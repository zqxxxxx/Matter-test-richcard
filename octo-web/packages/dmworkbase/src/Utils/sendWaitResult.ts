export function isSuccessfulSendAck(ackPacket?: { reasonCode?: number }): boolean {
    return ackPacket?.reasonCode === 1
}

export function messageStatusWaitResult(
    status: unknown,
    normalStatus: unknown,
    failStatus: unknown,
): boolean | undefined {
    if (status === normalStatus) return true
    if (status === failStatus) return false
    return undefined
}

export function taskStatusWaitResult(
    status: unknown,
    successStatus: unknown,
    failStatus: unknown,
): boolean | undefined {
    if (status === successStatus) return true
    if (status === failStatus) return false
    return undefined
}

export function mediaSendWaitResult(input: {
    ackSucceeded: boolean
    uploadSucceeded: boolean
    messageStatus: unknown
    taskStatus: unknown
    normalMessageStatus: unknown
    failedMessageStatus: unknown
    successfulTaskStatus: unknown
    failedTaskStatuses: unknown[]
}): boolean | undefined {
    if (input.failedTaskStatuses.includes(input.taskStatus)) return false
    if (input.messageStatus === input.failedMessageStatus) return false
    if (input.ackSucceeded && input.uploadSucceeded) return true

    const taskSucceeded = input.taskStatus === input.successfulTaskStatus
    const messageSucceeded = input.messageStatus === input.normalMessageStatus
    if (messageSucceeded && (input.uploadSucceeded || taskSucceeded)) return true

    return undefined
}
