export interface DocumentSearchNavigationTarget {
  view: "recent";
  fileId: string;
}

export function buildDocumentSearchNavigation(
  item: any
): DocumentSearchNavigationTarget | null {
  if (!item?.id) return null;
  return {
    view: "recent",
    fileId: item.id,
  };
}
