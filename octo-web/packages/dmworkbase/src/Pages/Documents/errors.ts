export function extractDocumentErrorMessage(
  error: unknown,
  fallback = "操作失败，请稍后重试"
) {
  if (!error) return fallback;
  if (typeof error === "string") return error || fallback;
  if (error instanceof Error && error.message) return error.message;

  const maybeError = error as {
    msg?: unknown;
    message?: unknown;
    response?: {
      data?: {
        msg?: unknown;
        message?: unknown;
      };
    };
  };
  const candidates = [
    maybeError.response?.data?.msg,
    maybeError.response?.data?.message,
    maybeError.msg,
    maybeError.message,
  ];
  const message = candidates.find(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  );
  return message || fallback;
}
