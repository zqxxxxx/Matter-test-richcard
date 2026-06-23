import React, { useEffect, useState } from "react";
import type { Channel } from "wukongimjssdk";
import { Button, Modal, Select, Toast } from "@douyinfe/semi-ui";
import { ListItem } from "../ListItem";
import { documentRepository } from "../../Pages/Documents/service";
import { navigateWorkspace } from "../../Pages/Documents";
import type { DocumentSpace } from "../../Pages/Documents/types";
import WKApp from "../../App";
import "./index.css";

interface ChannelDocumentStorageSpaceProps {
  channel: Channel;
  channelName?: string;
  canManageStorageSpace?: boolean;
}

export default function ChannelDocumentStorageSpace({
  channel,
  channelName,
  canManageStorageSpace = false,
}: ChannelDocumentStorageSpaceProps) {
  const [spaceId, setSpaceId] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [spaces, setSpaces] = useState<DocumentSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    documentRepository
      .getChannelStorageSpace(channel.channelID, channel.channelType)
      .then((storageSpace) => {
        if (!cancelled) {
          setSpaceId(storageSpace?.spaceId || "");
          setSpaceName(storageSpace?.spaceName || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpaceId("");
          setSpaceName("");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [channel.channelID, channel.channelType]);

  useEffect(() => {
    if (!modalVisible) return;
    let cancelled = false;
    setSpacesLoading(true);
    documentRepository
      .load()
      .then((state) => {
        if (cancelled) return;
        setSpaces(Array.isArray(state.spaces) ? state.spaces : []);
      })
      .catch(() => {
        if (!cancelled) {
          setSpaces([]);
          Toast.error("文档空间加载失败，请稍后重试");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSpacesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [modalVisible, spaceId]);

  const displayName = loading ? "查询中..." : spaceName;
  const currentUserId = WKApp.loginInfo.uid || "";
  const manageableSpaces = spaces.map((space) => ({
    ...space,
    manageable: canManageDocumentSpace(space, currentUserId),
  }));
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);
  const selectedSpaceOption = manageableSpaces.find(
    (space) => space.id === selectedSpaceId
  );

  function openStorageSpace() {
    if (canManageStorageSpace) {
      setSelectedSpaceId(spaceId || "");
      setModalVisible(true);
      return;
    }
    if (spaceName) {
      navigateWorkspace({ view: "space", spaceName });
    }
  }

  async function submitBinding() {
    if (!selectedSpaceId) {
      Toast.warning("请选择群文档存储空间");
      return;
    }
    if (selectedSpaceId === spaceId) {
      setModalVisible(false);
      return;
    }
    setSaving(true);
    try {
      await documentRepository.bindConversationToSpace(
        selectedSpaceId,
        {
          channelId: channel.channelID,
          channelType: channel.channelType,
          name: channelName || channel.channelID,
        },
        WKApp.loginInfo.name || WKApp.loginInfo.uid || ""
      );
      setSpaceId(selectedSpaceId);
      setSpaceName(selectedSpace?.name || "");
      setModalVisible(false);
      Toast.success("已更新群文档存储空间");
    } catch (error) {
      Toast.error("群文档存储空间更新失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ListItem
        title="群文档存储空间"
        subTitle={displayName}
        onClick={
          canManageStorageSpace || spaceName ? openStorageSpace : undefined
        }
      />
      <Modal
        title="设置群文档存储空间"
        visible={modalVisible}
        okText="确认绑定"
        cancelText="取消"
        confirmLoading={saving}
        okButtonProps={{
          disabled:
            spacesLoading ||
            !selectedSpaceId ||
            selectedSpaceId === spaceId ||
            !selectedSpaceOption?.manageable,
        }}
        onOk={submitBinding}
        onCancel={() => setModalVisible(false)}
      >
        <div className="wk-channel-doc-storage-form">
          <label>
            <span>目标空间</span>
            <Select
              value={selectedSpaceId}
              placeholder="选择群文档存储空间"
              loading={spacesLoading}
              onChange={(value) => setSelectedSpaceId(String(value))}
            >
              {manageableSpaces.map((space) => (
                <Select.Option
                  key={space.id}
                  value={space.id}
                  disabled={!space.manageable}
                >
                  {space.name}
                  {!space.manageable ? "（无管理权限）" : ""}
                </Select.Option>
              ))}
            </Select>
          </label>
          <p className="wk-channel-doc-storage-hint">
            绑定后，该群聊中新发文件会自动进入该空间。历史文件不会自动迁移。
          </p>
          {spaceName && (
            <Button
              className="wk-channel-doc-storage-view"
              theme="borderless"
              type="tertiary"
              onClick={() => navigateWorkspace({ view: "space", spaceName })}
            >
              查看当前空间
            </Button>
          )}
          {manageableSpaces.length > 0 &&
            manageableSpaces.every((space) => !space.manageable || space.id === spaceId) && (
              <p className="wk-channel-doc-storage-empty">
                暂无其他可绑定空间。需要先成为目标空间所有者或管理员。
              </p>
            )}
        </div>
      </Modal>
    </>
  );
}

function canManageDocumentSpace(space: DocumentSpace, uid: string) {
  if (!uid) return false;
  if (space.owner === uid) return true;
  return space.members.some(
    (member) =>
      member.uid === uid && (member.role === "owner" || member.role === "admin")
  );
}
