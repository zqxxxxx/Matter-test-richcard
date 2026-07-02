import { describe, expect, it } from "vitest";
import { buildSummaryFeedbackCard } from "../businessCard";
import { SummaryMode, TaskStatus, TriggerType } from "../../types/summary";
import type { SummaryDetail } from "../../types/summary";

describe("buildSummaryFeedbackCard", () => {
  it("includes only navigation actions for manually forwarded summary cards", () => {
    const detail: SummaryDetail = {
      task_id: 42,
      task_no: "SUM-42",
      title: "项目周会总结",
      summary_mode: SummaryMode.BY_GROUP,
      status: TaskStatus.COMPLETED,
      trigger_type: TriggerType.MANUAL,
      time_range_start: "2026-06-22T09:00:00Z",
      time_range_end: "2026-06-22T10:00:00Z",
      sources: [
        {
          source_type: 1,
          source_id: "group-1",
          source_name: "项目群",
        },
      ],
      participants: [],
      origin_channel_id: "group-1",
      origin_channel_type: 1,
      created_at: "2026-06-22T10:00:00Z",
      updated_at: "2026-06-22T10:10:00Z",
      result: {
        content: "本周主要推进 Matter 富文本卡片闭环。",
        total_msg_count: 20,
        total_token_used: 1000,
        model_version: "test",
        version: 1,
        generated_at: "2026-06-22T10:10:00Z",
      },
      permissions: {
        can_edit: true,
      },
      error_message: null,
    };

    const card = buildSummaryFeedbackCard(detail);

    expect(card.status).toBe("completed");
    expect(card.sourceChannelType).toBe(2);
    expect(card.actions?.map((action) => action.type)).toEqual([
      "open_summary_workspace",
      "open_summary",
    ]);
    expect(card.actions?.map((action) => action.label)).not.toContain("认可");
    expect(card.actions?.map((action) => action.label)).not.toContain("需要调整");
  });

  it("marks regenerated summary cards with a stable root and version metadata", () => {
    const detail: SummaryDetail = {
      task_id: 88,
      task_no: "SUM-88",
      title: "合同验收总结",
      summary_mode: SummaryMode.BY_GROUP,
      status: TaskStatus.COMPLETED,
      trigger_type: TriggerType.MANUAL,
      time_range_start: "2026-06-22T09:00:00Z",
      time_range_end: "2026-06-22T10:00:00Z",
      sources: [
        {
          source_type: 1,
          source_id: "group-1",
          source_name: "Richcard 验收群",
        },
      ],
      participants: [],
      origin_channel_id: "group-1",
      origin_channel_type: 1,
      created_at: "2026-06-22T10:00:00Z",
      updated_at: "2026-06-22T10:10:00Z",
      result: {
        content: "合同验收风险需要法务补充结论。",
        total_msg_count: 12,
        total_token_used: 1000,
        model_version: "test",
        version: 1,
        generated_at: "2026-06-22T10:10:00Z",
      },
      permissions: {
        can_edit: true,
      },
      error_message: null,
    };

    const card = buildSummaryFeedbackCard(detail, {
      rootTaskId: 42,
      version: 2,
      feedback: "补充法务风险结论",
      time: "2026/6/25 12:10:47",
    });

    expect(card.id).toBe("summary-42-v2");
    expect(card.entityId).toBe("88");
    expect(card.extra).toMatchObject({
      summaryRootTaskId: "42",
      revisionTaskId: "88",
      version: 2,
      versionLabel: "v2",
      feedback: "补充法务风险结论",
      sourceName: "Richcard 验收群",
      summaryTitle: "合同验收总结",
      messageCount: 12,
    });
  });
});
