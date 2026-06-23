import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FolderOpen,
  Inbox,
  MoveRight,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Upload,
  UserRound,
  Users,
} from "lucide-react";
import { Button, Input, Modal, Select, TextArea, Toast } from "@douyinfe/semi-ui";
import { Channel } from "wukongimjssdk";
import { ShowConversationOptions } from "../../EndpointCommon";
import WKApp from "../../App";
import {
  canPreviewInPanel,
  fileRendererRegistry,
  type FilePreviewInfo,
} from "../../Components/FilePreviewPanel";
import { formatFileSize, getFileIconInfo } from "../../Messages/File";
import {
  downloadFile,
  getPresignedDownloadUrl,
  getPresignedPreviewUrl,
} from "../../Utils/download";
import { canPreviewDocumentAsset } from "./preview";
import {
  documentRepository,
  resolveDefaultArchiveSpaceName,
} from "./service";
import { buildDocumentSourceNavigation } from "./sourceNavigation";
import { extractDocumentErrorMessage } from "./errors";
import {
  getBrowserDocumentNavigationTarget,
  replaceBrowserDocumentNavigation,
  type DocumentNavigationTarget,
  type DocumentView,
} from "./navigationState";
import {
  buildBatchActionModel,
  buildMoveSpaceOptions,
  canEditFile,
  chooseDefaultMoveSpaceName,
  getSpaceRoleLabel,
  type BatchActionKey,
  type MoveSpaceOption,
} from "./batchActions";
import {
  buildSpaceMemberRoleUpdate,
  canChangeSpaceMemberRole,
  editableSpaceRoleOptions,
} from "./memberPermissions";
import type {
  DocumentAsset,
  DocumentConversationCandidate,
  DocumentKind,
  DocumentMemberCandidate,
  DocumentSpaceMember,
  DocumentSpaceRole,
  DocumentState,
} from "./types";
import "./index.css";

type DocumentSort = "recent" | "created" | "size";
type SourceFilter = "all" | DocumentAsset["sourceType"];

const DOCUMENT_NAVIGATION_EVENT = "octo-documents:navigate";
const DOCUMENT_UPLOAD_EVENT = "octo-documents:upload";
let pendingNavigationTarget: DocumentNavigationTarget | null = null;
let pendingUploadOpen = false;

export function ensureDocumentWorkspaceLocation() {
  WKApp.route.currentPath = "/documents";
  WKApp.switchToMenuById?.("documents");
  WKApp.currentMenuId = "documents";
  if (window.location.pathname === "/documents/workspace") return;
  const url = new URL(window.location.href);
  url.pathname = "/documents/workspace";
  window.history.replaceState(
    window.history.state || {},
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
}

const viewOptions: Array<{
  key: DocumentView;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: "recent",
    label: "最近查看",
    description: "按最近访问排序",
    icon: <Clock3 size={16} />,
  },
  {
    key: "conversation",
    label: "会话文件",
    description: "尚未归档的 IM 文件",
    icon: <Inbox size={16} />,
  },
  {
    key: "space",
    label: "空间文件",
    description: "已沉淀到空间",
    icon: <FolderOpen size={16} />,
  },
  {
    key: "mine",
    label: "我上传的",
    description: "当前账号上传",
    icon: <UserRound size={16} />,
  },
  {
    key: "trash",
    label: "回收站",
    description: "已删除可恢复",
    icon: <Trash2 size={16} />,
  },
];

const kindOptions: Array<{ value: "all" | DocumentKind; label: string }> = [
  { value: "all", label: "全部类型" },
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "文档" },
  { value: "sheet", label: "表格" },
  { value: "image", label: "图片" },
  { value: "zip", label: "压缩包" },
];

const sourceOptions: Array<{ value: SourceFilter; label: string }> = [
  { value: "all", label: "全部来源" },
  { value: "群聊", label: "群聊" },
  { value: "单聊", label: "单聊" },
  { value: "上传", label: "上传" },
];

const sortOptions: Array<{ value: DocumentSort; label: string }> = [
  { value: "recent", label: "最近查看" },
  { value: "created", label: "上传时间" },
  { value: "size", label: "文件大小" },
];

const spaceRoleOptions: Array<{ value: DocumentSpaceRole; label: string }> = [
  { value: "viewer", label: "查看者" },
  { value: "editor", label: "编辑者" },
  { value: "admin", label: "管理员" },
];

function formatMemberCandidate(candidate: DocumentMemberCandidate) {
  return `${candidate.name || candidate.uid}（${candidate.username || candidate.uid}）`;
}

function useDocumentState() {
  const [state, setState] = useState<DocumentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await documentRepository.load();
      setState(next);
      return next;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload().catch(() => undefined);
    return documentRepository.subscribe((next) => {
      setState(next);
      setError(null);
    });
  }, []);

  return { state, setState, reload, loading, error };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "文档接口暂不可用";
}

function getStatusText(file: DocumentAsset) {
  if (file.status === "deleted") return "回收站";
  if (file.status === "archived") return "空间文件";
  return "会话文件";
}

function getExtension(fileName: string) {
  const extension = fileName.split(".").pop() || "";
  return extension === fileName ? "" : extension.toLowerCase();
}

function getCurrentUserName() {
  return WKApp.loginInfo.name || "陈一";
}

function getCurrentUserId() {
  return WKApp.loginInfo.uid || WKApp.loginInfo.name || "pm_chen01";
}

function getViewLabel(view: DocumentView) {
  return viewOptions.find((item) => item.key === view)?.label || "文档";
}

function getViewDescription(view: DocumentView, spaceName = "") {
  if (spaceName) return `空间文件 · ${spaceName}`;
  return (
    viewOptions.find((item) => item.key === view)?.description ||
    "查看会话与空间中的文件"
  );
}

function getSpaceFileCount(state: DocumentState, spaceName: string) {
  return state.files.filter(
    (file) => file.status === "archived" && file.spaceName === spaceName
  ).length;
}

function getViewCount(
  state: DocumentState,
  view: DocumentView,
  currentUser: string
) {
  return filterFiles(state.files, {
    view,
    currentUser,
    keyword: "",
    kind: "all",
    source: "all",
    uploader: "all",
    sort: "recent",
  }).length;
}

export function navigateWorkspace(
  target: DocumentNavigationTarget = { view: "recent" }
) {
  pendingNavigationTarget = target;
  ensureDocumentWorkspaceLocation();
  replaceBrowserDocumentNavigation(target);
  const page = WKApp.route.get("/documents/workspace");
  if (page && React.isValidElement(page)) {
    WKApp.routeRight.replaceToRoot(page);
  }
  window.dispatchEvent(
    new CustomEvent<DocumentNavigationTarget>(DOCUMENT_NAVIGATION_EVENT, {
      detail: target,
    })
  );
}

function openUploadDialog() {
  pendingUploadOpen = true;
  ensureDocumentWorkspaceLocation();
  const page = WKApp.route.get("/documents/workspace");
  if (page && React.isValidElement(page)) {
    WKApp.routeRight.replaceToRoot(page);
  }
  window.dispatchEvent(new Event(DOCUMENT_UPLOAD_EVENT));
}

function filterFiles(
  files: DocumentAsset[],
  options: {
    view: DocumentView;
    currentUser: string;
    keyword: string;
    kind: "all" | DocumentKind;
    source: SourceFilter;
    uploader: string;
    sort: DocumentSort;
    spaceName?: string;
  }
) {
  const query = options.keyword.trim().toLowerCase();

  const filtered = files
    .filter((file) => {
      if (options.view === "trash") return file.status === "deleted";
      if (file.status === "deleted") return false;
      if (options.view === "conversation")
        return file.status === "conversation";
      if (options.view === "space") return file.status === "archived";
      if (options.view === "mine") return file.uploader === options.currentUser;
      return true;
    })
    .filter((file) =>
      options.spaceName
        ? file.status === "archived" && file.spaceName === options.spaceName
        : true
    )
    .filter((file) =>
      options.kind === "all" ? true : file.kind === options.kind
    )
    .filter((file) =>
      options.source === "all" ? true : file.sourceType === options.source
    )
    .filter((file) =>
      options.uploader === "all" ? true : file.uploader === options.uploader
    )
    .filter((file) => {
      if (!query) return true;
      return [file.name, file.uploader, file.sourceName, file.spaceName].some(
        (text) => text.toLowerCase().includes(query)
      );
    });

  return filtered.sort((a, b) => {
    if (options.sort === "created")
      return b.createdAt.localeCompare(a.createdAt);
    if (options.sort === "size") return b.size - a.size;
    return b.lastAccessAt.localeCompare(a.lastAccessAt);
  });
}

