import { describe, expect, it } from "vitest";
import { canPreviewDocumentAsset } from "./preview";

const supported = (extension: string, name?: string) =>
  ["pdf", "xlsx", "txt", "png"].includes(
    (name?.split(".").pop() || extension).replace(/^\./, "").toLowerCase()
  );

describe("canPreviewDocumentAsset", () => {
  it("requires backend permission, local renderer support and a storage object", () => {
    expect(
      canPreviewDocumentAsset(
        {
          name: "需求清单.xlsx",
          extension: ".xlsx",
          previewable: true,
          storagePath: "common/documents/demo.xlsx",
        },
        supported
      )
    ).toBe(true);

    expect(
      canPreviewDocumentAsset(
        {
          name: "制度说明.docx",
          extension: ".docx",
          previewable: true,
          storagePath: "common/documents/demo.docx",
        },
        supported
      )
    ).toBe(false);

    expect(
      canPreviewDocumentAsset(
        {
          name: "离职资料包.zip",
          extension: ".zip",
          previewable: false,
          storagePath: "common/documents/demo.zip",
        },
        supported
      )
    ).toBe(false);

    expect(
      canPreviewDocumentAsset(
        {
          name: "丢失对象.pdf",
          extension: ".pdf",
          previewable: true,
          storagePath: "",
        },
        supported
      )
    ).toBe(false);
  });
});
