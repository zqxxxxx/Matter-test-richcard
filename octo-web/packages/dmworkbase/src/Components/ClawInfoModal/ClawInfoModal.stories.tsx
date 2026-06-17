import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import ClawInfoModal from "./ClawInfoModal";

const meta: Meta<typeof ClawInfoModal> = {
  title: "Components/ClawInfoModal",
  component: ClawInfoModal,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ClawInfoModal>;

/**
 * AC-1: 基础展示（有 Session 数据）
 *
 * 预期：
 * - 显示顶部统计 "3 running · 共 7 个（最近 1 小时）"
 * - 显示 7 个 Session 卡片
 * - running Session 排在前面（绿色左边框 + 脉冲动画）
 * - 每个卡片包含 Bot 字段（皮皮虾 (@pipixia_bot)）
 */
export const WithSessions: Story = {
  args: {
    botId: "01913a2b3c4d5e6f7890abcd_bot",
    visible: true,
    onClose: () => console.log("关闭弹窗"),
  },
  render: (args) => {
    // Mock fetch API
    const originalFetch = global.fetch;
    global.fetch = async (url: string) => {
      if (url.includes("/api/v1/agent-cards/")) {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            message: "ok",
            data: {
              bot_id: "01913a2b3c4d5e6f7890abcd_bot",
              session_total: 7,
              session_running_count: 3,
              sessions: [
                {
                  session_id: "sess_1",
                  session_key: "dmwork:group:a75b56c8d9e0f1a2b3c4d5e6f7890123",
                  channel: "dmwork",
                  status: "running",
                  peer_name: "Alice",
                  peer_type: "private",
                  group_member_count: null,
                  model: "claude-sonnet-4-6",
                  context_used: 12000,
                  context_total: 200000,
                  context_percent: 6.0,
                  last_user_message: "帮我写一个函数",
                  last_active_at: "2026-05-07T10:30:00Z",
                },
                {
                  session_id: "sess_2",
                  session_key: "discord:channel:1470015610489536542",
                  channel: "discord",
                  status: "running",
                  peer_name: "#square · LUO",
                  peer_type: "private",
                  group_member_count: null,
                  model: "claude-opus-4-5",
                  context_used: 128400,
                  context_total: 200000,
                  context_percent: 64.2,
                  last_user_message: "关于OctoPush的原型，有几个小问题需要修改一下…",
                  last_active_at: "2026-05-07T10:28:00Z",
                },
                {
                  session_id: "sess_3",
                  session_key: "localhost:terminal:cli_term_01",
                  channel: "localhost",
                  status: "running",
                  peer_name: "openclaw chat",
                  peer_type: "private",
                  group_member_count: null,
                  model: "claude-opus-4-5",
                  context_used: 32400,
                  context_total: 200000,
                  context_percent: 16.2,
                  last_user_message: "帮我检查下本地 git 仓库的未提交文件",
                  last_active_at: "2026-05-07T10:25:00Z",
                },
                {
                  session_id: "sess_4",
                  session_key: "dmwork:direct:a4f1e0cb92d34a7e",
                  channel: "dmwork",
                  status: "idle",
                  peer_name: "xmingming",
                  peer_type: "private",
                  group_member_count: null,
                  model: "claude-opus-4-5",
                  context_used: 38100,
                  context_total: 200000,
                  context_percent: 19.05,
                  last_user_message: "每天下午 16 点确认一下今天的进展",
                  last_active_at: "2026-05-07T10:20:00Z",
                },
                {
                  session_id: "sess_5",
                  session_key: "discord:direct:1172463467932954719",
                  channel: "discord",
                  status: "idle",
                  peer_name: "xmingming",
                  peer_type: "private",
                  group_member_count: null,
                  model: "claude-opus-4-5",
                  context_used: 18600,
                  context_total: 200000,
                  context_percent: 9.3,
                  last_user_message: "晚上的周报记得提醒我写",
                  last_active_at: "2026-05-07T09:50:00Z",
                },
                {
                  session_id: "sess_6",
                  session_key: "feishu:group:oc_x4a91b2c3d4e5f6",
                  channel: "feishu",
                  status: "idle",
                  peer_name: "明略 AI 小组",
                  peer_type: "group",
                  group_member_count: 8,
                  model: "claude-opus-4-5",
                  context_used: 8200,
                  context_total: 200000,
                  context_percent: 4.1,
                  last_user_message: "明天的周报帮我整理下",
                  last_active_at: "2026-05-07T09:30:00Z",
                },
                {
                  session_id: "sess_7",
                  session_key: "dmwork:group:8e4d13f7c2a14f88",
                  channel: "dmwork",
                  status: "stopped",
                  peer_name: "明略 AI Agent 组(8人)",
                  peer_type: "group",
                  group_member_count: 8,
                  model: "claude-opus-4-5",
                  context_used: 150000,
                  context_total: 200000,
                  context_percent: 75.0,
                  last_user_message: "@皮皮虾 把今天的会议纪要整理下。",
                  last_active_at: "2026-05-07T09:00:00Z",
                },
              ],
              runtime_info: {
                gateway_name: "Gateway-1",
                claw_id: "claw-a8f3d2e1",
                process_status: "running",
              },
            },
          }),
        } as any;
      }
      return originalFetch(url);
    };

    return <ClawInfoModal {...args} />;
  },
};

/**
 * AC-2: 空态（无 Session）
 *
 * 预期：
 * - 显示顶部统计 "0 running · 共 0 个（最近 1 小时）"
 * - 显示占位图 + 文案"最近 1 小时内没有活跃的会话，有新对话产生后会出现在这里"
 */
export const EmptySessions: Story = {
  args: {
    botId: "empty_bot",
    visible: true,
    onClose: () => console.log("关闭弹窗"),
  },
  render: (args) => {
    const originalFetch = global.fetch;
    global.fetch = async (url: string) => {
      if (url.includes("/api/v1/agent-cards/")) {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            message: "ok",
            data: {
              bot_id: "empty_bot",
              session_total: 0,
              session_running_count: 0,
              sessions: [],
              runtime_info: {
                gateway_name: "Gateway-2",
                claw_id: "claw-xyz123",
                process_status: "idle",
              },
            },
          }),
        } as any;
      }
      return originalFetch(url);
    };

    return <ClawInfoModal {...args} />;
  },
};

/**
 * AC-3: 加载中
 *
 * 预期：
 * - 显示 Spin 加载器
 */
export const Loading: Story = {
  args: {
    botId: "loading_bot",
    visible: true,
    onClose: () => console.log("关闭弹窗"),
  },
  render: (args) => {
    global.fetch = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return { ok: false } as any;
    };

    return <ClawInfoModal {...args} />;
  },
};

/**
 * AC-4: 加载失败
 *
 * 预期：
 * - 显示 Empty 错误提示
 */
export const LoadError: Story = {
  args: {
    botId: "error_bot",
    visible: true,
    onClose: () => console.log("关闭弹窗"),
  },
  render: (args) => {
    global.fetch = async () => {
      throw new Error("网络连接失败");
    };

    return <ClawInfoModal {...args} />;
  },
};
