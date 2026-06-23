import { describe, expect, it, vi } from "vitest";
import { resolveFileDownloadUrl, resolveFilePreviewUrl } from "./previewUrl";

function deps() {
  return {
    getFileURL: vi.fn((path: string) => `/api/v1/${path}`),
    getPresignedPreviewUrl: vi.fn(async (path: string, filename: string) =>
      `http://127.0.0.1:8090/v1/file/local?disposition=inline&path=${encodeURIComponent(path)}&filename=${encodeURIComponent(filename)}&sig=preview`,
    ),
    getPresignedDownloadUrl: vi.fn(async (path: string, filename: string) =>
      `http://127.0.0.1:8090/v1/file/local?path=${encodeURIComponent(path)}&filename=${encodeURIComponent(filename)}&sig=download`,
    ),
    isSafeUrl: vi.fn((url: string) => url.startsWith("http://") || url.startsWith("https://")),
    origin: "http://127.0.0.1:3001",
  };
}

describe("resolveFilePreviewUrl", () => {
  it("uses inline presigned URLs for storage object paths", async () => {
    const d = deps();

    const url = await resolveFilePreviewUrl(
      {
        url: "common/documents/demo/octo-file-requirements.xlsx",
        name: "Octo 文件空间需求清单.xlsx",
      },
      d,
    );

    expect(d.getPresignedPreviewUrl).toHaveBeenCalledWith(
      "common/documents/demo/octo-file-requirements.xlsx",
      "Octo 文件空间需求清单.xlsx",
    );
    expect(d.getFileURL).not.toHaveBeenCalled();
    expect(url).toContain("disposition=inline");
    expect(url).toContain("sig=preview");
  });

  it("keeps public preview paths on the existing file URL path", async () => {
    const d = deps();

    const url = await resolveFilePreviewUrl(
      { url: "file/preview/demo/report.pdf", name: "report.pdf" },
      d,
    );

    expect(d.getFileURL).toHaveBeenCalledWith("file/preview/demo/report.pdf");
    expect(d.getPresignedPreviewUrl).not.toHaveBeenCalled();
    expect(url).toBe("http://127.0.0.1:3001/api/v1/file/preview/demo/report.pdf");
  });

  it("keeps already absolute HTTP URLs", async () => {
    const d = deps();

    const url = await resolveFilePreviewUrl(
      { url: "https://cdn.example.com/report.pdf", name: "report.pdf" },
      d,
    );

    expect(d.getPresignedPreviewUrl).not.toHaveBeenCalled();
    expect(url).toBe("https://cdn.example.com/report.pdf");
  });
});

describe("resolveFileDownloadUrl", () => {
  it("uses download presigned URLs for storage object paths", async () => {
    const d = deps();

    const url = await resolveFileDownloadUrl(
      {
        url: "common/documents/demo/q3-delivery-plan.pdf",
        name: "Q3 客户现场实施计划.pdf",
      },
      d,
    );

    expect(d.getPresignedDownloadUrl).toHaveBeenCalledWith(
      "common/documents/demo/q3-delivery-plan.pdf",
      "Q3 客户现场实施计划.pdf",
    );
    expect(url).toContain("sig=download");
  });
});
