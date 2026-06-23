import { describe, expect, it } from "vitest";
import { extractDocumentErrorMessage } from "./errors";

describe("extractDocumentErrorMessage", () => {
  it("uses backend msg fields returned from failed uploads", () => {
    expect(
      extractDocumentErrorMessage({
        response: { data: { msg: "文件内容与扩展名不匹配" } },
      })
    ).toBe("文件内容与扩展名不匹配");
  });

  it("falls back to a friendly message for unknown errors", () => {
    expect(extractDocumentErrorMessage({})).toBe("操作失败，请稍后重试");
  });
});
