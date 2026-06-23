import { describe, expect, it } from "vitest";
import {
  buildDocumentNavigationSearch,
  parseDocumentNavigationSearch,
} from "./navigationState";

describe("document navigation state", () => {
  it("parses a persisted space view from the URL search", () => {
    expect(
      parseDocumentNavigationSearch(
        "?sid=doc-acceptance&view=space&space=%E4%BA%A7%E5%93%81%E9%83%A8%E5%85%AC%E5%85%B1%E7%A9%BA%E9%97%B4&file=asset-1"
      )
    ).toEqual({
      view: "space",
      spaceName: "产品部公共空间",
      fileId: "asset-1",
    });
  });

  it("keeps unrelated session params when writing document navigation", () => {
    expect(
      buildDocumentNavigationSearch(
        { view: "conversation" },
        "?sid=doc-acceptance&view=space&space=old&file=asset-1"
      )
    ).toBe("?sid=doc-acceptance&view=conversation");
  });
});
