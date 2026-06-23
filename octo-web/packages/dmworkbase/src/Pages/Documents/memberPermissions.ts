import type { DocumentSpaceMember, DocumentSpaceRole } from "./types";

export const editableSpaceRoleOptions: Array<{
  value: Exclude<DocumentSpaceRole, "owner">;
  label: string;
}> = [
  { value: "viewer", label: "查看者" },
  { value: "editor", label: "编辑者" },
  { value: "admin", label: "管理员" },
];

export function canChangeSpaceMemberRole(member: DocumentSpaceMember) {
  return member.role !== "owner";
}

export function buildSpaceMemberRoleUpdate(
  member: DocumentSpaceMember,
  role: Exclude<DocumentSpaceRole, "owner">
) {
  return {
    uid: member.uid,
    name: member.name || member.uid,
    role,
  };
}
