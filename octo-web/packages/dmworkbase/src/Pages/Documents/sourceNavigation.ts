import type { DocumentAsset } from "./types";

export interface DocumentSourceNavigation {
  channelId: string;
  channelType: number;
  initLocateMessageSeq?: number;
  toastName: string;
}

export function buildDocumentSourceNavigation(
  file: DocumentAsset
): DocumentSourceNavigation | null {
  const channelId = file.sourceRef?.channelId || file.sourceChannelId;
  const channelType = file.sourceRef?.channelType || file.sourceChannelType;
  if (!channelId || !channelType) return null;
  const messageSeq = file.sourceRef?.messageSeq;
  return {
    channelId,
    channelType,
    initLocateMessageSeq:
      typeof messageSeq === "number" && messageSeq > 0 ? messageSeq : undefined,
    toastName: file.sourceRef?.channelName || file.sourceName || channelId,
  };
}
