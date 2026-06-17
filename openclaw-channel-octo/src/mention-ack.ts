/**
 * Mention-ack ledger — @必达 v1 (结构外力量).
 *
 * The product complaint: "@了一只龙虾,它经常就不理我". A direct group @ is a
 * doorbell; silence is not an acceptable terminal state. This ledger tracks
 * every group mention aimed at the bot and, when no reply lands within the
 * threshold, redelivers ONE synthetic nudge through the normal inbound path
 * (so the agent wakes in the same group session and answers — or explicitly
 * declines). Still silent after the nudge → the entry expires with a loud
 * log line for the patrol/audit trail. Escalation to the owner is v2.
 *
 * Pure bookkeeping lives here (unit-tested); inbound.ts wires record/clear
 * and the sweeper.
 */

export interface PendingMention {
  accountId: string;
  channelId: string; // group id
  messageSeq: number;
  fromUID: string;
  fromName?: string;
  at: number; // ms epoch when received
  reprompted: boolean;
}

export interface SweepResult {
  toReprompt: PendingMention[];
  expired: PendingMention[];
}

/** Marker embedded in synthetic nudges so they are never themselves tracked. */
export const NUDGE_MARKER = "[门铃重提]";

const DEFAULT_THRESHOLD_MS = 5 * 60 * 1000; // nudge after 5 min of silence
const DEFAULT_GIVE_UP_MS = 30 * 60 * 1000; // stop caring after 30 min

export class MentionAckLedger {
  private pending = new Map<string, PendingMention>();

  readonly thresholdMs: number;
  readonly giveUpMs: number;

  constructor(thresholdMs?: number, giveUpMs?: number) {
    this.thresholdMs = thresholdMs ?? DEFAULT_THRESHOLD_MS;
    this.giveUpMs = giveUpMs ?? DEFAULT_GIVE_UP_MS;
  }

  /**
   * Keys are case-normalized: BotFather account ids arrive in mixed casing
   * depending on the code path (channel normalization #33), and a recorder/
   * clearer casing mismatch would silently break clearance — the exact class
   * of bug @必达 exists to catch elsewhere.
   */
  private key(accountId: string, channelId: string, seq: number): string {
    return `${accountId.toLowerCase()}|${channelId.toLowerCase()}|${seq}`;
  }

  /** Track a direct group mention. Synthetic nudges are skipped by marker. */
  record(m: Omit<PendingMention, "reprompted">, content?: string): void {
    if (content && content.includes(NUDGE_MARKER)) return;
    if (!m.messageSeq || m.messageSeq <= 0) return;
    this.pending.set(this.key(m.accountId, m.channelId, m.messageSeq), {
      ...m,
      reprompted: false,
    });
  }

  /**
   * A successful bot reply in a group addresses the conversation up to that
   * moment: clear every pending mention in (account, channel) with
   * seq <= repliedSeq. repliedSeq<=0 (API quirk) clears the whole channel.
   */
  clearUpTo(accountId: string, channelId: string, repliedSeq: number): number {
    let cleared = 0;
    const acct = accountId.toLowerCase();
    const chan = channelId.toLowerCase();
    for (const [k, m] of this.pending) {
      if (m.accountId.toLowerCase() !== acct || m.channelId.toLowerCase() !== chan) continue;
      if (repliedSeq <= 0 || m.messageSeq <= repliedSeq) {
        this.pending.delete(k);
        cleared++;
      }
    }
    return cleared;
  }

  /** Entries past threshold get ONE reprompt; past giveUp they expire. */
  sweep(now: number): SweepResult {
    const out: SweepResult = { toReprompt: [], expired: [] };
    for (const [k, m] of this.pending) {
      const age = now - m.at;
      if (age >= this.giveUpMs) {
        this.pending.delete(k);
        out.expired.push(m);
        continue;
      }
      if (!m.reprompted && age >= this.thresholdMs) {
        m.reprompted = true;
        out.toReprompt.push(m);
      }
    }
    return out;
  }

  get size(): number {
    return this.pending.size;
  }
}

/** Render the synthetic nudge text (carries the marker + the @ for routing). */
export function nudgeText(botName: string, m: PendingMention, now: number): string {
  const mins = Math.max(1, Math.round((now - m.at) / 60000));
  const who = m.fromName || m.fromUID;
  return (
    `@${botName} ${NUDGE_MARKER} ${who} 在 ${mins} 分钟前 @ 了你(seq ${m.messageSeq})至今没有回应。` +
    `现在就回应那条消息;确实无需回应也要回一句说明,不许默不作声。`
  );
}

/**
 * @必达 v2 — escalation DM to the bot's owner when even the nudge failed.
 * Silence is never a terminal state: if the bot stayed quiet past give-up,
 * the human who owns it should learn their agent dropped a request, so they
 * can step in. Plain text (no marker needed — it goes to a DM, never the
 * tracked group).
 */
export function escalationText(botName: string, m: PendingMention, now: number): string {
  const mins = Math.max(1, Math.round((now - m.at) / 60000));
  const who = m.fromName || m.fromUID;
  return (
    `⚠️ 你的 agent「${botName}」可能卡住了:${who} 在 ${mins} 分钟前的群里 @ 了它(seq ${m.messageSeq}),` +
    `提醒一次后仍然没有任何回应。它可能遇到了错误、缺少权限,或不知道怎么办 —— 去看一眼,必要时帮它接手。`
  );
}
