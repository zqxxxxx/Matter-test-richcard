import { WKApp, type SourceConversationRef } from "@octo/base";

export function openSummaryWorkspace(taskId: number, source?: SourceConversationRef) {
    WKApp.openSummaryDetail?.(taskId, source);
}
