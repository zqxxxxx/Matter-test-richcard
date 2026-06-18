import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FolderOpen,
  Inbox,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { Button, Input, Modal, Select, Toast } from "@douyinfe/semi-ui";
import { Channel, WKSDK } from "wukongimjssdk";
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
import { documentRepository } from "./service";
import type { DocumentAsset, DocumentKind, DocumentState } from "./types";
import "./index.css";

type DocumentView = "recent" | "conversation" | "space" | "mine" | "trash";
type DocumentSort = "recent" | "created" | "size";
type SourceFilter = "all" | DocumentAsset["sourceType"];

interface DocumentNavigationTarget {
  view: DocumentView;
  spaceName?: string;
  fileId?: string;
}

const DOCUMENT_NAVIGATION_EVENT = "octo-documents:navigate";
let pendingNavigationTarget: DocumentNavigationTarget | null = null;

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
  { value: "应用", label: "直接上传" },
];

const sortOptions: Array<{ value: DocumentSort; label: string }> = [
  { value: "recent", label: "最近查看" },
  { value: "created", label: "上传时间" },
  { value: "size", label: "文件大小" },
];

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

function getViewLabel(view: DocumentView) {
  return viewOptions.find((item) => item.key === view)?.label || "文档";
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

function navigateWorkspace(
  target: DocumentNavigationTarget = { view: "recent" }
) {
  pendingNavigationTarget = target;
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
  const { state, loading, error, reload } = useDocumentState();
  const currentUser = getCurrentUserName();

  return (
    <div className="wk-docs-entry">
      <div className="wk-docs-entry-header">
        <div>
          <h1>文档</h1>
          <p>查看会话与空间中的文件</p>
        </div>
        <button
          className="wk-docs-icon-button"
          aria-label="打开文档中心"
          onClick={() => navigateWorkspace({ view: "recent" })}
        >
          <FolderOpen size={18} />
        </button>
      </div>

      {error && <DocumentError message={error} onRetry={reload} />}
      {loading && !state && <div className="wk-docs-empty">正在加载文档</div>}

      <section className="wk-docs-entry-section">
        <div className="wk-docs-nav-list">
          {state &&
            viewOptions.map((item) => (
              <button
                key={item.key}
                className="wk-docs-nav-row"
                onClick={() => navigateWorkspace({ view: item.key })}
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
        </div>
        <div className="wk-docs-space-list">
          {state?.spaces.map((space) => (
            <button
              key={space.id}
              className="wk-docs-space-row"
              onClick={() =>
                navigateWorkspace({ view: "space", spaceName: space.name })
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
    </div>
  );
}

export function DocumentsWorkspace() {
  const { state, setState, loading, error, reload } = useDocumentState();
  const [view, setView] = useState<DocumentView>("recent");
  const [spaceName, setSpaceName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState<"all" | DocumentKind>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [uploader, setUploader] = useState("all");
  const [sort, setSort] = useState<DocumentSort>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archiveSpaceName, setArchiveSpaceName] = useState("");
  const [previewFile, setPreviewFile] = useState<FilePreviewInfo | null>(null);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadSpaceName, setUploadSpaceName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentAsset | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const currentUser = getCurrentUserName();

  const uploaderOptions = useMemo(() => {
    if (!state) return [];
    return Array.from(
      new Set<string>(state.files.map((file) => file.uploader))
    ).sort((a, b) => a.localeCompare(b, "zh-CN"));
  }, [state]);
  const activeTitle = spaceName || getViewLabel(view);
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
    if (!state || !selectedFile) return;
    const existingSpace = state.spaces.find(
      (space) => space.name === selectedFile.spaceName
    );
    setArchiveSpaceName(existingSpace?.name || state.spaces[0]?.name || "");
  }, [state, selectedFile?.id, selectedFile?.spaceName]);

  useEffect(() => {
    if (!state || uploadSpaceName) return;
    setUploadSpaceName(state.spaces[0]?.name || "");
  }, [state, uploadSpaceName]);

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

  async function showPreview(file: DocumentAsset) {
    if (!canPreviewDocumentAsset(file, canPreviewInPanel)) {
      Toast.warning("该类型暂不支持在线预览，可下载后查看");
      return;
    }
    if (!file.storagePath) {
      Toast.warning("文件对象路径缺失，无法预览");
      return;
    }
    const next = await documentRepository.previewFile(file.id, currentUser);
    setState(next);
    const freshFile = next.files.find((item) => item.id === file.id) || file;
    const url = await getPresignedPreviewUrl(freshFile.storagePath, freshFile.name);
    setPreviewFile({
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

  function openSource(file: DocumentAsset) {
    if (!file.sourceChannelId) {
      Toast.warning("直接上传的文件没有来源会话");
      return;
    }
    const channel = new Channel(file.sourceChannelId, file.sourceChannelType);
    const conversation =
      WKSDK.shared().conversationManager.findConversation(channel);
    if (!conversation) {
      Toast.warning("来源会话暂不可访问");
      return;
    }
    try {
      WKApp.endpoints.showConversation(channel);
      Toast.success(`正在打开来源会话：${file.sourceName}`);
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

  return (
    <div className="wk-docs-workspace">
      <header className="wk-docs-workspace-header">
        <div>
          <h1>文档中心</h1>
          <p>
            {activeTitle} · {visibleFiles.length} 个文件
          </p>
        </div>
        <div className="wk-docs-header-side">
          <Button
            theme="solid"
            icon={<Upload size={15} />}
            onClick={() => setUploadVisible(true)}
          >
            上传
          </Button>
        </div>
      </header>

      {error && <DocumentError message={error} onRetry={reload} />}
      {loading && !state && <div className="wk-docs-empty">正在加载文档</div>}

      <div className="wk-docs-main">
        <section className="wk-docs-list-panel">
          <div className="wk-docs-list-head">
            <div>
              <h2>{activeTitle}</h2>
              <p>{spaceName ? "当前空间文件" : "按存储位置分类展示"}</p>
            </div>
            {spaceName && (
              <Button
                onClick={() => {
                  setSpaceName("");
                  setSelectedId(null);
                }}
              >
                查看全部空间文件
              </Button>
            )}
          </div>
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

          <div className="wk-docs-file-list" role="list">
            {visibleFiles.map((file) => (
              <button
                key={file.id}
                className={`wk-docs-file-row ${
                  selectedFile?.id === file.id ? "active" : ""
                }`}
                onClick={() => setSelectedId(file.id)}
              >
                <FileBadge file={file} />
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
              </button>
            ))}
            {visibleFiles.length === 0 && (
              <div className="wk-docs-empty">
                <span>没有匹配的文件</span>
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
                  <p>{selectedFile.id}</p>
                </div>
                <StatusPill file={selectedFile} />
              </div>

              {selectedFile.status !== "deleted" && (
                <div className="wk-docs-actions">
                  {canPreviewDocumentAsset(selectedFile, canPreviewInPanel) ? (
                    <Button
                      icon={<Eye size={15} />}
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
                        disabled={!archiveSpaceName}
                        onClick={() => archiveSelectedFile(selectedFile)}
                      >
                        归档到空间
                      </Button>
                    </div>
                  )}
                  {selectedFile.status === "archived" && (
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
                  )}
                  {selectedFile.status !== "deleted" ? (
                    <Button
                      type="danger"
                      icon={<Trash2 size={15} />}
                      onClick={() => confirmDelete(selectedFile)}
                    >
                      移到回收站
                    </Button>
                  ) : (
                    <Button
                      icon={<RotateCcw size={15} />}
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
        {previewFile && <DocumentPreviewContent file={previewFile} />}
      </Modal>
      <Modal
        title="上传到空间"
        visible={uploadVisible}
        okText="上传"
        cancelText="取消"
        okButtonProps={{ "aria-label": "上传" }}
        cancelButtonProps={{ "aria-label": "取消" }}
        onOk={submitUpload}
        onCancel={() => {
          setUploadVisible(false);
          setUploadFile(null);
        }}
      >
        <div className="wk-docs-upload-form">
          <label>
            <span>目标空间</span>
            <Select
              value={uploadSpaceName}
              onChange={(value) => setUploadSpaceName(String(value))}
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
              onChange={(event) =>
                setUploadFile(event.currentTarget.files?.[0] || null)
              }
            />
          </label>
          {uploadFile && (
            <div className="wk-docs-upload-file">
              <strong>{uploadFile.name}</strong>
              <span>{formatFileSize(uploadFile.size)}</span>
            </div>
          )}
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
