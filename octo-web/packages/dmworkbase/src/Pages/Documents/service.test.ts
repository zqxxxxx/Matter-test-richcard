import { describe, expect, it, vi } from "vitest";
import {
  ApiDocumentRepository,
  createDocumentSummary,
  documentRepository,
  resolveBoundStorageSpaceName,
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
        sourceRef: {
          channelId: "grp_product_docs",
          channelType: 2,
          channelName: "产品方案讨论群",
          messageId: "2406171002",
          messageSeq: 91002,
          senderUid: "pm_chen",
          senderName: "陈一",
          sentAt: "2026-06-17 09:00",
        },
        permissions: {
          canPreview: true,
          canDownload: true,
          canArchive: false,
          canDelete: true,
          canRestore: false,
          canManage: true,
          summary: "上传者/拥有者",
          reasons: ["上传者/拥有者"],
        },
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
        permissions: {
          canPreview: true,
          canDownload: true,
          canArchive: true,
          canDelete: false,
          canRestore: false,
          canManage: false,
          summary: "来源会话成员可访问",
          reasons: ["来源会话成员可访问"],
        },
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
        permissions: {
          canPreview: false,
          canDownload: false,
          canArchive: false,
          canDelete: false,
          canRestore: true,
          canManage: true,
          summary: "空间管理员",
          reasons: ["空间管理员"],
        },
      },
    ],
    spaces: [
      {
        id: "space-product",
        name: "产品部公共空间",
        owner: "陈一",
        fileCount: 1,
        memberCount: 3,
        members: [
          {
            uid: "pm_chen",
            name: "陈一",
            role: "owner",
            source: "创建人",
            joinedAt: "2026-06-17 09:00",
          },
          {
            uid: "u2",
            name: "刘青",
            role: "editor",
            source: "手动添加",
            joinedAt: "2026-06-17 09:00",
          },
        ],
        boundConversations: [
          {
            id: "bind-product",
            channelId: "grp_product_docs",
            channelType: 2,
            name: "产品方案讨论群",
            createdBy: "pm_chen",
          },
        ],
        pinnedFileIds: [],
        description: "产品资料沉淀空间",
      },
      {
        id: "space-delivery",
        name: "华东交付空间",
        owner: "刘青",
        fileCount: 0,
        memberCount: 2,
        members: [
          {
            uid: "u2",
            name: "刘青",
            role: "owner",
            source: "创建人",
            joinedAt: "2026-06-17 09:00",
          },
        ],
        boundConversations: [
          {
            id: "bind-delivery",
            channelId: "grp_delivery_docs",
            channelType: 2,
            name: "华东项目交付群",
            createdBy: "u2",
          },
        ],
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

describe("resolveBoundStorageSpaceName", () => {
  it("returns the exact bound storage space for a group channel", () => {
    const fixture = stateFixture();

    expect(
      resolveBoundStorageSpaceName(fixture, "grp_product_docs", 2)
    ).toBe("产品部公共空间");
  });

  it("keeps unbound group files out of space auto-archive", () => {
    const fixture = stateFixture();

    expect(resolveBoundStorageSpaceName(fixture, "grp_unknown", 2)).toBe("");
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

  it("normalizes nullable backend arrays before exposing document state", async () => {
    const fixture = stateFixture();
    const apiState = {
      ...fixture,
      audits: null,
      spaces: [
        {
          ...fixture.spaces[0],
          members: null,
          boundConversations: null,
          pinnedFileIds: null,
        },
      ],
    } as any;
    const apiClient = {
      get: vi.fn().mockResolvedValue(apiState),
      post: vi.fn(),
    };
    const repo = new ApiDocumentRepository(apiClient);

    const state = await repo.load();

    expect(state.audits).toEqual([]);
    expect(state.spaces[0].members).toEqual([]);
    expect(state.spaces[0].boundConversations).toEqual([]);
    expect(state.spaces[0].pinnedFileIds).toEqual([]);
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
    await repo.unbindConversationFromSpace("space-product", "bind-product");

    expect(apiClient.post).toHaveBeenCalledWith(
      "documents/spaces/space-product/bind-conversation",
      {
        document_space_id: "space-product",
        source_channel_id: "产品方案讨论群",
        source_channel_type: 2,
        source_name: "产品方案讨论群",
      }
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "documents/spaces/space-product/bindings/bind-product/remove"
    );
  });

  it("binds a real group channel and queries binding candidates", async () => {
    const fixture = stateFixture();
    const apiClient = {
      get: vi.fn().mockResolvedValue([
        {
          channelId: "grp_product_docs",
          channelType: 2,
          name: "产品方案讨论群",
          alreadyBoundToCurrentSpace: true,
        },
      ]),
      post: vi.fn().mockResolvedValue(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.bindConversationToSpace("space-product", {
      channelId: "grp_product_docs",
      channelType: 2,
      name: "产品方案讨论群",
    });
    const candidates = await repo.searchBindingConversations(
      "space-product",
      "产品"
    );

    expect(apiClient.post).toHaveBeenCalledWith(
      "documents/spaces/space-product/bind-conversation",
      {
        document_space_id: "space-product",
        source_channel_id: "grp_product_docs",
        source_channel_type: 2,
        source_name: "产品方案讨论群",
      }
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      "documents/spaces/space-product/bindings/search",
      { param: { keyword: "产品" } }
    );
    expect(candidates[0].channelId).toBe("grp_product_docs");
  });

  it("auto-archives only when a group has a bound storage space", async () => {
    const fixture = stateFixture();
    const apiClient = {
      get: vi.fn().mockResolvedValue(fixture),
      post: vi.fn().mockResolvedValue(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.load();
    await repo.autoArchiveMessageFile({
      id: "msg-product-1",
      name: "新需求.docx",
      extension: ".docx",
      size: 1024,
      sourceName: "产品方案讨论群",
      sourceChannelId: "grp_product_docs",
      sourceChannelType: 2,
      sourceType: "群聊",
      uploader: "陈一",
      storagePath: "common/documents/new.docx",
    });
    const unbound = await repo.autoArchiveMessageFile({
      id: "msg-unknown-1",
      name: "未绑定群文件.docx",
      extension: ".docx",
      size: 1024,
      sourceName: "未绑定群",
      sourceChannelId: "grp_unknown",
      sourceChannelType: 2,
      sourceType: "群聊",
      uploader: "陈一",
    });

    expect(apiClient.post).toHaveBeenCalledWith("documents/archive", {
      asset_id: "msg-product-1",
      document_space_id: "space-product",
      name: "新需求.docx",
      extension: ".docx",
      size: 1024,
      storage_path: "common/documents/new.docx",
      source_name: "产品方案讨论群",
      source_channel_id: "grp_product_docs",
      source_channel_type: 2,
      source_message_id: "msg-product-1",
      source_type: "群聊",
      uploader_name: "陈一",
    });
    expect(unbound).toBeNull();
  });

  it("does not auto-archive bound group files before upload has a storage path", async () => {
    const fixture = stateFixture();
    const apiClient = {
      get: vi.fn().mockResolvedValue(fixture),
      post: vi.fn().mockResolvedValue(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.load();
    const result = await repo.autoArchiveMessageFile({
      id: "msg-product-uploading",
      name: "上传中.md",
      extension: ".md",
      size: 1024,
      sourceName: "产品方案讨论群",
      sourceChannelId: "grp_product_docs",
      sourceChannelType: 2,
      sourceType: "群聊",
      uploader: "陈一",
      storagePath: "",
    });

    expect(result).toBeNull();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("queries the group document storage space for channel settings", async () => {
    const apiClient = {
      get: vi.fn().mockResolvedValue({
        spaceId: "space-product",
        spaceName: "产品部公共空间",
      }),
      post: vi.fn(),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await expect(
      repo.getChannelStorageSpace("grp_product_docs", 2)
    ).resolves.toEqual({
      spaceId: "space-product",
      spaceName: "产品部公共空间",
    });
    expect(apiClient.get).toHaveBeenCalledWith(
      "documents/channel-storage-space",
      {
        param: {
          source_channel_id: "grp_product_docs",
          source_channel_type: 2,
        },
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

  it("renames and moves files through document APIs", async () => {
    const fixture = stateFixture();
    const movedFixture: DocumentState = {
      ...fixture,
      files: fixture.files.map((file) =>
        file.id === "asset-space"
          ? { ...file, spaceName: "华东交付空间" }
          : file
      ),
    };
    const apiClient = {
      get: vi
        .fn()
        .mockResolvedValueOnce(fixture)
        .mockResolvedValueOnce(movedFixture),
      post: vi.fn().mockResolvedValue(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.load();
    await repo.renameFile("asset-space", "新名称.pdf");
    const moved = await repo.moveFile("asset-space", "华东交付空间");

    expect(apiClient.post).toHaveBeenCalledWith("documents/asset-space/rename", {
      name: "新名称.pdf",
    });
    expect(apiClient.post).toHaveBeenCalledWith("documents/asset-space/move", {
      document_space_id: "space-delivery",
    });
    expect(apiClient.get).toHaveBeenLastCalledWith("documents/state");
    expect(moved.files.find((file) => file.id === "asset-space")?.spaceName).toBe(
      "华东交付空间"
    );
  });

  it("restores and permanently clears trash through document APIs", async () => {
    const fixture = stateFixture();
    const apiClient = {
      get: vi.fn().mockResolvedValue(fixture),
      post: vi.fn().mockResolvedValue(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.restoreFile("asset-deleted", "陈一");
    await repo.permanentDeleteFile("asset-deleted", "陈一");
    await repo.emptyTrash("陈一");

    expect(apiClient.post).toHaveBeenCalledWith("documents/asset-deleted/restore");
    expect(apiClient.post).toHaveBeenCalledWith(
      "documents/asset-deleted/permanent-delete"
    );
    expect(apiClient.post).toHaveBeenCalledWith("documents/trash/empty");
  });

  it("manages spaces and members through document APIs", async () => {
    const fixture = stateFixture();
    const apiClient = {
      get: vi.fn().mockResolvedValue(fixture),
      post: vi.fn().mockResolvedValue(fixture),
    };
    const repo = new ApiDocumentRepository(apiClient);

    await repo.createSpace("新空间", "说明");
    await repo.updateSpace("space-product", "产品资料库", "新说明");
    await repo.saveSpaceMember("space-product", {
      uid: "u3",
      name: "王珂",
      role: "viewer",
    });
    await repo.searchSpaceMembers("space-product", "王");
    await repo.removeSpaceMember("space-product", "u3");
    await repo.disableSpace("space-product");

    expect(apiClient.post).toHaveBeenCalledWith("documents/spaces", {
      name: "新空间",
      description: "说明",
    });
    expect(apiClient.post).toHaveBeenCalledWith("documents/spaces/space-product", {
      name: "产品资料库",
      description: "新说明",
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      "documents/spaces/space-product/members",
      { uid: "u3", name: "王珂", role: "viewer" }
    );
    expect(apiClient.get).toHaveBeenCalledWith(
      "documents/spaces/space-product/members/search",
      { param: { keyword: "王" } }
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "documents/spaces/space-product/members/u3/remove"
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "documents/spaces/space-product/disable"
    );
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
