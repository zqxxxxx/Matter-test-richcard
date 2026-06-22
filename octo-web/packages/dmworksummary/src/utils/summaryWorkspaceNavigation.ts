import { WKApp } from "@octo/base";

export function openSummaryWorkspace(taskId: number) {
    WKApp.openSummaryDetail?.(taskId);
}
