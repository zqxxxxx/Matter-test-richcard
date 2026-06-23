import { describe, expect, it, vi } from "vitest";

import { syncMatterWorkspaceAuth } from "./matterWorkspaceAuth";

describe("syncMatterWorkspaceAuth", () => {
  it("writes host Octo auth into the same-origin Matter UI storage keys", () => {
    const storage = {
      setItem: vi.fn(),
    } as unknown as Storage;

    syncMatterWorkspaceAuth(
      {
        token: "real-token",
        uid: "pm_chen",
        name: "陈一",
        spaceId: "space-real-octo",
      },
      storage,
    );

    expect(storage.setItem).toHaveBeenCalledWith("token", "real-token");
    expect(storage.setItem).toHaveBeenCalledWith("uid", "pm_chen");
    expect(storage.setItem).toHaveBeenCalledWith("name", "陈一");
    expect(storage.setItem).toHaveBeenCalledWith("currentSpaceId", "space-real-octo");
  });

  it("does not overwrite existing keys with empty values", () => {
    const storage = {
      setItem: vi.fn(),
    } as unknown as Storage;

    syncMatterWorkspaceAuth(
      {
        token: "",
        uid: undefined,
        name: "",
        spaceId: "space-real-octo",
      },
      storage,
    );

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.setItem).toHaveBeenCalledWith("currentSpaceId", "space-real-octo");
  });
});
