import { isSafeUrl } from "../../Utils/security";

export interface TextMessageLinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  domain: string;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readRecord(value: unknown): Record<string, any> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, any>;
}

function normalizeHttpUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (!isSafeUrl(parsed.toString())) return undefined;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function textContainsUrl(text: string, url: string) {
  if (!text) return false;
  if (text.includes(url)) return true;

  try {
    const parsed = new URL(url);
    const withoutTrailingSlash = parsed.toString().replace(/\/$/, "");
    return text.includes(withoutTrailingSlash);
  } catch {
    return false;
  }
}

function getPreviewPayload(content: Record<string, any>) {
  return readRecord(content.link_preview) ?? readRecord(content.linkPreview);
}

export function getTextMessageLinkPreview(content: unknown): TextMessageLinkPreview | undefined {
  const record = readRecord(content);
  if (!record) return undefined;

  const rawPayload = readRecord(record.contentObj);
  const preview = getPreviewPayload(record) ?? (rawPayload ? getPreviewPayload(rawPayload) : undefined);
  if (!preview) return undefined;

  const text = readString(record.text) ?? readString(record.content) ?? readString(rawPayload?.content) ?? "";
  const rawUrl = readString(preview.url);
  const url = rawUrl ? normalizeHttpUrl(rawUrl) : undefined;
  if (!url || !textContainsUrl(text, url)) return undefined;

  const title = readString(preview.title);
  if (!title) return undefined;

  let domain = readString(preview.domain);
  if (!domain) {
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      domain = "";
    }
  }

  return {
    url,
    title,
    description: readString(preview.description) ?? readString(preview.desc),
    image: readString(preview.image) ?? readString(preview.image_url) ?? readString(preview.imageUrl),
    domain: domain || "",
  };
}
