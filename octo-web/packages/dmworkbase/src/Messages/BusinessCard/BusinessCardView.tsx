import React from "react";
import type {
  BusinessCardAction,
  BusinessCardPayload,
} from "./BusinessCardContent";

const statusCopy: Record<string, string> = {
  backlog: "暂存",
  open: "待处理",
  in_progress: "进行中",
  review: "等你看",
  done: "已完成",
  pending_confirm: "待确认",
  confirmed: "已确认",
  revised: "待确认",
  failed: "失败",
  blocked: "受阻",
  cancelled: "已取消",
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

type CardTone =
  | "success"
  | "warn"
  | "error"
  | "info"
  | "review"
  | "neutral"
  | "summary-pending"
  | "summary-confirmed";

const statusTone: Record<string, CardTone> = {
  backlog: "neutral",
  done: "success",
  confirmed: "summary-confirmed",
  pending_confirm: "summary-pending",
  revised: "summary-pending",
  failed: "warn",
  blocked: "warn",
  review: "review",
  archived: "neutral",
  cancelled: "neutral",
  in_progress: "info",
  open: "info",
};

function getActionClassName(action: BusinessCardAction) {
  return `wk-business-card-action wk-business-card-action--${
    action.kind ?? "secondary"
  }`;
}

export function getBusinessCardActions(
  card: BusinessCardPayload
): BusinessCardAction[] {
  const actions = card.actions ?? [];
  const cardType = getCardType(card);

  if (cardType === "matter_status") {
    const normalized = actions
      .filter(
        (action) =>
          action.type === "open_matter_workspace" ||
          action.type === "open_matter"
      )
      .map((action) => {
        if (action.type === "open_matter_workspace") {
          return { ...action, label: "进入 Matter", kind: "primary" as const };
        }
        if (action.type === "open_matter") {
          return { ...action, label: "预览", kind: "ghost" as const };
        }
        return action;
      });
    const hasNormalizedAction = (type: string) =>
      normalized.some((action) => action.type === type);
    const withPreview = hasNormalizedAction("open_matter")
      ? normalized
      : [
          ...normalized,
          {
            label: "预览",
            type: "open_matter",
            kind: "ghost" as const,
          },
        ];
    const withWorkspace = hasNormalizedAction("open_matter_workspace")
      ? withPreview
      : [
          {
            label: "进入 Matter",
            type: "open_matter_workspace",
            kind: "primary" as const,
          },
          ...withPreview,
        ];
    return withWorkspace.sort((left, right) => {
      const rank = (action: BusinessCardAction) => {
        if (action.type === "open_matter_workspace") return 0;
        if (action.type === "open_matter") return 2;
        return 1;
      };
      return rank(left) - rank(right);
    });
  }

  if (cardType === "summary_feedback") {
    const normalized = actions
      .filter(
        (action) =>
          action.type !== "summary_accept" && action.type !== "summary_reject"
      )
      .map((action) => {
        if (action.type === "open_summary_workspace") {
          return { ...action, label: "进入群总结", kind: "primary" as const };
        }
        if (action.type === "open_summary") {
          return { ...action, label: "预览", kind: "ghost" as const };
        }
        return action;
      });
    const hasNormalizedAction = (type: string) =>
      normalized.some((action) => action.type === type);
    const withPreview = hasNormalizedAction("open_summary")
      ? normalized
      : [
          ...normalized,
          {
            label: "预览",
            type: "open_summary",
            kind: "ghost" as const,
          },
        ];
    const withWorkspace = hasNormalizedAction("open_summary_workspace")
      ? withPreview
      : [
          {
            label: "进入群总结",
            type: "open_summary_workspace",
            kind: "primary" as const,
          },
          ...withPreview,
        ];
    return withWorkspace.sort((left, right) => {
      const rank = (action: BusinessCardAction) => {
        if (action.type === "open_summary_workspace") return 0;
        if (action.type === "open_summary") return 2;
        return 1;
      };
      return rank(left) - rank(right);
    });
  }

  return actions;
}

function getPrimaryActions(actions: BusinessCardAction[]) {
  return actions.filter((action) => action.kind !== "ghost");
}

function getPreviewAction(actions: BusinessCardAction[], cardType: string) {
  if (cardType === "matter_status")
    return actions.find((action) => action.type === "open_matter");
  if (cardType === "summary_feedback")
    return actions.find((action) => action.type === "open_summary");
  return undefined;
}

function getStatusHistory(card: BusinessCardPayload) {
  const history = card.extra?.statusHistory;
  if (!Array.isArray(history)) return [];
  return history
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      return {
        id: String(
          item.id ?? item.messageId ?? item.status ?? item.time ?? index
        ),
        status: String(item.statusText ?? item.status ?? ""),
        title: String(item.title ?? item.body ?? item.description ?? ""),
        subtitle: String(item.subtitle ?? ""),
        body: String(item.body ?? item.description ?? ""),
        priority: String(item.priority ?? ""),
        metrics: Array.isArray(item.metrics) ? item.metrics : [],
        time: String(item.time ?? item.updatedAt ?? ""),
        actor: String(item.actor ?? ""),
        sourceText: String(item.sourceText ?? item.source ?? ""),
      };
    })
    .filter(
      (
        item
      ): item is {
        id: string;
        status: string;
        title: string;
        subtitle: string;
        body: string;
        priority: string;
        metrics: Array<{ label: string; value: string }>;
        time: string;
        actor: string;
        sourceText: string;
      } => !!item?.title || !!item?.status
    )
    .slice(-6);
}

