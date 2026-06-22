import { beforeEach, describe, expect, it, vi } from "vitest";
import { WKApp } from "@octo/base";
import { openSummaryWorkspace } from "../summaryWorkspaceNavigation";

describe("summary workspace navigation", () => {
    beforeEach(() => {
        WKApp.openSummaryDetail = vi.fn();
    });

    it("opens the summary detail in the Summary module", () => {
        openSummaryWorkspace(42);

        expect(WKApp.openSummaryDetail).toHaveBeenCalledWith(42);
    });
});
