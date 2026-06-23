import React, { Component, ReactNode } from "react";
import FileHelper from "../../Utils/filehelper";
import { sanitizeHighlight } from "./sanitize";
import "./item-file.css";

interface ItemDocumentProps {
  document: any;
  onClick?: () => void;
}

function formatSize(size?: number) {
  return FileHelper.getFileSizeFormat(size || 0);
}

export default class ItemDocument extends Component<ItemDocumentProps> {
  render(): ReactNode {
    const item = this.props.document;
    const realName = item.name?.replaceAll("<mark>", "").replaceAll("</mark>", "");
    const fileIconInfo = FileHelper.getFileIconInfo(realName);
    const source = [item.source_type, item.source_name].filter(Boolean).join(" / ");
    const meta = [
      item.uploader,
      source,
      item.space_name,
      formatSize(item.size),
    ].filter(Boolean);

    return (
      <div className="wk-item-file" onClick={this.props.onClick}>
        <div
          className="wk-item-file-icon"
          style={{ backgroundColor: fileIconInfo?.color, borderRadius: "4px" }}
        >
          <img alt="" src={fileIconInfo?.icon} style={{ width: "32px", height: "32px" }} />
        </div>
        <div
          className="wk-item-file-name"
          dangerouslySetInnerHTML={{ __html: sanitizeHighlight(item.name || realName || "") }}
        />
        <div className="wk-item-file-desc">
          {meta.map((text, index) => (
            <React.Fragment key={`${text}-${index}`}>
              {index > 0 && <div className="wk-item-file-line" />}
              <div className="wk-item-file-sender">{text}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }
}
