export type MatterWorkspaceAuth = {
  token?: string | null;
  uid?: string | null;
  name?: string | null;
  spaceId?: string | null;
};

export function syncMatterWorkspaceAuth(
  auth: MatterWorkspaceAuth,
  storage: Pick<Storage, "setItem"> = localStorage
) {
  const pairs: Array<[string, string | null | undefined]> = [
    ["token", auth.token],
    ["uid", auth.uid],
    ["name", auth.name],
    ["currentSpaceId", auth.spaceId],
  ];

  pairs.forEach(([key, value]) => {
    if (value) storage.setItem(key, value);
  });
}
