import React from "react";
import { Component, ReactNode } from "react";
import WKAvatar from "../WKAvatar";
import AiBadge from "../AiBadge";
import "./item-contacts.css"
import { sanitizeHighlight } from "./sanitize"
interface ItemContactsProps {
    avatar: string;
    name: string;
    isBot?: boolean;
    /**
     * 相对当前查看 Space 的来源 Space 名称。非空时在姓名后追加
     * 「@{sourceSpaceName}」灰紫色后缀，提示此联系人属于外部 Space，
     * 避免跨 Space 搜索时误选外部成员导致隐私泄漏。
     * 同 Space / 自己 / 非外部 时由调用方传空字符串，不渲染。
     */
    sourceSpaceName?: string;
    onClick?: () => void;
}

export default class ItemContacts extends Component<ItemContactsProps> {

     render(): ReactNode {
            const { sourceSpaceName } = this.props
            return <div className="wk-item-contacts" onClick={()=>{
                if(this.props.onClick){
                    this.props.onClick()
                }
            }}>
                <WKAvatar src={this.props.avatar} style={{width:"40px",height:"40px"}} lazy></WKAvatar>
                <div className="wk-item-contacts-name">
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHighlight(this.props.name) }}></span>
                    {/* 外部成员来源 Space 后缀（企微风格），与 @Mention 候选、成员列表视觉一致 */}
                    {sourceSpaceName && (
                        <span
                            className="wk-search-result-item-space"
                            title={`@${sourceSpaceName}`}
                        >
                            @{sourceSpaceName}
                        </span>
                    )}
                    {this.props.isBot && <AiBadge />}
                </div>
            </div>
        }
}
