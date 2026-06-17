import { describe, it, expect } from "vitest";
import { Convert } from "../../../../packages/dmworkbase/src/Service/Convert";

// GH dmwork-web#1121: userToChannelInfo 应把 real_name / realname_verified
// 透传到 orgData，并在 orgData.displayName 的解析优先级里放在 remark 之下、name 之上。

describe("Convert.userToChannelInfo realname fields", () => {
    const base = {
        uid: "u-001",
        name: "alice",
        short_no: "123",
        remark: "",
    } as const;

    it("does not set real_name path when realname_verified is false or missing", () => {
        const c1 = Convert.userToChannelInfo({ ...base });
        expect(c1.orgData.displayName).toBe("alice");
        expect(c1.orgData.realname_verified).toBe(0);
        expect(c1.orgData.real_name).toBe("");

        const c2 = Convert.userToChannelInfo({ ...base, real_name: "Alice Real" });
        // real_name 存在但未 verified，不应覆盖昵称
        expect(c2.orgData.displayName).toBe("alice");
    });

    it("uses real_name when realname_verified is 1 or true", () => {
        const c1 = Convert.userToChannelInfo({
            ...base,
            real_name: "Alice Real",
            realname_verified: 1,
        });
        expect(c1.orgData.displayName).toBe("Alice Real");
        expect(c1.orgData.realname_verified).toBe(1);
        expect(c1.orgData.real_name).toBe("Alice Real");

        const c2 = Convert.userToChannelInfo({
            ...base,
            real_name: "Alice Real",
            realname_verified: true,
        });
        expect(c2.orgData.displayName).toBe("Alice Real");
        expect(c2.orgData.realname_verified).toBe(1);
    });

    it("remark overrides real_name even when verified", () => {
        const c = Convert.userToChannelInfo({
            ...base,
            remark: "Ally",
            real_name: "Alice Real",
            realname_verified: 1,
        });
        expect(c.orgData.displayName).toBe("Ally");
    });

    it("falls back to name when real_name is empty but verified=1", () => {
        const c = Convert.userToChannelInfo({
            ...base,
            real_name: "",
            realname_verified: 1,
        });
        expect(c.orgData.displayName).toBe("alice");
    });
});
