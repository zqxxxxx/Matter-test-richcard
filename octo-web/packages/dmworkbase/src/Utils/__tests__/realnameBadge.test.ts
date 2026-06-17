import { describe, it, expect } from "vitest";
import { shouldShowRealnameBadge } from "../realnameBadge";

/**
 * Shared realname-badge helper 单测。
 *
 * ## 背景（Jerry R2 🔴 Critical）
 *
 * R1/R2 用 `channelInfo?.orgData?.robot === 1` 判断 "是不是 bot 会话"，但
 * `channelInfo` 是按 `message.fromUID` 查的。自己在 bot 1v1 里发消息时
 * `fromUID=自己`，按发送者查到的是"自己"的 Person channelInfo（robot≠1）→
 * bot 判断失效 → self-fallback 命中 → **自己发给 bot 的消息错误显示实名 ✓**。
 *
 * Round 3 拆成两个独立维度：
 *   - `isBotConversation` —— 会话对端是不是 bot（按 `message.channel` 推出）。
 *       会话 bot 1v1 里自己和别人发的消息都不应显示徽章。
 *   - `isBotSender`       —— 消息的发送者是不是 bot。
 *       群里 bot 发送者保留 R1 原规则，不显示徽章。
 *
 * 关键回归点（Jerry R2 Critical）钉死在本文件：
 *   "isBotConversation=true + self-sent → false"。
 */
describe("shouldShowRealnameBadge", () => {
    // ---------------------------------------------------------------------
    // bot 会话维度（R3 Critical）
    // ---------------------------------------------------------------------

    it("🔑 R3 Critical: isBotConversation=true + self-sent → false（自己发给 bot 的消息不显示徽章）", () => {
        // 真实场景：自己在 bot 1v1 里发消息
        //   - message.channel 的 channelInfo.robot === 1
        //   - message.fromUID === WKApp.loginInfo.uid （isOwnMessage=true）
        //   - WKApp.loginInfo.realnameVerified === true （self-fallback 本会命中）
        // isBotConversation 必须在 self-fallback 之前短路。
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: true,
                isBotSender: false, // 自己 fromUID 对应的 Person channelInfo.robot≠1
                isOwnMessage: true,
                groupMemberOrgData: undefined,
                channelInfoOrgData: undefined,
                loginRealnameVerified: true,
            })
        ).toBe(false);
    });

    it("isBotConversation=true + other-sent（bot 发消息给自己） → false", () => {
        // 1v1 bot 对我说话：message.fromUID = bot，channelInfo（按 fromUID 查）
        // 是 bot 的 Person，所以 isBotSender 也 true。但即使没被 isBotSender
        // 命中，isBotConversation 也应让它 false。
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: true,
                isBotSender: true,
                isOwnMessage: false,
                groupMemberOrgData: undefined,
                channelInfoOrgData: { robot: 1 },
                loginRealnameVerified: false,
            })
        ).toBe(false);
    });

    it("isBotConversation=true + 群成员 orgData.verified=true → false（会话 bot 优先级高于 verified 路径）", () => {
        // 防御：即便上游给了 groupMember.realname_verified=true（理论不该出现
        // 在 1v1 里，但兜底 SDK 行为），isBotConversation 也要让整体 false。
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: true,
                isBotSender: false,
                isOwnMessage: false,
                groupMemberOrgData: { realname_verified: true },
                channelInfoOrgData: { realname_verified: true },
                loginRealnameVerified: true,
            })
        ).toBe(false);
    });

    // ---------------------------------------------------------------------
    // bot 发送者维度（R1 原规则保留）
    // ---------------------------------------------------------------------

    it("isBotConversation=false + 群里 bot 作为 fromUID（isBotSender=true） → false（R1 原规则）", () => {
        // 群里 bot 发消息：message.channel 是群（robot≠1，isBotConversation=false），
        // 但发送者是 bot（isBotSender=true）。即便 groupMember.verified=true
        // 也不应显示徽章。
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: true,
                isOwnMessage: false,
                groupMemberOrgData: { realname_verified: true },
                channelInfoOrgData: { robot: 1 },
                loginRealnameVerified: false,
            })
        ).toBe(false);
    });

    // ---------------------------------------------------------------------
    // 正常 self-fallback / other-path
    // ---------------------------------------------------------------------

    it("isBotConversation=false + self + loginInfo.realnameVerified=true → true（正常 self-fallback）", () => {
        // 1v1 和真人说话 / 群里自己发：self-fallback 应命中。
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: true,
                groupMemberOrgData: undefined,
                channelInfoOrgData: undefined,
                loginRealnameVerified: true,
            })
        ).toBe(true);
    });

    it("isBotConversation=false + other + verified group member → true（正常 other-path）", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: false,
                groupMemberOrgData: {
                    realname_verified: true,
                    real_name: "Alice",
                },
                channelInfoOrgData: undefined,
                loginRealnameVerified: undefined,
            })
        ).toBe(true);
    });

    // ---------------------------------------------------------------------
    // 其它基础分支（兜底）
    // ---------------------------------------------------------------------

    it("AI message → false（即便 orgData 已实名也压制）", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: true,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: false,
                groupMemberOrgData: { realname_verified: true },
                channelInfoOrgData: { realname_verified: true },
                loginRealnameVerified: true,
            })
        ).toBe(false);
    });

    it("字段全缺 → false", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: false,
                groupMemberOrgData: undefined,
                channelInfoOrgData: undefined,
                loginRealnameVerified: undefined,
            })
        ).toBe(false);
    });

    // ---------------------------------------------------------------------
    // 其它回归兜底：保留 R1/R2 已覆盖的关键分支
    // ---------------------------------------------------------------------

    it("other-viewer + channelInfo verified → true (1v1 fallback)", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: false,
                groupMemberOrgData: undefined,
                channelInfoOrgData: {
                    realname_verified: true,
                    real_name: "Bob",
                },
                loginRealnameVerified: false,
            })
        ).toBe(true);
    });

    it("tri-state guard: self + loginInfo.realnameVerified=undefined → false（严格 === true）", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: true,
                groupMemberOrgData: undefined,
                channelInfoOrgData: undefined,
                loginRealnameVerified: undefined,
            })
        ).toBe(false);
    });

    it("scope guard: other-viewer + loginInfo.realnameVerified=true 不污染 → other 未实名仍为 false", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: false,
                groupMemberOrgData: { realname_verified: false },
                channelInfoOrgData: undefined,
                loginRealnameVerified: true,
            })
        ).toBe(false);
    });

    it("precedence: self + loginInfo.realnameVerified=true 即便 groupMember.realname_verified=false 也 true", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: true,
                groupMemberOrgData: { realname_verified: false },
                channelInfoOrgData: undefined,
                loginRealnameVerified: true,
            })
        ).toBe(true);
    });

    // 兼容后端序列化偏差（E1）
    it("兼容 realname_verified = 1 (number)", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: false,
                groupMemberOrgData: { realname_verified: 1 },
                channelInfoOrgData: undefined,
                loginRealnameVerified: undefined,
            })
        ).toBe(true);
    });

    it("兼容 realname_verified = \"true\" (string)", () => {
        expect(
            shouldShowRealnameBadge({
                isAi: false,
                isBotConversation: false,
                isBotSender: false,
                isOwnMessage: false,
                groupMemberOrgData: undefined,
                channelInfoOrgData: { realname_verified: "true" },
                loginRealnameVerified: undefined,
            })
        ).toBe(true);
    });
});
