import type { DocumentAsset } from "./types";

export function canPreviewDocumentAsset(
  file: Pick<DocumentAsset, "previewable" | "extension" | "name" | "storagePath">,
  canPreviewInPanel: (extension: string, name?: string) => boolean
) {
  return Boolean(
    file.previewable &&
      file.storagePath &&
      canPreviewInPanel(file.extension, file.name)
  );
}
