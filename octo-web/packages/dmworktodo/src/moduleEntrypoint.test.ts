import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Matter module entrypoint", () => {
  it("routes the NavRail matter entry to the embedded MatterWorkspace", () => {
    const source = readFileSync("src/module.tsx", "utf8");

    expect(source).toContain('from "./pages/MatterWorkspace"');
    expect(source).not.toContain('from "./pages/TodoPage"');
  });

  it("exports MatterPage as the embedded MatterWorkspace entry", () => {
    const source = readFileSync("src/index.tsx", "utf8");

    expect(source).toContain("export { default as MatterPage } from './pages/MatterWorkspace'");
    expect(source).not.toContain("export { default as MatterPage } from './pages/TodoPage'");
  });
});
