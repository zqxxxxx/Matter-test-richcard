import React, { useCallback, useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { BaseRendererProps } from "../types";
import { isFileTooLarge } from "../config";
import { useFileContent } from "../hooks/useFileContent";
import FileTooLarge from "./FileTooLarge";
import { RendererState } from "./RendererState";
import "./WordRenderer.css";

export interface WordRendererProps extends BaseRendererProps {}

let mammothLibrary: typeof import("mammoth") | null = null;

async function loadMammothLibrary(): Promise<typeof import("mammoth")> {
  if (mammothLibrary) return mammothLibrary;
  mammothLibrary = await import("mammoth/mammoth.browser");
  return mammothLibrary;
}

/**
 * Word 渲染器。
 *
 * 企业 IM 的第一版文档预览重点是让用户在不下载的情况下快速确认内容。
 * 这里把 docx 转成受限 HTML 展示；复杂分页、批注和修订痕迹不在前端还原。
 */
const WordRenderer: React.FC<WordRendererProps> = ({ file, onError }) => {
  if (file.size && isFileTooLarge(file.size)) {
    return (
      <FileTooLarge
        fileName={file.name}
        fileSize={file.size}
        fileUrl={file.url}
      />
    );
  }

  const [html, setHtml] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const {
    content: buffer,
    loading: fetching,
    error: fetchError,
    reload,
  } = useFileContent({
    url: file.url,
    responseType: "arraybuffer",
  });

  const parseContent = useCallback(
    async (data: ArrayBuffer) => {
      setParsing(true);
      setParseError(null);
      setHtml("");

      try {
        const mammoth = await loadMammothLibrary();
        const result = await mammoth.convertToHtml(
          { arrayBuffer: data },
          {
            convertImage: mammoth.images.dataUri,
            includeDefaultStyleMap: true,
          }
        );
        const sanitized = DOMPurify.sanitize(result.value, {
          USE_PROFILES: { html: true },
          ADD_ATTR: ["target", "rel"],
        });

        setHtml(sanitized);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Word 文档解析失败";
        setParseError(message);
        onError?.(message);
      } finally {
        setParsing(false);
      }
    },
    [onError]
  );

  useEffect(() => {
    if (buffer) {
      parseContent(buffer);
    }
  }, [buffer, parseContent]);

  const loading = fetching || parsing;
  const error = fetchError || parseError;

  if (loading) {
    return <RendererState type="loading" />;
  }

  if (error) {
    return <RendererState type="error" message={error} onRetry={reload} />;
  }

  if (!html.trim()) {
    return <RendererState type="empty" />;
  }

  return (
    <div className="wk-file-preview-word-renderer">
      <article
        className="wk-file-preview-word-renderer__paper"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

export default WordRenderer;
export { WordRenderer };
