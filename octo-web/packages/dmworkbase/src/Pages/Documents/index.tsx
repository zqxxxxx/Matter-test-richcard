import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Download,
  ExternalLink,
  Eye,
  FolderOpen,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, Input, Modal, Select, Toast } from "@douyinfe/semi-ui";
import { Channel } from "wukongimjssdk";
import WKApp from "../../App";
import { wkConfirm } from "../../Components/WKModal";
import { formatFileSize, getFileIconInfo } from "../../Messages/File";
import { createDocumentSummary, documentRepository } from "./service";
import type { DocumentAsset, DocumentState, DocumentTab } from "./types";
import "./index.css";

const tabOptions: Array<{ key: DocumentTab; label: string }> = [
  { key: "recent", label: "最近" },
  { key: "conversation", label: "会话文件" },
  { key: "space", label: "空间文件" },
  { key: "mine", label: "我的" },
  { key: "trash", label: "回收站" },
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

function filterFiles(files: DocumentAsset[], tab: DocumentTab, keyword: string, kind: string) {
  const query = keyword.trim().toLowerCase();

  return files
    .filter((file) => {
      if (tab === "trash") return file.status === "deleted";
      if (file.status === "deleted") return false;
      if (tab === "conversation") return file.status === "conversation";
      if (tab === "space") return file.status === "archived";
      if (tab === "mine") return file.uploader === "陈一";
      return true;
    })
    .filter((file) => (kind === "all" ? true : file.kind === kind))
    .filter((file) => {
      if (!query) return true;
      return [file.name, file.uploader, file.sourceName, file.spaceName].some((text) =>
        text.toLowerCase().includes(query),
      );
    })
    .sort((a, b) => b.lastAccessAt.localeCompare(a.lastAccessAt));
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
  return <span className={`wk-docs-status wk-docs-status-${file.status}`}>{getStatusText(file)}</span>;
}

function openWorkspace() {
  const page = WKApp.route.get("/documents/workspace");
  if (page && React.isValidElement(page)) {
    WKApp.routeRight.replaceToRoot(page);
  }
}

export default function DocumentsPage() {
  const { state } = useDocumentState();
  const [keyword, setKeyword] = useState("");

  const summary = useMemo(() => (state ? createDocumentSummary(state) : null), [state]);
  const recentFiles = useMemo(() => {
    if (!state) return [];
    return filterFiles(state.files, "recent", keyword, "all").slice(0, 5);
  }, [state, keyword]);

  return (
    <div className="wk-docs-entry">
      <div className="wk-docs-entry-header">
        <div>
          <h1>文档</h1>
          <p>集中查看 Octo 内部会话文件与空间文件</p>
        </div>
        <button className="wk-docs-icon-button" aria-label="打开文档中心" onClick={openWorkspace}>
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

      {summary && (
        <div className="wk-docs-entry-metrics">
          <div>
            <strong>{summary.activeFiles}</strong>
            <span>可用文件</span>
          </div>
          <div>
            <strong>{summary.spaceFiles}</strong>
            <span>空间文件</span>
          </div>
          <div>
            <strong>{summary.conversationFiles}</strong>
            <span>会话文件</span>
          </div>
        </div>
      )}

      <section className="wk-docs-entry-section">
        <div className="wk-docs-section-title">
          <span>最近访问</span>
          <button onClick={openWorkspace}>全部</button>
        </div>
        <div className="wk-docs-compact-list">
          {recentFiles.map((file) => (
            <button key={file.id} className="wk-docs-compact-file" onClick={openWorkspace}>
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
          {state?.spaces.slice(0, 4).map((space) => (
            <button key={space.id} className="wk-docs-space-row" onClick={openWorkspace}>
              <FolderOpen size={16} />
              <span>
                <strong>{space.name}</strong>
                <em>{space.fileCount} 个文件</em>
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
  const [tab, setTab] = useState<DocumentTab>("recent");
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archiveSpaceName, setArchiveSpaceName] = useState("");
  const [previewFile, setPreviewFile] = useState<DocumentAsset | null>(null);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadSpaceName, setUploadSpaceName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const summary = useMemo(() => (state ? createDocumentSummary(state) : null), [state]);
  const visibleFiles = useMemo(() => {
    if (!state) return [];
    return filterFiles(state.files, tab, keyword, kind);
  }, [state, tab, keyword, kind]);
  const selectedFile = useMemo(() => {
    if (!state) return null;
    return state.files.find((file) => file.id === selectedId) || visibleFiles[0] || null;
  }, [state, selectedId, visibleFiles]);

  useEffect(() => {
    if (!selectedId && visibleFiles[0]) {
      setSelectedId(visibleFiles[0].id);
    }
  }, [selectedId, visibleFiles]);

  useEffect(() => {
    if (!state || !selectedFile) return;
    const existingSpace = state.spaces.find((space) => space.name === selectedFile.spaceName);
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

  function showPreview(file: DocumentAsset) {
    if (!file.previewable) {
      Toast.warning("该类型暂不支持在线预览，可下载后查看");
      return;
    }
    setPreviewFile(file);
  }

  function download(file: DocumentAsset) {
    Toast.success(`已开始下载：${file.name}`);
  }

  function openSource(file: DocumentAsset) {
    try {
      WKApp.endpoints.showConversation(new Channel(file.sourceChannelId, file.sourceChannelType));
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
    apply(documentRepository.archiveFile(file.id, archiveSpaceName), `已保存到${archiveSpaceName}`);
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
      WKApp.loginInfo.name || "陈一",
    );
    setState(next);
    setTab("space");
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
      onOk: () => apply(documentRepository.deleteFile(file.id), "已移动到回收站"),
    });
  }

  return (
    <div className="wk-docs-workspace">
      <header className="wk-docs-workspace-header">
        <div>
          <h1>文档中心</h1>
          <p>查找 Octo 会话与空间中的文件，也可以直接上传到团队空间</p>
        </div>
        <div className="wk-docs-header-side">
          {summary && (
            <div className="wk-docs-summary">
              <span>{summary.activeFiles} 可用</span>
              <span>{summary.spaceFiles} 空间文件</span>
              <span>{summary.conversationFiles} 会话文件</span>
            </div>
          )}
          <Button theme="solid" icon={<Upload size={15} />} onClick={() => setUploadVisible(true)}>
            上传
          </Button>
        </div>
      </header>

      <div className="wk-docs-tabs" role="tablist" aria-label="文档分类">
        {tabOptions.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? "active" : ""}
            onClick={() => {
              setTab(item.key);
              setSelectedId(null);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="wk-docs-main">
        <section className="wk-docs-list-panel">
          <div className="wk-docs-toolbar">
            <Input
              prefix={<Search size={15} />}
              value={keyword}
              onChange={setKeyword}
              placeholder="搜索文件、来源、上传人、空间"
            />
            <Select value={kind} onChange={(value) => setKind(String(value))} className="wk-docs-kind-select">
              <Select.Option value="all">全部类型</Select.Option>
              <Select.Option value="pdf">PDF</Select.Option>
              <Select.Option value="doc">文档</Select.Option>
              <Select.Option value="sheet">表格</Select.Option>
              <Select.Option value="image">图片</Select.Option>
              <Select.Option value="zip">压缩包</Select.Option>
            </Select>
          </div>

            <div className="wk-docs-file-list" role="list">
              {visibleFiles.map((file) => (
                <button
                  key={file.id}
                  className={`wk-docs-file-row ${selectedFile?.id === file.id ? "active" : ""}`}
                  onClick={() => setSelectedId(file.id)}
                >
                  <FileBadge file={file} />
                  <span className="wk-docs-file-main">
                    <strong>{file.name}</strong>
                    <em>
                      {file.sourceType} · {file.sourceName} · {formatFileSize(file.size)}
                    </em>
                  </span>
                  <span className="wk-docs-file-meta">
                    <StatusPill file={file} />
                    <small>{file.uploader}</small>
                  </span>
                </button>
              ))}
              {visibleFiles.length === 0 && <div className="wk-docs-empty">没有匹配的文件</div>}
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
                  <Button icon={<Eye size={15} />} onClick={() => showPreview(selectedFile)}>
                    预览
                  </Button>
                  <Button icon={<Download size={15} />} onClick={() => download(selectedFile)}>
                    下载
                  </Button>
                  {selectedFile.sourceChannelId && (
                    <Button icon={<ExternalLink size={15} />} onClick={() => openSource(selectedFile)}>
                      来源会话
                    </Button>
                  )}
                </div>

                <div className="wk-docs-detail-grid">
                  <Info label="来源" value={`${selectedFile.sourceType} / ${selectedFile.sourceName}`} />
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
                        onClick={() => apply(documentRepository.restoreFile(selectedFile.id), "已恢复文件")}
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
            <Select value={uploadSpaceName} onChange={(value) => setUploadSpaceName(String(value))}>
              {state?.spaces.map((space) => (
                <Select.Option key={space.id} value={space.name}>
                  {space.name}
                </Select.Option>
              ))}
            </Select>
          </label>
          <label>
            <span>选择文件</span>
            <input type="file" onChange={(event) => setUploadFile(event.currentTarget.files?.[0] || null)} />
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
