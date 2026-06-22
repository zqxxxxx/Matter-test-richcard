import { describe, expect, it } from "vitest";
import { buildSummaryFeedbackCard } from "../businessCard";
import { SummaryMode, TaskStatus, TriggerType } from "../../types/summary";
import type { SummaryDetail } from "../../types/summary";

describe("buildSummaryFeedbackCard", () => {
  it("includes detail and workspace jump actions", () => {
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
      origin_channel_type: 2,
      creator_id: "u-creator",
      creator_name: "创建人",
      created_at: "2026-06-22T10:00:00Z",
      updated_at: "2026-06-22T10:10:00Z",
      completed_at: "2026-06-22T10:10:00Z",
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
        can_delete: true,
        can_cancel: false,
        can_regenerate: true,
        can_respond: true,
      },
    };

    const card = buildSummaryFeedbackCard(detail);

    expect(card.actions?.map((action) => action.type)).toEqual([
      "open_summary",
      "open_summary_workspace",
      "summary_accept",
      "summary_reject",
    ]);
  });
});
