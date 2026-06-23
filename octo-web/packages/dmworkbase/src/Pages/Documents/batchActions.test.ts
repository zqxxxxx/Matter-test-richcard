import { describe, expect, it } from "vitest";
import {
  buildBatchActionModel,
  buildMoveSpaceOptions,
  chooseDefaultMoveSpaceName,
} from "./batchActions";
import type { DocumentAsset, DocumentSpace } from "./types";

function file(
  id: string,
  status: DocumentAsset["status"],
  permissions: Partial<DocumentAsset["permissions"]> = {}
): DocumentAsset {
  return {
    id,
    name: `${id}.docx`,
    kind: "doc",
    extension: "docx",
    size: 1024,
    storagePath: `common/documents/${id}.docx`,
    owner: "陈一",
    uploader: "陈一",
    sourceName: "产品方案讨论群",
    sourceChannelId: "grp_product_docs",
    sourceChannelType: 2,
    sourceType: "群聊",
    spaceName: status === "conversation" ? "会话文件" : "产品部公共空间",
    visibility: status === "conversation" ? "conversation" : "space",
    status,
    createdAt: "2026-06-17 09:00:00",
    lastAccessAt: "2026-06-17 09:00:00",
    downloads: 0,
    previewable: true,
    flow: [],
    permissions: {
      canPreview: true,
      canDownload: true,
      canArchive: false,
      canEdit: false,
      canDelete: false,
      canRestore: false,
      canManage: false,
      summary: "",
      reasons: [],
      ...permissions,
    },
  };
}

function space(
  name: string,
  owner: string,
  members: DocumentSpace["members"] = []
): DocumentSpace {
  return {
    id: name,
    name,
    owner,
    fileCount: 0,
    memberCount: members.length,
    members,
    boundConversations: [],
    pinnedFileIds: [],
    description: "",
  };
}

describe("buildMoveSpaceOptions", () => {
  it("lists every space while disabling the current and unauthorized targets", () => {
    const options = buildMoveSpaceOptions(
      [
        space("产品部公共空间", "pm_chen"),
        space("华东交付空间", "delivery_liu"),
        space("公司制度空间", "admin_zhou", [
          {
            uid: "pm_chen",
            name: "陈一",
            role: "viewer",
            source: "手动添加",
            joinedAt: "2026-06-17 09:00:00",
          },
        ]),
      ],
      "pm_chen",
      "产品部公共空间"
    );

    expect(options).toEqual([
      expect.objectContaining({
        name: "产品部公共空间",
        disabled: true,
        reason: "当前所在空间",
      }),
      expect.objectContaining({
        name: "华东交付空间",
        disabled: true,
        reason: "无编辑权限",
      }),
      expect.objectContaining({
        name: "公司制度空间",
        disabled: true,
        reason: "无编辑权限",
      }),
    ]);
  });

  it("defaults to the first editable non-current space", () => {
    const options = buildMoveSpaceOptions(
      [
        space("产品部公共空间", "pm_chen"),
        space("华东交付空间", "delivery_liu", [
          {
            uid: "pm_chen",
            name: "陈一",
            role: "editor",
            source: "手动添加",
            joinedAt: "2026-06-17 09:00:00",
          },
        ]),
      ],
      "pm_chen",
      "产品部公共空间"
    );

    expect(chooseDefaultMoveSpaceName(options)).toBe("华东交付空间");
  });
});

describe("buildBatchActionModel", () => {
  it("shows only save-to-space for conversation view selections", () => {
    const model = buildBatchActionModel(
      [file("conversation", "conversation", { canArchive: true })],
      "conversation"
    );

    expect(model.actions.map((action) => action.key)).toEqual(["save"]);
    expect(model.summary).toBe("已选 1 个：1 个会话文件");
  });

  it("shows move and trash for archived space selections", () => {
    const model = buildBatchActionModel(
      [file("archived", "archived", { canEdit: true, canDelete: true })],
      "space"
    );

    expect(model.actions.map((action) => action.key)).toEqual([
      "move",
      "delete",
    ]);
  });

  it("separates mixed recent selections into save, move and delete actions", () => {
    const model = buildBatchActionModel(
      [
        file("conversation", "conversation", { canArchive: true }),
        file("archived", "archived", { canEdit: true, canDelete: true }),
        file("readonly", "archived"),
      ],
      "recent"
    );

    expect(model.actions.map((action) => action.key)).toEqual([
      "save",
      "move",
      "delete",
    ]);
    expect(model.skippedCount).toBe(1);
    expect(model.summary).toBe(
      "已选 3 个：1 个会话文件，2 个空间文件，1 个无权限"
    );
  });
});
