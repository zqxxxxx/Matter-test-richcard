import { describe, expect, it } from "vitest";
import { buildMatterStatusCard } from "../businessCard";
import type { MatterDetail } from "../../bridge/types";

describe("buildMatterStatusCard", () => {
  it("includes detail and workspace jump actions", () => {
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
      "open_matter",
      "open_matter_workspace",
      "complete_matter",
    ]);
  });
});
