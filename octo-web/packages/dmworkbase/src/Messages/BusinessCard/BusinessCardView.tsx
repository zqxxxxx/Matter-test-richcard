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

function getCardType(card: BusinessCardPayload) {
  return String(card.cardType || (card as any).card_type || "").trim();
}

function isExternalLinkCard(card: BusinessCardPayload) {
  return getCardType(card) === "external_link";
}

function getExternalLinkAction(card: BusinessCardPayload) {
  return (card.actions ?? []).find((action) => action.type === "open_url" && action.url);
}

function getExternalLinkUrl(card: BusinessCardPayload) {
  return getExternalLinkAction(card)?.url || card.extra?.url || card.entityId || "";
}

function getExternalLinkDomain(card: BusinessCardPayload) {
  if (card.extra?.domain) return card.extra.domain;
  const url = getExternalLinkUrl(card);
  if (!url) return "";
  try {
    const base = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    return new URL(url, base).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isPlaceholderExternalLinkTitle(title?: string) {
  return !title || /外部链接预览卡片|外部分享链接|网页链接/.test(title);
}

function getExternalLinkTitle(card: BusinessCardPayload) {
  const url = getExternalLinkUrl(card);
  const domain = getExternalLinkDomain(card);

  if (!isPlaceholderExternalLinkTitle(card.title)) return card.title;
  if (/deepseek\.com/i.test(url) || /deepseek\.com/i.test(domain)) return "DeepSeek | 深度求索";

  const subtitleTitle = card.subtitle?.split("·").pop()?.trim();
  if (subtitleTitle && !isPlaceholderExternalLinkTitle(subtitleTitle)) return subtitleTitle;

  return domain || url || "网页链接";
}

function getExternalLinkDescription(card: BusinessCardPayload) {
  const domain = getExternalLinkDomain(card);
  const url = getExternalLinkUrl(card);

  if (/deepseek\.com/i.test(url) || /deepseek\.com/i.test(domain)) {
    return "深度求索，专注于研究世界领先的通用人工智能。";
  }

  return card.body || card.subtitle || domain;
}

export interface BusinessCardViewProps {
  card: BusinessCardPayload;
  actionLoadingType?: string | null;
  onAction?: (action: BusinessCardAction) => void;
}

export function BusinessCardView({ card, actionLoadingType, onAction }: BusinessCardViewProps) {
  const cardType = getCardType(card);

  if (isExternalLinkCard(card)) {
    const action = getExternalLinkAction(card);
    const url = getExternalLinkUrl(card);
    const domain = getExternalLinkDomain(card);
    const imageUrl = card.extra?.image || card.extra?.imageUrl || card.extra?.thumbnail || card.extra?.thumbnailUrl;
    const title = getExternalLinkTitle(card);
    const description = getExternalLinkDescription(card);
    const canOpen = !!action;

    return (
      <article className="wk-link-preview-card" aria-label="外部链接预览">
        {url && <div className="wk-link-preview-url">{url}</div>}
        <button
          type="button"
          className="wk-link-preview-panel"
          disabled={!canOpen}
          onClick={(event) => {
            event.stopPropagation();
            if (action) onAction?.(action);
          }}
        >
          <span className="wk-link-preview-copy">
            <span className="wk-link-preview-title">{title}</span>
            {description && <span className="wk-link-preview-desc">{description}</span>}
          </span>
          {imageUrl ? (
            <img className="wk-link-preview-thumb" src={imageUrl} alt="" loading="lazy" />
          ) : (
            <span className="wk-link-preview-favicon" aria-hidden="true">{domain.slice(0, 1).toUpperCase() || "L"}</span>
          )}
        </button>
      </article>
    );
  }

  const statusLabel = card.status ? statusCopy[card.status] ?? card.status : "";
  const typeLabel = cardTypeCopy[cardType] ?? "业务卡片";
  const shortTypeLabel = cardTypeShortCopy[cardType] ?? "卡";
  const tone = statusTone[card.status ?? ""] ?? "info";
  const progressPercent = getProgressPercent(card);
  const sourceText = getSourceText(card);
  const actions = getBusinessCardActions(card);

  return (
    <article className={`wk-business-card wk-business-card--${cardType}`} aria-label={typeLabel}>
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
