import type { MessageWrap } from "../../Service/Model";
import type { ConversationRenderItem } from "./vm";

function getMessageIdentity(message: MessageWrap) {
  if (message.messageSeq > 0) return `seq:${message.messageSeq}`;
  if (message.messageID) return `id:${message.messageID}`;
  if (message.clientMsgNo) return `client:${message.clientMsgNo}`;
  return `content:${message.contentType || "unknown"}`;
}

export function getConversationMessageRenderKey(
  message: MessageWrap,
  index: number,
  scope = "message"
) {
  return `${scope}:${getMessageIdentity(message)}:${index}`;
}

export function getConversationRenderItemKey(
  item: ConversationRenderItem,
  index: number
) {
  if (item.type === "foldSession") {
    return `fold:${item.session.sessionId}:${index}`;
  }
  return getConversationMessageRenderKey(item.message, index);
}