function getProgressPercent(card: BusinessCardPayload) {
  const progress = String(
    card.extra?.progress ||
      card.metrics?.find((item) => /进度|progress/i.test(item.label))?.value ||
      ""
  );
  if (!progress) return undefined;
  const match = progress.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0)
    return undefined;
  return `${Math.max(0, Math.min(100, Math.round((current / total) * 100)))}%`;
}

function getKicker(card: BusinessCardPayload) {
  if (card.cardType === "matter_status") {
    const matterNo = String(
      card.extra?.matterNo || card.entityId || card.source || "Matter"
    );
    const sourceName = String(
      card.extra?.sourceName || card.extra?.source || ""
    ).trim();
    return [matterNo, sourceName].filter(Boolean).join(" · ");
  }
  if (card.cardType === "summary_feedback") {
    const msgCount = card.metrics?.find((item) =>
      /消息/.test(item.label)
    )?.value;
    return (
      [card.time, msgCount ? `${msgCount} 条消息` : undefined]
        .filter(Boolean)
        .join(" · ") ||
      card.source ||
      "Summary"
    );
  }
  return (
    [card.source, card.time].filter(Boolean).join(" · ") ||
    card.extra?.domain ||
    "Link"
  );
}

function getSourceText(card: BusinessCardPayload) {
  return card.extra?.sourceText || card.extra?.quote || card.extra?.source;
}

function getMetricValue(card: BusinessCardPayload, labelPattern: RegExp) {
  return card.metrics?.find((item) => labelPattern.test(item.label))?.value;
}

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function getMatterStatusText(card: BusinessCardPayload) {
  if (card.extra?.statusText) return String(card.extra.statusText);

  const owner = getMetricValue(card, /负责人|处理|owner|assignee/i);
  const blockReason =
    card.extra?.blockReason || getMetricValue(card, /原因|阻塞|受阻|reason/i);

  if (card.status === "review") return "东西回来了，等你确认";
  if (card.status === "done") return "已验收完成，结果可回看";
  if (card.status === "blocked")
    return blockReason ? `卡住了：${blockReason}` : "卡住了，需要补充输入";
  if (card.status === "backlog") return "已暂存，等待排期";
  if (card.status === "cancelled") return "已取消，原因可回看";
  if (card.status === "archived") return "已归档，记录可回看";
  if (card.status === "in_progress")
    return owner ? `${owner} 正在处理` : "正在推进中";
  if (card.status === "open")
    return owner ? `已交给 ${owner}` : "已接收，待开始";
  return card.subtitle || "事项状态更新";
}

