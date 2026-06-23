export interface FileUrlContent {
  url?: string;
  remoteUrl?: string;
  name?: string;
}

export interface ResolveFileUrlDeps {
  getFileURL: (path: string) => string;
  getPresignedPreviewUrl: (path: string, filename: string) => Promise<string>;
  getPresignedDownloadUrl: (path: string, filename: string) => Promise<string>;
  isSafeUrl: (url: string) => boolean;
  origin: string;
}

function rawFilePath(content: FileUrlContent): string {
  return content.url || content.remoteUrl || "";
}

function absoluteUrl(url: string, origin: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}/${url.replace(/^\//, "")}`;
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function shouldUseExistingFileURL(path: string): boolean {
  return path.startsWith("file/preview/") || path.startsWith("/") || path.startsWith("api/");
}

async function resolveFileUrl(
  content: FileUrlContent,
  deps: ResolveFileUrlDeps,
  mode: "preview" | "download",
): Promise<string> {
  const raw = rawFilePath(content);
  if (!raw) return "";

  const filename = content.name || "file";
  let resolved = "";

  if (isHttpUrl(raw)) {
    resolved = raw;
  } else if (shouldUseExistingFileURL(raw)) {
    resolved = deps.getFileURL(raw);
  } else if (mode === "preview") {
    resolved = await deps.getPresignedPreviewUrl(raw, filename);
  } else {
    resolved = await deps.getPresignedDownloadUrl(raw, filename);
  }

  resolved = absoluteUrl(resolved, deps.origin);
  return deps.isSafeUrl(resolved) ? resolved : "";
}

export function resolveFilePreviewUrl(
  content: FileUrlContent,
  deps: ResolveFileUrlDeps,
): Promise<string> {
  return resolveFileUrl(content, deps, "preview");
}

export function resolveFileDownloadUrl(
  content: FileUrlContent,
  deps: ResolveFileUrlDeps,
): Promise<string> {
  return resolveFileUrl(content, deps, "download");
}
