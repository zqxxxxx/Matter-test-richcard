import { WKApp } from "@octo/base";
import type { SourceConversationRef } from "@octo/base";

export const MATTER_WORKSPACE_OPEN_EVENT = "wk:open-matter-workspace";

export interface MatterWorkspaceOpenPayload {
  matterId: string;
  source?: SourceConversationRef;
}

let pendingMatterId: string | null = null;
let pendingSource: SourceConversationRef | undefined;

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

export function consumePendingMatterWorkspaceSource() {
  const source = pendingSource;
  pendingSource = undefined;
  return source;
}

export function openMatterWorkspace(matterId: string, source?: SourceConversationRef) {
  pendingMatterId = matterId;
  pendingSource = source;
  WKApp.switchToMenuById?.("matter");
  WKApp.mittBus.emit("wk:nav-menu-activated", { menuId: "matter" });
  WKApp.mittBus.emit(MATTER_WORKSPACE_OPEN_EVENT, { matterId, source } satisfies MatterWorkspaceOpenPayload);
}
