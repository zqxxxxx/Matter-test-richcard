import { initialDocumentState } from "./mock";
import type {
  ArchiveMessageFileInput,
  DocumentAsset,
  DocumentAudit,
  DocumentKind,
  DocumentState,
  DocumentSummary,
  UploadDocumentInput,
} from "./types";

export interface DocumentRepository {
  load(): Promise<DocumentState>;
  archiveFile(fileId: string, spaceName: string, actor?: string): Promise<DocumentState>;
  archiveMessageFile(input: ArchiveMessageFileInput, spaceName: string, actor?: string): Promise<DocumentState>;
  uploadFile(input: UploadDocumentInput, spaceName: string, actor?: string): Promise<DocumentState>;
  bindConversationToSpace(spaceId: string, conversationName: string, actor?: string): Promise<DocumentState>;
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

function createAudit(action: string, target: string, detail: string, actor = DEFAULT_ACTOR): DocumentAudit {
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
  const space = state.spaces.find((item) => item.id === spaceIdOrName || item.name === spaceIdOrName);
  if (!space) {
    throw new Error(`Document space not found: ${spaceIdOrName}`);
  }
  return space;
}

export function createDocumentSummary(state: DocumentState): DocumentSummary {
  const activeFiles = state.files.filter((file) => file.status !== "deleted").length;
  const spaceFiles = state.files.filter((file) => file.status === "archived").length;
  const conversationFiles = state.files.filter((file) => file.status === "conversation").length;

  return {
    activeFiles,
    spaceFiles,
    conversationFiles,
  };
}

export class MockDocumentRepository implements DocumentRepository {
  private state: DocumentState;

  constructor(seed: DocumentState = initialDocumentState) {
    this.state = cloneState(seed);
  }

  async load() {
    return cloneState(this.state);
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
    next.audits.unshift(createAudit("归档", file.name, `从${file.sourceName}归档到${spaceName}`, actor));

    this.state = next;
    return this.load();
  }

  async archiveMessageFile(input: ArchiveMessageFileInput, spaceName: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const existing = next.files.find((item) => item.id === input.id);
    const createdAt = input.createdAt || nowText();

    if (existing) {
      existing.status = "archived";
      existing.visibility = "space";
      existing.spaceName = spaceName;
      existing.lastAccessAt = nowText();
      appendFlow(existing, `归档到${spaceName}`);
      next.audits.unshift(createAudit("归档", existing.name, `从${existing.sourceName}归档到${spaceName}`, actor));
      this.state = next;
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
      previewable: input.previewable ?? !["zip", "rar", "7z"].includes(input.extension.toLowerCase().replace(/^\./, "")),
      flow: [`来自${input.sourceName}`, `归档到${spaceName}`],
    };

    next.files.unshift(file);
    const space = next.spaces.find((item) => item.name === spaceName);
    if (space) {
      space.fileCount += 1;
    }
    next.audits.unshift(createAudit("归档", file.name, `从${file.sourceName}归档到${spaceName}`, actor));

    this.state = next;
    return this.load();
  }

  async uploadFile(input: UploadDocumentInput, spaceName: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const createdAt = input.createdAt || nowText();
    const file: DocumentAsset = {
      id: input.id || `UPLOAD-${Date.now()}-${Math.round(Math.random() * 1000)}`,
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
      previewable: input.previewable ?? !["zip", "rar", "7z"].includes(input.extension.toLowerCase().replace(/^\./, "")),
      flow: ["直接上传", `保存到${spaceName}`],
    };

    next.files.unshift(file);
    const space = next.spaces.find((item) => item.name === spaceName);
    if (space) {
      space.fileCount += 1;
    }
    next.audits.unshift(createAudit("上传", file.name, `上传到${spaceName}`, actor));

    this.state = next;
    return this.load();
  }

  async bindConversationToSpace(spaceId: string, conversationName: string, actor = DEFAULT_ACTOR) {
    const name = conversationName.trim();
    if (!name) {
      throw new Error("Conversation name is required");
    }

    const next = cloneState(this.state);
    const space = findSpace(next, spaceId);
    if (!space.boundConversations.includes(name)) {
      space.boundConversations = [...space.boundConversations, name];
      next.audits.unshift(createAudit("绑定群聊", space.name, `${name} 设为${space.name}默认归档空间`, actor));
    }

    this.state = next;
    return this.load();
  }

  async deleteFile(fileId: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const file = findFile(next, fileId);

    file.status = "deleted";
    appendFlow(file, "移动到回收站");
    next.audits.unshift(createAudit("删除", file.name, "移动到回收站，保留期 30 天", actor));

    this.state = next;
    return this.load();
  }

  async restoreFile(fileId: string, actor = DEFAULT_ACTOR) {
    const next = cloneState(this.state);
    const file = findFile(next, fileId);

    file.status = file.spaceName === "会话文件" ? "conversation" : "archived";
    file.visibility = file.spaceName === "会话文件" ? "conversation" : "space";
    appendFlow(file, "从回收站恢复");
    next.audits.unshift(createAudit("恢复", file.name, `恢复到${file.spaceName}`, actor));

    this.state = next;
    return this.load();
  }

}

export const documentRepository = new MockDocumentRepository();
