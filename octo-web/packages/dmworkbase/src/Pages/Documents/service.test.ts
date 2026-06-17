import { describe, expect, it, vi } from "vitest";
import {
  ApiDocumentRepository,
  FallbackDocumentRepository,
  MockDocumentRepository,
  createDocumentSummary,
} from "./service";

describe("DocumentRepository", () => {
  it("archives conversation files into a controlled document space", async () => {
    const repo = new MockDocumentRepository();

    const next = await repo.archiveFile(
      "DOC-240617-003",
      "产品部公共空间",
      "管理员 王珂"
    );
    const archived = next.files.find((file) => file.id === "DOC-240617-003");

    expect(archived?.status).toBe("archived");
    expect(archived?.visibility).toBe("space");
    expect(archived?.spaceName).toBe("产品部公共空间");
    expect(
      next.spaces.find((space) => space.name === "产品部公共空间")?.fileCount
    ).toBe(95);
    expect(next.audits[0]).toMatchObject({
      actor: "管理员 王珂",
      action: "归档",
      target: "客户账号权限确认截图.png",
    });
  });

  it("moves files through trash and restores them without losing source metadata", async () => {
    const repo = new MockDocumentRepository();

    const deleted = await repo.deleteFile("DOC-240617-001", "管理员 王珂");
    const fileInTrash = deleted.files.find(
      (file) => file.id === "DOC-240617-001"
    );

    expect(fileInTrash?.status).toBe("deleted");
    expect(fileInTrash?.sourceName).toBe("华东项目交付群");

    const restored = await repo.restoreFile("DOC-240617-001", "管理员 王珂");
    const activeFile = restored.files.find(
      (file) => file.id === "DOC-240617-001"
    );

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
      "陈一"
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
      "陈一"
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

    const next = await repo.bindConversationToSpace(
      "space-product",
      "需求评审群",
      "陈一"
    );
    const productSpace = next.spaces.find(
      (space) => space.id === "space-product"
    );

    expect(productSpace?.boundConversations).toContain("产品方案讨论群");
    expect(productSpace?.boundConversations).toContain("需求评审群");
    expect(next.audits[0]).toMatchObject({
      action: "绑定群聊",
      target: "产品部公共空间",
    });
  });

  it("records preview and download as closed-loop file interactions", async () => {
    const repo = new MockDocumentRepository();

    const previewed = await repo.previewFile("DOC-240617-002", "陈一");
    const previewedFile = previewed.files.find(
      (file) => file.id === "DOC-240617-002"
    );

    expect(previewedFile?.flow.at(-1)).toBe("陈一 预览文件");
    expect(previewed.audits[0]).toMatchObject({
      action: "预览",
      target: "Octo 文件空间需求清单.xlsx",
    });

    const downloaded = await repo.downloadFile("DOC-240617-002", "陈一");
    const downloadedFile = downloaded.files.find(
      (file) => file.id === "DOC-240617-002"
    );

    expect(downloadedFile?.downloads).toBe(19);
    expect(downloadedFile?.flow.at(-1)).toBe("陈一 下载文件");
    expect(downloaded.audits[0]).toMatchObject({
      action: "下载",
      target: "Octo 文件空间需求清单.xlsx",
    });
  });

  it("notifies subscribers when document state changes", async () => {
    const repo = new MockDocumentRepository();
    const snapshots: number[] = [];

    const unsubscribe = repo.subscribe((next) => {
      snapshots.push(next.files.length);
    });

    await repo.uploadFile(
      {
        id: "UPLOAD-STATE-001",
        name: "状态同步验证.docx",
        extension: "docx",
        size: 4096,
        uploader: "陈一",
      },
      "产品部公共空间",
      "陈一"
    );

    unsubscribe();

    expect(snapshots).toEqual([6]);
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

describe("ApiDocumentRepository", () => {
  it("loads document state from the backend document API", async () => {
    const apiClient = {
      get: vi.fn().mockResolvedValue({
        files: [],
        spaces: [],
        audits: [],
      }),
      post: vi.fn(),
    };
    const repo = new ApiDocumentRepository(apiClient);

    const state = await repo.load();

    expect(apiClient.get).toHaveBeenCalledWith("documents/state");
    expect(state).toEqual({ files: [], spaces: [], audits: [] });
  });

  it("archives files by resolving the selected document space name", async () => {
    const apiClient = {
      get: vi.fn().mockResolvedValue({
        files: [],
        spaces: [{ id: "space-product", name: "产品部公共空间" }],
        audits: [],
      }),
      post: vi.fn().mockResolvedValue({
        files: [],
        spaces: [{ id: "space-product", name: "产品部公共空间" }],
        audits: [],
      }),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.load();
    await repo.archiveFile("asset-1", "产品部公共空间", "陈一");

    expect(apiClient.post).toHaveBeenCalledWith("documents/archive", {
      asset_id: "asset-1",
      document_space_id: "space-product",
    });
  });
});

describe("FallbackDocumentRepository", () => {
  it("keeps the local prototype usable when document APIs are unavailable", async () => {
    const apiRepo = {
      load: vi.fn().mockRejectedValue(new Error("api down")),
      subscribe: vi.fn(() => () => {}),
    };
    const fallbackRepo = new MockDocumentRepository();
    const repo = new FallbackDocumentRepository(
      apiRepo as unknown as MockDocumentRepository,
      fallbackRepo
    );

    const state = await repo.load();

    expect(state.files.length).toBeGreaterThan(0);
    expect(apiRepo.load).toHaveBeenCalled();
  });
});
