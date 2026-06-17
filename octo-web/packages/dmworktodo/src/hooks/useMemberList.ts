import { useState, useEffect, useCallback, useRef } from 'react';
import { WKApp } from '@octo/base';
import { Channel, Subscriber } from 'wukongimjssdk';
import { SpaceService, SpaceMember } from '@octo/base';
import { isBot } from '@octo/base/src/Components/WKAvatar';

export interface AssigneeInfo {
  uid: string;
  name: string;
  avatar?: string;
  isBot?: boolean;
}

interface UseMemberListOptions {
  channel?: { channelId: string; channelType: number };
  keyword?: string;
  enabled?: boolean;
}

interface UseMemberListResult {
  members: AssigneeInfo[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PAGE_SIZE = 20;

/**
 * useMemberList Hook
 *
 * 数据源：
 * - 有 channel：使用群成员 (WKApp.dataSource.channelDataSource.subscribers)
 * - 无 channel：使用 Space 成员 (SpaceService.shared.getMembers)
 */
export function useMemberList(options: UseMemberListOptions = {}): UseMemberListResult {
  const { channel, keyword = '', enabled = true } = options;

  const [members, setMembers] = useState<AssigneeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // Space 成员全量缓存，记录 spaceId 用于失效判断
  const allSpaceMembersRef = useRef<AssigneeInfo[] | null>(null);
  const cachedSpaceIdRef = useRef<string | null>(null);

  // 从 Space 成员加载
  const loadSpaceMembers = useCallback(async (): Promise<AssigneeInfo[]> => {
    const spaceId = WKApp.shared.currentSpaceId;
    if (!spaceId) return [];

    // SpaceService.getMembers 有分页（默认 limit=50），循环全量拉取
    // MAX_PAGES = 20（上限 1000 人），防止超大 Space 无限加载
    const PAGE_LIMIT = 50;
    const MAX_PAGES = 20;
    let page = 1;
    const all: SpaceMember[] = [];
    while (page <= MAX_PAGES) {
      const batch = await SpaceService.shared.getMembers(spaceId, page, PAGE_LIMIT);
      if (!batch || batch.length === 0) break;
      all.push(...batch);
      if (batch.length < PAGE_LIMIT) break; // 最后一页
      page++;
    }

    return all
      .map((m: SpaceMember) => ({
        uid: m.uid,
        name: m.name || m.uid,
        avatar: WKApp.shared.avatarUser(m.uid),
        isBot: m.robot === 1,
      }));
  }, []);

  // 从群成员加载
  const loadChannelMembers = useCallback(
    async (currentPage: number, currentKeyword: string): Promise<AssigneeInfo[]> => {
      if (!channel) return [];

      const ch = new Channel(channel.channelId, channel.channelType);
      const subscribers = await WKApp.dataSource.channelDataSource.subscribers(ch, {
        page: currentPage,
        limit: PAGE_SIZE,
        keyword: currentKeyword,
      });

      if (!subscribers) return [];

      return subscribers
        .map((s: Subscriber) => ({
          uid: s.uid,
          name: s.remark || s.name || s.uid,
          avatar: WKApp.shared.avatarUser(s.uid),
          isBot: isBot(s.uid),
        }));
    },
    // 用原始值而非 channel 对象引用，避免父组件每次传新对象字面量导致无限循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channel?.channelId, channel?.channelType]
  );

  // requestId 模式：每次发新请求递增 ID，旧请求结果自动丢弃，解决竞态
  const requestIdRef = useRef(0);

  // 加载数据
  const loadMembers = useCallback(
    async (currentPage: number, append: boolean = false) => {
      const reqId = ++requestIdRef.current;
      setLoading(true);

      try {
        let result: AssigneeInfo[];

        if (channel) {
          // 群成员模式：分页加载
          result = await loadChannelMembers(currentPage, keyword);
          if (reqId !== requestIdRef.current) return; // 旧请求，丢弃结果
          setHasMore(result.length >= PAGE_SIZE);
        } else {
          // Space 成员模式：缓存全量，keyword 变化时本地过滤
          // spaceId 变更时清缓存，确保切换 Space 后看到新成员
          const currentSpaceId = WKApp.shared.currentSpaceId;
          if (!allSpaceMembersRef.current || cachedSpaceIdRef.current !== currentSpaceId) {
            allSpaceMembersRef.current = await loadSpaceMembers();
            cachedSpaceIdRef.current = currentSpaceId;
          }
          if (reqId !== requestIdRef.current) return; // 旧请求，丢弃结果
          const allMembers = allSpaceMembersRef.current;
          result = keyword.trim()
            ? allMembers.filter(
                (m) =>
                  m.name.toLowerCase().includes(keyword.toLowerCase()) ||
                  m.uid.toLowerCase().includes(keyword.toLowerCase())
              )
            : allMembers;
          setHasMore(false);
        }

        setMembers((prev) => (append ? [...prev, ...result] : result));
      } catch (error) {
        if (reqId !== requestIdRef.current) return;
        console.error('Failed to load members:', error);
        setMembers([]);
        setHasMore(false);
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    // channel?.channelId/channelType 已覆盖 channel 有→无的变化，!!channel 多余
    [channel?.channelId, channel?.channelType, keyword, loadChannelMembers, loadSpaceMembers]
  );

  // 加载更多
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await loadMembers(nextPage, true);
  }, [hasMore, loading, page, loadMembers]);

  // 刷新数据（同时清空 Space 成员缓存，确保拿到最新成员）
  const refresh = useCallback(async () => {
    allSpaceMembersRef.current = null; // 强制下次重新加载
    setPage(1);
    setHasMore(true);
    await loadMembers(1, false);
  }, [loadMembers]);

  // 初始加载和关键词变化时重新加载
  // loadMembers 加入依赖：它依赖 loadChannelMembers/loadSpaceMembers，
  // 两者变化时需要用新版本的 loadMembers，不能用旧闭包
  useEffect(() => {
    if (!enabled) return;
    setPage(1);
    setHasMore(true);
    loadMembers(1, false);
  }, [loadMembers, enabled]);

  return {
    members,
    loading,
    hasMore,
    loadMore,
    refresh,
  };
}
