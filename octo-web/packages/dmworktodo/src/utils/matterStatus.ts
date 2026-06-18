import type { MatterStatus } from "../bridge/types";

export type MatterStatusTone =
  | "blue"
  | "green"
  | "gray"
  | "orange"
  | "purple"
  | "red";

export interface MatterStatusMeta {
  labelKey: string;
  tone: MatterStatusTone;
  terminal: boolean;
}

export interface MatterStatusDropdownOption {
  value: MatterStatus;
  labelKey: string;
  tone: MatterStatusTone;
  requiresReason: boolean;
}

const STATUS_META: Record<MatterStatus, MatterStatusMeta> = {
  backlog: {
    labelKey: "todo.status.backlog",
    tone: "gray",
    terminal: false,
  },
  open: {
    labelKey: "todo.status.pending",
    tone: "blue",
    terminal: false,
  },
  in_progress: {
    labelKey: "todo.status.inProgress",
    tone: "orange",
    terminal: false,
  },
  review: {
    labelKey: "todo.status.review",
    tone: "purple",
    terminal: false,
  },
  done: {
    labelKey: "todo.status.done",
    tone: "green",
    terminal: true,
  },
  blocked: {
    labelKey: "todo.status.blocked",
    tone: "red",
    terminal: false,
  },
  cancelled: {
    labelKey: "todo.status.cancelled",
    tone: "gray",
    terminal: true,
  },
  archived: {
    labelKey: "todo.status.archived",
    tone: "gray",
    terminal: true,
  },
};

export function getMatterStatusMeta(status: MatterStatus): MatterStatusMeta {
  return STATUS_META[status] ?? STATUS_META.open;
}

export function nextQuickToggleStatus(status: MatterStatus): MatterStatus {
  return status === "done" ? "open" : "done";
}

export function canQuickToggleStatus(status: MatterStatus): boolean {
  return status !== "archived" && status !== "cancelled";
}

const STATUS_ORDER: MatterStatus[] = [
  "backlog",
  "open",
  "in_progress",
  "review",
  "done",
  "blocked",
  "cancelled",
  "archived",
];

export function getMatterStatusDropdownOptions(
  currentStatus: MatterStatus,
  isCreator: boolean,
): MatterStatusDropdownOption[] {
  return STATUS_ORDER.filter((status) => {
    if (!isCreator && (status === "archived" || status === "cancelled")) {
      return false;
    }
    return true;
  }).map((status) => {
    const meta = getMatterStatusMeta(status);
    return {
      value: status,
      labelKey: meta.labelKey,
      tone: meta.tone,
      requiresReason: status === "blocked" && currentStatus !== "blocked",
    };
  });
}
