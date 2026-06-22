import { beforeEach, describe, expect, it, vi } from "vitest";
import WKApp from "../../../App";
import {
  buildSourceConversationRef,
  getSourceConversationLabel,
  openSourceConversation,
} from "../sourceConversation";

vi.mock("../../../App", () => ({
  default: {
    switchToMenuById: vi.fn(),
    mittBus: { emit: vi.fn() },
    endpoints: { showConversation: vi.fn() },
  },
}));

describe("business card source conversation", () => {
  beforeEach(() => {
    WKApp.switchToMenuById = vi.fn();
    WKApp.mittBus.emit = vi.fn();
    WKApp.endpoints.showConversation = vi.fn();
  });

  it("builds the return target from card and message context", () => {
    expect(buildSourceConversationRef({
      card: {
        id: "card-1",
        cardType: "matter_status",
        title: "事项",
        source: "Matter",
        sourceChannelId: "group-1",
        sourceChannelType: 2,
        extra: { sourceName: "验收群" },
      },
      action: { label: "进入 Matter", type: "open_matter_workspace" },
      message: { messageSeq: 42 },
    })).toEqual({
      channelId: "group-1",
      channelType: 2,
      label: "验收群",
      messageSeq: 42,
    });
  });

  it("switches back to chat and locates the source message", () => {
    const opened = openSourceConversation({ channelId: "group-1", channelType: 2, label: "验收群", messageSeq: 42 });

    expect(opened).toBe(true);
    expect(WKApp.switchToMenuById).toHaveBeenCalledWith("chat");
    expect(WKApp.mittBus.emit).toHaveBeenCalledWith("wk:nav-menu-activated", { menuId: "chat" });
    expect(WKApp.endpoints.showConversation).toHaveBeenCalledWith(
      expect.objectContaining({ channelID: "group-1", channelType: 2 }),
      { fromSidebarList: true, initLocateMessageSeq: 42 },
    );
  });

  it("formats a human readable return label", () => {
    expect(getSourceConversationLabel({ channelId: "group-1", channelType: 2, label: "验收群" })).toBe("返回 验收群");
    expect(getSourceConversationLabel({ channelId: "group-1", channelType: 2 })).toBe("返回原始聊天");
  });
});
