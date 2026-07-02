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

function makeMatterMessageFromWire(
    clientMsgNo: string,
    messageSeq: number,
    payload: Record<string, any>,
): TestMessageWrap {
    const content = new BusinessCardContent()
    content.decodeJSON(payload)
    return {
        clientMsgNo,
        messageSeq,
        timestamp: 1_719_290_000 + messageSeq,
        contentType: MessageContentTypeConst.businessCard,
        content,
    }
}

describe("aggregateBusinessCardMessages", () => {
    it("folds Matter status cards decoded from backend wire payload by entity_id", () => {
        const created = makeMatterMessageFromWire("matter-created", 1, {
            type: MessageContentTypeConst.businessCard,
            card_id: "matter-matter-1",
            card_type: "matter_status",
            title: "客户合同审批",
            body: "Matter created from group",
            status: "open",
            entity_id: "matter-1",
            entity_type: "matter",
            source_channel_id: "group-richcard",
            source_channel_type: 2,
            extra: { statusText: "已接收，待开始", sourceText: "创建 Matter" },
        })
        const done = makeMatterMessageFromWire("matter-done", 2, {
            type: MessageContentTypeConst.businessCard,
            card_id: "matter-matter-1",
            card_type: "matter_status",
            title: "客户合同审批",
            body: "已完成",
            status: "done",
            entity_id: "matter-1",
            entity_type: "matter",
            source_channel_id: "group-richcard",
            source_channel_type: 2,
            extra: { statusText: "已验收完成，结果可回看", sourceText: "状态变更" },
        })

        const result = aggregateBusinessCardMessages([created, done])

        expect(result).toEqual([done])
        const latest = result[0].content as BusinessCardContent
        expect(latest.entityId).toBe("matter-1")
        expect(latest.extra.updateCount).toBe(2)
        expect(latest.extra.statusHistory).toEqual([
            expect.objectContaining({ id: "matter-created", status: "open", sourceText: "创建 Matter" }),
            expect.objectContaining({ id: "matter-done", status: "done", sourceText: "状态变更" }),
        ])
    })

    it("keeps summary feedback cards separate because summary revision is no longer supported", () => {
        const v1 = makeSummaryMessage("summary-v1", "101", "100", 1, "合同总结", "生成初稿")
        const v2 = makeSummaryMessage("summary-v2", "102", "100", 2, "合同总结", "补充风险")
        const v3 = makeSummaryMessage("summary-v3", "103", "100", 3, "合同总结", "补充行动项")

        const result = aggregateBusinessCardMessages([v1, v2, v3])

        expect(result).toEqual([v1, v2, v3])
        for (const message of result) {
            const content = message.content as BusinessCardContent
            expect(content.extra.updateCount).toBeUndefined()
            expect(content.extra.statusHistory).toBeUndefined()
            expect(content.extra.stackedMessageClientMsgNos).toBeUndefined()
        }
    })
})
