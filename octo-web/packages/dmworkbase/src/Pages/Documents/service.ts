import { initialDocumentState } from "./mock";
import APIClient from "../../Service/APIClient";
import type {
  ArchiveMessageFileInput,
  DocumentAsset,
  DocumentAudit,
  DocumentKind,
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
}

const DEFAULT_ACTOR = "陈一";

function cloneState(state: DocumentState): DocumentState {
  return JSON.parse(JSON.stringify(state)) as DocumentState;
}

function nowText() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date()).replace(/\//g, "-");
}

function createAudit(
  action: string,
  target: string,
  detail: string,
  actor = DEFAULT_ACTOR
): DocumentAudit {
  return {
    id: `AUD-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    time: nowText(),
    actor,
    action,
    target,
    detail,
  };
}

function appendFlow(file: DocumentAsset, flowText: string) {
  file.flow = [...file.flow, flowText];
}

function getDocumentKind(extension: string): DocumentKind {
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (["pdf"].includes(ext)) return "pdf";
  if (["xls", "xlsx", "csv"].includes(ext)) return "sheet";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  return "doc";
}

function findFile(state: DocumentState, fileId: string) {
  const file = state.files.find((item) => item.id === fileId);
  if (!file) {
    throw new Error(`Document file not found: ${fileId}`);
  }
  return file;
}

function findSpace(state: DocumentState, spaceIdOrName: string) {
  const space = state.spaces.find(
    (item) => item.id === spaceIdOrName || item.name === spaceIdOrName
  );
  if (!space) {
    throw new Error(`Document space not found: ${spaceIdOrName}`);
  }
  return space;
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

export class MockDocumentRepository implements DocumentRepository {
  private state: DocumentState;
  private listeners = new Set<(state: DocumentState) => void>();

  constructor(seed: DocumentState = initialDocumentState) {
    this.state = cloneState(seed);
  }

  async load() {
    return cloneState(this.state);
  }

  subscribe(listener: (state: DocumentState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange() {
    const snapshot = cloneState(this.state);
    this.listeners.forEach((listener) => listener(snapshot));
  }

  async archiveFile(fileId: string, spaceName: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const file = findFile(next, fileId);
    const wasSpaceFile = file.status === "archived";

    file.status = "archived";
    file.visibility = "space";
    file.spaceName = spaceName;
    appendFlow(file, `归档到${spaceName}`);
    if (!wasSpaceFile) {
      findSpace(next, spaceName).fileCount += 1;
    }
    next.audits.unshift(
      createAudit(
        "归档",
        file.name,
        `从${file.sourceName}归档到${spaceName}`,
        actor
      )
    );

    this.state = next;
    this.emitChange();
    return this.load();
  }

  async archiveMessageFile(
    input: ArchiveMessageFileInput,
    spaceName: string,
    actor = DEFAULT_ACTOR
  ) {
    const next = cloneState(this.state);
    const existing = next.files.find((item) => item.id === input.id);
    const createdAt = input.createdAt || nowText();

    if (existing) {
      existing.status = "archived";
      existing.visibility = "space";
      existing.spaceName = spaceName;
      existing.lastAccessAt = nowText();
      appendFlow(existing, `归档到${spaceName}`);
      next.audits.unshift(
        createAudit(
          "归档",
          existing.name,
          `从${existing.sourceName}归档到${spaceName}`,
          actor
        )
      );
      this.state = next;
      this.emitChange();
      return this.load();
    }

    const file: DocumentAsset = {
      id: input.id,
      name: input.name || "未命名文件",
      kind: getDocumentKind(input.extension),
      extension: input.extension,
      size: input.size,
      owner: actor,
      uploader: input.uploader,
      sourceName: input.sourceName,
      sourceChannelId: input.sourceChannelId,
      sourceChannelType: input.sourceChannelType,
      sourceType: input.sourceType,
      spaceName,
      visibility: "space",
      status: "archived",
      createdAt,
      lastAccessAt: nowText(),
      downloads: 0,
      previewable:
        input.previewable ??
        !["zip", "rar", "7z"].includes(
          input.extension.toLowerCase().replace(/^\./, "")
        ),
      flow: [`来自${input.sourceName}`, `归档到${spaceName}`],
    };

    next.files.unshift(file);
    const space = next.spaces.find((item) => item.name === spaceName);
    if (space) {
      space.fileCount += 1;
    }
    next.audits.unshift(
      createAudit(
        "归档",
        file.name,
        `从${file.sourceName}归档到${spaceName}`,
        actor
      )
    );

    this.state = next;
    this.emitChange();
    return this.load();
  }

  async uploadFile(
    input: UploadDocumentInput,
    spaceName: string,
    actor = DEFAULT_ACTOR
  ) {
    const next = cloneState(this.state);
    const createdAt = input.createdAt || nowText();
    const file: DocumentAsset = {
      id:
        input.id || `UPLOAD-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      name: input.name || "未命名文件",
      kind: getDocumentKind(input.extension),
      extension: input.extension,
      size: input.size,
      owner: actor,
      uploader: input.uploader,
      sourceName: "直接上传",
      sourceChannelId: "",
      sourceChannelType: 0,
      sourceType: "应用",
      spaceName,
      visibility: "space",
      status: "archived",
      createdAt,
      lastAccessAt: nowText(),
      downloads: 0,
      previewable:
        input.previewable ??
        !["zip", "rar", "7z"].includes(
          input.extension.toLowerCase().replace(/^\./, "")
        ),
      flow: ["直接上传", `保存到${spaceName}`],
    };

    next.files.unshift(file);
    const space = next.spaces.find((item) => item.name === spaceName);
    if (space) {
      space.fileCount += 1;
    }
    next.audits.unshift(
      createAudit("上传", file.name, `上传到${spaceName}`, actor)
    );

    this.state = next;
    this.emitChange();
    return this.load();
  }

  async bindConversationToSpace(
    spaceId: string,
    conversationName: string,
    actor = DEFAULT_ACTOR
  ) {
    const name = conversationName.trim();
    if (!name) {
      throw new Error("Conversation name is required");
    }

    const next = cloneState(this.state);
    const space = findSpace(next, spaceId);
    if (!space.boundConversations.includes(name)) {
      space.boundConversations = [...space.boundConversations, name];
      next.audits.unshift(
        createAudit(
          "绑定群聊",
          space.name,
          `${name} 设为${space.name}默认归档空间`,
          actor
        )
      );
    }

    this.state = next;
    this.emitChange();
    return this.load();
  }

  async previewFile(fileId: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const file = findFile(next, fileId);

    file.lastAccessAt = nowText();
    appendFlow(file, `${actor} 预览文件`);
    next.audits.unshift(
      createAudit("预览", file.name, `${actor}在线预览`, actor)
    );

    this.state = next;
    this.emitChange();
    return this.load();
  }

  async downloadFile(fileId: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const file = findFile(next, fileId);

    file.downloads += 1;
    file.lastAccessAt = nowText();
    appendFlow(file, `${actor} 下载文件`);
    next.audits.unshift(
      createAudit("下载", file.name, `${actor}下载文件`, actor)
    );

    this.state = next;
    this.emitChange();
    return this.load();
  }

  async deleteFile(fileId: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const file = findFile(next, fileId);
    const wasSpaceFile = file.status === "archived";

    file.status = "deleted";
    appendFlow(file, "移动到回收站");
    if (wasSpaceFile) {
      const space = next.spaces.find((item) => item.name === file.spaceName);
      if (space) {
        space.fileCount = Math.max(0, space.fileCount - 1);
      }
    }
    next.audits.unshift(
      createAudit("删除", file.name, "移动到回收站，保留期 30 天", actor)
    );

    this.state = next;
    this.emitChange();
    return this.load();
  }

  async restoreFile(fileId: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const file = findFile(next, fileId);
    const restoreToSpace = file.spaceName !== "会话文件";

    file.status = restoreToSpace ? "archived" : "conversation";
    file.visibility = restoreToSpace ? "space" : "conversation";
    appendFlow(file, "从回收站恢复");
    if (restoreToSpace) {
      const space = next.spaces.find((item) => item.name === file.spaceName);
      if (space) {
        space.fileCount += 1;
      }
    }
    next.audits.unshift(
      createAudit("恢复", file.name, `恢复到${file.spaceName}`, actor)
    );

    this.state = next;
    this.emitChange();
    return this.load();
  }
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

  async archiveFile(fileId: string, spaceName: string) {
    const spaceId = await this.resolveSpaceId(spaceName);
    return this.applyState(
      this.apiClient.post("documents/archive", {
        asset_id: fileId,
        document_space_id: spaceId,
      })
    );
  }

  async archiveMessageFile(input: ArchiveMessageFileInput, spaceName: string) {
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

  async uploadFile(input: UploadDocumentInput, spaceName: string) {
    const spaceId = await this.resolveSpaceId(spaceName);
    const storagePath =
      input.storagePath ||
      (input.file ? await this.uploadObject(input.file) : "");
    return this.applyState(
      this.apiClient.post("documents/upload", {
        name: input.name,
        extension: input.extension,
        size: input.size,
        storage_path: storagePath,
        document_space_id: spaceId,
      })
    );
  }

  async bindConversationToSpace() {
    return this.load();
  }

  async previewFile(fileId: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/preview`)
    );
  }

  async downloadFile(fileId: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/download`)
    );
  }

  async deleteFile(fileId: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/trash`)
    );
  }

  async restoreFile(fileId: string) {
    return this.applyState(
      this.apiClient.post(`documents/${encodeURIComponent(fileId)}/restore`)
    );
  }

  private async uploadObject(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("contenttype", file.type || "application/octet-stream");
    const path = `/documents/${Date.now()}-${sanitizeUploadPath(file.name)}`;
    const resp = await this.apiClient.post(
      `file/upload?type=common&path=${encodeURIComponent(path)}`,
      formData
    );
    return resp?.path || path;
  }
}

export class FallbackDocumentRepository implements DocumentRepository {
  private usingFallback = false;

  constructor(
    private primary: DocumentRepository,
    private fallback: DocumentRepository
  ) {}

  async load() {
    if (this.usingFallback) return this.fallback.load();
    try {
      return await this.primary.load();
    } catch (error) {
      this.usingFallback = true;
      return this.fallback.load();
    }
  }

  subscribe(listener: (state: DocumentState) => void) {
    const unsubscribePrimary = this.primary.subscribe(listener);
    const unsubscribeFallback = this.fallback.subscribe(listener);
    return () => {
      unsubscribePrimary();
      unsubscribeFallback();
    };
  }

  private active() {
    return this.usingFallback ? this.fallback : this.primary;
  }

  private async run(
    operation: (repo: DocumentRepository) => Promise<DocumentState>
  ) {
    if (this.usingFallback) return operation(this.fallback);
    try {
      return await operation(this.primary);
    } catch (error) {
      this.usingFallback = true;
      return operation(this.fallback);
    }
  }

  archiveFile(fileId: string, spaceName: string, actor?: string) {
    return this.run((repo) => repo.archiveFile(fileId, spaceName, actor));
  }

  archiveMessageFile(
    input: ArchiveMessageFileInput,
    spaceName: string,
    actor?: string
  ) {
    return this.run((repo) => repo.archiveMessageFile(input, spaceName, actor));
  }

  uploadFile(input: UploadDocumentInput, spaceName: string, actor?: string) {
    return this.run((repo) => repo.uploadFile(input, spaceName, actor));
  }

  bindConversationToSpace(
    spaceId: string,
    conversationName: string,
    actor?: string
  ) {
    return this.active().bindConversationToSpace(
      spaceId,
      conversationName,
      actor
    );
  }

  previewFile(fileId: string, actor?: string) {
    return this.run((repo) => repo.previewFile(fileId, actor));
  }

  downloadFile(fileId: string, actor?: string) {
    return this.run((repo) => repo.downloadFile(fileId, actor));
  }

  deleteFile(fileId: string, actor?: string) {
    return this.run((repo) => repo.deleteFile(fileId, actor));
  }

  restoreFile(fileId: string, actor?: string) {
    return this.run((repo) => repo.restoreFile(fileId, actor));
  }
}

export const documentRepository = new FallbackDocumentRepository(
  new ApiDocumentRepository(),
  new MockDocumentRepository()
);
