import { WKApp, type SourceConversationRef } from "@octo/base";

export const SUMMARY_WORKSPACE_OPEN_EVENT = "wk:open-summary-workspace";

export interface SummaryWorkspaceOpenPayload {
    taskId: number;
    source?: SourceConversationRef;
}

let pendingOpenPayload: SummaryWorkspaceOpenPayload | null = null;
let lastWorkspaceSource: SourceConversationRef | undefined;

export function consumePendingSummaryWorkspaceOpen(): SummaryWorkspaceOpenPayload | null {
    const payload = pendingOpenPayload;
    pendingOpenPayload = null;
    return payload;
}

export function getLastSummaryWorkspaceSource(): SourceConversationRef | undefined {
    return lastWorkspaceSource;
}

export function openSummaryWorkspace(taskId: number, source?: SourceConversationRef) {
    const payload: SummaryWorkspaceOpenPayload = { taskId, source };
    pendingOpenPayload = payload;
    if (source) lastWorkspaceSource = source;
    WKApp.openSummaryDetail?.(taskId, source);
    WKApp.mittBus.emit(SUMMARY_WORKSPACE_OPEN_EVENT, payload);
}
