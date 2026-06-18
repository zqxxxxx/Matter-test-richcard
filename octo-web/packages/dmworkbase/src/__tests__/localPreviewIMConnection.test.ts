import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

describe("local preview IM startup", () => {
  it("still calls connectIM before local mock-only device shortcuts", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(dir, "../App.tsx"), "utf8");
    const start = source.indexOf("  startMain() {");
    const end = source.indexOf("\n  connectIM()", start);
    const startMain = source.slice(start, end);

    expect(startMain).toContain("this.connectIM();");
    expect(startMain).toMatch(
      /this\.connectIM\(\);\s+WKApp\.dataSource\.contactsSync\(\);/
    );
    expect(startMain).toMatch(
      /if \(isLocalMockLogin\) \{\s+return;\s+\}/
    );
    expect(startMain).not.toContain("import.meta.env.DEV");
  });
});
