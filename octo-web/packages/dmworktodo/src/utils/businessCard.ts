import type { BusinessCardPayload } from "@octo/base";
import type { MatterDetail, MatterStatus } from "../bridge/types";

const STATUS_LABELS: Record<MatterStatus, string> = {
  open: "待处理",
  done: "已完成",
  archived: "已归档",
};

export interface BuildMatterStatusCardOptions {
  actor?: string;
  sourceChannelId?: string;
  sourceChannelType?: number;
  sourceName?: string;
  time?: string;
}

export function buildMatterStatusCard(
  matter: MatterDetail,
  options: BuildMatterStatusCardOptions = {},
): BusinessCardPayload {
  const sourceChannelId = options.sourceChannelId || matter.source_channel_id || matter.channels?.[0]?.channel_id || "";
  const sourceChannelType = options.sourceChannelType || matter.source_channel_type || matter.channels?.[0]?.channel_type;
  const assigneeCount = matter.assignees?.length ?? 0;
  const metrics = [
    { label: "状态", value: STATUS_LABELS[matter.status] ?? matter.status },
    matter.deadline ? { label: "截止", value: matter.deadline } : null,
    assigneeCount > 0 ? { label: "负责人", value: `${assigneeCount} 人` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return {
    id: `matter-${matter.id}-${matter.status}`,
    cardType: "matter_status",
    title: matter.title,
    subtitle: options.sourceName || matter.source_name || "事项状态更新",
    body: matter.description || "",
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
      { label: "查看事项", type: "open_matter", kind: "primary" },
      ...(matter.status === "done"
        ? []
        : [{ label: "标记完成", type: "complete_matter", kind: "secondary" as const }]),
    ],
  };
}
