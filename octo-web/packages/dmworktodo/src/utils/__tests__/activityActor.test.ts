import { describe, expect, it } from "vitest";
import { getSystemActorLabel, isSystemActor } from "../activityActor";

describe("activityActor", () => {
  it("identifies system activities without resolving them as IM users", () => {
    expect(isSystemActor("system")).toBe(true);
    expect(isSystemActor(" SYSTEM ")).toBe(true);
    expect(isSystemActor("pm_chen")).toBe(false);
    expect(getSystemActorLabel()).toBe("系统");
  });
});
