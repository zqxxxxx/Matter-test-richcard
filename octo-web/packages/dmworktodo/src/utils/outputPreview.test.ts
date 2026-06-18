import { describe, expect, it } from "vitest";
import { canPreviewMatterOutput } from "./outputPreview";

describe("canPreviewMatterOutput", () => {
  it("only enables preview for files supported by the shared preview panel", () => {
    const canPreviewInPanel = (extension: string, name?: string) =>
      extension === "pdf" || name === "meeting-notes.txt";

    expect(
      canPreviewMatterOutput(
        { file_name: "delivery-plan.pdf", file_url: "/files/delivery-plan.pdf" },
        canPreviewInPanel,
      ),
    ).toBe(true);

    expect(
      canPreviewMatterOutput(
        { file_name: "policy-update.docx", file_url: "/files/policy-update.docx" },
        canPreviewInPanel,
      ),
    ).toBe(false);
  });

  it("does not preview output rows without a file url", () => {
    expect(
      canPreviewMatterOutput(
        { file_name: "delivery-plan.pdf", file_url: "" },
        () => true,
      ),
    ).toBe(false);
  });
});
