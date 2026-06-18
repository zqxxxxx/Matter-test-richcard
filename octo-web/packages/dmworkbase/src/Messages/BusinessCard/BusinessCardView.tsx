import React from "react";
import type { BusinessCardAction, BusinessCardPayload } from "./BusinessCardContent";

const statusCopy: Record<string, string> = {
  open: "待处理",
  in_progress: "进行中",
  done: "已完成",
  blocked: "受阻",
  archived: "已归档",
};

const cardTypeCopy: Record<string, string> = {
  matter_status: "Matter",
  summary_feedback: "总结",
  external_link: "链接",
};

function getActionClassName(action: BusinessCardAction) {
  return `wk-business-card-action wk-business-card-action--${action.kind ?? "secondary"}`;
}

export interface BusinessCardViewProps {
  card: BusinessCardPayload;
  actionLoadingType?: string | null;
  onAction?: (action: BusinessCardAction) => void;
}

export function BusinessCardView({ card, actionLoadingType, onAction }: BusinessCardViewProps) {
  const statusLabel = card.status ? statusCopy[card.status] ?? card.status : "";
  const typeLabel = cardTypeCopy[card.cardType] ?? "业务";

  return (
    <article className={`wk-business-card wk-business-card--${card.cardType}`}>
      <header className="wk-business-card-header">
        <div className="wk-business-card-icon" aria-hidden="true">
          {typeLabel.slice(0, 1)}
        </div>
        <div className="wk-business-card-headcopy">
          {(card.source || card.time) && (
            <div className="wk-business-card-eyebrow">
              {[card.source, card.time].filter(Boolean).join(" · ")}
            </div>
          )}
          <h3>{card.title}</h3>
          {card.subtitle && <p>{card.subtitle}</p>}
        </div>
        <div className="wk-business-card-badges">
          {card.priority && <span className="wk-business-card-badge wk-business-card-badge--priority">{card.priority}</span>}
          {statusLabel && <span className={`wk-business-card-badge wk-business-card-badge--${card.status}`}>{statusLabel}</span>}
        </div>
      </header>

      {card.body && <p className="wk-business-card-body">{card.body}</p>}

      {!!card.metrics?.length && (
        <dl className="wk-business-card-metrics">
          {card.metrics.map((item) => (
            <div key={`${item.label}-${item.value}`}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <footer className="wk-business-card-footer">
        {card.actor && <span className="wk-business-card-actor">由 {card.actor} 触发</span>}
        {!!card.actions?.length && (
          <div className="wk-business-card-actions">
            {card.actions.map((action) => {
              const loading = actionLoadingType === action.type;
              return (
                <button
                  key={`${action.type}-${action.label}`}
                  type="button"
                  className={getActionClassName(action)}
                  disabled={action.disabled || loading}
                  onClick={(event) => {
                    event.stopPropagation();
                    onAction?.(action);
                  }}
                >
                  {loading ? "处理中" : action.label}
                </button>
              );
            })}
          </div>
        )}
      </footer>
    </article>
  );
}

export default BusinessCardView;