function getMatterFoldedFacts(card: BusinessCardPayload) {
  const metrics = card.metrics ?? [];
  const preferred = metrics.filter((item) =>
    /截止|进度|处理|负责人|owner|assignee/i.test(item.label)
  );
  return (preferred.length ? preferred : metrics)
    .slice(0, 3)
    .map((item) => `${item.label} ${item.value}`);
}

function getMatterAgent(card: BusinessCardPayload) {
  const rawAgent = card.extra?.agent;
  const agentRecord =
    rawAgent && typeof rawAgent === "object"
      ? (rawAgent as Record<string, any>)
      : undefined;
  const name =
    agentRecord?.name ||
    card.extra?.agentName ||
    card.extra?.leaderName ||
    card.extra?.leader ||
    card.actor;
  if (!name) return undefined;

  const role =
    agentRecord?.role ||
    agentRecord?.type ||
    card.extra?.agentRole ||
    card.extra?.agentType ||
    "带队";
  const participantText =
    card.extra?.participantText ||
    (card.extra?.participantCount
      ? `${card.extra.participantCount} 个参与者`
      : undefined);
  const pills = asTextArray(
    card.extra?.agentPills || card.extra?.participantRoles
  ).slice(0, 3);
  const initial = String(name).trim().slice(0, 1).toUpperCase() || "A";

  return {
    name: String(name),
    role: String(role),
    participantText: participantText ? String(participantText) : "",
    pills,
    initial,
  };
}

function getCardType(card: BusinessCardPayload) {
  return String(card.cardType || (card as any).card_type || "").trim();
}

function isSummaryConfirmed(card: BusinessCardPayload) {
  return (
    card.status === "confirmed" ||
    card.status === "accepted" ||
    card.extra?.confirmed === true ||
    !!card.extra?.confirmedAt
  );
}

function getSummaryStatusLabel(card: BusinessCardPayload) {
  if (card.status === "failed") return "失败";
  return isSummaryConfirmed(card) ? "已确认" : "待确认";
}

function getSummaryTone(card: BusinessCardPayload): CardTone {
  if (card.status === "failed") return "warn";
  return isSummaryConfirmed(card) ? "summary-confirmed" : "summary-pending";
}

function getSummarySourceName(card: BusinessCardPayload) {
  return String(
    card.extra?.sourceName ||
      card.extra?.groupName ||
      card.extra?.channelName ||
      card.source ||
      "群总结"
  );
}

function getSummaryContentTitle(card: BusinessCardPayload) {
  return String(
    card.extra?.summaryTitle ||
      card.extra?.contentTitle ||
      card.extra?.topic ||
      card.subtitle ||
      card.title ||
      "群总结"
  );
}

function getSummaryTechnicalTitle(
  card: BusinessCardPayload,
  contentTitle: string
) {
  if (!card.title || card.title === contentTitle) return "";
  return card.title;
}

function getSummaryAbstract(card: BusinessCardPayload) {
  return String(
    card.extra?.abstract ||
      card.extra?.summaryText ||
      card.extra?.summary ||
      card.body ||
      card.subtitle ||
      ""
  );
}

function getSummaryMetricChips(card: BusinessCardPayload) {
  const chips: string[] = [];
  const messageCount =
    card.extra?.messageCount ||
    card.extra?.messagesCount ||
    getMetricValue(card, /消息|message/i);
  const actionCount =
    card.extra?.actionCount ||
    card.extra?.actionsCount ||
    getMetricValue(card, /行动|action/i);
  const riskCount =
    card.extra?.riskCount ||
    card.extra?.risksCount ||
    getMetricValue(card, /风险|risk/i);

  if (messageCount) {
    const text = String(messageCount);
    chips.push(
      text.includes("消息")
        ? text
        : `${text}${text.includes("条") ? "消息" : " 条消息"}`
    );
  }
  if (actionCount) chips.push(`行动项 ${actionCount}`);
  if (riskCount) chips.push(`风险点 ${riskCount}`);

  return chips.slice(0, 4);
}

