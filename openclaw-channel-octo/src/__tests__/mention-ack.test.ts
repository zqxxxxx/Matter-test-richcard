import { describe, it, expect } from "vitest";
import { MentionAckLedger, NUDGE_MARKER, nudgeText, escalationText } from "../mention-ack";

const base = {
  accountId: "acct1",
  channelId: "g1",
  fromUID: "u_evan",
  fromName: "Evan",
};

describe("MentionAckLedger", () => {
  it("records direct mentions and clears them on a later reply", () => {
    const l = new MentionAckLedger();
    l.record({ ...base, messageSeq: 10, at: 1000 });
    l.record({ ...base, messageSeq: 12, at: 2000 });
    expect(l.size).toBe(2);
    expect(l.clearUpTo("acct1", "g1", 11)).toBe(1); // only seq 10 addressed
    expect(l.size).toBe(1);
    expect(l.clearUpTo("acct1", "g1", 0)).toBe(1); // seq=0 API quirk → clear all
    expect(l.size).toBe(0);
  });

  it("does not clear other channels or accounts", () => {
    const l = new MentionAckLedger();
    l.record({ ...base, messageSeq: 10, at: 1000 });
    l.record({ ...base, channelId: "g2", messageSeq: 11, at: 1000 });
    l.record({ ...base, accountId: "acct2", messageSeq: 12, at: 1000 });
    expect(l.clearUpTo("acct1", "g1", 999)).toBe(1);
    expect(l.size).toBe(2);
  });

  it("clears across accountId/channelId casing differences (#33 normalization)", () => {
    const l = new MentionAckLedger();
    l.record({ ...base, accountId: "27A8InGz6zAae7ef483_bot", channelId: "G1", messageSeq: 10, at: 1000 });
    expect(l.clearUpTo("27a8ingz6zaae7ef483_bot", "g1", 0)).toBe(1);
    expect(l.size).toBe(0);
  });

  it("never tracks synthetic nudges (marker guard)", () => {
    const l = new MentionAckLedger();
    l.record({ ...base, messageSeq: 10, at: 1000 }, `hello ${NUDGE_MARKER} again`);
    expect(l.size).toBe(0);
  });

  it("ignores seq<=0 (cannot be cleared reliably)", () => {
    const l = new MentionAckLedger();
    l.record({ ...base, messageSeq: 0, at: 1000 });
    expect(l.size).toBe(0);
  });

  it("reprompts exactly once after threshold, expires after giveUp", () => {
    const l = new MentionAckLedger(5_000, 20_000);
    l.record({ ...base, messageSeq: 10, at: 0 });

    expect(l.sweep(1_000).toReprompt).toHaveLength(0); // too fresh

    const first = l.sweep(6_000);
    expect(first.toReprompt).toHaveLength(1); // past threshold → nudge
    expect(first.expired).toHaveLength(0);

    expect(l.sweep(10_000).toReprompt).toHaveLength(0); // only ONE nudge

    const last = l.sweep(25_000);
    expect(last.expired).toHaveLength(1); // past giveUp → expire loudly
    expect(l.size).toBe(0);
  });

  it("a reply between threshold and giveUp clears without expiry", () => {
    const l = new MentionAckLedger(5_000, 20_000);
    l.record({ ...base, messageSeq: 10, at: 0 });
    l.sweep(6_000); // nudged
    expect(l.clearUpTo("acct1", "g1", 10)).toBe(1);
    expect(l.sweep(25_000).expired).toHaveLength(0);
  });
});

describe("nudgeText", () => {
  it("carries the marker, the bot @, and the asker", () => {
    const t = nudgeText("执剑人", { ...base, messageSeq: 10, at: 0, reprompted: false }, 6 * 60_000);
    expect(t).toContain("@执剑人");
    expect(t).toContain(NUDGE_MARKER);
    expect(t).toContain("Evan");
    expect(t).toContain("6 分钟");
  });
});

describe("escalationText", () => {
  it("names the bot, the asker, the seq — and carries NO nudge marker (it's a DM)", () => {
    const t = escalationText("执剑人", { ...base, messageSeq: 31, at: 0, reprompted: true }, 30 * 60_000);
    expect(t).toContain("执剑人");
    expect(t).toContain("Evan");
    expect(t).toContain("seq 31");
    expect(t).toContain("30 分钟");
    expect(t).not.toContain(NUDGE_MARKER); // must not be re-ingested as a group mention
  });
});
