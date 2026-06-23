import { describe, expect, it } from "vitest";
import { buildDocumentSearchNavigation } from "./documentNavigation";

describe("buildDocumentSearchNavigation", () => {
  it("opens the document workspace with the searched file selected", () => {
    expect(
      buildDocumentSearchNavigation({
        id: "doc-1",
        status: "conversation",
      })
    ).toEqual({
      view: "recent",
      fileId: "doc-1",
    });
  });

  it("returns null when the result has no document id", () => {
    expect(buildDocumentSearchNavigation({ name: "客户计划.pdf" })).toBeNull();
  });
});
