# Richcard Full Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all remaining Richcard acceptance risks and make the deployed environment pass a complete P0 business-closure test.

**Architecture:** Keep the current Octo richcard implementation and deployed stack. Clean and reseed a deterministic acceptance group, verify all card actions with real APIs, and lock the demo-only send-message switch behind explicit acceptance tooling notes.

**Tech Stack:** Octo web React/TypeScript, Vitest, Playwright, Octo server APIs, summary-api, Matter iframe workspace, Docker Compose deployment on `10.172.49.131`.

---

## Acceptance Risks To Close

1. Historical cards remain in the current acceptance group and confuse visual validation.
2. Summary feedback only verified the `认可` branch; `需要调整` must be verified against the real summary API.
3. Matter card transition actions such as `标记完成` / `认可结果` must be verified end-to-end.
4. `TS_MESSAGE_SENDMESSAGEON=true` is currently enabled for demo data injection; its target-state must be explicit for acceptance versus production.

## Files

- Modify: `octo-deployment/richcard-demo/scripts/send-richcard-messages.sh`
- Modify: `octo-deployment/richcard-demo/scripts/cleanup-demo.sh`
- Create: `octo-deployment/richcard-demo/scripts/reset-current-acceptance-group.sh`
- Create: `octo-web/tests/richcard-full-acceptance.spec.ts`
- Modify: `docs/superpowers/plans/2026-06-22-richcard-real-data-deployment.md`

## Task 1: Deterministic Acceptance Group Reset

**Goal:** Make the currently viewed group contain only one clean, current acceptance batch.

- [ ] **Step 1: Add a reset script for the current acceptance group**

Create `octo-deployment/richcard-demo/scripts/reset-current-acceptance-group.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/common.sh"

: "${DEMO_GROUP_NO:?DEMO_GROUP_NO is required}"

echo "[reset] marking old acceptance messages deleted for group $DEMO_GROUP_NO"
mysql_root "octo" <<SQL
SET @group_no := '$(sql_quote "$DEMO_GROUP_NO")';
UPDATE message_extra
   SET is_deleted = 1, updated_at = NOW()
 WHERE channel_id = @group_no
   AND channel_type = 2;
SQL

echo "[reset] done"
```

- [ ] **Step 2: Run reset against the currently viewed group**

Run on server:

```bash
cd /home/zhangqianxiao/Matter-test-richcard
DEMO_GROUP_NO=908c31bf1bce41118fcf43b0497b3fc9 \
  octo-deployment/richcard-demo/scripts/reset-current-acceptance-group.sh
```

Expected: script exits `0`.

- [ ] **Step 3: Reseed the current group**

Run:

```bash
cd /home/zhangqianxiao/Matter-test-richcard
DEMO_GROUP_NO=908c31bf1bce41118fcf43b0497b3fc9 \
DEMO_GROUP_NAME="Matter 助手、法务同学、赵倩笑 P" \
DEMO_SUMMARY_TASK_ID=4 \
DEMO_SUMMARY_ACTION_TASK_ID=6 \
DEMO_CARD_RUN_ID=final-acceptance-$(date +%Y%m%d%H%M%S) \
  octo-deployment/richcard-demo/scripts/send-richcard-messages.sh
```

Expected: group has exactly the current batch visible for acceptance.

## Task 2: Summary Feedback Full Branch Verification

**Goal:** Verify both summary card feedback branches call real backend APIs.

- [ ] **Step 1: Verify `认可` branch**

Playwright action:

```ts
await summaryCard.getByRole("button", { name: "认可" }).click();
```

Expected network response:

```text
POST /summary/api/v1/summaries/6/respond -> 200
```

- [ ] **Step 2: Verify `需要调整` branch**

Before this test, reseed or use a second summary task id so previous `认可` does not make the task terminal.

Playwright action:

```ts
await summaryCard.getByRole("button", { name: "需要调整" }).click();
```

Expected network response:

```text
POST /summary/api/v1/summaries/{task_id}/respond -> 200
```

Expected UI: no iframe/panel blocks subsequent chat interaction.

## Task 3: Matter Transition Action Verification

**Goal:** Verify card buttons that mutate Matter status use real data and produce a visible return card.

- [ ] **Step 1: Click `进入 Matter` on MAT-RC-004**

Expected:

```text
GET /matter/api/v1/matters/44444444-4444-4444-8444-444444444444 -> 200
GET /matter/api/v1/matters/44444444-4444-4444-8444-444444444444/timeline?limit=100 -> 200
```

Expected UI: Matter workspace opens and shows `返回 Matter 助手、法务同学、赵倩笑 P`.

- [ ] **Step 2: Click return to original chat**

Expected:

```ts
const iframeVisible = await page
  .locator('iframe[title="事项"]')
  .evaluate(el => getComputedStyle(el).display !== "none");
expect(iframeVisible).toBe(false);
```

- [ ] **Step 3: Click `认可结果` / `标记完成` on a Matter card**

Expected:

```text
PUT or POST Matter status transition API -> 200
```

Expected UI: a new Matter status card is sent back to the same group and visible in the chat stream.

## Task 4: Demo Send Switch Decision

**Goal:** Remove ambiguity around `TS_MESSAGE_SENDMESSAGEON=true`.

- [ ] **Step 1: Document acceptance-only state**

Update deployment notes:

```markdown
For the Richcard acceptance environment, `TS_MESSAGE_SENDMESSAGEON=true` is enabled only to inject demo acceptance cards through the real message-send API.
Before production or security-sensitive staging, set it back to the target production policy and seed data through approved backend jobs instead.
```

- [ ] **Step 2: Verify current acceptance env intentionally keeps it enabled**

Run:

```bash
cd /opt/octo-richcard/octo-deployment/docker
sudo docker compose exec octo-server printenv TS_MESSAGE_SENDMESSAGEON
```

Expected:

```text
true
```

## Task 5: One-Command Full Acceptance Test

**Goal:** Produce one repeatable browser test that proves all P0 flows.

- [ ] **Step 1: Create Playwright test**

Create `octo-web/tests/richcard-full-acceptance.spec.ts` with checks for:

- login as `rc_demo_pm`
- current group opens
- all four Matter states visible
- current batch card x coordinates are equal
- Matter workspace opens and returns cleanly
- summary `认可` response is `200`
- summary `需要调整` response is `200`
- text + DeepSeek link preview appears as a white preview panel

- [ ] **Step 2: Run final browser acceptance**

Run:

```bash
cd /Users/Administrator/Desktop/aicoding\ setting/card_research/Matter-test-richcard/octo-web
pnpm exec playwright test tests/richcard-full-acceptance.spec.ts --project=chromium
```

Expected:

```text
1 passed
```

## Final Pass Criteria

- [ ] Current visible group has only the latest acceptance batch.
- [ ] Matter cards show `进行中 / 等你看 / 已完成 / 受阻`.
- [ ] Card alignment is consistent for the current batch.
- [ ] `进入 Matter -> 返回原始聊天 -> continue clicking chat actions` works.
- [ ] Summary `认可` and `需要调整` both call real summary API and return `200`.
- [ ] Matter transition action calls real Matter API and produces a return status card.
- [ ] Link preview remains `文字消息 + 白色预览卡`.
- [ ] `TS_MESSAGE_SENDMESSAGEON` state is documented as acceptance-only.
- [ ] Vitest and Playwright acceptance tests pass.
