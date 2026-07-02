import moment from "moment"
import { MessageContentTypeConst } from "../../Service/Const"
import type { BusinessCardContent } from "../../Messages/BusinessCard/BusinessCardContent"

type BusinessCardMessage = {
    clientMsgNo?: string
    messageSeq?: number
    timestamp?: number
    contentType?: number
    content?: Partial<BusinessCardContent> & {
        cardType?: string
        entityId?: string
        title?: string
        body?: string
        status?: string
        actor?: string
        time?: string
        priority?: string
        subtitle?: string
        metrics?: Array<{ label: string; value: string }>
        extra?: Record<string, any>
        applyPayload?: (payload: Partial<BusinessCardContent>) => void
    }
}

function formatMessageTime(message: BusinessCardMessage) {
    return message.timestamp ? moment.unix(message.timestamp).format("M/D HH:mm") : ""
}

function readMatterCardId(message: BusinessCardMessage): string | undefined {
    if (message.contentType !== MessageContentTypeConst.businessCard) return undefined
    const content = message.content
    if (content?.cardType !== "matter_status") return undefined
    const id = content.entityId || content.extra?.matterId || content.extra?.matterNo || content.extra?.id
    return typeof id === "string" && id.length > 0 ? id : undefined
}

function buildMatterCardHistoryItem(message: BusinessCardMessage) {
    const content = message.content || {}
    return {
        id: message.clientMsgNo || String(message.messageSeq || ""),
        messageSeq: message.messageSeq,
        status: content.status || "",
        statusText: content.extra?.statusText || content.status || "",
        title: content.title || content.body || "",
        subtitle: content.subtitle || "",
        body: content.body || "",
        priority: content.priority || "",
        metrics: content.metrics || [],
        actor: content.actor || "",
        time: content.time || formatMessageTime(message),
        updatedAt: content.extra?.updatedAt || "",
        sourceText: content.extra?.sourceText || "",
    }
}

function applyBusinessCardExtra(message: BusinessCardMessage, extra: Record<string, any>) {
    const content = message.content
    if (!content) return
    if (typeof content.applyPayload === "function") {
        content.applyPayload({ extra } as Partial<BusinessCardContent>)
    } else {
        content.extra = extra
    }
}

function aggregateGroupedMessages<T extends BusinessCardMessage>(
    messages: T[],
    readGroupId: (message: T) => string | undefined,
    buildHistoryItem: (message: T, index: number) => Record<string, any>,
): Set<T> {
    const grouped = new Map<string, T[]>()
    for (const message of messages) {
        const groupId = readGroupId(message)
        if (!groupId) continue
        const group = grouped.get(groupId) || []
        group.push(message)
        grouped.set(groupId, group)
    }

    const hidden = new Set<T>()
    for (const group of grouped.values()) {
        if (group.length <= 1) continue
        const latest = group[group.length - 1]
        const latestContent = latest.content || {}
        const history = group.map(buildHistoryItem)
        const extra = {
            ...(latestContent.extra || {}),
            updateCount: history.length,
            statusHistory: history,
            stackedMessageClientMsgNos: group.map((message) => message.clientMsgNo).filter(Boolean),
        }
        applyBusinessCardExtra(latest, extra)
        group.slice(0, -1).forEach((message) => hidden.add(message))
    }
    return hidden
}

export function aggregateBusinessCardMessages<T extends BusinessCardMessage>(messages: T[]): T[] {
    const matterHidden = aggregateGroupedMessages(messages, readMatterCardId, buildMatterCardHistoryItem)
    const hidden = new Set<T>(matterHidden)
    if (hidden.size === 0) return messages
    return messages.filter((message) => !hidden.has(message))
}
