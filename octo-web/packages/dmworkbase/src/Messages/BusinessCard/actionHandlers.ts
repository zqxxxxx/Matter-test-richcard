import type { BusinessCardAction, BusinessCardPayload } from "./BusinessCardContent";

export interface BusinessCardActionContext {
  card: BusinessCardPayload;
  action: BusinessCardAction;
  message?: {
    messageID?: string;
    messageSeq?: number;
    clientMsgNo?: string;
    channelId?: string;
    channelType?: number;
  };
}

export type BusinessCardActionHandler = (
  context: BusinessCardActionContext,
) => boolean | void | Promise<boolean | void>;

const actionHandlers = new Set<BusinessCardActionHandler>();

export function registerBusinessCardActionHandler(handler: BusinessCardActionHandler): () => void {
  actionHandlers.add(handler);
  return () => {
    actionHandlers.delete(handler);
  };
}

export async function dispatchBusinessCardAction(context: BusinessCardActionContext): Promise<boolean> {
  let handled = false;

  for (const handler of Array.from(actionHandlers)) {
    const result = await handler(context);
    if (result === true) handled = true;
  }

  return handled;
}

export function __resetBusinessCardActionHandlersForTest(): void {
  actionHandlers.clear();
}
