import React from "react";
import { Component, ReactNode } from "react";
import WKAvatar from "../WKAvatar";
import "./item-message.css"
import { sanitizeHighlight } from "./sanitize"
interface ItemMessageProps {
    avatar: string; // 会话头像
    name: string; // 会话名字
    digest: string; // 消息摘要
    sender?: string; // 发送者
    /**
     * 发送者相对当前查看 Space 的来源 Space 名称。非空时在发送者
     * 名字后追加「@{sourceSpaceName}」后缀，让用户直观区分外部消息来源。
     * 同 Space / 内部消息时由调用方传空字符串，不渲染。
     */
    senderSourceSpaceName?: string;
    onClick?: () => void;
}

export default class ItemMessage extends Component<ItemMessageProps> {

    render(): ReactNode {

        const digest = this.props?.digest
        const { sender, senderSourceSpaceName } = this.props
        const hasSender = !!(sender && sender !== "")

        return <div className="wk-item-message" onClick={() => {
            if (this.props.onClick) {
                this.props.onClick()
            }
        } }>
            <WKAvatar src={this.props.avatar} style={{ width: "40px", height: "40px" }} lazy></WKAvatar>
            <div className="wk-item-message-content">
                <div className="wk-item-message-name">{this.props.name}</div>
                {/* <div className="wk-item-message-time">{this.props.time}</div> */}
                <div className="wk-item-message-digest">
                    {hasSender && (
                        <>
                            <span className="wk-item-message-sender">{sender}</span>
                            {/* 发送者名字后的外部来源 Space 后缀（企微风格） */}
                            {senderSourceSpaceName && (
                                <span
                                    className="wk-search-result-item-space"
                                    title={`@${senderSourceSpaceName}`}
                                >
                                    @{senderSourceSpaceName}
                                </span>
                            )}
                            <span>: </span>
                        </>
                    )}
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHighlight(digest) }}></span>
                </div>
            </div>
        </div>
    }
}