import type { BusinessCardPayload } from "@octo/base";
import type { SummaryDetail } from "../types/summary";
import { SummaryMode } from "../types/summary";
import { summaryOriginTypeToIMChannelType } from "./sourceConversation";

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
    rootTaskId?: string | number;
    version?: number;
    feedback?: string;
    status?: string;
    confirmedAt?: string;
}

export function buildSummaryFeedbackCard(
    detail: SummaryDetail,
    options: BuildSummaryFeedbackCardOptions = {},
): BusinessCardPayload {
    const sourceCount = detail.sources?.length ?? 0;
    const participantCount = detail.participants?.length ?? 0;
    const totalMsgCount = detail.result?.total_msg_count ?? 0;
    const body = truncate(compactText(detail.result?.content ?? ""), CARD_BODY_MAX_LENGTH);
    const rootTaskId = String(options.rootTaskId ?? detail.task_id);
    const revisionTaskId = String(detail.task_id);
    const version = options.version ?? detail.result?.version ?? 1;
    const sourceName = detail.sources?.[0]?.source_name || "智能总结";
    const status = options.status || "completed";

    return {
        id: `summary-${rootTaskId}-v${version}`,
        cardType: "summary_feedback",
        title: detail.title,
        subtitle: detail.summary_mode === SummaryMode.BY_PERSON ? "成员总结" : "群总结",
        body,
        status,
        source: "智能总结",
        actor: options.actor,
        time: options.time,
        entityId: revisionTaskId,
        entityType: "summary",
        sourceChannelId: options.sourceChannelId || detail.origin_channel_id,
        sourceChannelType: options.sourceChannelType ?? summaryOriginTypeToIMChannelType(detail.origin_channel_type),
        metrics: [
            { label: "消息数", value: String(totalMsgCount) },
            { label: "来源", value: `${sourceCount} 个` },
            ...(participantCount > 0 ? [{ label: "参与人", value: `${participantCount} 人` }] : []),
        ],
        actions: [
            { label: "进入群总结", type: "open_summary_workspace", kind: "primary" },
            { label: "预览", type: "open_summary", kind: "ghost" },
        ],
        extra: {
            summaryRootTaskId: rootTaskId,
            revisionTaskId,
            version,
            versionLabel: `v${version}`,
            feedback: options.feedback || "",
            sourceName,
            summaryTitle: detail.title,
            messageCount: totalMsgCount,
            summaryText: body,
            confirmed: status === "confirmed",
            confirmedAt: options.confirmedAt || "",
        },
    };
}
