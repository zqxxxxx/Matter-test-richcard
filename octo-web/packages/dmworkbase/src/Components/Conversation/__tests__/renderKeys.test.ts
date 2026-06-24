import { describe, expect, it } from "vitest";
import {
  getConversationMessageRenderKey,
  getConversationRenderItemKey,
} from "../renderKeys";

function message(overrides: Record<string, any>) {
  return {
    clientMsgNo: overrides.clientMsgNo || "",
    messageSeq: overrides.messageSeq || 0,
    messageID: overrides.messageID || "",
    contentType: overrides.contentType ?? 1,
  } as any;
}

describe("conversation render keys", () => {
  it("keeps duplicate client message numbers unique in the render list", () => {
    const items = [
      { type: "message", message: message({ clientMsgNo: "dup", messageSeq: 72 }) },
      { type: "message", message: message({ clientMsgNo: "dup", messageSeq: 73 }) },
      { type: "message", message: message({ clientMsgNo: "dup", messageSeq: 73 }) },
    ] as any[];

    const keys = items.map((item, index) =>
      getConversationRenderItemKey(item, index)
    );

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toContain("seq:72");
    expect(keys[1]).toContain("seq:73");
  });

  it("keeps fold sessions and expanded duplicate messages unique", () => {
    const foldKey = getConversationRenderItemKey(
      {
        type: "foldSession",
        session: { sessionId: "fold-session-1" },
      } as any,
      0
    );
    const firstExpanded = getConversationMessageRenderKey(
      message({ clientMsgNo: "bot-dup" }),
      0,
      "fold-expanded"
    );
    const secondExpanded = getConversationMessageRenderKey(
      message({ clientMsgNo: "bot-dup" }),
      1,
      "fold-expanded"
    );

    expect(foldKey).toBe("fold:fold-session-1:0");
    expect(firstExpanded).not.toBe(secondExpanded);
  });
});
