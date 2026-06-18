import APIClient from "../../Service/APIClient";
import type {
  ArchiveMessageFileInput,
  DocumentState,
  DocumentSummary,
  UploadDocumentInput,
} from "./types";

interface DocumentApiClient {
  get<T = any>(path: string, config?: any): Promise<T>;
  post(path: string, data?: any, config?: any): Promise<any>;
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
  uploadFile(
    input: UploadDocumentInput,
    spaceName: string,
    actor?: string
  ): Promise<DocumentState>;
  bindConversationToSpace(
    spaceId: string,
    conversationName: string,
    actor?: string
  ): Promise<DocumentState>;
  previewFile(fileId: string, actor?: string): Promise<DocumentState>;
  downloadFile(fileId: string, actor?: string): Promise<DocumentState>;
  deleteFile(fileId: string, actor?: string): Promise<DocumentState>;
  restoreFile(fileId: string, actor?: string): Promise<DocumentState>;
  checkSource(fileId: string): Promise<boolean>;
}

function cloneState(state: DocumentState): DocumentState {
  return JSON.parse(JSON.stringify(state)) as DocumentState;
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
    const state = await this.apiClient.get<DocumentState>("documents/state");
    this.state = cloneState(state);
    return cloneState(state);
  }

  subscribe(listener: (state: DocumentState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async applyState(nextState: Promise<DocumentState>) {
    const next = await nextState;
    this.state = cloneState(next);
    notifyListeners(this.listeners, next);
    return cloneState(next);
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
        source_name: input.sourceName,
        source_channel_id: input.sourceChannelId,
        source_channel_type: input.sourceChannelType,
        source_type: input.sourceType,
        uploader_name: input.uploader,
      })
    );
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
    conversationName: string,
    _actor?: string
  ) {
    const trimmedName = conversationName.trim();
    if (!trimmedName) {
      throw new Error("Conversation name is required");
    }
    return this.applyState(
      this.apiClient.post(
        `documents/spaces/${encodeURIComponent(spaceId)}/bind-conversation`,
        {
          document_space_id: spaceId,
          source_channel_id: trimmedName,
          source_channel_type: 2,
          source_name: trimmedName,
        }
      )
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
