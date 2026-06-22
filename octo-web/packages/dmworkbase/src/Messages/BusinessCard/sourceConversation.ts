import { Channel } from "wukongimjssdk";
import WKApp from "../../App";
import type { BusinessCardPayload } from "./BusinessCardContent";
import type { BusinessCardActionContext } from "./actionHandlers";

export interface SourceConversationRef {
  channelId: string;
  channelType: number;
  label?: string;
  messageSeq?: number;
}

export function buildSourceConversationRef(context?: Partial<BusinessCardActionContext>): SourceConversationRef | undefined {
  const card = context?.card as BusinessCardPayload | undefined;
  const message = context?.message;
  const channelId = card?.sourceChannelId || message?.channelId;
  const channelType = card?.sourceChannelType ?? message?.channelType;
  if (!channelId || channelType == null) return undefined;

  return {
    channelId,
    channelType,
    label: card?.extra?.sourceName || card?.extra?.source,
    messageSeq: message?.messageSeq,
  };
}

export function openSourceConversation(source?: SourceConversationRef) {
  if (!source?.channelId || source.channelType == null) return false;
  WKApp.switchToMenuById?.("chat");
  WKApp.mittBus.emit("wk:nav-menu-activated", { menuId: "chat" });
  WKApp.endpoints.showConversation(
    new Channel(source.channelId, source.channelType),
    {
      fromSidebarList: true,
      initLocateMessageSeq: source.messageSeq,
    },
  );
  return true;
}

export function getSourceConversationLabel(source?: SourceConversationRef) {
  return source?.label ? `返回 ${source.label}` : "返回原始聊天";
}
