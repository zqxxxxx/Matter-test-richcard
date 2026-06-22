import { MessageContent } from "wukongimjssdk";
import { t } from "../../i18n/instance";
import { MessageContentTypeConst } from "../../Service/Const";

export type BusinessCardType = "matter_status" | "summary_feedback" | "external_link" | string;
export type BusinessCardStatus = "open" | "in_progress" | "done" | "blocked" | "archived" | string;
export type BusinessCardActionKind = "primary" | "secondary" | "danger";
export type BusinessCardActionType =
  | "open_matter"
  | "open_matter_workspace"
  | "complete_matter"
  | "open_summary"
  | "open_summary_workspace"
  | "summary_accept"
  | "summary_reject"
  | "open_url"
  | string;

export interface BusinessCardMetric {
  label: string;
  value: string;
}

export interface BusinessCardAction {
  label: string;
  type: BusinessCardActionType;
  kind?: BusinessCardActionKind;
  url?: string;
  value?: string;
  disabled?: boolean;
}

export interface BusinessCardPayload {
  id: string;
  cardType: BusinessCardType;
  title: string;
  subtitle?: string;
  body?: string;
  status?: BusinessCardStatus;
  priority?: string;
  source?: string;
  actor?: string;
  time?: string;
  entityId?: string;
  entityType?: string;
  sourceChannelId?: string;
  sourceChannelType?: number;
  metrics?: BusinessCardMetric[];
  actions?: BusinessCardAction[];
  extra?: Record<string, any>;
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, any>;
}

function compactRecord(value: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "")
  );
}

function normalizeMetrics(value: unknown): BusinessCardMetric[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      label: readString(item?.label) ?? "",
      value: readString(item?.value) ?? "",
    }))
    .filter((item) => item.label || item.value);
}

function normalizeActions(value: unknown): BusinessCardAction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      label: readString(item?.label) ?? "",
      type: readString(item?.type) ?? "",
      kind: (readString(item?.kind) as BusinessCardActionKind | undefined) ?? "secondary",
      url: readString(item?.url),
      value: readString(item?.value),
      disabled: item?.disabled === true,
    }))
    .filter((item) => item.label && item.type);
}

export class BusinessCardContent extends MessageContent implements BusinessCardPayload {
  id = "";
  cardType: BusinessCardType = "external_link";
  title = "";
  subtitle = "";
  body = "";
  status = "";
  priority = "";
  source = "";
  actor = "";
  time = "";
  entityId = "";
  entityType = "";
  sourceChannelId = "";
  sourceChannelType?: number;
  metrics: BusinessCardMetric[] = [];
  actions: BusinessCardAction[] = [];
  extra: Record<string, any> = {};

  constructor(payload?: Partial<BusinessCardPayload>) {
    super();
    if (payload) this.applyPayload(payload);
  }

  get contentType() {
    return MessageContentTypeConst.businessCard;
  }

  get conversationDigest() {
    return this.title ? `[${this.title}]` : t("base.message.digest.businessCard");
  }

  applyPayload(payload: Partial<BusinessCardPayload>) {
    this.id = payload.id ?? this.id;
    this.cardType = payload.cardType ?? this.cardType;
    this.title = payload.title ?? this.title;
    this.subtitle = payload.subtitle ?? this.subtitle;
    this.body = payload.body ?? this.body;
    this.status = payload.status ?? this.status;
    this.priority = payload.priority ?? this.priority;
    this.source = payload.source ?? this.source;
    this.actor = payload.actor ?? this.actor;
    this.time = payload.time ?? this.time;
    this.entityId = payload.entityId ?? this.entityId;
    this.entityType = payload.entityType ?? this.entityType;
    this.sourceChannelId = payload.sourceChannelId ?? this.sourceChannelId;
    this.sourceChannelType = payload.sourceChannelType ?? this.sourceChannelType;
    this.metrics = payload.metrics ?? this.metrics;
    this.actions = payload.actions ?? this.actions;
    this.extra = payload.extra ?? this.extra;
  }

  toPayload(): BusinessCardPayload {
    return {
      id: this.id,
      cardType: this.cardType,
      title: this.title,
      subtitle: this.subtitle,
      body: this.body,
      status: this.status,
      priority: this.priority,
      source: this.source,
      actor: this.actor,
      time: this.time,
      entityId: this.entityId,
      entityType: this.entityType,
      sourceChannelId: this.sourceChannelId,
      sourceChannelType: this.sourceChannelType,
      metrics: this.metrics,
      actions: this.actions,
      extra: this.extra,
    };
  }

  encodeJSON(): Record<string, any> {
    return {
      type: this.contentType,
      card_id: this.id,
      card_type: this.cardType,
      title: this.title,
      subtitle: this.subtitle,
      body: this.body,
      status: this.status,
      priority: this.priority,
      source: this.source,
      actor: this.actor,
      time: this.time,
      entity_id: this.entityId,
      entity_type: this.entityType,
      source_channel_id: this.sourceChannelId,
      source_channel_type: this.sourceChannelType,
      metrics: this.metrics,
      actions: this.actions,
      extra: this.extra,
    };
  }

  decodeJSON(content: Record<string, any>): void {
    const knownExtra = compactRecord({
      matterNo: readString(content.matter_no) ?? readString(content.matterNo),
      statusText: readString(content.status_text) ?? readString(content.statusText),
      sourceText: readString(content.source_text) ?? readString(content.sourceText),
      quote: readString(content.quote),
      domain: readString(content.domain),
      favicon: readString(content.favicon),
      spaceId: readString(content.space_id) ?? readString(content.spaceId),
    });

    this.applyPayload({
      id: readString(content.card_id) ?? readString(content.id) ?? "",
      cardType: readString(content.card_type) ?? readString(content.cardType) ?? "external_link",
      title: readString(content.title) ?? "",
      subtitle: readString(content.subtitle) ?? "",
      body: readString(content.body) ?? "",
      status: readString(content.status) ?? "",
      priority: readString(content.priority) ?? "",
      source: readString(content.source) ?? "",
      actor: readString(content.actor) ?? "",
      time: readString(content.time) ?? "",
      entityId: readString(content.entity_id) ?? readString(content.entityId) ?? "",
      entityType: readString(content.entity_type) ?? readString(content.entityType) ?? "",
      sourceChannelId: readString(content.source_channel_id) ?? readString(content.sourceChannelId) ?? "",
      sourceChannelType: readNumber(content.source_channel_type) ?? readNumber(content.sourceChannelType),
      metrics: normalizeMetrics(content.metrics),
      actions: normalizeActions(content.actions),
      extra: {
        ...knownExtra,
        ...readRecord(content.extra),
      },
    });
  }
}

export default BusinessCardContent;
