import { describe, expect, it } from "vitest";
import { getMatterStatusDropdownOptions } from "../matterStatus";

describe("getMatterStatusDropdownOptions", () => {
  it("offers blocked as a reason-required status", () => {
    const values = getMatterStatusDropdownOptions("review", true).map(
      (option) => [option.value, option.requiresReason],
    );

    expect(values).toContainEqual(["review", false]);
    expect(values).toContainEqual(["in_progress", false]);
    expect(values).toContainEqual(["done", false]);
    expect(values).toContainEqual(["blocked", true]);
  });

  it("keeps the current blocked status visible without requiring a new reason", () => {
    expect(
      getMatterStatusDropdownOptions("blocked", true).find(
        (option) => option.value === "blocked",
      )?.requiresReason,
    ).toBe(false);
  });

  it("hides creator-only terminal actions for non-creators", () => {
    const values = getMatterStatusDropdownOptions("review", false).map(
      (option) => option.value,
    );

    expect(values).not.toContain("archived");
    expect(values).not.toContain("cancelled");
  });
});
