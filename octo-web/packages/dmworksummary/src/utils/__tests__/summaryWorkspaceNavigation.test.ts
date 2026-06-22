import { beforeEach, describe, expect, it, vi } from "vitest";
import { WKApp } from "@octo/base";
import { openSummaryWorkspace } from "../summaryWorkspaceNavigation";

describe("summary workspace navigation", () => {
    beforeEach(() => {
        WKApp.openSummaryDetail = vi.fn();
    });

    it("opens the summary detail in the Summary module", () => {
        const source = { channelId: "group-1", channelType: 2, label: "验收群", messageSeq: 12 };
        openSummaryWorkspace(42, source);

        expect(WKApp.openSummaryDetail).toHaveBeenCalledWith(42, source);
    });
});
