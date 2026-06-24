import { describe, expect, it } from "vitest";
import { buildMatterStatusCard } from "../businessCard";
import type { MatterDetail } from "../../bridge/types";

describe("buildMatterStatusCard", () => {
  it("includes workspace jump and lightweight preview actions", () => {
    const matter: MatterDetail = {
      id: "matter-1",
      seq_no: 1001,
      space_id: "space-1",
      title: "跟进重点客户方案",
      description: "需要在今天同步方案状态",
      creator_id: "u-creator",
      status: "open",
      deadline: "2026-06-22T10:00:00Z",
      source_channel_id: "group-1",
      source_channel_type: 2,
      source_name: "售前项目群",
      source_msgs: ["客户希望今天看到新版方案"],
      assignees: [
        {
          id: "assignee-1",
          matter_id: "matter-1",
          user_id: "u-owner",
          created_at: "2026-06-22T09:00:00Z",
        },
      ],
      created_at: "2026-06-22T09:00:00Z",
      updated_at: "2026-06-22T09:30:00Z",
      channels: [],
    };

    const card = buildMatterStatusCard(matter);

    expect(card.actions?.map((action) => action.type)).toEqual([
      "open_matter_workspace",
      "complete_matter",
      "open_matter",
    ]);
    expect(card.actions?.[0]?.label).toBe("进入 Matter");
    expect(card.actions?.[1]?.label).toBe("标记完成");
    expect(card.actions?.[2]?.label).toBe("预览");
  });

  it("hides complete action for closed matter states", () => {
    const baseMatter: MatterDetail = {
      id: "matter-closed",
      seq_no: 1002,
      space_id: "space-1",
      title: "客户合同审批完成",
      description: "结果已经回到群内",
      creator_id: "u-creator",
      status: "done",
      deadline: "2026-06-22T10:00:00Z",
      source_channel_id: "group-1",
      source_channel_type: 2,
      source_name: "售前项目群",
      source_msgs: ["确认合同审批结果"],
      assignees: [],
      created_at: "2026-06-22T09:00:00Z",
      updated_at: "2026-06-22T09:30:00Z",
      channels: [],
    };

    const doneCard = buildMatterStatusCard(baseMatter);
    const archivedCard = buildMatterStatusCard({ ...baseMatter, status: "archived" });

    expect(doneCard.actions?.map((action) => action.type)).toEqual([
      "open_matter_workspace",
      "open_matter",
    ]);
    expect(archivedCard.actions?.map((action) => action.type)).toEqual([
      "open_matter_workspace",
      "open_matter",
    ]);
  });

  it("uses the same core fields as the Matter module card", () => {
    const matter: MatterDetail = {
      id: "matter-1",
      seq_no: 1001,
      space_id: "space-1",
      title: "跟进重点客户方案",
      description: "需要在今天同步方案状态",
      creator_id: "u-creator",
      status: "open",
      deadline: "2026-06-22T10:00:00Z",
      source_channel_id: "group-1",
      source_channel_type: 2,
      source_name: "售前项目群",
      source_msgs: ["客户希望今天看到新版方案"],
      assignees: [
        {
          id: "assignee-1",
          matter_id: "matter-1",
          user_id: "u-owner",
          created_at: "2026-06-22T09:00:00Z",
        },
      ],
      created_at: "2026-06-22T09:00:00Z",
      updated_at: "2026-06-22T09:30:00Z",
      channels: [],
    };

    const card = buildMatterStatusCard(matter);

    expect(card.extra?.matterNo).toBe("M-1001");
    expect(card.extra?.matterId).toBe("matter-1");
    expect(card.subtitle).toBe("M-1001 · 来自 售前项目群");
    expect(card.metrics?.map((item) => item.label)).toEqual([
      "现在该谁处理",
      "截止",
      "进度",
    ]);
    expect(card.metrics?.map((item) => item.value)).toEqual([
      "u-owner",
      "2026/06/22 18:00",
      "1 / 4",
    ]);
    expect(card.extra?.statusText).toBe("已交给 u-owner");
    expect(card.extra?.trail).toHaveLength(4);
  });
});
