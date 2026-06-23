import type { DocumentAsset } from "./types";

export type DocumentView = "recent" | "conversation" | "space" | "mine" | "trash";

export interface DocumentNavigationTarget {
  view: DocumentView;
  spaceName?: string;
  fileId?: string;
}

const DOCUMENT_VIEWS: DocumentView[] = [
  "recent",
  "conversation",
  "space",
  "mine",
  "trash",
];

export function parseDocumentNavigationSearch(
  search: string
): DocumentNavigationTarget {
  const params = new URLSearchParams(search);
  const rawView = params.get("view") || "";
  const view = DOCUMENT_VIEWS.includes(rawView as DocumentView)
    ? (rawView as DocumentView)
    : "recent";
  return {
    view,
    spaceName: params.get("space") || "",
    fileId: params.get("file") || "",
  };
}

export function buildDocumentNavigationSearch(
  target: DocumentNavigationTarget,
  currentSearch = ""
) {
  const params = new URLSearchParams(currentSearch);
  params.set("view", target.view);
  if (target.spaceName) {
    params.set("space", target.spaceName);
  } else {
    params.delete("space");
  }
  if (target.fileId) {
    params.set("file", target.fileId);
  } else {
    params.delete("file");
  }
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function getBrowserDocumentNavigationTarget(): DocumentNavigationTarget {
  if (typeof window === "undefined") return { view: "recent" };
  return parseDocumentNavigationSearch(window.location.search);
}

export function replaceBrowserDocumentNavigation(
  target: DocumentNavigationTarget
) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.pathname = "/documents/workspace";
  url.search = buildDocumentNavigationSearch(target, url.search);
  window.history.replaceState(
    window.history.state || {},
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
}

export function resolveNavigationSelection(
  files: DocumentAsset[],
  target: DocumentNavigationTarget
) {
  if (target.fileId && files.some((file) => file.id === target.fileId)) {
    return target.fileId;
  }
  return "";
}
