import APIClient from "../../Service/APIClient";
import type {
  ArchiveMessageFileInput,
  DocumentAsset,
  DocumentChannelStorageSpace,
  DocumentConversationCandidate,
  DocumentMemberCandidate,
  DocumentSpaceRole,
  DocumentState,
  DocumentSummary,
  RawDocumentState,
  UploadDocumentInput,
} from "./types";

interface DocumentApiClient {
  get<T = any>(path: string, config?: any): Promise<T>;
  post(path: string, data?: any, config?: any): Promise<any>;
}

export interface BindConversationInput {
  channelId: string;
  channelType: number;
  name: string;
}

export interface DocumentRepository {
  load(): Promise<DocumentState>;
  subscribe(listener: (state: DocumentState) => void): () => void;
  archiveFile(
    fileId: string,
    spaceName: string,
    actor?: string
  ): Promise<DocumentState>;
  archiveMessageFile(
    input: ArchiveMessageFileInput,
    spaceName: string,
    actor?: string
  ): Promise<DocumentState>;
  autoArchiveMessageFile(
    input: ArchiveMessageFileInput,
    actor?: string
  ): Promise<DocumentState | null>;
  uploadFile(
    input: UploadDocumentInput,
    spaceName: string,
    actor?: string
  ): Promise<DocumentState>;
  bindConversationToSpace(
    spaceId: string,
    conversation: string | BindConversationInput,
    actor?: string
  ): Promise<DocumentState>;
  searchBindingConversations(
    spaceId: string,
    keyword: string
  ): Promise<DocumentConversationCandidate[]>;
  getChannelStorageSpace(
    channelId: string,
    channelType: number
  ): Promise<DocumentChannelStorageSpace>;
  unbindConversationFromSpace(
    spaceId: string,
    bindingId: string
  ): Promise<DocumentState>;
  createSpace(name: string, description?: string): Promise<DocumentState>;
  updateSpace(
    spaceId: string,
    name: string,
    description?: string
  ): Promise<DocumentState>;
  disableSpace(spaceId: string): Promise<DocumentState>;
  saveSpaceMember(
    spaceId: string,
    member: { uid: string; name: string; role: DocumentSpaceRole }
  ): Promise<DocumentState>;
  searchSpaceMembers(
    spaceId: string,
    keyword: string
  ): Promise<DocumentMemberCandidate[]>;
  removeSpaceMember(spaceId: string, memberUid: string): Promise<DocumentState>;
  renameFile(fileId: string, name: string): Promise<DocumentState>;
  moveFile(fileId: string, spaceName: string): Promise<DocumentState>;
  previewFile(fileId: string, actor?: string): Promise<DocumentState>;
  downloadFile(fileId: string, actor?: string): Promise<DocumentState>;
  deleteFile(fileId: string, actor?: string): Promise<DocumentState>;
  restoreFile(fileId: string, actor?: string): Promise<DocumentState>;
  permanentDeleteFile(fileId: string, actor?: string): Promise<DocumentState>;
  emptyTrash(actor?: string): Promise<DocumentState>;
  checkSource(fileId: string): Promise<boolean>;
}

function cloneState(state: DocumentState): DocumentState {
  return JSON.parse(JSON.stringify(state)) as DocumentState;
}

function normalizeDocumentState(raw: RawDocumentState): DocumentState {
  return {
    files: Array.isArray(raw.files) ? raw.files : [],
    audits: Array.isArray(raw.audits) ? raw.audits : [],
    spaces: (Array.isArray(raw.spaces) ? raw.spaces : []).map((space) => ({
      ...space,
      members: Array.isArray(space.members) ? space.members : [],
      boundConversations: Array.isArray(space.boundConversations)
        ? space.boundConversations
        : [],
      pinnedFileIds: Array.isArray(space.pinnedFileIds)
        ? space.pinnedFileIds
        : [],
    })),
  };
}

export function createDocumentSummary(state: DocumentState): DocumentSummary {
  const activeFiles = state.files.filter(
    (file) => file.status !== "deleted"
  ).length;
  const spaceFiles = state.files.filter(
    (file) => file.status === "archived"
  ).length;
  const conversationFiles = state.files.filter(
    (file) => file.status === "conversation"
  ).length;

  return {
    activeFiles,
    spaceFiles,
    conversationFiles,
  };
}

