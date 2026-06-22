import { WKApp } from "@octo/base";

export const MATTER_WORKSPACE_OPEN_EVENT = "wk:open-matter-workspace";

export interface MatterWorkspaceOpenPayload {
  matterId: string;
}

let pendingMatterId: string | null = null;

export function buildMatterWorkspaceSrc(matterId?: string | null) {
  if (matterId) {
    return `/matter/ui/?embed=1#/matter/${encodeURIComponent(matterId)}`;
  }
  return "/matter/ui/?embed=1#/inbox";
}

export function consumePendingMatterWorkspaceMatterId() {
  const matterId = pendingMatterId;
  pendingMatterId = null;
  return matterId;
}

export function openMatterWorkspace(matterId: string) {
  pendingMatterId = matterId;
  WKApp.switchToMenuById?.("matter");
  WKApp.mittBus.emit("wk:nav-menu-activated", { menuId: "matter" });
  WKApp.mittBus.emit(MATTER_WORKSPACE_OPEN_EVENT, { matterId } satisfies MatterWorkspaceOpenPayload);
}
