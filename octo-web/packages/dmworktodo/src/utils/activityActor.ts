export function isSystemActor(uid?: string | null) {
  return (uid || "").trim().toLowerCase() === "system";
}

export function getSystemActorLabel() {
  return "系统";
}
