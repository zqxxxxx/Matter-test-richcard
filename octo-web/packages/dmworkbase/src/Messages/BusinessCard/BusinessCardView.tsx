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
  matter_status: "Matter 状态卡",
  summary_feedback: "群总结卡",
  external_link: "外部链接卡",
};

const cardTypeShortCopy: Record<string, string> = {
  matter_status: "M",
  summary_feedback: "总",
  external_link: "链",
};

const statusTone: Record<string, "success" | "warn" | "error" | "info"> = {
  done: "success",
  blocked: "warn",
  archived: "success",
  in_progress: "info",
  open: "info",
};

function getActionClassName(action: BusinessCardAction) {
  return `wk-business-card-action wk-business-card-action--${action.kind ?? "secondary"}`;
}

function insertAfterAction(actions: BusinessCardAction[], afterType: string, action: BusinessCardAction) {
  const insertIndex = actions.findIndex((item) => item.type === afterType);
  if (insertIndex < 0) return [...actions, action];
  return [...actions.slice(0, insertIndex + 1), action, ...actions.slice(insertIndex + 1)];
}

export function getBusinessCardActions(card: BusinessCardPayload): BusinessCardAction[] {
  const actions = card.actions ?? [];
  const hasAction = (type: string) => actions.some((action) => action.type === type);

  if (card.cardType === "matter_status" && !hasAction("open_matter_workspace")) {
    return insertAfterAction(actions, "open_matter", {
      label: "进入 Matter",
      type: "open_matter_workspace",
      kind: "secondary",
    });
  }

  if (card.cardType === "summary_feedback" && !hasAction("open_summary_workspace")) {
    return insertAfterAction(actions, "open_summary", {
      label: "进入群总结",
      type: "open_summary_workspace",
      kind: "secondary",
    });
  }

  return actions;
}

function getProgressPercent(card: BusinessCardPayload) {
  const progress = card.metrics?.find((item) => /进度|progress/i.test(item.label))?.value;
  if (!progress) return undefined;
  const match = progress.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return undefined;
  return `${Math.max(0, Math.min(100, Math.round((current / total) * 100)))}%`;
}

function getKicker(card: BusinessCardPayload) {
  if (card.cardType === "matter_status") {
    return String(card.extra?.matterNo || card.entityId || card.source || "Matter");
  }
  if (card.cardType === "summary_feedback") {
    const msgCount = card.metrics?.find((item) => /消息/.test(item.label))?.value;
    return [card.time, msgCount ? `${msgCount} 条消息` : undefined].filter(Boolean).join(" · ") || card.source || "Summary";
  }
  return [card.source, card.time].filter(Boolean).join(" · ") || card.extra?.domain || "Link";
}

function getSourceText(card: BusinessCardPayload) {
  return card.extra?.sourceText || card.extra?.quote || card.extra?.source;
}

export interface BusinessCardViewProps {
  card: BusinessCardPayload;
  actionLoadingType?: string | null;
  onAction?: (action: BusinessCardAction) => void;
}

export function BusinessCardView({ card, actionLoadingType, onAction }: BusinessCardViewProps) {
  const statusLabel = card.status ? statusCopy[card.status] ?? card.status : "";
  const typeLabel = cardTypeCopy[card.cardType] ?? "业务卡片";
  const shortTypeLabel = cardTypeShortCopy[card.cardType] ?? "卡";
  const tone = statusTone[card.status ?? ""] ?? "info";
  const progressPercent = getProgressPercent(card);
  const sourceText = getSourceText(card);
  const actions = getBusinessCardActions(card);

  return (
    <article className={`wk-business-card wk-business-card--${card.cardType}`} aria-label={typeLabel}>
      <div className="wk-business-card-main">
        <header className="wk-business-card-head">
          <span className="wk-business-card-type-mark" aria-hidden="true">{shortTypeLabel}</span>
          <div className="wk-business-card-title-group">
            <div className="wk-business-card-kicker">
              <span className={`wk-business-card-status-dot wk-business-card-status-dot--${tone}`} aria-hidden="true" />
              <span>{getKicker(card)}</span>
            </div>
            <h3 className="wk-business-card-title">{card.title}</h3>
            {card.subtitle && <p className="wk-business-card-subtitle">{card.subtitle}</p>}
          </div>
          <div className="wk-business-card-badges">
            {card.priority && <span className="wk-business-card-badge wk-business-card-badge--priority">{card.priority}</span>}
            {statusLabel && <span className={`wk-business-card-badge wk-business-card-badge--${tone}`}>{statusLabel}</span>}
          </div>
        </header>

        {card.body && <p className="wk-business-card-desc">{card.body}</p>}

        {!!card.metrics?.length && (
          <dl className="wk-business-card-fields">
            {card.metrics.map((item) => (
              <div className="wk-business-card-field" key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {progressPercent && (
          <div className="wk-business-card-progress" aria-hidden="true">
            <span style={{ width: progressPercent }} />
          </div>
        )}

        {sourceText && <div className="wk-business-card-source">{sourceText}</div>}

        {!!actions.length && (
          <div className="wk-business-card-actions">
            {actions.map((action) => {
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
      </div>

      <footer className="wk-business-card-footer">
        <span>{typeLabel}</span>
        <span>{card.time || card.actor || shortTypeLabel}</span>
      </footer>
    </article>
  );
}

export default BusinessCardView;
