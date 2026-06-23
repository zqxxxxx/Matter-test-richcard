import { beforeEach, describe, expect, it, vi } from "vitest";
import { WKApp } from "@octo/base";
import {
  buildMatterWorkspaceSrc,
  consumePendingMatterWorkspaceMatterId,
  consumePendingMatterWorkspaceSource,
  MATTER_WORKSPACE_OPEN_EVENT,
  openMatterWorkspace,
} from "../matterWorkspaceNavigation";

vi.mock("@octo/base", () => ({
  WKApp: {
    switchToMenuById: vi.fn(),
    mittBus: {
      emit: vi.fn(),
    },
  },
}));

describe("matter workspace navigation", () => {
  beforeEach(() => {
    consumePendingMatterWorkspaceMatterId();
    consumePendingMatterWorkspaceSource();
    WKApp.switchToMenuById = vi.fn();
    WKApp.mittBus.emit = vi.fn();
  });

  it("builds the embedded detail hash route for a matter", () => {
    expect(buildMatterWorkspaceSrc("matter-1")).toBe("/matter/ui/?embed=1#/matter/matter-1");
  });

  it("switches to the Matter module and emits a workspace open event", () => {
    const source = { channelId: "group-1", channelType: 2, label: "验收群", messageSeq: 12 };
    openMatterWorkspace("matter-1", source);

    expect(WKApp.switchToMenuById).toHaveBeenCalledWith("matter");
    expect(WKApp.mittBus.emit).toHaveBeenCalledWith("wk:nav-menu-activated", { menuId: "matter" });
    expect(WKApp.mittBus.emit).toHaveBeenCalledWith(MATTER_WORKSPACE_OPEN_EVENT, { matterId: "matter-1", source });
    expect(consumePendingMatterWorkspaceMatterId()).toBe("matter-1");
    expect(consumePendingMatterWorkspaceSource()).toEqual(source);
  });
});
