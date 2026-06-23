import { describe, expect, it } from "vitest";
import {
  buildSpaceMemberRoleUpdate,
  canChangeSpaceMemberRole,
  editableSpaceRoleOptions,
} from "./memberPermissions";
import type { DocumentSpaceMember } from "./types";

const member: DocumentSpaceMember = {
  uid: "qa_wang01",
  name: "王珂",
  role: "viewer",
  source: "手动添加",
  joinedAt: "2026-06-17 09:00:00",
};

describe("space member permissions", () => {
  it("allows role changes for non-owner members only", () => {
    expect(canChangeSpaceMemberRole(member)).toBe(true);
    expect(canChangeSpaceMemberRole({ ...member, role: "owner" })).toBe(false);
  });

  it("builds an update payload that preserves identity and changes only role", () => {
    expect(buildSpaceMemberRoleUpdate(member, "editor")).toEqual({
      uid: "qa_wang01",
      name: "王珂",
      role: "editor",
    });
  });

  it("does not offer owner as an inline editable role", () => {
    expect(editableSpaceRoleOptions.map((role) => role.value)).toEqual([
      "viewer",
      "editor",
      "admin",
    ]);
  });
});
