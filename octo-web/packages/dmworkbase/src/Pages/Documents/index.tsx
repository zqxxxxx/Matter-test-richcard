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
import { Channel } from "wukongimjssdk";
import WKApp from "../../App";
import { wkConfirm } from "../../Components/WKModal";
import { formatFileSize, getFileIconInfo } from "../../Messages/File";
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

  const reload = async () => {
    const next = await documentRepository.load();
    setState(next);
    return next;
  };

  useEffect(() => {
    reload();
  }, []);

  return { state, setState, reload };
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
  const { state } = useDocumentState();
  const [keyword, setKeyword] = useState("");
  const currentUser = getCurrentUserName();

  const recentFiles = useMemo(() => {
    if (!state) return [];
    return filterFiles(state.files, {
      view: "recent",
      currentUser,
      keyword,
      kind: "all",
      source: "all",
      uploader: "all",
      sort: "recent",
    }).slice(0, 4);
  }, [state, keyword, currentUser]);

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

      <label className="wk-docs-search">
        <Search size={16} />
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索文件、来源、上传人"
        />
      </label>

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
          <span>最近查看</span>
          <button onClick={() => navigateWorkspace({ view: "recent" })}>
            全部
          </button>
        </div>
        <div className="wk-docs-compact-list">
          {recentFiles.map((file) => (
            <button
              key={file.id}
              className="wk-docs-compact-file"
              onClick={() =>
                navigateWorkspace({ view: "recent", fileId: file.id })
              }
            >
              <FileBadge file={file} />
              <span>
                <strong>{file.name}</strong>
                <em>{file.sourceName}</em>
              </span>
              <StatusPill file={file} />
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
  const { state, setState } = useDocumentState();
  const [view, setView] = useState<DocumentView>("recent");
  const [spaceName, setSpaceName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState<"all" | DocumentKind>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [uploader, setUploader] = useState("all");
  const [sort, setSort] = useState<DocumentSort>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archiveSpaceName, setArchiveSpaceName] = useState("");
  const [previewFile, setPreviewFile] = useState<DocumentAsset | null>(null);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadSpaceName, setUploadSpaceName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const currentUser = getCurrentUserName();

  const uploaderOptions = useMemo(() => {
    if (!state) return [];
    return Array.from(new Set(state.files.map((file) => file.uploader))).sort(
      (a, b) => a.localeCompare(b, "zh-CN")
    );
  }, [state]);
  const activeTitle = spaceName || getViewLabel(view);
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

  async function showPreview(file: DocumentAsset) {
    if (!file.previewable) {
      Toast.warning("该类型暂不支持在线预览，可下载后查看");
      return;
    }
    const next = await documentRepository.previewFile(file.id, currentUser);
    setState(next);
    setPreviewFile(file);
  }

  async function download(file: DocumentAsset) {
    const next = await documentRepository.downloadFile(file.id, currentUser);
    setState(next);
    Toast.success(`已开始下载：${file.name}`);
  }

  function openSource(file: DocumentAsset) {
    if (!file.sourceChannelId) {
      Toast.warning("直接上传的文件没有来源会话");
      return;
    }
    try {
      WKApp.endpoints.showConversation(
        new Channel(file.sourceChannelId, file.sourceChannelType)
      );
      Toast.success(`正在打开来源会话：${file.sourceName}`);
    } catch (error) {
      Toast.warning("来源会话暂不可访问");
    }
  }

  function archiveSelectedFile(file: DocumentAsset) {
    if (!archiveSpaceName) {
      Toast.warning("请选择目标空间");
      return;
    }
    apply(
      documentRepository.archiveFile(file.id, archiveSpaceName),
      `已保存到${archiveSpaceName}`
    );
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
    wkConfirm({
      title: `移到回收站「${file.name}」？`,
      content: "文件会进入回收站，之后仍可恢复。",
      okText: "移到回收站",
      cancelText: "取消",
      onOk: () =>
        apply(documentRepository.deleteFile(file.id), "已移动到回收站"),
    });
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
              <div className="wk-docs-empty">没有匹配的文件</div>
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

              <div className="wk-docs-actions">
                <Button
                  icon={<Eye size={15} />}
                  onClick={() => showPreview(selectedFile)}
                >
                  预览
                </Button>
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
                      onClick={() =>
                        apply(
                          documentRepository.restoreFile(selectedFile.id),
                          "已恢复文件"
                        )
                      }
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
        onCancel={() => setPreviewFile(null)}
      >
        {previewFile && (
          <div className="wk-docs-preview">
            <FileBadge file={previewFile} />
            <div>
              <h3>{previewFile.name}</h3>
              <p>
                {previewFile.sourceName} · {formatFileSize(previewFile.size)}
              </p>
              <span>预览内容暂不可用，可下载后查看完整文件。</span>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        title="上传到空间"
        visible={uploadVisible}
        okText="上传"
        cancelText="取消"
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