export function resolveDefaultArchiveSpaceName(
  state: DocumentState,
  file: DocumentAsset
) {
  const currentSpace = state.spaces.find(
    (space) => space.name === file.spaceName
  );
  if (currentSpace) return currentSpace.name;

  const boundSpaceName = resolveBoundStorageSpaceName(
    state,
    file.sourceChannelId,
    file.sourceChannelType
  );
  return boundSpaceName || state.spaces[0]?.name || "";
}

export function resolveBoundStorageSpaceName(
  state: DocumentState,
  sourceChannelId: string,
  sourceChannelType: number
) {
  const boundSpace = state.spaces.find((space) =>
    space.boundConversations.some(
      (conversation) =>
        conversation.channelId === sourceChannelId &&
        conversation.channelType === sourceChannelType
    )
  );
  return boundSpace?.name || "";
}

function notifyListeners(
  listeners: Set<(state: DocumentState) => void>,
  state: DocumentState
) {
  const snapshot = cloneState(state);
  listeners.forEach((listener) => listener(snapshot));
}

function sanitizeUploadPath(name: string) {
  return name.replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "_");
}

export class ApiDocumentRepository implements DocumentRepository {
  private state: DocumentState | null = null;
  private listeners = new Set<(state: DocumentState) => void>();

  constructor(private apiClient: DocumentApiClient = APIClient.shared) {}

  async load() {
    const state = normalizeDocumentState(
      await this.apiClient.get<RawDocumentState>("documents/state")
    );
    this.state = cloneState(state);
    return cloneState(state);
  }