function getSummaryContentBlocks(card: BusinessCardPayload) {
  const conclusion =
    card.extra?.conclusion ||
    card.extra?.keyConclusion ||
    card.extra?.summaryConclusion;
  const actionItems = asTextArray(
    card.extra?.actionItems || card.extra?.actions
  );
  const risks = asTextArray(card.extra?.riskItems || card.extra?.risks);
  const blocks: Array<{ title: string; body: string }> = [];

  if (conclusion) blocks.push({ title: "关键结论", body: String(conclusion) });
  if (actionItems.length)
    blocks.push({ title: "行动项", body: actionItems.join("；") });
  if (risks.length) blocks.push({ title: "风险点", body: risks.join("；") });

  if (!blocks.length) {
    const abstract = getSummaryAbstract(card);
    if (abstract) blocks.push({ title: "摘要内容", body: abstract });
  }

  return blocks.slice(0, 3);
}

function isExternalLinkCard(card: BusinessCardPayload) {
  return getCardType(card) === "external_link";
}

function getExternalLinkAction(card: BusinessCardPayload) {
  return (card.actions ?? []).find(
    (action) => action.type === "open_url" && action.url
  );
}

function getExternalLinkUrl(card: BusinessCardPayload) {
  return (
    getExternalLinkAction(card)?.url || card.extra?.url || card.entityId || ""
  );
}

