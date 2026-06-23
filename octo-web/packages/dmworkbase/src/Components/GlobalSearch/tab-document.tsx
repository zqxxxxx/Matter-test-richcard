import React, { Component, ReactNode } from "react";
import ItemDocument from "./item-document";
import "./tab-file.css";

interface TabDocumentProps {
  documents?: any[];
  onClick?: (item: any) => void;
}

export default class TabDocument extends Component<TabDocumentProps> {
  private stickyDocuments?: any[];

  render(): ReactNode {
    const incoming = this.props.documents;
    if (incoming !== undefined) {
      this.stickyDocuments = incoming;
    }
    const documents = this.stickyDocuments;

    return (
      <div className="wk-tab-file">
        {documents?.map((item: any) => (
          <ItemDocument
            key={item.id}
            document={item}
            onClick={() => {
              this.props.onClick?.(item);
            }}
          />
        ))}
      </div>
    );
  }
}
