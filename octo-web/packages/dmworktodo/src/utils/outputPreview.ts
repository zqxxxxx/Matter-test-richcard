export interface PreviewableOutputLike {
  file_name?: string;
  file_url?: string;
}

function getExtensionFromName(name?: string) {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  if (dot > 0 && dot < name.length - 1) {
    return name.substring(dot + 1).toLowerCase();
  }
  return "";
}

export function canPreviewMatterOutput(
  output: PreviewableOutputLike,
  canPreviewInPanel: (extension: string, name?: string) => boolean,
) {
  if (!output.file_url) return false;
  const extension = getExtensionFromName(output.file_name);
  return canPreviewInPanel(extension, output.file_name);
}