function getExternalLinkDomain(card: BusinessCardPayload) {
  if (card.extra?.domain) return card.extra.domain;
  const url = getExternalLinkUrl(card);
  if (!url) return "";
  try {
    const base =
      typeof window === "undefined"
        ? "http://localhost"
        : window.location.origin;
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
  if (/deepseek\.com/i.test(url) || /deepseek\.com/i.test(domain))
    return "DeepSeek | 深度求索";

  const subtitleTitle = card.subtitle?.split("·").pop()?.trim();
  if (subtitleTitle && !isPlaceholderExternalLinkTitle(subtitleTitle))
    return subtitleTitle;

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

export function BusinessCardView({
  card,
  actionLoadingType,
  onAction,
}: BusinessCardViewProps) {
  const [expanded, setExpanded] = React.useState(false);
  const cardType = getCardType(card);

  if (isExternalLinkCard(card)) {
    const action = getExternalLinkAction(card);
    const url = getExternalLinkUrl(card);
    const domain = getExternalLinkDomain(card);
    const imageUrl =
      card.extra?.image ||
      card.extra?.imageUrl ||
      card.extra?.thumbnail ||
      card.extra?.thumbnailUrl;
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
            {description && (
              <span className="wk-link-preview-desc">{description}</span>
            )}
          </span>
          {imageUrl ? (
            <img
              className="wk-link-preview-thumb"
              src={imageUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className="wk-link-preview-favicon" aria-hidden="true">
              {domain.slice(0, 1).toUpperCase() || "L"}
            </span>
          )}
        </button>
      </article>
    );
  }

  const statusLabel = card.status ? statusCopy[card.status] ?? card.status : "";
  const typeLabel = cardTypeCopy[cardType] ?? "业务卡片";
  const shortTypeLabel = cardTypeShortCopy[cardType] ?? "卡";
  const isMatterCard = cardType === "matter_status";
  const isSummaryCard = cardType === "summary_feedback";
  const isStackableCard = isMatterCard;
  const summaryStatusLabel = isSummaryCard ? getSummaryStatusLabel(card) : "";
  const tone = isSummaryCard
    ? getSummaryTone(card)
    : statusTone[card.status ?? ""] ?? "info";
  const progressPercent = getProgressPercent(card);
  const sourceText = getSourceText(card);
  const actions = getBusinessCardActions(card);
  const primaryActions = getPrimaryActions(actions);
  const previewAction = getPreviewAction(actions, cardType);
  const statusHistory = isStackableCard ? getStatusHistory(card) : [];
  const updateCount = Number(
    card.extra?.updateCount || statusHistory.length || 0
  );
  const visibleUpdateCount = Math.max(updateCount, statusHistory.length);
  const hasExpandedContent =
    isStackableCard && visibleUpdateCount > 1 && statusHistory.length > 1;
  const shouldShowCardStack = !expanded && hasExpandedContent;
  const shouldShowDetailBlocks =
    !isStackableCard || expanded || !hasExpandedContent;
  const canPreviewByCardClick =
    !!previewAction && !isMatterCard && !hasExpandedContent;
  const matterStatusText = isMatterCard ? getMatterStatusText(card) : undefined;
  const matterFoldedFacts =
    isMatterCard && !expanded && hasExpandedContent
      ? getMatterFoldedFacts(card)
      : [];
  const matterAgent = isMatterCard ? getMatterAgent(card) : undefined;
  const latestHistoryItem =
    statusHistory.length > 0
      ? statusHistory[statusHistory.length - 1]
      : undefined;
  const matterSummaryDescription =
    latestHistoryItem?.title && latestHistoryItem.title !== matterStatusText
      ? latestHistoryItem.title
      : card.body || latestHistoryItem?.body || "";
  const shouldShowMatterSummary =
    isMatterCard && hasExpandedContent && !expanded;
  const shouldShowMatterDetail = isMatterCard && shouldShowDetailBlocks;
  const summarySourceName = isSummaryCard ? getSummarySourceName(card) : "";
  const summaryContentTitle = isSummaryCard ? getSummaryContentTitle(card) : "";
  const summaryTechnicalTitle = isSummaryCard
    ? getSummaryTechnicalTitle(card, summaryContentTitle)
    : "";
  const summaryAbstract = isSummaryCard ? getSummaryAbstract(card) : "";
  const summaryMetricChips = isSummaryCard ? getSummaryMetricChips(card) : [];
  const stackLabel = "Matter 状态更新";
  const stackActionLabel = ` ${stackLabel}`;
  const handlePreview = () => {
    if (previewAction) onAction?.(previewAction);
  };
  const toggleExpanded = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setExpanded((value) => !value);
  };

  return (
    <article
      className={[
        "wk-business-card",
        `wk-business-card--${cardType}`,
        `wk-business-card--tone-${tone}`,
        canPreviewByCardClick ? "wk-business-card--previewable" : "",
        shouldShowCardStack ? "wk-business-card--stacked" : "",
        expanded ? "wk-business-card--expanded" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={typeLabel}
      role={canPreviewByCardClick ? "button" : undefined}
      tabIndex={canPreviewByCardClick ? 0 : undefined}
      onClick={canPreviewByCardClick ? handlePreview : undefined}
      onKeyDown={(event) => {
        if (!canPreviewByCardClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handlePreview();
        }
      }}
    >
      {shouldShowCardStack && (
        <div className="wk-business-card-stack-layers" aria-hidden="true">
          <span className="wk-business-card-stack-layer wk-business-card-stack-layer--middle" />
          <span className="wk-business-card-stack-layer wk-business-card-stack-layer--back" />
        </div>
      )}
      <div className="wk-business-card-main">
        <header className="wk-business-card-head">
          <span className="wk-business-card-type-mark" aria-hidden="true">
            {shortTypeLabel}
          </span>
          <div className="wk-business-card-title-group">
            {isSummaryCard ? (
              <div className="wk-business-card-summary-headline">
                <div className="wk-business-card-summary-source">
                  <span
                    className={`wk-business-card-status-dot wk-business-card-status-dot--${tone}`}
                    aria-hidden="true"
                  />
                  <strong>{summarySourceName}</strong>
                  {card.time && <span>{card.time}</span>}
                </div>
                <h3 className="wk-business-card-title">
                  {summaryContentTitle}
                </h3>
                {summaryTechnicalTitle && (
                  <div className="wk-business-card-summary-id">
                    {summaryTechnicalTitle}
                  </div>
                )}
                {summaryAbstract && (
                  <p className="wk-business-card-summary-abstract">
                    {summaryAbstract}
                  </p>
                )}
                {!!summaryMetricChips.length && (
                  <div
                    className="wk-business-card-summary-chips"
                    aria-label="群总结关键指标"
                  >
                    {summaryMetricChips.map((chip) => (
                      <span key={chip}>{chip}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="wk-business-card-kicker">
                  <span
                    className={`wk-business-card-status-dot wk-business-card-status-dot--${tone}`}
                    aria-hidden="true"
                  />
                  <span>{getKicker(card)}</span>
                </div>
                <h3 className="wk-business-card-title">{card.title}</h3>
                {!isMatterCard && card.subtitle && (
                  <p className="wk-business-card-subtitle">{card.subtitle}</p>
                )}
                {!hasExpandedContent && matterStatusText && (
                  <p className="wk-business-card-human-status">
                    {matterStatusText}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="wk-business-card-badges">
            {card.priority && (
              <span className="wk-business-card-badge wk-business-card-badge--priority">
                {card.priority}
              </span>
            )}
            {(summaryStatusLabel || statusLabel) && (
              <span
                className={`wk-business-card-badge wk-business-card-badge--${tone}`}
              >
                {summaryStatusLabel || statusLabel}
              </span>
            )}
            {hasExpandedContent && (
              <button
                type="button"
                className="wk-business-card-expand-button"
                aria-label={
                  expanded
                    ? `收起${stackActionLabel}`
                    : `展开${stackActionLabel}`
                }
                aria-expanded={expanded}
                onClick={toggleExpanded}
              >
                <span aria-hidden="true">⌄</span>
              </button>
            )}
          </div>
        </header>

        {!!matterFoldedFacts.length && (
          <div
            className="wk-business-card-folded-facts"
            aria-label="Matter 折叠态关键信息"
          >
            {matterFoldedFacts.map((fact) => (
              <span className="wk-business-card-fact-chip" key={fact}>
                {fact}
              </span>
            ))}
          </div>
        )}

        {shouldShowMatterSummary && (
          <section
            className="wk-business-card-matter-summary"
            aria-label="Matter 折叠态状态摘要"
          >
            <div className="wk-business-card-matter-summary-copy">
              {matterStatusText && <strong>{matterStatusText}</strong>}
              {matterSummaryDescription && <p>{matterSummaryDescription}</p>}
            </div>
            {progressPercent && (
              <div className="wk-business-card-progress" aria-hidden="true">
                <span style={{ width: progressPercent }} />
              </div>
            )}
          </section>
        )}

        {shouldShowMatterDetail && (
          <section
            className="wk-business-card-matter-detail"
            aria-label="Matter 详情"
          >
            {matterStatusText && (
              <div className="wk-business-card-matter-detail-status">
                <span>当前状态</span>
                <strong>{matterStatusText}</strong>
              </div>
            )}
            {card.body && <p className="wk-business-card-desc">{card.body}</p>}
            {!!card.metrics?.length && (
              <dl className="wk-business-card-fields">
                {card.metrics.map((item) => (
                  <div
                    className="wk-business-card-field"
                    key={`${item.label}-${item.value}`}
                  >
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
          </section>
        )}

        {card.body &&
          shouldShowDetailBlocks &&
          !isMatterCard &&
          !isSummaryCard && (
            <p className="wk-business-card-desc">{card.body}</p>
          )}

        {!!card.metrics?.length &&
          shouldShowDetailBlocks &&
          !isMatterCard &&
          !isSummaryCard && (
            <dl className="wk-business-card-fields">
              {card.metrics.map((item) => (
                <div
                  className="wk-business-card-field"
                  key={`${item.label}-${item.value}`}
                >
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}

        {progressPercent && !isMatterCard && !isSummaryCard && (
          <div className="wk-business-card-progress" aria-hidden="true">
            <span style={{ width: progressPercent }} />
          </div>
        )}

        {matterAgent && (
          <div className="wk-business-card-agent">
            <span className="wk-business-card-agent-avatar" aria-hidden="true">
              {matterAgent.initial}
            </span>
            <span className="wk-business-card-agent-name">
              {matterAgent.name}
            </span>
            <span className="wk-business-card-agent-meta">
              · {matterAgent.role}
            </span>
            {matterAgent.participantText && (
              <span className="wk-business-card-agent-meta">
                · {matterAgent.participantText}
              </span>
            )}
            {visibleUpdateCount > 1 && (
              <span className="wk-business-card-agent-meta">
                · 已更新 {visibleUpdateCount} 次
              </span>
            )}
            {matterAgent.pills.map((pill) => (
              <span className="wk-business-card-agent-pill" key={pill}>
                {pill}
              </span>
            ))}
          </div>
        )}

        {sourceText &&
          !isMatterCard &&
          !isSummaryCard &&
          shouldShowDetailBlocks && (
            <div className="wk-business-card-source">{sourceText}</div>
          )}

        {isStackableCard && !expanded && visibleUpdateCount > 1 && (
          <button
            type="button"
            className="wk-business-card-stack-note"
            aria-label={`展开${stackActionLabel}`}
            aria-expanded={expanded}
            onClick={toggleExpanded}
          >
            <span>{`${visibleUpdateCount} 次状态更新已合并`}</span>
            {latestHistoryItem?.time && <span>{latestHistoryItem.time}</span>}
          </button>
        )}

        {hasExpandedContent && (
          <div
            className={`wk-business-card-history${
              expanded ? " wk-business-card-history--open" : ""
            }`}
            aria-label={`${stackLabel}历史`}
            aria-hidden={!expanded}
          >
            <div className="wk-business-card-history-inner">
              <div className="wk-business-card-history-section-head">
                <span>状态合并详情</span>
                <span>{`${visibleUpdateCount} 次更新`}</span>
              </div>
              {statusHistory.map((item, index) => (
                <div
                  className={`wk-business-card-history-card${
                    index === statusHistory.length - 1
                      ? " wk-business-card-history-card--latest"
                      : ""
                  }`}
                  key={`${item.id}-${index}`}
                >
                  <div className="wk-business-card-history-head">
                    <span>{item.status || "状态更新"}</span>
                    <time>
                      {[
                        item.actor,
                        item.time,
                        index === statusHistory.length - 1 ? "最新" : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </time>
                  </div>
                  <strong>{item.title}</strong>
                  {item.body && item.body !== item.title && <p>{item.body}</p>}
                  {item.sourceText && (
                    <span className="wk-business-card-history-source">
                      来源：{item.sourceText}
                    </span>
                  )}
                  {!!item.metrics?.length && (
                    <dl>
                      {item.metrics.slice(0, 3).map((metric) => (
                        <div key={`${item.id}-${metric.label}-${metric.value}`}>
                          <dt>{metric.label}</dt>
                          <dd>{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(!!primaryActions.length || previewAction) && (
          <div className="wk-business-card-actions">
            {primaryActions.map((action) => {
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
            {previewAction && (
              <button
                type="button"
                className="wk-business-card-preview-link"
                onClick={(event) => {
                  event.stopPropagation();
                  onAction?.(previewAction);
                }}
              >
                预览 <span aria-hidden="true">&gt;</span>
              </button>
            )}
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
