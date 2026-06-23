import { describe, expect, it } from "vitest";
import { buildDocumentSourceNavigation } from "./sourceNavigation";
import type { DocumentAsset } from "./types";

const baseFile: DocumentAsset = {
  id: "asset-1",
  name: "需求清单.xlsx",
  kind: "sheet",
  extension: "xlsx",
  size: 1024,
  storagePath: "common/documents/demo.xlsx",
  owner: "陈一",
  uploader: "陈一",
  sourceName: "产品方案讨论群",
  sourceChannelId: "grp_product_docs",
  sourceChannelType: 2,
  sourceType: "群聊",
  spaceName: "产品部公共空间",
  visibility: "space",
  status: "archived",
  createdAt: "2026-06-17 09:40:00",
  lastAccessAt: "2026-06-17 10:05:00",
  downloads: 2,
  previewable: true,
  flow: ["来自产品方案讨论群"],
  sourceRef: {
    channelId: "grp_product_docs",
    channelType: 2,
    channelName: "产品方案讨论群",
    messageId: "2406171002",
    messageSeq: 91002,
    senderUid: "pm_chen",
    senderName: "陈一",
    sentAt: "2026-06-17 09:40:00",
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
};

describe("buildDocumentSourceNavigation", () => {
  it("uses sourceRef messageSeq to locate the original message", () => {
    expect(buildDocumentSourceNavigation(baseFile)).toEqual({
      channelId: "grp_product_docs",
      channelType: 2,
      initLocateMessageSeq: 91002,
      toastName: "产品方案讨论群",
    });
  });

  it("falls back to channel fields when sourceRef is absent", () => {
    const file = { ...baseFile, sourceRef: undefined };

    expect(buildDocumentSourceNavigation(file)).toEqual({
      channelId: "grp_product_docs",
      channelType: 2,
      initLocateMessageSeq: undefined,
      toastName: "产品方案讨论群",
    });
  });

  it("supports direct chat source navigation", () => {
    const file = {
      ...baseFile,
      sourceName: "刘青",
      sourceChannelId: "u_liu_qing",
      sourceChannelType: 1,
      sourceType: "单聊" as const,
      sourceRef: undefined,
    };

    expect(buildDocumentSourceNavigation(file)).toEqual({
      channelId: "u_liu_qing",
      channelType: 1,
      initLocateMessageSeq: undefined,
      toastName: "刘青",
    });
  });
});
