import { describe, expect, it } from "vitest";
import { MockDocumentRepository, createDocumentSummary } from "./service";

describe("DocumentRepository", () => {
  it("archives conversation files into a controlled document space", async () => {
    const repo = new MockDocumentRepository();

    const next = await repo.archiveFile("DOC-240617-003", "产品部公共空间", "管理员 王珂");
    const archived = next.files.find((file) => file.id === "DOC-240617-003");

    expect(archived?.status).toBe("archived");
    expect(archived?.visibility).toBe("space");
    expect(archived?.spaceName).toBe("产品部公共空间");
    expect(next.spaces.find((space) => space.name === "产品部公共空间")?.fileCount).toBe(95);
    expect(next.audits[0]).toMatchObject({
      actor: "管理员 王珂",
      action: "归档",
      target: "客户账号权限确认截图.png",
    });
  });

  it("moves files through trash and restores them without losing source metadata", async () => {
    const repo = new MockDocumentRepository();

    const deleted = await repo.deleteFile("DOC-240617-001", "管理员 王珂");
    const fileInTrash = deleted.files.find((file) => file.id === "DOC-240617-001");

    expect(fileInTrash?.status).toBe("deleted");
    expect(fileInTrash?.sourceName).toBe("华东项目交付群");

    const restored = await repo.restoreFile("DOC-240617-001", "管理员 王珂");
    const activeFile = restored.files.find((file) => file.id === "DOC-240617-001");

    expect(activeFile?.status).toBe("archived");
    expect(activeFile?.visibility).toBe("space");
    expect(restored.audits[0]).toMatchObject({
      action: "恢复",
      target: "Q3 客户现场实施计划.pdf",
    });
  });

  it("archives a file message from chat into the selected document space", async () => {
    const repo = new MockDocumentRepository();

    const next = await repo.archiveMessageFile(
      {
        id: "MSG-10001",
        name: "项目验收问题清单.xlsx",
        extension: "xlsx",
        size: 16384,
        sourceName: "华东项目交付群",
        sourceChannelId: "group-001",
        sourceChannelType: 2,
        sourceType: "群聊",
        uploader: "陈一",
        createdAt: "2026-06-17 10:30",
      },
      "项目交付空间",
      "陈一",
    );
    const archived = next.files.find((file) => file.id === "MSG-10001");

    expect(archived).toMatchObject({
      status: "archived",
      visibility: "space",
      spaceName: "项目交付空间",
      sourceName: "华东项目交付群",
      kind: "sheet",
    });
    expect(archived?.flow).toContain("归档到项目交付空间");
  });

  it("uploads local documents directly into a selected document space", async () => {
    const repo = new MockDocumentRepository();

    const next = await repo.uploadFile(
      {
        id: "UPLOAD-10001",
        name: "客户现场会议纪要.docx",
        extension: "docx",
        size: 8192,
        uploader: "陈一",
        createdAt: "2026-06-17 11:05",
      },
      "产品部公共空间",
      "陈一",
    );
    const uploaded = next.files.find((file) => file.id === "UPLOAD-10001");

    expect(uploaded).toMatchObject({
      status: "archived",
      visibility: "space",
      spaceName: "产品部公共空间",
      sourceName: "直接上传",
      sourceType: "应用",
      kind: "doc",
    });
    expect(uploaded?.flow).toEqual(["直接上传", "保存到产品部公共空间"]);
    expect(next.audits[0]).toMatchObject({
      action: "上传",
      target: "客户现场会议纪要.docx",
    });
  });

  it("binds a conversation to a document space for default collaboration", async () => {
    const repo = new MockDocumentRepository();

    const next = await repo.bindConversationToSpace("space-product", "需求评审群", "陈一");
    const productSpace = next.spaces.find((space) => space.id === "space-product");

    expect(productSpace?.boundConversations).toContain("产品方案讨论群");
    expect(productSpace?.boundConversations).toContain("需求评审群");
    expect(next.audits[0]).toMatchObject({
      action: "绑定群聊",
      target: "产品部公共空间",
    });
  });
});

describe("createDocumentSummary", () => {
  it("summarizes active, archived and conversation file counts", async () => {
    const repo = new MockDocumentRepository();
    const state = await repo.load();

    expect(createDocumentSummary(state)).toEqual({
      activeFiles: 4,
      spaceFiles: 2,
      conversationFiles: 2,
    });
  });
});
