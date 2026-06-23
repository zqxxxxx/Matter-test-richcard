import { beforeEach, describe, expect, it, vi } from "vitest";
import { openSourceConversation } from "@octo/base";
import { returnToSourceAndClose } from "../MatterWorkspace";

vi.mock("@octo/base", () => ({
  WKApp: {
    shared: { currentSpaceId: "rc_demo_space" },
    mittBus: { on: vi.fn(), off: vi.fn() },
  },
  getSourceConversationLabel: (source?: { label?: string }) => source?.label ? `返回 ${source.label}` : "返回原始聊天",
  openSourceConversation: vi.fn(),
  t: (key: string) => key,
}));

describe("MatterWorkspace return flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes the workspace when returning to the source conversation succeeds", () => {
    vi.mocked(openSourceConversation).mockReturnValue(true);
    const close = vi.fn();
    const source = { channelId: "group-1", channelType: 2, label: "验收群", messageSeq: 12 };

    expect(returnToSourceAndClose(source, close)).toBe(true);

    expect(openSourceConversation).toHaveBeenCalledWith(source);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("keeps the workspace open when there is no source conversation", () => {
    vi.mocked(openSourceConversation).mockReturnValue(false);
    const close = vi.fn();

    expect(returnToSourceAndClose(undefined, close)).toBe(false);

    expect(close).not.toHaveBeenCalled();
  });
});
