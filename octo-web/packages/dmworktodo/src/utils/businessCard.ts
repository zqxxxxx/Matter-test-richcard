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

function getStatusText(status: string, assigneeLabel?: string): string {
  if (status === "review") return "东西回来了，等你确认";
  if (status === "done") return "已验收完成，结果可回看";
  if (status === "blocked") return "卡住了，需要补充输入";
  if (status === "in_progress") return assigneeLabel ? `${assigneeLabel} 正在处理` : "正在推进中";
  return assigneeLabel ? `已交给 ${assigneeLabel}` : "已接收，待开始";
}

function getProgressText(status: string): string {
  if (status === "done") return "4 / 4";
  if (status === "review") return "3 / 4";
  if (status === "blocked") return "2 / 4";
  if (status === "in_progress") return "2 / 4";
  return "1 / 4";
}

function getActions(status: string): BusinessCardPayload["actions"] {
  const actions: BusinessCardPayload["actions"] = [
    { label: "进入 Matter", type: "open_matter_workspace", kind: "primary" },
    { label: "预览", type: "open_matter", kind: "ghost" },
  ];
  if (status !== "done" && status !== "archived") {
    actions.splice(1, 0, { label: "标记完成", type: "complete_matter", kind: "secondary" });
  }
  return actions;
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
    assigneeLabel ? { label: "现在该谁处理", value: assigneeLabel } : null,
    deadlineLabel ? { label: "截止", value: deadlineLabel } : null,
    { label: "进度", value: getProgressText(matter.status) },
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
    actions: getActions(matter.status),
    extra: {
      matterId: matter.id,
      matterNo,
      statusText: getStatusText(matter.status, assigneeLabel),
      sourceText,
      sourceName,
      agentName: matter.status === "blocked" ? "Matter 助手" : "Brooks",
      agentRole: matter.status === "review" ? "已汇总" : "带队",
      participantText: matter.participants?.length ? `${matter.participants.length} 个参与者` : undefined,
      participantRoles: matter.status === "review" ? ["Research", "Review"] : ["法务", "销售"],
      progress: getProgressText(matter.status),
      outputs: matter.status === "review" || matter.status === "done" ? ["风险说明", "审批结论"] : [],
      trail: [
        { label: "创建", title: "从群消息创建事项" },
        { label: "编排", title: "分派给参与者" },
        { label: "当前", title: getStatusText(matter.status, assigneeLabel) },
        { label: "下一步", title: matter.status === "review" ? "等待 PM 盖章" : "继续推进" },
      ],
      spaceId: matter.space_id,
      updatedAt: matter.updated_at,
      createdAt: matter.created_at,
    },
  };
}
