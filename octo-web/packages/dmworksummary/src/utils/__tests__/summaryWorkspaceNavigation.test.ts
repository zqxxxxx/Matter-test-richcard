import { beforeEach, describe, expect, it, vi } from "vitest";
import { WKApp } from "@octo/base";
import {
    consumePendingSummaryWorkspaceOpen,
    openSummaryWorkspace,
    SUMMARY_WORKSPACE_OPEN_EVENT,
} from "../summaryWorkspaceNavigation";

const mockEmit = vi.fn();

describe("summary workspace navigation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        WKApp.openSummaryDetail = vi.fn();
        WKApp.mittBus.emit = mockEmit;
        consumePendingSummaryWorkspaceOpen();
    });

    it("opens the summary detail in the Summary module", () => {
        const source = { channelId: "group-1", channelType: 2, label: "验收群", messageSeq: 12 };
        openSummaryWorkspace(42, source);

        expect(WKApp.openSummaryDetail).toHaveBeenCalledWith(42, source);
        expect(mockEmit).toHaveBeenCalledWith(SUMMARY_WORKSPACE_OPEN_EVENT, {
            taskId: 42,
            source,
        });
        expect(consumePendingSummaryWorkspaceOpen()).toEqual({
            taskId: 42,
            source,
        });
    });
});
