export type DocumentStatus = "conversation" | "archived" | "deleted";
export type DocumentVisibility = "conversation" | "space" | "specified";
export type DocumentKind = "pdf" | "doc" | "sheet" | "image" | "zip";
export type DocumentTab = "recent" | "conversation" | "space" | "mine" | "trash";

export interface DocumentAsset {
  id: string;
  name: string;
  kind: DocumentKind;
  extension: string;
  size: number;
  owner: string;
  uploader: string;
  sourceName: string;
  sourceChannelId: string;
  sourceChannelType: number;
  sourceType: "单聊" | "群聊" | "应用";
  spaceName: string;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  createdAt: string;
  lastAccessAt: string;
  downloads: number;
  previewable: boolean;
  flow: string[];
}

export interface DocumentSpace {
  id: string;
  name: string;
  owner: string;
  fileCount: number;
  memberCount: number;
  description: string;
}

export interface DocumentAudit {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface DocumentState {
  files: DocumentAsset[];
  spaces: DocumentSpace[];
  audits: DocumentAudit[];
}

export interface DocumentSummary {
  activeFiles: number;
  spaceFiles: number;
  conversationFiles: number;
}

export interface ArchiveMessageFileInput {
  id: string;
  name: string;
  extension: string;
  size: number;
  sourceName: string;
  sourceChannelId: string;
  sourceChannelType: number;
  sourceType: "单聊" | "群聊" | "应用";
  uploader: string;
  createdAt?: string;
  previewable?: boolean;
}

export interface UploadDocumentInput {
  id?: string;
  name: string;
  extension: string;
  size: number;
  uploader: string;
  createdAt?: string;
  previewable?: boolean;
}
