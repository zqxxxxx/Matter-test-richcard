import React from "react";
import MessageBase from "../Base";
import { MessageBaseCellProps, MessageCell } from "../MessageCell";
import WKApp from "../../App";
import { BusinessCardAction, BusinessCardContent } from "./BusinessCardContent";
import BusinessCardView from "./BusinessCardView";
import { dispatchBusinessCardAction } from "./actionHandlers";
import "./index.css";

function isSafeHttpUrl(url: string) {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export class BusinessCardCell extends MessageCell<MessageBaseCellProps, { loadingActionType: string | null }> {
  state = { loadingActionType: null };

  private handleAction = async (action: BusinessCardAction) => {
    const { message } = this.props;
    const content = message.content as BusinessCardContent;

    if (action.type === "open_url" && action.url && isSafeHttpUrl(action.url)) {
      window.open(action.url, "_blank", "noopener,noreferrer");
      return;
    }

    this.setState({ loadingActionType: action.type });
    const actionContext = {
      card: content.toPayload(),
      action,
      message: {
        messageID: message.messageID,
        messageSeq: message.messageSeq,
        clientMsgNo: message.clientMsgNo,
        channelId: message.channel?.channelID,
        channelType: message.channel?.channelType,
      },
    };

    try {
      const handled = await dispatchBusinessCardAction(actionContext);
      if (!handled) {
        WKApp.mittBus.emit("wk:business-card-action", {
          ...actionContext,
        });
      }
    } catch (error) {
      console.error("[BusinessCard] action failed", error);
    } finally {
      this.setState({ loadingActionType: null });
    }
  };

  render() {
    const { message, context } = this.props;
    const content = message.content as BusinessCardContent;

    return (
      <MessageBase hiddeBubble={true} message={message} context={context}>
        <div className="wk-business-card-message">
          <BusinessCardView
            card={content.toPayload()}
            actionLoadingType={this.state.loadingActionType}
            onAction={this.handleAction}
          />
        </div>
      </MessageBase>
    );
  }
}

export { BusinessCardContent, BusinessCardView };
export {
  dispatchBusinessCardAction,
  registerBusinessCardActionHandler,
} from "./actionHandlers";
export type {
  BusinessCardActionHandler,
  BusinessCardActionContext,
} from "./actionHandlers";
export type {
  BusinessCardAction,
  BusinessCardMetric,
  BusinessCardPayload,
  BusinessCardStatus,
  BusinessCardType,
} from "./BusinessCardContent";
export {
  buildSourceConversationRef,
  getSourceConversationLabel,
  openSourceConversation,
} from "./sourceConversation";
export type { SourceConversationRef } from "./sourceConversation";
export default BusinessCardCell;
