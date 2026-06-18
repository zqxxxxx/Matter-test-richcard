export function getFileIcon() {
  return "";
}

export function formatFileSize(size?: number) {
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}
