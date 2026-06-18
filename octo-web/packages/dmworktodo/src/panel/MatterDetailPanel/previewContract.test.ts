import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(__dirname, "index.tsx"), "utf8");

describe("MatterDetailPanel preview contract", () => {
  it("keeps preview actions available on the standalone matter page", () => {
    expect(source).not.toContain(
      "showClose ? handlePreviewAttachment : undefined",
    );
    expect(source).not.toContain("showClose ? handleOutputPreview : undefined");

    expect(source).toMatch(/onPreviewAttachment=\{\s*handlePreviewAttachment\s*\}/);
    expect(source).toMatch(/onPreview=\{\s*handleOutputPreview\s*\}/);
  });
});
