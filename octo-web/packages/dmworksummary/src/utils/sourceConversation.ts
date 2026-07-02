import type { SourceConversationRef } from "@octo/base";

const SUMMARY_ORIGIN_GROUP = 1;
const SUMMARY_ORIGIN_THREAD = 2;
const SUMMARY_ORIGIN_DM = 3;

const IM_CHANNEL_PERSON = 1;
const IM_CHANNEL_GROUP = 2;
const IM_CHANNEL_THREAD = 5;

export interface SummaryOriginLike {
    origin_channel_id?: string | null;
    origin_channel_type?: number | null;
}

export function summaryOriginTypeToIMChannelType(originType?: number | null): number | undefined {
    if (originType === SUMMARY_ORIGIN_GROUP) return IM_CHANNEL_GROUP;
    if (originType === SUMMARY_ORIGIN_THREAD) return IM_CHANNEL_THREAD;
    if (originType === SUMMARY_ORIGIN_DM) return IM_CHANNEL_PERSON;
    return undefined;
}

export function normalizeSummarySourceLabel(label?: string): string | undefined {
    const normalized = label?.replace(/\s*[（(](群聊|子区|私聊|单聊)[)）]\s*$/, "").trim();
    return normalized || undefined;
}

export function getSummaryOriginConversation(
    detail?: SummaryOriginLike | null,
    existing?: SourceConversationRef,
): SourceConversationRef | undefined {
    const channelId = detail?.origin_channel_id?.trim();
    const channelType = summaryOriginTypeToIMChannelType(detail?.origin_channel_type);
    if (!channelId || channelType == null) return existing;

    const source: SourceConversationRef = {
        channelId,
        channelType,
    };
    if (
        existing &&
        existing.channelId === source.channelId &&
        existing.channelType === source.channelType
    ) {
        return {
            ...source,
            label: normalizeSummarySourceLabel(existing.label),
            messageSeq: existing.messageSeq,
        };
    }
    return source;
}