function FileBadge({ file }: { file: DocumentAsset }) {
  const info = getFileIconInfo(file.extension, file.name);

  return (
    <div className="wk-docs-file-badge" style={{ color: info.color }}>
      <span>{info.label}</span>
    </div>
  );
}

function StatusPill({ file }: { file: DocumentAsset }) {
  return (
    <span className={`wk-docs-status wk-docs-status-${file.status}`}>
      {getStatusText(file)}
    </span>
  );
}

export default function DocumentsPage() {
  const { state, setState, loading, error, reload } = useDocumentState();
  const currentUser = getCurrentUserName();
  const [activeTarget, setActiveTarget] = useState<DocumentNavigationTarget>(
    () => getBrowserDocumentNavigationTarget()
  );
  const [spaceCreateVisible, setSpaceCreateVisible] = useState(false);
  const [spaceDraftName, setSpaceDraftName] = useState("");
  const [spaceDraftDescription, setSpaceDraftDescription] = useState("");

  useEffect(() => {
    const listener = (event: Event) => {
      const target = (event as CustomEvent<DocumentNavigationTarget>).detail;
      setActiveTarget({
        view: target.view,
        spaceName: target.spaceName || "",
      });
    };
    window.addEventListener(DOCUMENT_NAVIGATION_EVENT, listener);
    return () =>
      window.removeEventListener(DOCUMENT_NAVIGATION_EVENT, listener);
  }, []);

  function openDocumentTarget(target: DocumentNavigationTarget) {
    setActiveTarget({
      view: target.view,
      spaceName: target.spaceName || "",
    });
    navigateWorkspace(target);
  }

  async function submitCreateSpace() {
    const name = spaceDraftName.trim();
    if (!name) {
      Toast.warning("请输入空间名称");
      return;
    }
    const next = await documentRepository.createSpace(
      name,
      spaceDraftDescription
    );
    setState(next);
    setSpaceCreateVisible(false);
    setSpaceDraftName("");
    setSpaceDraftDescription("");
    openDocumentTarget({ view: "space", spaceName: name });
    Toast.success(`已新建空间：${name}`);
  }

  return (
    <div className="wk-docs-entry">
      <div className="wk-docs-entry-header">
        <div>
          <h1>文档</h1>
          <p>查看会话与空间中的文件</p>
        </div>
        <Button
          className="wk-docs-entry-upload-button"
          theme="solid"
          icon={<Upload size={16} />}
          aria-label="上传文件"
          title="上传文件"
          onClick={openUploadDialog}
        />
      </div>

      {error && <DocumentError message={error} onRetry={reload} />}
      {loading && !state && <div className="wk-docs-empty">正在加载文档</div>}

      <section className="wk-docs-entry-section">
        <div className="wk-docs-nav-list">
          {state &&
            viewOptions.map((item) => (
              <button
                key={item.key}
                className={`wk-docs-nav-row ${
                  activeTarget.view === item.key && !activeTarget.spaceName
                    ? "active"
                    : ""
                }`}
                onClick={() => openDocumentTarget({ view: item.key })}
              >
                {item.icon}
                <span>
                  <strong>{item.label}</strong>
                  <em>{item.description}</em>
                </span>
                <small>{getViewCount(state, item.key, currentUser)}</small>
              </button>
            ))}
        </div>
      </section>

      <section className="wk-docs-entry-section">
        <div className="wk-docs-section-title">
          <span>空间</span>
          <Button
            theme="borderless"
            icon={<Plus size={15} />}
            aria-label="新增空间"
            title="新增空间"
            onClick={() => setSpaceCreateVisible(true)}
          />
        </div>
        <div className="wk-docs-space-list">
          {state?.spaces.map((space) => (
            <button
              key={space.id}
              className={`wk-docs-space-row ${
                activeTarget.spaceName === space.name ? "active" : ""
              }`}
              onClick={() =>
                openDocumentTarget({ view: "space", spaceName: space.name })
              }
            >
              <FolderOpen size={16} />
              <span>
                <strong>{space.name}</strong>
                <em>{getSpaceFileCount(state, space.name)} 个文件</em>
              </span>
            </button>
          ))}
        </div>
      </section>
      <Modal
        title="新增空间"
        visible={spaceCreateVisible}
        okText="创建"
        cancelText="取消"
        onOk={submitCreateSpace}
        onCancel={() => setSpaceCreateVisible(false)}
      >
        <div className="wk-docs-form">
          <label>
            <span>空间名称</span>
            <Input
              value={spaceDraftName}
              onChange={setSpaceDraftName}
              placeholder="例如：产品部公共空间"
            />
          </label>
          <label>
            <span>空间描述</span>
            <TextArea
              value={spaceDraftDescription}
              onChange={setSpaceDraftDescription}
              placeholder="描述这个空间沉淀哪些文件"
              autosize
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}

export function DocumentsWorkspace() {
  const { state, setState, loading, error, reload } = useDocumentState();
  const initialNavigationRef = useRef(getBrowserDocumentNavigationTarget());
  const [view, setView] = useState<DocumentView>(
    () => initialNavigationRef.current.view
  );
  const [spaceName, setSpaceName] = useState(
    () => initialNavigationRef.current.spaceName || ""
  );
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState<"all" | DocumentKind>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [uploader, setUploader] = useState("all");
  const [sort, setSort] = useState<DocumentSort>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialNavigationRef.current.fileId || null
  );
  const [archiveSpaceName, setArchiveSpaceName] = useState("");
  const [previewFile, setPreviewFile] = useState<FilePreviewInfo | null>(null);
  const previewRequestRef = useRef(0);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadSpaceName, setUploadSpaceName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentAsset | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DocumentAsset | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [moveTarget, setMoveTarget] = useState<DocumentAsset | null>(null);
  const [moveSpaceName, setMoveSpaceName] = useState("");
  const [spaceSettingsVisible, setSpaceSettingsVisible] = useState(false);
  const [spaceMembersVisible, setSpaceMembersVisible] = useState(false);
  const [spaceDraftName, setSpaceDraftName] = useState("");
  const [spaceDraftDescription, setSpaceDraftDescription] = useState("");
  const [memberDraftUid, setMemberDraftUid] = useState("");
  const [memberDraftName, setMemberDraftName] = useState("");
  const [memberSearchKeyword, setMemberSearchKeyword] = useState("");
  const [memberCandidates, setMemberCandidates] = useState<
    DocumentMemberCandidate[]
  >([]);
  const [selectedMemberCandidate, setSelectedMemberCandidate] =
    useState<DocumentMemberCandidate | null>(null);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberSearchError, setMemberSearchError] = useState("");
  const [memberDraftRole, setMemberDraftRole] =
    useState<DocumentSpaceRole>("viewer");
  const [memberRoleUpdatingUid, setMemberRoleUpdatingUid] = useState("");
  const [bindingSearchKeyword, setBindingSearchKeyword] = useState("");
  const [bindingCandidates, setBindingCandidates] = useState<
    DocumentConversationCandidate[]
  >([]);
  const [selectedBindingCandidates, setSelectedBindingCandidates] = useState<
    DocumentConversationCandidate[]
  >([]);
  const [bindingSearchLoading, setBindingSearchLoading] = useState(false);
  const [bindingSearchError, setBindingSearchError] = useState("");
  const [batchSpaceAction, setBatchSpaceAction] =
    useState<Extract<BatchActionKey, "save" | "move"> | null>(null);
  const [batchSpaceName, setBatchSpaceName] = useState("");
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<string>>(
    () => new Set()
  );
  const currentUser = getCurrentUserName();

  const uploaderOptions = useMemo(() => {
    if (!state) return [];
    return Array.from(
      new Set<string>(state.files.map((file) => file.uploader))
    ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [state]);
  const activeTitle = spaceName || getViewLabel(view);
  const activeDescription = getViewDescription(view, spaceName);
  const activeSpace = useMemo(() => {
    if (!state || !spaceName) return null;
    return state.spaces.find((space) => space.name === spaceName) || null;
  }, [state, spaceName]);
  const activeSpaceBindings = activeSpace?.boundConversations ?? [];
  const activeSpaceMembers = activeSpace?.members ?? [];
  const currentUserId = getCurrentUserId();
  const activeSpaceRole = useMemo(() => {
    if (!activeSpace) return "";
    if (activeSpace.owner === currentUserId) return "owner";
    return (
      activeSpaceMembers.find((member) => member.uid === currentUserId)?.role ||
      ""
    );
  }, [activeSpace, activeSpaceMembers, currentUserId]);
  const canManageActiveSpace =
    activeSpaceRole === "owner" || activeSpaceRole === "admin";
  const hasActiveFilters =
    Boolean(keyword.trim()) ||
    kind !== "all" ||
    source !== "all" ||
    uploader !== "all" ||
    sort !== "recent";
  const visibleFiles = useMemo(() => {
    if (!state) return [];
    return filterFiles(state.files, {
      view,
      currentUser,
      keyword,
      kind,
      source,
      uploader,
      sort,
      spaceName,
    });
  }, [
    state,
    view,
    currentUser,
    keyword,
    kind,
    source,
    uploader,
    sort,
    spaceName,
  ]);
  const selectedFile = useMemo(() => {
    if (!state) return null;
    return (
      state.files.find((file) => file.id === selectedId) ||
      visibleFiles[0] ||
      null
    );
  }, [state, selectedId, visibleFiles]);
  const batchSelectedFiles = useMemo(() => {
    if (!state) return [];
    return state.files.filter((file) => batchSelectedIds.has(file.id));
  }, [state, batchSelectedIds]);
  const moveSpaceOptions = useMemo(() => {
    if (!state) return [];
    return buildMoveSpaceOptions(state.spaces, currentUserId, moveTarget?.spaceName);
  }, [state, currentUserId, moveTarget?.spaceName]);
  const batchActionModel = useMemo(
    () => buildBatchActionModel(batchSelectedFiles, view),
    [batchSelectedFiles, view]
  );
  const batchArchiveableFiles = batchSelectedFiles.filter(
    (file) => file.status === "conversation" && file.permissions.canArchive
  );
  const batchMovableFiles = batchSelectedFiles.filter(
    (file) => file.status === "archived" && canEditFile(file)
  );
  const batchDeletableFiles = batchSelectedFiles.filter(
    (file) => file.status !== "deleted" && file.permissions.canDelete
  );
  const batchSpaceOptions = useMemo<MoveSpaceOption[]>(() => {
    if (!state || !batchSpaceAction) return [];
    const baseOptions = buildMoveSpaceOptions(state.spaces, currentUserId);
    if (batchSpaceAction !== "move") return baseOptions;
    return baseOptions.map((option) => {
      const allSelectedAlreadyInSpace =
        batchMovableFiles.length > 0 &&
        batchMovableFiles.every((file) => file.spaceName === option.name);
      if (!allSelectedAlreadyInSpace) return option;
      return {
        ...option,
        disabled: true,
        reason: option.reason || "已在该空间",
      };
    });
  }, [state, currentUserId, batchSpaceAction, batchMovableFiles]);
  const selectedMoveSpaceOption = moveSpaceOptions.find(
    (option) => option.name === moveSpaceName
  );
  const selectedBatchSpaceOption = batchSpaceOptions.find(
    (option) => option.name === batchSpaceName
  );
  const emptyTitle = hasActiveFilters
    ? "没有匹配的文件"
    : spaceName
      ? "当前空间暂无文件"
      : view === "trash"
        ? "回收站暂无文件"
        : view === "conversation"
          ? "暂无会话文件"
          : "暂无文件";
  const emptyDescription = hasActiveFilters
    ? "可以调整关键词或清空筛选条件"
    : spaceName
      ? "可以上传文件，或从会话文件归档到该空间"
      : "当前视图下还没有可展示的文件";

  useEffect(() => {
    setBatchSelectedIds(new Set());
    setBatchSpaceAction(null);
    setBatchSpaceName("");
  }, [view, spaceName]);

  useEffect(() => {
    if (selectedId && visibleFiles.some((file) => file.id === selectedId))
      return;
    if (visibleFiles[0]) {
      setSelectedId(visibleFiles[0].id);
      return;
    }
    setSelectedId(null);
  }, [selectedId, visibleFiles]);

  useEffect(() => {
    replaceBrowserDocumentNavigation({
      view,
      spaceName,
      fileId: selectedId || undefined,
    });
  }, [view, spaceName, selectedId]);

  useEffect(() => {
    const applyNavigation = (target: DocumentNavigationTarget) => {
      setView(target.view);
      setSpaceName(target.spaceName || "");
      setSelectedId(target.fileId || null);
      setSort("recent");
    };

    if (pendingNavigationTarget) {
      applyNavigation(pendingNavigationTarget);
      pendingNavigationTarget = null;
    }

    const listener = (event: Event) => {
      applyNavigation((event as CustomEvent<DocumentNavigationTarget>).detail);
    };
    window.addEventListener(DOCUMENT_NAVIGATION_EVENT, listener);
    return () =>
      window.removeEventListener(DOCUMENT_NAVIGATION_EVENT, listener);
  }, []);

  useEffect(() => {
    if (pendingUploadOpen) {
      pendingUploadOpen = false;
      setUploadError("");
      setUploadVisible(true);
    }

    const listener = () => {
      pendingUploadOpen = false;
      setUploadError("");
      setUploadVisible(true);
    };
    window.addEventListener(DOCUMENT_UPLOAD_EVENT, listener);
    return () => window.removeEventListener(DOCUMENT_UPLOAD_EVENT, listener);
  }, []);

  useEffect(() => {
    if (!state || !selectedFile) return;
    setArchiveSpaceName(resolveDefaultArchiveSpaceName(state, selectedFile));
  }, [state, selectedFile?.id, selectedFile?.spaceName]);

  useEffect(() => {
    if (!state || uploadSpaceName) return;
    setUploadSpaceName(state.spaces[0]?.name || "");
  }, [state, uploadSpaceName]);

  useEffect(() => {
    if (!state || !spaceName) return;
    if (state.spaces.some((space) => space.name === spaceName)) {
      setUploadSpaceName(spaceName);
    }
  }, [state, spaceName]);

  useEffect(() => {
    if (!spaceMembersVisible) return;
    const keywordValue = memberSearchKeyword.trim();
    if (!activeSpace || selectedMemberCandidate || keywordValue.length < 1) {
      setMemberCandidates([]);
      setMemberSearchLoading(false);
      setMemberSearchError("");
      return;
    }

    let cancelled = false;
    setMemberSearchLoading(true);
    setMemberSearchError("");
    const timer = window.setTimeout(async () => {
      try {
        const candidates = await documentRepository.searchSpaceMembers(
          activeSpace.id,
          keywordValue
        );
        if (!cancelled) {
          setMemberCandidates(candidates);
        }
      } catch (error) {
        if (!cancelled) {
          setMemberCandidates([]);
          setMemberSearchError(
            extractDocumentErrorMessage(error, "成员搜索失败，请稍后重试")
          );
        }
      } finally {
        if (!cancelled) {
          setMemberSearchLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    activeSpace?.id,
    memberSearchKeyword,
    selectedMemberCandidate,
    spaceMembersVisible,
  ]);

  useEffect(() => {
    if (spaceMembersVisible) return;
    setMemberDraftUid("");
    setMemberDraftName("");
    setMemberDraftRole("viewer");
    setMemberSearchKeyword("");
    setSelectedMemberCandidate(null);
    setMemberCandidates([]);
    setMemberSearchError("");
    setMemberSearchLoading(false);
  }, [spaceMembersVisible]);

  useEffect(() => {
    if (!spaceSettingsVisible) return;
    const keywordValue = bindingSearchKeyword.trim();
    if (!activeSpace || keywordValue.length < 1) {
      setBindingCandidates([]);
      setBindingSearchLoading(false);
      setBindingSearchError("");
      return;
    }

    let cancelled = false;
    setBindingSearchLoading(true);
    setBindingSearchError("");
    const timer = window.setTimeout(async () => {
      try {
        const candidates = await documentRepository.searchBindingConversations(
          activeSpace.id,
          keywordValue
        );
        if (!cancelled) {
          setBindingCandidates(candidates);
        }
      } catch (error) {
        if (!cancelled) {
          setBindingCandidates([]);
          setBindingSearchError(
            extractDocumentErrorMessage(error, "群聊搜索失败，请稍后重试")
          );
        }
      } finally {
        if (!cancelled) {
          setBindingSearchLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeSpace?.id, bindingSearchKeyword, spaceSettingsVisible]);

  useEffect(() => {
    if (spaceSettingsVisible) return;
    setBindingSearchKeyword("");
    setBindingCandidates([]);
    setSelectedBindingCandidates([]);
    setBindingSearchLoading(false);
    setBindingSearchError("");
  }, [spaceSettingsVisible]);

  async function apply(nextState: Promise<DocumentState>, message: string) {
    const next = await nextState;
    setState(next);
    Toast.success(message);
  }

  function clearFilters() {
    setKeyword("");
    setKind("all");
    setSource("all");
    setUploader("all");
    setSort("recent");
  }

  function toggleBatchSelected(fileId: string, checked: boolean) {
    setBatchSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(fileId);
      } else {
        next.delete(fileId);
      }
      return next;
    });
  }

  function clearBatchSelected() {
    setBatchSelectedIds(new Set());
    setBatchSpaceAction(null);
    setBatchSpaceName("");
  }

  function openRename(file: DocumentAsset) {
    setRenameTarget(file);
    setRenameDraft(file.name);
  }

  function openMove(file: DocumentAsset) {
    const targets = state
      ? buildMoveSpaceOptions(state.spaces, currentUserId, file.spaceName)
      : [];
    setMoveTarget(file);
    setMoveSpaceName(chooseDefaultMoveSpaceName(targets));
  }

  function openBatchSpaceAction(action: Extract<BatchActionKey, "save" | "move">) {
    let targets = state
      ? buildMoveSpaceOptions(state.spaces, currentUserId)
      : [];
    if (action === "move") {
      targets = targets.map((option) => {
        const allSelectedAlreadyInSpace =
          batchMovableFiles.length > 0 &&
          batchMovableFiles.every((file) => file.spaceName === option.name);
        if (!allSelectedAlreadyInSpace) return option;
        return {
          ...option,
          disabled: true,
          reason: option.reason || "已在该空间",
        };
      });
    }
    setBatchSpaceAction(action);
    setBatchSpaceName(chooseDefaultMoveSpaceName(targets));
  }

  function openSpaceSettings() {
    if (!activeSpace) return;
    setSpaceDraftName(activeSpace.name);
    setSpaceDraftDescription(activeSpace.description || "");
    setSpaceSettingsVisible(true);
  }

  function handleMemberSearchChange(value: string) {
    setMemberSearchKeyword(value);
    setSelectedMemberCandidate(null);
    setMemberDraftUid("");
    setMemberDraftName("");
  }

  function selectMemberCandidate(candidate: DocumentMemberCandidate) {
    if (candidate.alreadyMember) return;
    setSelectedMemberCandidate(candidate);
    setMemberDraftUid(candidate.uid);
    setMemberDraftName(candidate.name || candidate.uid);
    setMemberSearchKeyword(formatMemberCandidate(candidate));
    setMemberCandidates([]);
    setMemberSearchError("");
  }

  async function submitRename() {
    if (!renameTarget) return;
    const name = renameDraft.trim();
    if (!name) {
      Toast.warning("请输入文件名");
      return;
    }
    const next = await documentRepository.renameFile(renameTarget.id, name);
    setState(next);
    setRenameTarget(null);
    setSelectedId(renameTarget.id);
    Toast.success("已重命名");
  }

  async function submitMove() {
    if (!moveTarget || !moveSpaceName) return;
    if (moveSpaceName === moveTarget.spaceName) {
      Toast.warning("请选择不同的目标空间");
      return;
    }
    const next = await documentRepository.moveFile(moveTarget.id, moveSpaceName);
    const movedFile = next.files.find((file) => file.id === moveTarget.id);
    const targetSpaceName = movedFile?.spaceName || moveSpaceName;
    setState(next);
    setMoveTarget(null);
    setView("space");
    setSpaceName(targetSpaceName);
    setSelectedId(moveTarget.id);
    Toast.success(`已移动到${targetSpaceName}`);
  }

  async function submitSpaceSettings() {
    if (!activeSpace) return;
    const name = spaceDraftName.trim();
    if (!name) {
      Toast.warning("请输入空间名称");
      return;
    }
    const next = await documentRepository.updateSpace(
      activeSpace.id,
      name,
      spaceDraftDescription
    );
    setState(next);
    setSpaceName(name);
    setSpaceSettingsVisible(false);
    Toast.success("已更新空间信息");
  }

  async function submitDisableSpace() {
    if (!activeSpace) return;
    const next = await documentRepository.disableSpace(activeSpace.id);
    setState(next);
    setSpaceSettingsVisible(false);
    navigateWorkspace({ view: "space" });
    Toast.success("已停用空间");
  }

  async function submitSpaceMember() {
    if (!activeSpace) return;
    const uid = memberDraftUid.trim();
    if (!uid) {
      Toast.warning("请先搜索并选择成员");
      return;
    }
    if (selectedMemberCandidate?.alreadyMember) {
      Toast.warning("该成员已在空间中");
      return;
    }
    const next = await documentRepository.saveSpaceMember(activeSpace.id, {
      uid,
      name: memberDraftName.trim() || uid,
      role: memberDraftRole,
    });
    setState(next);
    setMemberDraftUid("");
    setMemberDraftName("");
    setMemberDraftRole("viewer");
    setMemberSearchKeyword("");
    setSelectedMemberCandidate(null);
    setMemberCandidates([]);
    Toast.success("已更新成员权限");
  }

  async function updateSpaceMemberRole(
    member: DocumentSpaceMember,
    role: Exclude<DocumentSpaceRole, "owner">
  ) {
    if (!activeSpace || member.role === role || !canChangeSpaceMemberRole(member)) {
      return;
    }
    setMemberRoleUpdatingUid(member.uid);
    try {
      const next = await documentRepository.saveSpaceMember(
        activeSpace.id,
        buildSpaceMemberRoleUpdate(member, role)
      );
      setState(next);
      Toast.success("已更新成员权限");
    } catch (error) {
      Toast.error(
        extractDocumentErrorMessage(error, "成员权限更新失败，请稍后重试")
      );
    } finally {
      setMemberRoleUpdatingUid("");
    }
  }

  async function removeSpaceMember(memberUid: string) {
    if (!activeSpace) return;
    const next = await documentRepository.removeSpaceMember(
      activeSpace.id,
      memberUid
    );
    setState(next);
    Toast.success("已移除成员");
  }

  async function submitBindConversation() {
    if (!activeSpace) return;
    if (selectedBindingCandidates.length === 0) {
      Toast.warning("请选择要绑定的群聊");
      return;
    }
    let next: DocumentState | null = state;
    for (const candidate of selectedBindingCandidates) {
      next = await documentRepository.bindConversationToSpace(
        activeSpace.id,
        {
          channelId: candidate.channelId,
          channelType: candidate.channelType,
          name: candidate.name,
        },
        currentUser
      );
    }
    if (next) {
      setState(next);
    }
    setBindingSearchKeyword("");
    setBindingCandidates([]);
    setSelectedBindingCandidates([]);
    Toast.success("已更新群文档存储空间");
  }

  function selectBindingCandidate(candidate: DocumentConversationCandidate) {
    if (candidate.alreadyBoundToCurrentSpace) {
      Toast.warning("该群聊已绑定当前空间");
      return;
    }
    if (
      selectedBindingCandidates.some(
        (item) =>
          item.channelId === candidate.channelId &&
          item.channelType === candidate.channelType
      )
    ) {
      return;
    }
    setSelectedBindingCandidates((items) => [...items, candidate]);
  }

  function removeSelectedBindingCandidate(candidate: DocumentConversationCandidate) {
    setSelectedBindingCandidates((items) =>
      items.filter(
        (item) =>
          item.channelId !== candidate.channelId ||
          item.channelType !== candidate.channelType
      )
    );
  }

  async function removeSpaceBinding(bindingId: string) {
    if (!activeSpace) return;
    const next = await documentRepository.unbindConversationFromSpace(
      activeSpace.id,
      bindingId
    );
    setState(next);
    Toast.success("已解绑会话");
  }

  async function showPreview(file: DocumentAsset) {
    if (!canPreviewDocumentAsset(file, canPreviewInPanel)) {
      Toast.warning("该类型暂不支持在线预览，可下载后查看");
      return;
    }
    if (!file.storagePath) {
      Toast.warning("文件对象路径缺失，无法预览");
      return;
    }
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setPreviewFile(null);
    const next = await documentRepository.previewFile(file.id, currentUser);
    if (previewRequestRef.current !== requestId) return;
    setState(next);
    const freshFile = next.files.find((item) => item.id === file.id) || file;
    const url = await getPresignedPreviewUrl(freshFile.storagePath, freshFile.name);
    if (previewRequestRef.current !== requestId) return;
    setPreviewFile({
      assetId: freshFile.id,
      url,
      name: freshFile.name,
      extension: freshFile.extension,
      size: freshFile.size,
      sourceChannelId: freshFile.sourceChannelId,
      sourceChannelType: freshFile.sourceChannelType,
    });
  }

  async function download(file: DocumentAsset) {
    if (!file.storagePath) {
      Toast.warning("文件对象路径缺失，无法下载");
      return;
    }
    const next = await documentRepository.downloadFile(file.id, currentUser);
    setState(next);
    const freshFile = next.files.find((item) => item.id === file.id) || file;
    const url = await getPresignedDownloadUrl(freshFile.storagePath, freshFile.name);
    await downloadFile(url, freshFile.name, { presignCrossOrigin: false });
    Toast.success(`已开始下载：${file.name}`);
  }

  async function openSource(file: DocumentAsset) {
    const navigation = buildDocumentSourceNavigation(file);
    if (!navigation) {
      Toast.warning("直接上传的文件没有来源会话");
      return;
    }
    const accessible = await documentRepository.checkSource(file.id);
    if (!accessible) {
      Toast.warning("来源会话暂不可访问");
      return;
    }
    const channel = new Channel(navigation.channelId, navigation.channelType);
    const options = new ShowConversationOptions();
    if (navigation.initLocateMessageSeq) {
      options.initLocateMessageSeq = navigation.initLocateMessageSeq;
    }
    try {
      WKApp.endpoints.showConversation(channel, options);
      Toast.success(
        navigation.initLocateMessageSeq
          ? `正在定位来源消息：${navigation.toastName}`
          : `正在打开来源会话：${navigation.toastName}`
      );
    } catch (error) {
      Toast.warning("来源会话暂不可访问");
    }
  }

  async function archiveSelectedFile(file: DocumentAsset) {
    if (!archiveSpaceName) {
      Toast.warning("请选择目标空间");
      return;
    }
    const next = await documentRepository.archiveFile(
      file.id,
      archiveSpaceName,
      currentUser
    );
    setState(next);
    setView("space");
    setSpaceName(archiveSpaceName);
    setSelectedId(file.id);
    Toast.success(`已保存到${archiveSpaceName}`);
  }

  async function submitUpload() {
    if (!uploadFile) {
      Toast.warning("请选择要上传的文件");
      return;
    }
    if (!uploadSpaceName) {
      Toast.warning("请选择目标空间");
      return;
    }

    setUploadPending(true);
    setUploadError("");
    try {
      const next = await documentRepository.uploadFile(
        {
          name: uploadFile.name,
          extension: getExtension(uploadFile.name),
          size: uploadFile.size,
          uploader: WKApp.loginInfo.name || "陈一",
          file: uploadFile,
        },
        uploadSpaceName,
        currentUser
      );
      setState(next);
      setView("space");
      setSpaceName(uploadSpaceName);
      setSelectedId(next.files[0]?.id || null);
      setUploadVisible(false);
      setUploadFile(null);
      Toast.success(`已上传到${uploadSpaceName}`);
    } catch (error) {
      const message = extractDocumentErrorMessage(error, "上传失败，请检查文件后重试");
      setUploadError(message);
      Toast.error(message);
    } finally {
      setUploadPending(false);
    }
  }

  function confirmDelete(file: DocumentAsset) {
    setDeleteTarget(file);
  }

  async function submitDelete() {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    try {
      await apply(
        documentRepository.deleteFile(deleteTarget.id),
        "已移动到回收站"
      );
      setDeleteTarget(null);
    } finally {
      setDeletePending(false);
    }
  }

  async function restoreSelectedFile(file: DocumentAsset) {
    const targetSpaceName = file.spaceName === "会话文件" ? "" : file.spaceName;
    const next = await documentRepository.restoreFile(file.id, currentUser);
    setState(next);
    setView(targetSpaceName ? "space" : "conversation");
    setSpaceName(targetSpaceName);
    setSelectedId(file.id);
    Toast.success("已恢复文件");
  }

  async function archiveBatchFiles() {
    if (!batchSpaceName || batchArchiveableFiles.length === 0) return;
    let nextState: DocumentState | null = null;
    for (const file of batchArchiveableFiles) {
      nextState = await documentRepository.archiveFile(
        file.id,
        batchSpaceName,
        currentUser
      );
    }
    if (nextState) setState(nextState);
    const skippedCount = batchSelectedFiles.length - batchArchiveableFiles.length;
    clearBatchSelected();
    Toast.success(
      `已保存 ${batchArchiveableFiles.length} 个文件到${batchSpaceName}${
        skippedCount > 0 ? `，跳过 ${skippedCount} 个` : ""
      }`
    );
  }

  async function moveBatchFiles() {
    if (!batchSpaceName || batchMovableFiles.length === 0) return;
    const movableTargets = batchMovableFiles.filter(
      (file) => file.spaceName !== batchSpaceName
    );
    if (movableTargets.length === 0) {
      Toast.warning("所选文件已在该空间");
      return;
    }
    let nextState: DocumentState | null = null;
    for (const file of movableTargets) {
      nextState = await documentRepository.moveFile(file.id, batchSpaceName);
    }
    if (nextState) setState(nextState);
    const skippedCount = batchSelectedFiles.length - movableTargets.length;
    clearBatchSelected();
    Toast.success(
      `已移动 ${movableTargets.length} 个文件到${batchSpaceName}${
        skippedCount > 0 ? `，跳过 ${skippedCount} 个` : ""
      }`
    );
  }

  async function submitBatchSpaceAction() {
    if (!batchSpaceAction) return;
    if (!batchSpaceName || selectedBatchSpaceOption?.disabled) {
      Toast.warning("请选择可操作的目标空间");
      return;
    }
    if (batchSpaceAction === "save") {
      await archiveBatchFiles();
      return;
    }
    await moveBatchFiles();
  }

  async function deleteBatchFiles() {
    if (batchDeletableFiles.length === 0) return;
    let nextState: DocumentState | null = null;
    for (const file of batchDeletableFiles) {
      nextState = await documentRepository.deleteFile(file.id, currentUser);
    }
    if (nextState) setState(nextState);
    const skippedCount = batchSelectedFiles.length - batchDeletableFiles.length;
    clearBatchSelected();
    Toast.success(
      `已移入回收站 ${batchDeletableFiles.length} 个文件${
        skippedCount > 0 ? `，跳过 ${skippedCount} 个` : ""
      }`
    );
  }

  return (
    <div className="wk-docs-workspace">
      <header className="wk-docs-workspace-header">
        <div className="wk-docs-workspace-title">
          <h1>{activeTitle}</h1>
          <p>
            {activeDescription} · {visibleFiles.length} 个文件
          </p>
          <div className="wk-docs-title-actions">
            {activeSpace && (
              <>
                <Button
                  theme="borderless"
                  icon={<Settings size={15} />}
                  disabled={!canManageActiveSpace}
                  onClick={openSpaceSettings}
                >
                  空间设置
                </Button>
                <Button
                  theme="borderless"
                  icon={<Users size={15} />}
                  disabled={!canManageActiveSpace}
                  onClick={() => setSpaceMembersVisible(true)}
                >
                  成员权限
                </Button>
              </>
            )}
            {spaceName && (
              <Button
                theme="borderless"
                icon={<FolderOpen size={15} />}
                onClick={() => navigateWorkspace({ view: "space" })}
              >
                查看全部空间文件
              </Button>
            )}
          </div>
        </div>
      </header>

      {error && <DocumentError message={error} onRetry={reload} />}
      {loading && !state && <div className="wk-docs-empty">正在加载文档</div>}

      <div className="wk-docs-main">
        <section className="wk-docs-list-panel">
          <div className="wk-docs-toolbar">
            <Input
              prefix={<Search size={15} />}
              value={keyword}
              onChange={setKeyword}
              placeholder="搜索文件、来源、上传人、空间"
            />
            <Select
              value={kind}
              onChange={(value) => setKind(value as "all" | DocumentKind)}
              className="wk-docs-filter-select"
            >
              {kindOptions.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
            <Select
              value={source}
              onChange={(value) => setSource(value as SourceFilter)}
              className="wk-docs-filter-select"
            >
              {sourceOptions.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
            <Select
              value={uploader}
              onChange={(value) => setUploader(String(value))}
              className="wk-docs-filter-select"
            >
              <Select.Option value="all">全部上传人</Select.Option>
              {uploaderOptions.map((name) => (
                <Select.Option key={name} value={name}>
                  {name}
                </Select.Option>
              ))}
            </Select>
            <Select
              value={sort}
              onChange={(value) => setSort(value as DocumentSort)}
              className="wk-docs-filter-select"
            >
              {sortOptions.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>
          </div>

          {batchSelectedIds.size > 0 && (
            <div className="wk-docs-batchbar">
              <span className="wk-docs-batch-summary">
                {batchActionModel.summary}
              </span>
              {batchActionModel.actions.map((action) => {
                const icon =
                  action.key === "save" ? (
                    <Archive size={15} />
                  ) : action.key === "move" ? (
                    <MoveRight size={15} />
                  ) : (
                    <Trash2 size={15} />
                  );
                const onClick =
                  action.key === "delete"
                    ? deleteBatchFiles
                    : () => openBatchSpaceAction(action.key);
                return (
                  <Button
                    key={action.key}
                    type={action.key === "delete" ? "danger" : "primary"}
                    theme="light"
                    icon={icon}
                    disabled={action.disabled}
                    title={
                      action.skippedCount > 0
                        ? `将跳过 ${action.skippedCount} 个无权限文件`
                        : undefined
                    }
                    onClick={onClick}
                  >
                    {action.label}
                  </Button>
                );
              })}
              <Button onClick={clearBatchSelected}>取消</Button>
            </div>
          )}

          <div className="wk-docs-file-list" role="list">
            {visibleFiles.map((file) => (
              <div
                key={file.id}
                role="button"
                tabIndex={0}
                className={`wk-docs-file-row ${
                  selectedFile?.id === file.id ? "active" : ""
                } ${batchSelectedIds.has(file.id) ? "is-batch-selected" : ""}`}
                onClick={() => setSelectedId(file.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(file.id);
                  }
                }}
              >
                <span className="wk-docs-file-select">
                  <input
                    type="checkbox"
                    aria-label={`选择 ${file.name}`}
                    checked={batchSelectedIds.has(file.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) =>
                      toggleBatchSelected(file.id, event.currentTarget.checked)
                    }
                  />
                  <FileBadge file={file} />
                </span>
                <span className="wk-docs-file-main">
                  <strong>{file.name}</strong>
                  <em>
                    {file.sourceType} · {file.sourceName} · {file.spaceName} ·{" "}
                    {formatFileSize(file.size)}
                  </em>
                </span>
                <span className="wk-docs-file-meta">
                  <StatusPill file={file} />
                  <small>
                    {sort === "created" ? file.createdAt : file.lastAccessAt}
                  </small>
                </span>
              </div>
            ))}
            {visibleFiles.length === 0 && (
              <div className="wk-docs-empty">
                <strong>{emptyTitle}</strong>
                <span>{emptyDescription}</span>
                {hasActiveFilters && (
                  <Button onClick={clearFilters}>清空筛选</Button>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="wk-docs-detail-panel">
          {selectedFile ? (
            <>
              <div className="wk-docs-detail-head">
                <FileBadge file={selectedFile} />
                <div>
                  <h2>{selectedFile.name}</h2>
                  <p>
                    {selectedFile.sourceRef?.messageId
                      ? `源消息 ${selectedFile.sourceRef.messageId}`
                      : selectedFile.sourceType === "上传"
                        ? "直接上传"
                        : "会话文件"}
                  </p>
                </div>
                <StatusPill file={selectedFile} />
              </div>

              {selectedFile.status !== "deleted" && (
                <div className="wk-docs-actions">
                  {canPreviewDocumentAsset(selectedFile, canPreviewInPanel) ? (
                    <Button
                      icon={<Eye size={15} />}
                      disabled={!selectedFile.permissions.canPreview}
                      onClick={() => showPreview(selectedFile)}
                    >
                      预览
                    </Button>
                  ) : (
                    <Button icon={<Eye size={15} />} disabled>
                      暂不支持预览
                    </Button>
                  )}
                  <Button
                    icon={<Download size={15} />}
                    disabled={!selectedFile.permissions.canDownload}
                    onClick={() => download(selectedFile)}
                  >
                    下载
                  </Button>
                  {selectedFile.sourceChannelId && (
                    <Button
                      icon={<ExternalLink size={15} />}
                      onClick={() => openSource(selectedFile)}
                    >
                      来源会话
                    </Button>
                  )}
                </div>
              )}

              <div className="wk-docs-detail-grid">
                <Info
                  label="来源"
                  value={`${selectedFile.sourceType} / ${selectedFile.sourceName}`}
                />
                <Info label="所在空间" value={selectedFile.spaceName} />
                <Info label="上传人" value={selectedFile.uploader} />
                <Info label="上传时间" value={selectedFile.createdAt} />
                <Info label="最近访问" value={selectedFile.lastAccessAt} />
                <Info label="下载次数" value={`${selectedFile.downloads}`} />
                <Info label="大小" value={formatFileSize(selectedFile.size)} />
                <Info label="权限" value={selectedFile.permissions.summary} />
                {selectedFile.sourceRef && (
                  <Info
                    label="源消息"
                    value={`${selectedFile.sourceRef.senderName} / ${selectedFile.sourceRef.sentAt}`}
                  />
                )}
              </div>

              <section className="wk-docs-operation-card">
                <h3>文件操作</h3>
                <div className="wk-docs-operation-list">
                  {selectedFile.status === "conversation" && (
                    <div className="wk-docs-archive-row">
                      <Select
                        value={archiveSpaceName}
                        onChange={(value) => setArchiveSpaceName(String(value))}
                        className="wk-docs-space-select"
                      >
                        {state?.spaces.map((space) => (
                          <Select.Option key={space.id} value={space.name}>
                            {space.name}
                          </Select.Option>
                        ))}
                      </Select>
                      <Button
                        theme="solid"
                        icon={<Archive size={15} />}
                        disabled={
                          !archiveSpaceName ||
                          !selectedFile.permissions.canArchive
                        }
                        onClick={() => archiveSelectedFile(selectedFile)}
                      >
                        归档到空间
                      </Button>
                    </div>
                  )}
                  {selectedFile.status === "archived" && (
                    <>
                      <Button
                        icon={<Pencil size={15} />}
                        disabled={!canEditFile(selectedFile)}
                        onClick={() => openRename(selectedFile)}
                      >
                        重命名
                      </Button>
                      <Button
                        icon={<MoveRight size={15} />}
                        disabled={!canEditFile(selectedFile)}
                        onClick={() => openMove(selectedFile)}
                      >
                        移动空间
                      </Button>
                      <Button
                        icon={<FolderOpen size={15} />}
                        onClick={() => {
                          setView("space");
                          setSpaceName(selectedFile.spaceName);
                          setSelectedId(selectedFile.id);
                        }}
                      >
                        查看所在空间
                      </Button>
                    </>
                  )}
                  {selectedFile.status !== "deleted" ? (
                    <Button
                      type="danger"
                      icon={<Trash2 size={15} />}
                      disabled={!selectedFile.permissions.canDelete}
                      onClick={() => confirmDelete(selectedFile)}
                    >
                      移到回收站
                    </Button>
                  ) : (
                    <Button
                      icon={<RotateCcw size={15} />}
                      disabled={!selectedFile.permissions.canRestore}
                      onClick={() => restoreSelectedFile(selectedFile)}
                    >
                      恢复
                    </Button>
                  )}
                </div>
              </section>

              <section className="wk-docs-flow">
                <h3>文件动态</h3>
                {selectedFile.flow.map((item) => (
                  <div key={item}>
                    <span />
                    <p>{item}</p>
                  </div>
                ))}
              </section>
            </>
          ) : (
            <div className="wk-docs-empty">选择一个文件查看详情</div>
          )}
        </aside>
      </div>
      <Modal
        title="文件预览"
        visible={Boolean(previewFile)}
        footer={null}
        closeOnEsc
        onCancel={() => {
          setPreviewFile(null);
        }}
        width="78vw"
        className="wk-docs-preview-modal"
      >
        {previewFile && (
          <DocumentPreviewContent
            key={previewFile.assetId || previewFile.url}
            file={previewFile}
          />
        )}
      </Modal>
      <Modal
        title="上传到空间"
        visible={uploadVisible}
        okText="上传"
        cancelText="取消"
        okButtonProps={{ "aria-label": "上传" }}
        cancelButtonProps={{ "aria-label": "取消" }}
        confirmLoading={uploadPending}
        onOk={submitUpload}
        onCancel={() => {
          if (uploadPending) return;
          setUploadVisible(false);
          setUploadFile(null);
          setUploadError("");
        }}
      >
        <div className="wk-docs-upload-form">
          <label>
            <span>目标空间</span>
            <Select
              value={uploadSpaceName}
              onChange={(value) => {
                setUploadSpaceName(String(value));
                setUploadError("");
              }}
            >
              {state?.spaces.map((space) => (
                <Select.Option key={space.id} value={space.name}>
                  {space.name}
                </Select.Option>
              ))}
            </Select>
          </label>
          <label>
            <span>选择文件</span>
            <input
              type="file"
              onChange={(event) => {
                setUploadFile(event.currentTarget.files?.[0] || null);
                setUploadError("");
              }}
            />
          </label>
          {uploadFile && (
            <div className="wk-docs-upload-file">
              <strong>{uploadFile.name}</strong>
              <span>{formatFileSize(uploadFile.size)}</span>
            </div>
          )}
          {uploadError && (
            <div className="wk-docs-upload-error" role="alert">
              {uploadError}
            </div>
          )}
        </div>
      </Modal>
      <Modal
        title="重命名文件"
        visible={Boolean(renameTarget)}
        okText="保存"
        cancelText="取消"
        onOk={submitRename}
        onCancel={() => setRenameTarget(null)}
      >
        <div className="wk-docs-form">
          <label>
            <span>文件名</span>
            <Input value={renameDraft} onChange={setRenameDraft} />
          </label>
        </div>
      </Modal>
      <Modal
        title="移动到空间"
        visible={Boolean(moveTarget)}
        okText="移动"
        cancelText="取消"
        onOk={submitMove}
        okButtonProps={{
          disabled:
            !moveSpaceName ||
            !selectedMoveSpaceOption ||
            selectedMoveSpaceOption.disabled,
        }}
        onCancel={() => setMoveTarget(null)}
      >
        <div className="wk-docs-form">
          <label>
            <span>目标空间</span>
            <Select
              value={moveSpaceName}
              placeholder="请选择目标空间"
              onChange={(value) => setMoveSpaceName(String(value))}
            >
              {moveSpaceOptions.map((space) => (
                <Select.Option
                  key={space.id}
                  value={space.name}
                  disabled={space.disabled}
                >
                  <span className="wk-docs-space-option">
                    <span>{space.name}</span>
                    {space.reason && <em>{space.reason}</em>}
                  </span>
                </Select.Option>
              ))}
            </Select>
          </label>
          {moveSpaceOptions.every((space) => space.disabled) && (
            <p className="wk-docs-form-hint">
              暂无可移动的目标空间。你需要先成为其他空间的所有者、管理员或编辑者。
            </p>
          )}
        </div>
      </Modal>
      <Modal
        title={batchSpaceAction === "save" ? "保存到空间" : "移动到空间"}
        visible={Boolean(batchSpaceAction)}
        okText={batchSpaceAction === "save" ? "保存" : "移动"}
        cancelText="取消"
        onOk={submitBatchSpaceAction}
        okButtonProps={{
          disabled:
            !batchSpaceName ||
            !selectedBatchSpaceOption ||
            selectedBatchSpaceOption.disabled,
        }}
        onCancel={() => {
          setBatchSpaceAction(null);
          setBatchSpaceName("");
        }}
      >
        <div className="wk-docs-form">
          <label>
            <span>目标空间</span>
            <Select
              value={batchSpaceName}
              placeholder="请选择目标空间"
              onChange={(value) => setBatchSpaceName(String(value))}
            >
              {batchSpaceOptions.map((space) => (
                <Select.Option
                  key={space.id}
                  value={space.name}
                  disabled={space.disabled}
                >
                  <span className="wk-docs-space-option">
                    <span>{space.name}</span>
                    {space.reason && <em>{space.reason}</em>}
                  </span>
                </Select.Option>
              ))}
            </Select>
          </label>
          <p className="wk-docs-form-hint">
            {batchSpaceAction === "save"
              ? `将保存 ${batchArchiveableFiles.length} 个会话文件到目标空间。`
              : `将移动 ${batchMovableFiles.length} 个空间文件到目标空间。`}
            {batchActionModel.skippedCount > 0
              ? ` 无权限文件会自动跳过。`
              : ""}
          </p>
          {batchSpaceOptions.every((space) => space.disabled) && (
            <p className="wk-docs-form-hint">
              暂无可操作的目标空间。你需要先成为目标空间的所有者、管理员或编辑者。
            </p>
          )}
        </div>
      </Modal>
      <Modal
        title="空间设置"
        visible={spaceSettingsVisible}
        okText="保存"
        cancelText="取消"
        onOk={submitSpaceSettings}
        onCancel={() => setSpaceSettingsVisible(false)}
      >
        <div className="wk-docs-form">
          <label>
            <span>空间名称</span>
            <Input value={spaceDraftName} onChange={setSpaceDraftName} />
          </label>
          <label>
            <span>空间描述</span>
            <TextArea
              value={spaceDraftDescription}
              onChange={setSpaceDraftDescription}
              autosize
            />
          </label>
          <section className="wk-docs-binding-box">
            <div className="wk-docs-binding-head">
              <span>群文档存储空间</span>
              <em>绑定后，该群聊中新发文件会自动进入当前空间</em>
            </div>
            <div className="wk-docs-binding-add">
              <Input
                value={bindingSearchKeyword}
                onChange={setBindingSearchKeyword}
                prefix={<Search size={15} />}
                placeholder="搜索群聊名称或群 ID"
              />
              <Button
                onClick={submitBindConversation}
                disabled={selectedBindingCandidates.length === 0}
              >
                绑定
              </Button>
            </div>
            {(bindingCandidates.length > 0 ||
              bindingSearchLoading ||
              bindingSearchError ||
              (bindingSearchKeyword.trim() && !bindingSearchLoading)) && (
              <div className="wk-docs-binding-candidates">
                {bindingSearchLoading && <p>搜索中...</p>}
                {!bindingSearchLoading && bindingSearchError && (
                  <p className="wk-docs-form-error">{bindingSearchError}</p>
                )}
                {!bindingSearchLoading &&
                  !bindingSearchError &&
                  bindingCandidates.map((candidate) => {
                    const selected = selectedBindingCandidates.some(
                      (item) =>
                        item.channelId === candidate.channelId &&
                        item.channelType === candidate.channelType
                    );
                    return (
                      <button
                        key={`${candidate.channelId}-${candidate.channelType}`}
                        type="button"
                        disabled={candidate.alreadyBoundToCurrentSpace}
                        className={selected ? "selected" : ""}
                        onClick={() => selectBindingCandidate(candidate)}
                      >
                        <span>
                          <strong>{candidate.name}</strong>
                          <em>{candidate.channelId}</em>
                        </span>
                        {candidate.alreadyBoundToCurrentSpace ? (
                          <small>已绑定当前空间</small>
                        ) : candidate.boundSpaceName ? (
                          <small>将从 {candidate.boundSpaceName} 重绑</small>
                        ) : selected ? (
                          <small>已选择</small>
                        ) : (
                          <small>可绑定</small>
                        )}
                      </button>
                    );
                  })}
                {!bindingSearchLoading &&
                  !bindingSearchError &&
                  bindingCandidates.length === 0 &&
                  bindingSearchKeyword.trim() && <p>未找到可绑定群聊</p>}
              </div>
            )}
            {selectedBindingCandidates.length > 0 && (
              <div className="wk-docs-binding-selected">
                {selectedBindingCandidates.map((candidate) => (
                  <span key={`${candidate.channelId}-${candidate.channelType}`}>
                    {candidate.name}
                    <button
                      type="button"
                      onClick={() => removeSelectedBindingCandidate(candidate)}
                    >
                      移除
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="wk-docs-binding-list">
              {activeSpaceBindings.map((binding) => (
                <div key={binding.id}>
                  <span>{binding.name}</span>
                  <Button
                    theme="borderless"
                    type="danger"
                    onClick={() => removeSpaceBinding(binding.id)}
                  >
                    解绑
                  </Button>
                </div>
              ))}
              {activeSpaceBindings.length === 0 && (
                <p>暂无绑定会话</p>
              )}
            </div>
          </section>
          <div className="wk-docs-danger-zone">
            <strong>停用空间</strong>
            <p>停用后，该空间不会继续出现在普通空间列表中。</p>
            <Button type="danger" onClick={submitDisableSpace}>
              停用空间
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        title="成员与权限"
        visible={spaceMembersVisible}
        footer={null}
        onCancel={() => setSpaceMembersVisible(false)}
        width={640}
      >
        <div className="wk-docs-members">
          <div className="wk-docs-member-add">
            <div className="wk-docs-member-search">
              <Input
                value={memberSearchKeyword}
                onChange={handleMemberSearchChange}
                prefix={<Search size={15} />}
                placeholder="搜索成员姓名、账号、邮箱"
              />
              {(memberCandidates.length > 0 ||
                memberSearchLoading ||
                memberSearchError ||
                (memberSearchKeyword.trim() &&
                  !selectedMemberCandidate &&
                  !memberSearchLoading)) && (
                <div className="wk-docs-member-candidates">
                  {memberSearchLoading && (
                    <div className="wk-docs-member-candidate-empty">
                      搜索中...
                    </div>
                  )}
                  {!memberSearchLoading && memberSearchError && (
                    <div className="wk-docs-member-candidate-empty">
                      {memberSearchError}
                    </div>
                  )}
                  {!memberSearchLoading &&
                    !memberSearchError &&
                    memberCandidates.map((candidate) => (
                      <button
                        key={candidate.uid}
                        type="button"
                        className="wk-docs-member-candidate"
                        disabled={candidate.alreadyMember}
                        onClick={() => selectMemberCandidate(candidate)}
                      >
                        <span>
                          <strong>{candidate.name || candidate.uid}</strong>
                          <em>
                            {candidate.username || candidate.uid}
                            {candidate.email ? ` · ${candidate.email}` : ""}
                          </em>
                        </span>
                        {candidate.alreadyMember && <small>已在空间</small>}
                      </button>
                    ))}
                  {!memberSearchLoading &&
                    !memberSearchError &&
                    memberCandidates.length === 0 && (
                      <div className="wk-docs-member-candidate-empty">
                        未找到匹配成员
                      </div>
                    )}
                </div>
              )}
            </div>
            <Select
              value={memberDraftRole}
              onChange={(value) =>
                setMemberDraftRole(value as DocumentSpaceRole)
              }
            >
              {spaceRoleOptions.map((role) => (
                <Select.Option key={role.value} value={role.value}>
                  {role.label}
                </Select.Option>
              ))}
            </Select>
            <Button
              theme="solid"
              disabled={!memberDraftUid || selectedMemberCandidate?.alreadyMember}
              onClick={submitSpaceMember}
            >
              添加
            </Button>
          </div>
          <div className="wk-docs-member-list">
            {activeSpaceMembers.map((member) => (
              <div key={member.uid} className="wk-docs-member-row">
                <span>
                  <strong>{member.name || member.uid}</strong>
                  <em>{member.uid} · {member.source}</em>
                </span>
                {canChangeSpaceMemberRole(member) ? (
                  <Select
                    value={member.role}
                    size="small"
                    className="wk-docs-member-role-select"
                    disabled={memberRoleUpdatingUid === member.uid}
                    aria-label={`修改 ${member.name || member.uid} 的权限`}
                    onChange={(value) =>
                      updateSpaceMemberRole(
                        member,
                        value as Exclude<DocumentSpaceRole, "owner">
                      )
                    }
                  >
                    {editableSpaceRoleOptions.map((role) => (
                      <Select.Option key={role.value} value={role.value}>
                        {role.label}
                      </Select.Option>
                    ))}
                  </Select>
                ) : (
                  <small className="wk-docs-member-owner-role">
                    {getSpaceRoleLabel(member.role)}
                  </small>
                )}
                <Button
                  type="danger"
                  theme="borderless"
                  disabled={
                    member.role === "owner" ||
                    memberRoleUpdatingUid === member.uid
                  }
                  onClick={() => removeSpaceMember(member.uid)}
                >
                  移除
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
      <Modal
        title={deleteTarget ? `移到回收站「${deleteTarget.name}」？` : "移到回收站"}
        visible={Boolean(deleteTarget)}
        okText="移到回收站"
        cancelText="取消"
        okButtonProps={{ "aria-label": "移到回收站" }}
        cancelButtonProps={{ "aria-label": "取消" }}
        confirmLoading={deletePending}
        onOk={submitDelete}
        onCancel={() => {
          if (!deletePending) setDeleteTarget(null);
        }}
      >
        <p className="wk-docs-confirm-text">文件会进入回收站，之后仍可恢复。</p>
      </Modal>
    </div>
  );
}

function DocumentPreviewContent({ file }: { file: FilePreviewInfo }) {
  const { renderer: Renderer } = fileRendererRegistry.getRenderer(
    file.extension,
    file.name
  );
  return (
    <div className="wk-docs-preview">
      <Renderer file={file} />
    </div>
  );
}

function DocumentError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<DocumentState>;
}) {
  return (
    <div className="wk-docs-error" role="alert">
      <div>
        <strong>文档数据加载失败</strong>
        <span>{message}</span>
      </div>
      <Button onClick={() => onRetry().catch(() => undefined)}>重试</Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
