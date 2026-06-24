import type { BusinessCardPayload } from "@octo/base";
import type { SummaryDetail } from "../types/summary";
import { SummaryMode } from "../types/summary";

const CARD_BODY_MAX_LENGTH = 220;

function compactText(value: string): string {
    return value.replace(/\[\d+\]/g, "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1)}…`;
}

export interface BuildSummaryFeedbackCardOptions {
    actor?: string;
    sourceChannelId?: string;
    sourceChannelType?: number;
    time?: string;
}

export function buildSummaryFeedbackCard(
    detail: SummaryDetail,
    options: BuildSummaryFeedbackCardOptions = {},
): BusinessCardPayload {
    const sourceCount = detail.sources?.length ?? 0;
    const participantCount = detail.participants?.length ?? 0;
    const totalMsgCount = detail.result?.total_msg_count ?? 0;
    const body = truncate(compactText(detail.result?.content ?? ""), CARD_BODY_MAX_LENGTH);

    return {
        id: `summary-${detail.task_id}`,
        cardType: "summary_feedback",
        title: detail.title,
        subtitle: detail.summary_mode === SummaryMode.BY_PERSON ? "成员总结" : "群总结",
        body,
        status: "pending_confirm",
        source: "智能总结",
        actor: options.actor,
        time: options.time,
        entityId: String(detail.task_id),
        entityType: "summary",
        sourceChannelId: options.sourceChannelId || detail.origin_channel_id,
        sourceChannelType: options.sourceChannelType || detail.origin_channel_type,
        metrics: [
            { label: "消息数", value: String(totalMsgCount) },
            { label: "来源", value: `${sourceCount} 个` },
            ...(participantCount > 0 ? [{ label: "参与人", value: `${participantCount} 人` }] : []),
        ],
        actions: [
            { label: "进入群总结", type: "open_summary_workspace", kind: "primary" },
            { label: "认可", type: "summary_accept", kind: "secondary" },
            { label: "需要调整", type: "summary_reject", kind: "secondary" },
            { label: "预览", type: "open_summary", kind: "ghost" },
        ],
    };
}
