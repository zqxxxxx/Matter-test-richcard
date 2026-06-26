import { describe, expect, it } from "vitest"
import { MessageContentTypeConst } from "../../../Service/Const"
import { BusinessCardContent } from "../../../Messages/BusinessCard/BusinessCardContent"
import { aggregateBusinessCardMessages } from "../businessCardAggregation"

type TestMessageWrap = {
    clientMsgNo: string
    messageSeq: number
    timestamp: number
    contentType: number
    content: BusinessCardContent
}

function makeSummaryMessage(
    clientMsgNo: string,
    taskId: string,
    rootTaskId: string,
    version: number,
    title: string,
    body: string,
): TestMessageWrap {
    return {
        clientMsgNo,
        messageSeq: version,
        timestamp: 1_719_290_000 + version,
        contentType: MessageContentTypeConst.businessCard,
        content: new BusinessCardContent({
            id: `summary-${rootTaskId}-v${version}`,
            cardType: "summary_feedback",
            title,
            body,
            status: "pending_confirm",
            entityId: taskId,
            entityType: "summary",
            source: "智能总结",
            time: `12:0${version}`,
            metrics: [{ label: "消息数", value: "7" }],
            extra: {
                summaryRootTaskId: rootTaskId,
                revisionTaskId: taskId,
                version,
                versionLabel: `v${version}`,
                feedback: version > 1 ? `第 ${version} 次调整` : "",
            },
        }),
    }
}

describe("aggregateBusinessCardMessages", () => {
    it("folds summary revisions with the same root task into the latest card", () => {
        const v1 = makeSummaryMessage("summary-v1", "101", "100", 1, "合同总结", "生成初稿")
        const v2 = makeSummaryMessage("summary-v2", "102", "100", 2, "合同总结", "补充风险")
        const v3 = makeSummaryMessage("summary-v3", "103", "100", 3, "合同总结", "补充行动项")

        const result = aggregateBusinessCardMessages([v1, v2, v3])

        expect(result).toEqual([v3])
        const latest = result[0].content as BusinessCardContent
        expect(latest.entityId).toBe("103")
        expect(latest.extra).toMatchObject({
            summaryRootTaskId: "100",
            revisionTaskId: "103",
            version: 3,
            versionLabel: "v3",
            updateCount: 3,
            stackedMessageClientMsgNos: ["summary-v1", "summary-v2", "summary-v3"],
        })
        expect(latest.extra.statusHistory).toEqual([
            expect.objectContaining({
                id: "summary-v1",
                statusText: "v1",
                title: "生成初稿",
                revisionTaskId: "101",
            }),
            expect.objectContaining({
                id: "summary-v2",
                statusText: "v2",
                title: "补充风险",
                revisionTaskId: "102",
                feedback: "第 2 次调整",
            }),
            expect.objectContaining({
                id: "summary-v3",
                statusText: "v3",
                title: "补充行动项",
                revisionTaskId: "103",
                feedback: "第 3 次调整",
            }),
        ])
    })

    it("uses a confirmed summary revision as the visible card for the root", () => {
        const draft = makeSummaryMessage("summary-v1", "101", "100", 1, "合同总结", "生成初稿")
        const confirmed = makeSummaryMessage("summary-confirmed", "101", "100", 2, "合同总结", "确认版")
        const content = confirmed.content as BusinessCardContent
        content.applyPayload({
            status: "confirmed",
            extra: {
                ...content.extra,
                version: 2,
                versionLabel: "v2",
                confirmed: true,
                confirmedAt: "2026/6/25 12:20:00",
            },
        })

        const result = aggregateBusinessCardMessages([draft, confirmed])

        expect(result).toEqual([confirmed])
        const latest = result[0].content as BusinessCardContent
        expect(latest.status).toBe("confirmed")
        expect(latest.extra.updateCount).toBe(2)
        expect(latest.extra.statusHistory.at(-1)).toMatchObject({
            statusText: "v2",
            title: "确认版",
            confirmed: true,
        })
    })

    it("does not count a same-version confirmation as an extra summary revision", () => {
        const draft = makeSummaryMessage("summary-v1", "101", "100", 1, "合同总结", "生成初稿")
        const confirmed = makeSummaryMessage("summary-confirmed", "101", "100", 1, "合同总结", "确认版")
        const content = confirmed.content as BusinessCardContent
        content.applyPayload({
            status: "confirmed",
            extra: {
                ...content.extra,
                version: 1,
                versionLabel: "v1",
                confirmed: true,
                confirmedAt: "2026/6/25 12:20:00",
            },
        })

        const result = aggregateBusinessCardMessages([draft, confirmed])

        expect(result).toEqual([confirmed])
        const latest = result[0].content as BusinessCardContent
        expect(latest.status).toBe("confirmed")
        expect(latest.extra.updateCount).toBe(1)
        expect(latest.extra.statusHistory).toHaveLength(1)
        expect(latest.extra.statusHistory[0]).toMatchObject({
            statusText: "v1",
            title: "确认版",
            confirmed: true,
        })
    })

    it("folds a regenerated summary into a legacy card that has no extra metadata", () => {
        const legacy = makeSummaryMessage("summary-legacy", "36", "36", 1, "合同总结", "初始总结")
        legacy.content.applyPayload({
            id: "summary-36",
            extra: {},
        })
        const regenerated = makeSummaryMessage("summary-v2", "42", "36", 2, "合同总结", "补充法务风险条目")

        const result = aggregateBusinessCardMessages([legacy, regenerated])

        expect(result).toEqual([regenerated])
        const latest = result[0].content as BusinessCardContent
        expect(latest.extra).toMatchObject({
            summaryRootTaskId: "36",
            revisionTaskId: "42",
            version: 2,
            updateCount: 2,
            stackedMessageClientMsgNos: ["summary-legacy", "summary-v2"],
        })
        expect(latest.extra.statusHistory).toEqual([
            expect.objectContaining({
                id: "summary-legacy",
                statusText: "v1",
                revisionTaskId: "36",
                title: "初始总结",
            }),
            expect.objectContaining({
                id: "summary-v2",
                statusText: "v2",
                revisionTaskId: "42",
                title: "补充法务风险条目",
            }),
        ])
    })
})
