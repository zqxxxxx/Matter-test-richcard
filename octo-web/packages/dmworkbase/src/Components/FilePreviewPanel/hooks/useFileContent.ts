import { useState, useEffect, useCallback, useRef } from "react";
import { t } from "../../../i18n/instance";

export type ResponseType = "text" | "arraybuffer";

export interface UseFileContentOptions<T extends ResponseType = "text"> {
  url: string;
  enabled?: boolean;
  /** 响应类型：text（默认）或 arraybuffer */
  responseType?: T;
}

export type ContentType<T extends ResponseType> = T extends "arraybuffer"
  ? ArrayBuffer
  : string;

export interface UseFileContentResult<T extends ResponseType = "text"> {
  content: ContentType<T> | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * 文件内容加载 Hook
 * 用于需要预加载内容的渲染器（Markdown、Code、Text、Excel 等）
 * @param options.responseType - 'text'（默认）或 'arraybuffer'
 */
export function useFileContent<T extends ResponseType = "text">(
  options: UseFileContentOptions<T>
): UseFileContentResult<T> {
  const { url, enabled = true, responseType = "text" as T } = options;

  const [content, setContent] = useState<ContentType<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 用请求序号丢弃过期响应，避免主动 abort fetch 造成浏览器 Network 面板噪声。
  const requestSeqRef = useRef(0);

  const loadContent = useCallback(async () => {
    if (!url || !enabled) {
      return;
    }

    const requestSeq = ++requestSeqRef.current;
    const isCurrentRequest = () => requestSeq === requestSeqRef.current;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);

      if (!isCurrentRequest()) {
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (responseType === "arraybuffer") {
        const buffer = await response.arrayBuffer();
        if (!isCurrentRequest()) {
          return;
        }
        setContent(buffer as ContentType<T>);
      } else {
        const buffer = await response.arrayBuffer();
        if (!isCurrentRequest()) {
          return;
        }
        const text = new TextDecoder("utf-8").decode(buffer);
        setContent(text as ContentType<T>);
      }
    } catch (err) {
      if (!isCurrentRequest()) {
        return;
      }
      const message = err instanceof Error ? err.message : t("base.filePreview.loadFailed");
      setError(message);
      setContent(null);
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [url, enabled, responseType]);

  useEffect(() => {
    loadContent();

    // 清理函数：组件卸载或依赖变化时让当前请求结果失效，不主动 abort。
    return () => {
      requestSeqRef.current += 1;
    };
  }, [loadContent]);

  const reload = useCallback(() => {
    loadContent();
  }, [loadContent]);

  return {
    content,
    loading,
    error,
    reload,
  };
}

export default useFileContent;