  subscribe(listener: (state: DocumentState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async applyState(nextState: Promise<RawDocumentState>) {
    const next = normalizeDocumentState(await nextState);
    this.state = cloneState(next);
    notifyListeners(this.listeners, next);
    return cloneState(next);
  }

  private async refreshState() {
    const next = normalizeDocumentState(
      await this.apiClient.get<RawDocumentState>("documents/state")
    );
    this.state = cloneState(next);
    notifyListeners(this.listeners, next);
    return cloneState(next);
  }

  private async mutateAndRefresh(mutation: Promise<unknown>) {
    await mutation;
    return this.refreshState();
  }

  private async currentState() {
    if (!this.state) {
      await this.load();
    }
    return this.state as DocumentState;
  }

  private async resolveSpaceId(spaceName: string) {
    const state = await this.currentState();
    const space = state.spaces.find(
      (item) => item.id === spaceName || item.name === spaceName
    );
    if (!space) {
      throw new Error(`Document space not found: ${spaceName}`);
    }
    return space.id;
  }

  async archiveFile(fileId: string, spaceName: string, _actor?: string) {
    const spaceId = await this.resolveSpaceId(spaceName);
    return this.applyState(
      this.apiClient.post("documents/archive", {
        asset_id: fileId,
        document_space_id: spaceId,
      })
    );
  }

  async archiveMessageFile(
    input: ArchiveMessageFileInput,
    spaceName: string,
    _actor?: string
  ) {
    const spaceId = await this.resolveSpaceId(spaceName);
    return this.applyState(
      this.apiClient.post("documents/archive", {
        asset_id: input.id,
        document_space_id: spaceId,
        name: input.name,
        extension: input.extension,
        size: input.size,
        storage_path: input.storagePath || "",
        source_name: input.sourceName,
        source_channel_id: input.sourceChannelId,
        source_channel_type: input.sourceChannelType,
        source_message_id: input.sourceMessageId || input.id,
        source_type: input.sourceType,
        uploader_name: input.uploader,
      })
    );
  }

  async autoArchiveMessageFile(input: ArchiveMessageFileInput, actor?: string) {
    if (!input.storagePath) {
      return null;
    }
    const state = await this.currentState();
    const spaceName = resolveBoundStorageSpaceName(
      state,
      input.sourceChannelId,
      input.sourceChannelType
    );
    if (!spaceName) {
      return null;
    }
    return this.archiveMessageFile(input, spaceName, actor);
  }

  async uploadFile(
    input: UploadDocumentInput,
    spaceName: string,
    _actor?: string
  ) {
    const spaceId = await this.resolveSpaceId(spaceName);
    const storagePath =
      input.storagePath ||
      (input.file ? await this.uploadObject(input.file) : "");
    return this.applyState(
      this.apiClient.post("documents/upload", {
        name: input.name,
        extension: input.extension,
        size: input.size,
        uploader_name: input.uploader,
        storage_path: storagePath,
        document_space_id: spaceId,
      })
    );
  }

  async bindConversationToSpace(
    spaceId: string,
    conversation: string | BindConversationInput,
    _actor?: string
  ) {
    const normalized =
      typeof conversation === "string"
        ? {
            channelId: conversation.trim(),
            channelType: 2,
            name: conversation.trim(),
          }
        : {
            channelId: conversation.channelId.trim(),
            channelType: conversation.channelType,
            name: conversation.name.trim(),
          };
    const trimmedName = normalized.name;
    if (!trimmedName) {
      throw new Error("Conversation name is required");
    }
    if (!normalized.channelId) {
      throw new Error("Conversation channel is required");
    }
    return this.applyState(
      this.apiClient.post(
        `documents/spaces/${encodeURIComponent(spaceId)}/bind-conversation`,
        {
          document_space_id: spaceId,
          source_channel_id: normalized.channelId,
          source_channel_type: normalized.channelType,
          source_name: trimmedName,
        }
      )
    );
  }

  async searchBindingConversations(spaceId: string, keyword: string) {
    return this.apiClient.get<DocumentConversationCandidate[]>(
      `documents/spaces/${encodeURIComponent(spaceId)}/bindings/search`,
      { param: { keyword } }
    );
  }

  async getChannelStorageSpace(channelId: string, channelType: number) {
    return this.apiClient.get<DocumentChannelStorageSpace>(
      "documents/channel-storage-space",
      {
        param: {
          source_channel_id: channelId,
          source_channel_type: channelType,
        },
      }
    );
  }

  async unbindConversationFromSpace(spaceId: string, bindingId: string) {
    return this.applyState(
      this.apiClient.post(
        `documents/spaces/${encodeURIComponent(spaceId)}/bindings/${encodeURIComponent(bindingId)}/remove`
      )
    );
  }

  async createSpace(name: string, description = "") {
    return this.applyState(
      this.apiClient.post("documents/spaces", { name, description })
    );
  }

  async updateSpace(spaceId: string, name: string, description = "") {
    return this.applyState(
      this.apiClient.post(`documents/spaces/${encodeURIComponent(spaceId)}`, {
        name,
        description,
      })
    );
  }

  async disableSpace(spaceId: string) {
    return this.applyState(
      this.apiClient.post(
        `documents/spaces/${encodeURIComponent(spaceId)}/disable`
      )
    );
  }

  async saveSpaceMember(
    spaceId: string,
    member: { uid: string; name: string; role: DocumentSpaceRole }
  ) {
    return this.applyState(
      this.apiClient.post(
        `documents/spaces/${encodeURIComponent(spaceId)}/members`,
        member
      )
    );
  }

  async searchSpaceMembers(spaceId: string, keyword: string) {
    return this.apiClient.get<DocumentMemberCandidate[]>(
      `documents/spaces/${encodeURIComponent(spaceId)}/members/search`,
      { param: { keyword } }
    );
  }

  async removeSpaceMember(spaceId: string, memberUid: string) {
    return this.applyState(
      this.apiClient.post(
        `documents/spaces/${encodeURIComponent(spaceId)}/members/${encodeURIComponent(memberUid)}/remove`
      )
    );
  }

  async renameFile(fileId: string, name: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/rename`, {
        name,
      })
    );
  }

  async moveFile(fileId: string, spaceName: string) {
    const spaceId = await this.resolveSpaceId(spaceName);
    return this.mutateAndRefresh(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/move`, {
        document_space_id: spaceId,
      })
    );
  }

  async previewFile(fileId: string, _actor?: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/preview`)
    );
  }

  async downloadFile(fileId: string, _actor?: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/download`)
    );
  }

  async deleteFile(fileId: string, _actor?: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/trash`)
    );
  }

  async restoreFile(fileId: string, _actor?: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/restore`)
    );
  }

  async permanentDeleteFile(fileId: string, _actor?: string) {
    return this.applyState(
      this.apiClient.post(
        `documents/${encodeURIComponent(fileId)}/permanent-delete`
      )
    );
  }

  async emptyTrash(_actor?: string) {
    return this.applyState(this.apiClient.post("documents/trash/empty"));
  }

  async checkSource(fileId: string) {
    const result = await this.apiClient.get<{ accessible: boolean }>(
      "documents/source/check",
      {
        param: {
          asset_id: fileId,
        },
      }
    );
    return Boolean(result?.accessible);
  }

  private async uploadObject(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("contenttype", file.type || "application/octet-stream");
    const path = `/documents/${Date.now()}-${sanitizeUploadPath(file.name)}`;
    await this.apiClient.post(
      `file/upload?type=common&path=${encodeURIComponent(path)}`,
      formData
    );
    return `common${path}`;
  }
}

export const documentRepository = new ApiDocumentRepository();
