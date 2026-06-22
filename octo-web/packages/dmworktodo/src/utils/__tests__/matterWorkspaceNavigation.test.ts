import { beforeEach, describe, expect, it, vi } from "vitest";
import { WKApp } from "@octo/base";
import {
  buildMatterWorkspaceSrc,
  consumePendingMatterWorkspaceMatterId,
  MATTER_WORKSPACE_OPEN_EVENT,
  openMatterWorkspace,
} from "../matterWorkspaceNavigation";

describe("matter workspace navigation", () => {
  beforeEach(() => {
    consumePendingMatterWorkspaceMatterId();
    WKApp.switchToMenuById = vi.fn();
    WKApp.mittBus.emit = vi.fn();
  });

  it("builds the embedded detail hash route for a matter", () => {
    expect(buildMatterWorkspaceSrc("matter-1")).toBe("/matter/ui/?embed=1#/matter/matter-1");
  });

  it("switches to the Matter module and emits a workspace open event", () => {
    openMatterWorkspace("matter-1");

    expect(WKApp.switchToMenuById).toHaveBeenCalledWith("matter");
    expect(WKApp.mittBus.emit).toHaveBeenCalledWith("wk:nav-menu-activated", { menuId: "matter" });
    expect(WKApp.mittBus.emit).toHaveBeenCalledWith(MATTER_WORKSPACE_OPEN_EVENT, { matterId: "matter-1" });
    expect(consumePendingMatterWorkspaceMatterId()).toBe("matter-1");
  });
});
