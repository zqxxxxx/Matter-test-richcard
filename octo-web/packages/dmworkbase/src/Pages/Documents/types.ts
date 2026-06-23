export type DocumentStatus = "conversation" | "archived" | "deleted";
export type DocumentVisibility = "conversation" | "space" | "specified";
export type DocumentKind = "pdf" | "doc" | "sheet" | "image" | "zip";

export interface DocumentAsset {
  id: string;
  name: string;
  kind: DocumentKind;
  extension: string;
  size: number;
  storagePath: string;
  owner: string;
  uploader: string;
  sourceName: string;
  sourceChannelId: string;
  sourceChannelType: number;
  sourceType: "单聊" | "群聊" | "上传";
  spaceName: string;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  createdAt: string;
  lastAccessAt: string;
  downloads: number;
  previewable: boolean;
  flow: string[];
  sourceRef?: DocumentSourceRef;
  permissions: DocumentPermissions;
}

export interface DocumentSourceRef {
  channelId: string;
  channelType: number;
  channelName: string;
  messageId: string;
  messageSeq: number;
  senderUid: string;
  senderName: string;
  sentAt: string;
}

export interface DocumentPermissions {
  canPreview: boolean;
  canDownload: boolean;
  canArchive: boolean;
  canEdit?: boolean;
  canDelete: boolean;
  canRestore: boolean;
  canManage: boolean;
  summary: string;
  reasons: string[];
}

export type DocumentSpaceRole = "owner" | "admin" | "editor" | "viewer";

export interface DocumentSpaceMember {
  uid: string;
  name: string;
  role: DocumentSpaceRole;
  source: string;
  joinedAt: string;
}

export interface DocumentMemberCandidate {
  uid: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  alreadyMember: boolean;
}

export interface DocumentConversationCandidate {
  channelId: string;
  channelType: number;
  name: string;
  boundSpaceId?: string;
  boundSpaceName?: string;
  alreadyBoundToCurrentSpace: boolean;
}

export interface DocumentChannelStorageSpace {
  spaceId: string;
  spaceName: string;
}

export interface DocumentSpaceBinding {
  id: string;
  channelId: string;
  channelType: number;
  name: string;
  createdBy: string;
}

export interface DocumentSpace {
  id: string;
  name: string;
  owner: string;
  fileCount: number;
  memberCount: number;
  members: DocumentSpaceMember[];
  boundConversations: DocumentSpaceBinding[];
  pinnedFileIds: string[];
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

export type RawDocumentSpace = Omit<
  DocumentSpace,
  "members" | "boundConversations" | "pinnedFileIds"
> & {
  members?: DocumentSpaceMember[] | null;
  boundConversations?: DocumentSpaceBinding[] | null;
  pinnedFileIds?: string[] | null;
};

export type RawDocumentState = Omit<
  DocumentState,
  "files" | "spaces" | "audits"
> & {
  files?: DocumentAsset[] | null;
  spaces?: RawDocumentSpace[] | null;
  audits?: DocumentAudit[] | null;
};

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
  sourceType: "单聊" | "群聊" | "上传";
  uploader: string;
  storagePath?: string;
  sourceMessageId?: string;
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
  file?: File;
  storagePath?: string;
}
