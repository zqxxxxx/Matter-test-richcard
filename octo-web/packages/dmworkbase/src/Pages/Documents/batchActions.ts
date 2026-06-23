import type {
  DocumentAsset,
  DocumentSpace,
  DocumentSpaceRole,
} from "./types";

export type BatchActionKey = "save" | "move" | "delete";
export type BatchViewKey = "recent" | "conversation" | "space" | "mine" | "trash";

export interface MoveSpaceOption {
  id: string;
  name: string;
  disabled: boolean;
  reason: string;
}

export interface BatchActionItem {
  key: BatchActionKey;
  label: string;
  enabledCount: number;
  skippedCount: number;
  disabled: boolean;
}

export interface BatchActionModel {
  total: number;
  conversationCount: number;
  spaceCount: number;
  skippedCount: number;
  summary: string;
  actions: BatchActionItem[];
}

export function getSpaceRole(space: DocumentSpace, uid: string) {
  if (space.owner === uid) return "owner";
  return space.members.find((member) => member.uid === uid)?.role || "";
}

export function canEditSpace(space: DocumentSpace, uid: string) {
  const role = getSpaceRole(space, uid);
  return role === "owner" || role === "admin" || role === "editor";
}

export function canEditFile(file: DocumentAsset) {
  return file.permissions.canEdit ?? file.permissions.canManage;
}

export function getSpaceRoleLabel(role: DocumentSpaceRole | string) {
  if (role === "owner") return "所有者";
  if (role === "admin") return "管理员";
  if (role === "editor") return "编辑者";
  return "查看者";
}

export function buildMoveSpaceOptions(
  spaces: DocumentSpace[],
  currentUserId: string,
  currentSpaceName?: string
): MoveSpaceOption[] {
  return spaces.map((space) => {
    if (currentSpaceName && space.name === currentSpaceName) {
      return {
        id: space.id,
        name: space.name,
        disabled: true,
        reason: "当前所在空间",
      };
    }
    if (!canEditSpace(space, currentUserId)) {
      return {
        id: space.id,
        name: space.name,
        disabled: true,
        reason: "无编辑权限",
      };
    }
    return {
      id: space.id,
      name: space.name,
      disabled: false,
      reason: "",
    };
  });
}

export function chooseDefaultMoveSpaceName(options: MoveSpaceOption[]) {
  return options.find((option) => !option.disabled)?.name || "";
}

export function buildBatchActionModel(
  files: DocumentAsset[],
  view: BatchViewKey
): BatchActionModel {
  const conversationFiles = files.filter((file) => file.status === "conversation");
  const archivedFiles = files.filter((file) => file.status === "archived");
  const archivableFiles = conversationFiles.filter(
    (file) => file.permissions.canArchive
  );
  const movableFiles = archivedFiles.filter(canEditFile);
  const deletableFiles = files.filter(
    (file) => file.status !== "deleted" && file.permissions.canDelete
  );
  const actionableIds = new Set<string>([
    ...archivableFiles.map((file) => file.id),
    ...movableFiles.map((file) => file.id),
    ...deletableFiles.map((file) => file.id),
  ]);
  const skippedCount = files.filter((file) => !actionableIds.has(file.id)).length;
  const summaryParts = [
    `${conversationFiles.length} 个会话文件`,
    `${archivedFiles.length} 个空间文件`,
  ].filter((part) => !part.startsWith("0 个"));
  if (skippedCount > 0) {
    summaryParts.push(`${skippedCount} 个无权限`);
  }

  const actions: BatchActionItem[] = [];
  const pushAction = (
    key: BatchActionKey,
    label: string,
    enabledCount: number,
    relevantCount: number
  ) => {
    actions.push({
      key,
      label,
      enabledCount,
      skippedCount: Math.max(relevantCount - enabledCount, 0),
      disabled: enabledCount === 0,
    });
  };

  if (view === "conversation") {
    pushAction("save", "保存到空间", archivableFiles.length, conversationFiles.length);
  } else if (view === "space") {
    pushAction("move", "移动到空间", movableFiles.length, archivedFiles.length);
    pushAction("delete", "移到回收站", deletableFiles.length, files.length);
  } else if (view !== "trash") {
    if (conversationFiles.length > 0) {
      pushAction("save", "保存到空间", archivableFiles.length, conversationFiles.length);
    }
    if (archivedFiles.length > 0) {
      pushAction("move", "移动到空间", movableFiles.length, archivedFiles.length);
    }
    if (deletableFiles.length > 0) {
      pushAction("delete", "移到回收站", deletableFiles.length, files.length);
    }
  }

  return {
    total: files.length,
    conversationCount: conversationFiles.length,
    spaceCount: archivedFiles.length,
    skippedCount,
    summary: `已选 ${files.length} 个${
      summaryParts.length > 0 ? `：${summaryParts.join("，")}` : ""
    }`,
    actions,
  };
}
