import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type {
  BusinessCardAction,
  BusinessCardPayload,
} from "@octo/base/src/Messages/BusinessCard/BusinessCardContent";
import { BusinessCardView } from "@octo/base/src/Messages/BusinessCard/BusinessCardView";
import { mockRichCardPayloads } from "./mockRichCardPayloads";
import "@octo/base/src/Messages/BusinessCard/index.css";
import "./RichCardPreviewApp.css";

interface ActionLog {
  cardId: string;
  cardType: string;
  actionType: string;
  label: string;
  time: string;
}

function RichCardPreviewApp() {
  const [activeCardId, setActiveCardId] = useState(mockRichCardPayloads[0]?.id);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);

  const activeCard = useMemo(
    () =>
      mockRichCardPayloads.find((item) => item.id === activeCardId) ??
      mockRichCardPayloads[0],
    [activeCardId]
  );

  const handleAction = (
    card: BusinessCardPayload,
    action: BusinessCardAction
  ) => {
    setActionLogs((logs) =>
      [
        {
          cardId: card.id,
          cardType: card.cardType,
          actionType: action.type,
          label: action.label,
          time: new Date().toLocaleTimeString(),
        },
        ...logs,
      ].slice(0, 8)
    );
  };

  return (
    <main className="richcard-preview">
      <aside className="richcard-preview__sidebar">
        <div>
          <h1>Octo 富格式消息卡片</h1>
          <p>正式组件预览</p>
        </div>
        <nav aria-label="卡片场景">
          {mockRichCardPayloads.map((card) => (
            <button
              key={card.id}
              type="button"
              className={card.id === activeCard?.id ? "is-active" : ""}
              onClick={() => setActiveCardId(card.id)}
            >
              <span>{card.title}</span>
              <small>{card.subtitle || card.source || card.cardType}</small>
            </button>
          ))}
        </nav>
      </aside>

      <section className="richcard-preview__chat" aria-label="聊天卡片预览">
        <header>
          <div>
            <strong>销售一群</strong>
            <span>卡片在真实聊天流中的显示效果</span>
          </div>
          <span className="richcard-preview__status">Mock 数据</span>
        </header>

        <div className="richcard-preview__conversation">
          <div className="richcard-preview__message richcard-preview__message--plain">
            <span className="richcard-preview__avatar">王</span>
            <p>合同评审这边需要同步一下最新状态。</p>
          </div>
          <div className="richcard-preview__message">
            <span className="richcard-preview__avatar richcard-preview__avatar--bot">
              O
            </span>
            <BusinessCardView
              key={activeCard.id}
              card={activeCard}
              onAction={(action) => handleAction(activeCard, action)}
            />
          </div>
          <div className="richcard-preview__message richcard-preview__message--plain richcard-preview__message--self">
            <p>收到，卡片状态和操作入口可以直接在群里闭环。</p>
          </div>
        </div>
      </section>

      <aside className="richcard-preview__inspector">
        <h2>动作回放</h2>
        {actionLogs.length === 0 ? (
          <p className="richcard-preview__empty">
            点击卡片按钮查看事件 payload。
          </p>
        ) : (
          <ul>
            {actionLogs.map((log, index) => (
              <li key={`${log.cardId}-${log.actionType}-${index}`}>
                <strong>{log.label}</strong>
                <span>
                  {log.cardType} · {log.actionType}
                </span>
                <small>{log.time}</small>
              </li>
            ))}
          </ul>
        )}
        <h2>当前 Payload</h2>
        <pre>{JSON.stringify(activeCard, null, 2)}</pre>
      </aside>
    </main>
  );
}

export function mountRichCardPreview(container: HTMLElement) {
  createRoot(container).render(
    <React.StrictMode>
      <RichCardPreviewApp />
    </React.StrictMode>
  );
}
