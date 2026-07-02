import { describe, expect, it } from "vitest";
import {
    getSummaryOriginConversation,
    normalizeSummarySourceLabel,
    summaryOriginTypeToIMChannelType,
} from "../sourceConversation";

describe("summary source conversation mapping", () => {
    it("maps summary origin group type to IM group channel type", () => {
        expect(summaryOriginTypeToIMChannelType(1)).toBe(2);
    });

    it("maps summary origin thread type to IM thread channel type", () => {
        expect(summaryOriginTypeToIMChannelType(2)).toBe(5);
    });

    it("maps summary origin dm type to IM person channel type", () => {
        expect(summaryOriginTypeToIMChannelType(3)).toBe(1);
    });

    it("builds a returnable conversation ref from summary detail origin fields", () => {
        expect(
            getSummaryOriginConversation({
                origin_channel_id: "group-1",
                origin_channel_type: 1,
            }),
        ).toEqual({
            channelId: "group-1",
            channelType: 2,
        });
    });

    it("keeps existing label and message sequence when the source matches", () => {
        expect(
            getSummaryOriginConversation(
                {
                    origin_channel_id: "group-1",
                    origin_channel_type: 1,
                },
                {
                    channelId: "group-1",
                    channelType: 2,
                    label: "搜索测试群",
                    messageSeq: 21,
                },
            ),
        ).toEqual({
            channelId: "group-1",
            channelType: 2,
            label: "搜索测试群",
            messageSeq: 21,
        });
    });

    it("normalizes conversation type suffixes for return button labels", () => {
        expect(normalizeSummarySourceLabel("搜索测试群(群聊)")).toBe("搜索测试群");
        expect(normalizeSummarySourceLabel("搜索测试群（群聊）")).toBe("搜索测试群");
        expect(normalizeSummarySourceLabel("项目子区 (子区)")).toBe("项目子区");
        expect(normalizeSummarySourceLabel("普通群名")).toBe("普通群名");
    });

    it("normalizes existing label while preserving message sequence", () => {
        expect(
            getSummaryOriginConversation(
                {
                    origin_channel_id: "group-1",
                    origin_channel_type: 1,
                },
                {
                    channelId: "group-1",
                    channelType: 2,
                    label: "搜索测试群(群聊)",
                    messageSeq: 21,
                },
            ),
        ).toEqual({
            channelId: "group-1",
            channelType: 2,
            label: "搜索测试群",
            messageSeq: 21,
        });
    });
});
