import type { BusinessCardPayload } from "@octo/base";
import type { MatterDetail } from "../bridge/types";

const CARD_BODY_MAX_LENGTH = 180;
const SOURCE_MAX_LENGTH = 160;

export interface BuildMatterStatusCardOptions {
  actor?: string;
  sourceChannelId?: string;
  sourceChannelType?: number;
  sourceName?: string;
  time?: string;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function compactText(value?: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function formatDeadline(deadline?: string): string | undefined {
  if (!deadline) return undefined;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getAssigneeLabel(matter: MatterDetail): string | undefined {
  const assignees = matter.assignees ?? [];
  if (!assignees.length) return undefined;
  const firstAssignee = assignees[0]?.user_id;
  if (assignees.length === 1) return firstAssignee || "1 人";
  if (firstAssignee) return `${firstAssignee} 等 ${assignees.length} 人`;
  return `${assignees.length} 人`;
}

function getSourceText(matter: MatterDetail, sourceName?: string): string | undefined {
  const sourceMessage = matter.source_msgs?.map(compactText).find(Boolean);
  if (sourceMessage) return truncate(sourceMessage, SOURCE_MAX_LENGTH);
  return sourceName || matter.source_name || matter.channels?.[0]?.channel_name;
}

export function buildMatterStatusCard(
  matter: MatterDetail,
  options: BuildMatterStatusCardOptions = {},
): BusinessCardPayload {
  const sourceChannelId = options.sourceChannelId || matter.source_channel_id || matter.channels?.[0]?.channel_id || "";
  const sourceChannelType = options.sourceChannelType || matter.source_channel_type || matter.channels?.[0]?.channel_type;
  const sourceName = options.sourceName || matter.source_name || matter.channels?.[0]?.channel_name;
  const assigneeLabel = getAssigneeLabel(matter);
  const deadlineLabel = formatDeadline(matter.deadline);
  const sourceText = getSourceText(matter, sourceName);
  const matterNo = matter.seq_no ? `M-${matter.seq_no}` : undefined;
  const metrics = [
    matter.creator_id ? { label: "创建人", value: matter.creator_id } : null,
    assigneeLabel ? { label: "负责人", value: assigneeLabel } : null,
    deadlineLabel ? { label: "截止", value: deadlineLabel } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return {
    id: `matter-${matter.id}-${matter.status}`,
    cardType: "matter_status",
    title: matter.title,
    subtitle: [matterNo, sourceName ? `来自 ${sourceName}` : undefined]
      .filter(Boolean)
      .join(" · ") || "事项状态更新",
    body: truncate(compactText(matter.description), CARD_BODY_MAX_LENGTH),
    status: matter.status,
    source: "Matter",
    actor: options.actor,
    time: options.time,
    entityId: matter.id,
    entityType: "matter",
    sourceChannelId,
    sourceChannelType,
    metrics,
    actions: [
      { label: "查看 Matter", type: "open_matter", kind: "primary" },
      { label: "进入 Matter", type: "open_matter_workspace", kind: "secondary" },
      ...(matter.status === "done"
        ? []
        : [{ label: "标记完成", type: "complete_matter", kind: "secondary" as const }]),
    ],
    extra: {
      matterNo,
      sourceText,
      sourceName,
      spaceId: matter.space_id,
      updatedAt: matter.updated_at,
      createdAt: matter.created_at,
    },
  };
}
