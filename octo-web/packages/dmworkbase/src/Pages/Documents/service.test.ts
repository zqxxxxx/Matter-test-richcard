import { describe, expect, it, vi } from "vitest";
import {
  ApiDocumentRepository,
  createDocumentSummary,
  documentRepository,
  resolveDefaultArchiveSpaceName,
} from "./service";
import type { DocumentState } from "./types";

function stateFixture(): DocumentState {
  return {
    files: [
      {
        id: "asset-space",
        name: "产品方案.pdf",
        kind: "pdf",
        extension: "pdf",
        size: 1024,
        storagePath: "common/documents/product.pdf",
        owner: "陈一",
        uploader: "陈一",
        sourceName: "产品方案讨论群",
        sourceChannelId: "grp_product_docs",
        sourceChannelType: 2,
        sourceType: "群聊",
        spaceName: "产品部公共空间",
        visibility: "space",
        status: "archived",
        createdAt: "2026-06-17 09:00",
        lastAccessAt: "2026-06-17 09:30",
        downloads: 2,
        previewable: true,
        flow: ["来自产品方案讨论群", "归档到产品部公共空间"],
      },
      {
        id: "asset-conversation",
        name: "交付问题清单.xlsx",
        kind: "sheet",
        extension: "xlsx",
        size: 2048,
        storagePath: "common/documents/delivery.xlsx",
        owner: "刘青",
        uploader: "刘青",
        sourceName: "华东项目交付群",
        sourceChannelId: "grp_delivery_docs",
        sourceChannelType: 2,
        sourceType: "群聊",
        spaceName: "会话文件",
        visibility: "conversation",
        status: "conversation",
        createdAt: "2026-06-17 10:00",
        lastAccessAt: "2026-06-17 10:00",
        downloads: 0,
        previewable: true,
        flow: ["来自华东项目交付群"],
      },
      {
        id: "asset-deleted",
        name: "制度更新说明.docx",
        kind: "doc",
        extension: "docx",
        size: 4096,
        storagePath: "common/documents/policy.docx",
        owner: "周岚",
        uploader: "周岚",
        sourceName: "行政制度发布群",
        sourceChannelId: "grp_policy_docs",
        sourceChannelType: 2,
        sourceType: "群聊",
        spaceName: "公司制度空间",
        visibility: "space",
        status: "deleted",
        createdAt: "2026-06-16 10:00",
        lastAccessAt: "2026-06-16 10:00",
        downloads: 1,
        previewable: true,
        flow: ["来自行政制度发布群", "移动到回收站"],
      },
    ],
    spaces: [
      {
        id: "space-product",
        name: "产品部公共空间",
        owner: "陈一",
        fileCount: 1,
        memberCount: 3,
        members: ["陈一", "刘青", "周岚"],
        boundConversations: ["产品方案讨论群"],
        pinnedFileIds: [],
        description: "产品资料沉淀空间",
      },
      {
        id: "space-delivery",
        name: "华东交付空间",
        owner: "刘青",
        fileCount: 0,
        memberCount: 2,
        members: ["陈一", "刘青"],
        boundConversations: ["华东项目交付群"],
        pinnedFileIds: [],
        description: "客户交付材料沉淀空间",
      },
    ],
    audits: [],
  };
}

describe("createDocumentSummary", () => {
  it("summarizes active, archived and conversation file counts", () => {
    expect(createDocumentSummary(stateFixture())).toEqual({
      activeFiles: 2,
      spaceFiles: 1,
      conversationFiles: 1,
    });
  });
});

describe("resolveDefaultArchiveSpaceName", () => {
  it("uses the space already holding an archived file", () => {
    const fixture = stateFixture();

    expect(
      resolveDefaultArchiveSpaceName(fixture, fixture.files[0])
    ).toBe("产品部公共空间");
  });

  it("uses the space bound to the source conversation for conversation files", () => {
    const fixture = stateFixture();

    expect(
      resolveDefaultArchiveSpaceName(fixture, fixture.files[1])
    ).toBe("华东交付空间");
  });
});

describe("ApiDocumentRepository", () => {
  it("loads document state from the backend document API", async () => {
    const fixture = stateFixture();
    const apiClient = {
      get: vi.fn().mockResolvedValue(fixture),
      post: vi.fn(),
    };
    const repo = new ApiDocumentRepository(apiClient);

    const state = await repo.load();

    expect(apiClient.get).toHaveBeenCalledWith("documents/state");
    expect(state).toEqual(fixture);
  });

  it("archives files by resolving the selected document space name", async () => {
    const fixture = stateFixture();
    const apiClient = {
      get: vi.fn().mockResolvedValue(fixture),
      post: vi.fn().mockResolvedValue(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.load();
    await repo.archiveFile("asset-conversation", "产品部公共空间", "陈一");

    expect(apiClient.post).toHaveBeenCalledWith("documents/archive", {
      asset_id: "asset-conversation",
      document_space_id: "space-product",
    });
  });

  it("uploads the original file object before registering the document asset", async () => {
    const fixture = stateFixture();
    const uploadFile = new File(["demo"], "客户会议纪要.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const apiClient = {
      get: vi.fn().mockResolvedValue(fixture),
      post: vi
        .fn()
        .mockResolvedValueOnce({ path: "https://files.example.com/common/documents/uploaded.docx" })
        .mockResolvedValueOnce(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.load();
    await repo.uploadFile(
      {
        name: "客户会议纪要.docx",
        extension: "docx",
        size: uploadFile.size,
        uploader: "陈一",
        file: uploadFile,
      },
      "产品部公共空间",
      "陈一"
    );

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/^file\/upload\?type=common&path=/),
      expect.any(FormData)
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(2, "documents/upload", {
      name: "客户会议纪要.docx",
      extension: "docx",
      size: uploadFile.size,
      uploader_name: "陈一",
      storage_path: expect.stringMatching(/^common\/documents\/\d+-客户会议纪要\.docx$/),
      document_space_id: "space-product",
    });
  });

  it("binds a source conversation to the selected document space through the backend", async () => {
    const fixture = stateFixture();
    const apiClient = {
      get: vi.fn().mockResolvedValue(fixture),
      post: vi.fn().mockResolvedValue(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.bindConversationToSpace("space-product", "产品方案讨论群", "陈一");

    expect(apiClient.post).toHaveBeenCalledWith(
      "documents/spaces/space-product/bind-conversation",
      {
        document_space_id: "space-product",
        source_channel_id: "产品方案讨论群",
        source_channel_type: 2,
        source_name: "产品方案讨论群",
      }
    );
  });

  it("checks source conversation access through the backend", async () => {
    const apiClient = {
      get: vi.fn().mockResolvedValue({ accessible: true }),
      post: vi.fn(),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await expect(repo.checkSource("asset-space")).resolves.toBe(true);

    expect(apiClient.get).toHaveBeenCalledWith("documents/source/check", {
      param: {
        asset_id: "asset-space",
      },
    });
  });

  it("does not fall back to mock data when the backend API fails", async () => {
    const apiClient = {
      get: vi.fn().mockRejectedValue(new Error("api down")),
      post: vi.fn(),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await expect(repo.load()).rejects.toThrow("api down");
  });
});

describe("runtime document repository", () => {
  it("uses the real document API repository", () => {
    expect(documentRepository).toBeInstanceOf(ApiDocumentRepository);
  });
});
