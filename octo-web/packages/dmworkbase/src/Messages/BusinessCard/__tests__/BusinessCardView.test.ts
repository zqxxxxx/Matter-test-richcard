import { describe, expect, it } from "vitest";
import { getBusinessCardActions } from "../BusinessCardView";
import type { BusinessCardPayload } from "../BusinessCardContent";

describe("BusinessCardView actions", () => {
  it("adds the matter workspace jump action for legacy matter cards", () => {
    const card: BusinessCardPayload = {
      id: "matter-legacy",
      cardType: "matter_status",
      title: "Matter 状态返回",
      actions: [
        { label: "查看 Matter", type: "open_matter", kind: "primary" },
        { label: "标记完成", type: "complete_matter", kind: "secondary" },
      ],
    };

    expect(getBusinessCardActions(card).map((action) => action.type)).toEqual([
      "open_matter",
      "open_matter_workspace",
      "complete_matter",
    ]);
  });

  it("adds the summary workspace jump action for legacy summary cards", () => {
    const card: BusinessCardPayload = {
      id: "summary-legacy",
      cardType: "summary_feedback",
      title: "群总结反馈",
      actions: [
        { label: "查看总结", type: "open_summary", kind: "primary" },
        { label: "采纳", type: "summary_accept", kind: "secondary" },
        { label: "继续优化", type: "summary_reject", kind: "secondary" },
      ],
    };

    expect(getBusinessCardActions(card).map((action) => action.type)).toEqual([
      "open_summary",
      "open_summary_workspace",
      "summary_accept",
      "summary_reject",
    ]);
  });

  it("does not duplicate workspace jump actions that already exist", () => {
    const card: BusinessCardPayload = {
      id: "matter-current",
      cardType: "matter_status",
      title: "Matter 状态返回",
      actions: [
        { label: "查看 Matter", type: "open_matter", kind: "primary" },
        { label: "进入 Matter", type: "open_matter_workspace", kind: "secondary" },
      ],
    };

    expect(getBusinessCardActions(card).filter((action) => action.type === "open_matter_workspace")).toHaveLength(1);
  });
});
