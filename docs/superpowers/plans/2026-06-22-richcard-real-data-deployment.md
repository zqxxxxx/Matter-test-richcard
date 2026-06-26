# Richcard Real Data Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the richcard branch on a real Octo stack with real users, groups, Matter data, summary data, and persisted rich-card messages.

**Architecture:** Use a separate `richcard` validation stack cloned from the existing filespace stack if available. Keep production validation on the normal Octo login/chat/Matter/Summary routes, send business cards through the real message delivery path, and isolate all demo seed data under a deterministic `rc_demo_` namespace for cleanup.

**Tech Stack:** Docker Compose, MySQL 8, Redis, MinIO, WuKongIM, octo-server, octo-web, octo-matter, optional octo-smart-summary `summary-api` and `summary-worker`.

---

## Goal

Deploy the `richcard` branch as a real Octo environment, not a mock preview. The deployed environment must keep the original Octo web experience usable, add rich business-card messages, and support an end-to-end business loop:

- Users can log in and enter a seeded group chat.
- The group contains real rich-card messages persisted through Octo/WuKongIM message delivery.
- Matter cards open real Matter detail pages.
- Matter status actions update real Matter data and return status cards to the same group.
- Summary feedback cards open/submit through the real summary/Matter feedback flow where backend support exists.
- External link cards open real configured links.
- All demo data is isolated and removable.

## Target Inputs

- Target server: `10.172.49.131`
- Bastion/gateway: provided out-of-band in the chat. Do not write the gateway identifier into committed scripts or repository docs.
- External link card URL: `https://www.deepseek.com/`
- Summary feedback backend: exists only when the Docker Compose `summary` profile is enabled. Frontend calls `/summary/api/v1/summaries/:taskId/respond`; nginx proxies `/summary/` to `summary-api`; compose services are `summary-api` and `summary-worker`.

## Server Discovery Findings

Discovered on `10.172.49.131`:

- Hostname: `Msh-mlclaw-zqx1`
- Docker: installed and usable through passwordless `sudo`
- Docker Compose: installed
- Running stack: `octo-richcard`
- Running compose file: `/opt/octo-richcard/octo-deployment/docker/docker-compose.yaml`
- Running web image: `octo-web:richcard-18c3515-20260618120502`
- Source checkout: `/home/zhangqianxiao/Matter-test-richcard`
- Source branch: `card0617`
- Source commit: `18c3515`
- Public ingress: host port `443` mapped to nginx port `80`
- Existing stopped/baseline stack assets: `/opt/octo-zqx` plus `octo-zqx_*` volumes
- Current `octo-richcard` services: web, nginx, admin, matter, octo-server, wukongim, redis, mysql, minio
- Current `octo-richcard` summary profile: not enabled
- Current `/summary/health`: `502 Bad Gateway`
- Current `/matter/health`: `200 OK`
- Current `/api/v1/health`: `200 OK`
- Current MySQL databases include `octo`, `octo_matter`, `octo_summary`
- Current `octo_summary`: no tables discovered
- Current `octo_matter`: only baseline tables discovered; v2 tables such as `matter_projects`, `matter_summaries`, `matter_feedbacks`, `matter_schedules`, and `preference_cards` are not present

Important implication:

- The deployed richcard stack is currently frontend-only custom (`octo-web` image is branch-built). `octo-server` and `octo-matter` still use public `latest` images. For the full richcard business loop, deployment must also build/deploy the repository's `octo-matter` and any required backend image changes, then run migrations.

## Deployment Recommendation

Use a separate `richcard` validation environment.

Do not deploy directly on top of the already-finished `filespace` environment. If filespace behavior must be included in the demo, clone the filespace database/image baseline first, then deploy richcard on the cloned stack. This gives us:

- no pollution of the filespace acceptance environment;
- a clean rollback path;
- a realistic integration rehearsal before both branches are merged into `main`;
- freedom to seed demo users, groups, matters, and cards without risking real data.

Final integration should happen later on an integration branch after filespace and richcard are both validated.

## Filespace Environment Discovery

The local repository does not contain a dedicated `filespace` deployment folder. It contains the generic stack at `octo-deployment/docker/docker-compose.yaml`. Therefore, the already-deployed filespace environment must be discovered on the server by Docker Compose project name, container labels, env files, and volumes.

Server discovery found `/opt/octo-zqx` and `octo-zqx_*` Docker volumes. It is not running now, but its MySQL volume exists and is a plausible filespace baseline. Treat it as the first clone candidate after confirming with the user.

Run these commands on `10.172.49.131` after bastion/VPN access is available:

```bash
hostname
whoami
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker compose ls
docker volume ls | grep -E 'octo|filespace|file'
docker network ls | grep -E 'octo|filespace|file'
find /opt /data /home -maxdepth 4 \( -name docker-compose.yaml -o -name compose.yaml -o -name .env \) 2>/dev/null | grep -E 'octo|filespace|richcard|Matter-test'
```

If filespace is a Compose stack, identify:

```bash
docker inspect <container_name> --format '{{ index .Config.Labels "com.docker.compose.project" }}'
docker inspect <container_name> --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}'
```

Clone strategy:

- If filespace stack project name is `octo-filespace`, create a new project name such as `octo-richcard`.
- Copy the filespace `.env` to the richcard deployment directory.
- Change only isolation-sensitive values: `COMPOSE_PROJECT_NAME`, external ports, optional image tags, and branch/build source.
- Clone MySQL data by dump/restore, not by sharing the same Docker volume.
- Never point `octo-richcard` at the same MySQL volume as `octo-filespace`.
- For the discovered server, do not reuse `octo-zqx_mysql-data` directly. Dump from a temporary MySQL container mounted to `octo-zqx_mysql-data`, then restore into `octo-richcard_mysql-data` or a new `octo-richcard-v2_mysql-data` volume.

## Current Code Facts

- Repository: `https://github.com/zqxxxxx/Matter-test-richcard.git`
- Frontend branch checked locally: `octo-web/card0617`
- Richcard content type: `MessageContentTypeConst.businessCard = 17`
- Card payload frontend model: `octo-web/packages/dmworkbase/src/Messages/BusinessCard/BusinessCardContent.ts`
- Matter card handlers: `octo-web/packages/dmworktodo/src/module.tsx`
- Summary card handlers: `octo-web/packages/dmworksummary/src/module.tsx`
- Dev/mock preview still exists at `octo-web/apps/web/src/dev/richCardPreview/mockRichCardPayloads.ts`
- Dev preview route exists at `/matter-richcard-preview`

## Phase 0: Preflight

- [ ] Confirm target deployment topology:
   - `richcard` standalone stack, recommended;
   - or clone of the filespace stack plus richcard branch.
- [ ] Confirm server access and runtime:
   - app host;
   - MySQL host/port/user/database names;
   - Redis/WuKongIM endpoints;
   - existing Octo API base URL;
   - web domain or exposed port.
- [ ] Locate filespace stack on `10.172.49.131` with the discovery commands above.
- [ ] Confirm whether `/opt/octo-zqx` is the filespace environment that should be cloned.
- [ ] Create a full backup before any seed operation:
   - Octo server DB;
   - Octo Matter DB;
   - Octo Summary DB if `summary` profile is enabled;
   - WuKongIM message storage if separately persisted.
- [ ] Record current git revisions for rollback:
   - `octo-web`;
   - `octo-server`;
   - `octo-matter`;
   - `octo-deployment`.

## Phase 1: Remove Mock From Production Path

- [ ] Keep mock files only for local dev tests, or delete them after real data is ready.
- [ ] Remove `/matter-richcard-preview` from production build, or guard it behind:
   - `import.meta.env.DEV`
   - and `VITE_ENABLE_RICHCARD_PREVIEW=true`
- [ ] Do not use `serve-richcard-preview.mjs` for deployment.
- [ ] Validate rich cards only through the normal Octo login, conversation list, group chat, and Matter modules.

Acceptance:

- Production URL has no dependency on `mockRichCardPayloads.ts`.
- Refreshing the browser still shows rich cards because cards came from real messages.
- Disabling the dev preview route does not break normal Octo navigation.

## Phase 2: Seed Data Design

Create an isolated seed package under:

```text
octo-deployment/richcard-demo/
```

Files:

```text
README.md
seed.env.example
00-preflight.sql
01-seed-octo-server.sql
02-seed-octo-matter.sql
03-send-richcard-messages.sh
99-cleanup.sql
```

Rules:

- Use deterministic IDs prefixed with `rc_demo_`.
- Use idempotent SQL: repeat execution must update or skip existing demo rows.
- Use cleanup SQL that deletes only `rc_demo_%` rows.
- Do not truncate production tables.
- Do not insert chat messages directly into message tables unless Octo has no usable API fallback.
- Send group rich-card messages through Octo/WuKongIM message APIs so conversation list, unread state, sync, and refresh behavior are real.
- Use `https://www.deepseek.com/` for the demo external-link card.
- Enable `COMPOSE_PROFILES=summary` before summary-card verification.

Suggested demo namespace:

```text
space_id: rc_demo_space
group/channel: rc_demo_group_contract
users:
  rc_demo_pm
  rc_demo_sales
  rc_demo_legal
  rc_demo_bot
matters:
  rc_demo_matter_open_contract_review
  rc_demo_matter_done_launch_summary
  rc_demo_matter_blocked_api_dependency
project:
  rc_demo_project_contract_launch
```

## Phase 3: Seed Octo Server Data

Seed the Octo side of the world:

- [ ] Create or upsert one demo space.
- [ ] Create or upsert demo users.
- [ ] Create one group chat/channel.
- [ ] Add all demo users to the group.
- [ ] Ensure each demo user can see the group in conversation/channel lists.
- [ ] Ensure the Matter bot/system user can send cards into the group.

If the repository provides creation APIs for users/groups/spaces, prefer APIs. Use SQL only for stable base data where APIs are unavailable or too admin-heavy.

Acceptance:

- Demo users can log in.
- Demo group appears in normal Octo chat UI.
- Sending a normal text message to the group works.

## Phase 4: Seed Matter Data

Seed Matter DB using current migrations as the source of truth:

- [ ] Create a Matter project:
   - linked to the demo space;
   - optionally linked to the demo group as source.
- [ ] Create at least three matters:
   - open/in progress matter;
   - done matter;
   - blocked matter.
- [ ] Populate assignees and participants:
   - `matter_assignees`;
   - `matter_participants`.
- [ ] Link each matter to the demo group:
   - `matter_channels`.
- [ ] Add meaningful timeline rows where required by the Matter detail page.
- [ ] Add `matter_summaries`, `matter_feedbacks`, or `preference_cards` only where the frontend/API can read them.

Acceptance:

- `/matter` workspace loads the seeded project and matters.
- Opening a matter by ID from a card displays a real Matter detail panel.
- Status transition API can update the seeded matter.

## Phase 5: Send Real Richcard Messages

Use the Octo message send path to send `content_type = 17` payloads to the seeded group.

Minimum cards:

1. Matter status card: open/in progress
   - `card_type = matter_status`
   - `entity_id = rc_demo_matter_open_contract_review`
   - actions: `open_matter_workspace`, `open_matter`, `complete_matter`
2. Matter review card: handed back / waiting human acceptance
   - `card_type = matter_status`
   - status: `review`
   - actions: `open_matter_workspace`, `complete_matter`, `open_matter`
3. Matter status card: done
   - `card_type = matter_status`
   - actions: `open_matter_workspace`, `open_matter`
4. Matter blocked card
   - `card_type = matter_status`
   - actions: `open_matter_workspace`, `open_matter`
5. Group summary feedback card
   - `card_type = summary_feedback`
   - actions: `open_summary`, `summary_accept`, `summary_reject`
   - must point to a real summary entity if the backend endpoint exists
6. External link card
   - `card_type = external_link`
   - action: `open_url`
   - target URL: `https://www.deepseek.com/`

Acceptance:

- Cards appear in the normal group message timeline.
- Cards remain after refresh/re-login.
- Conversation list digest shows card title.
- Card actions call real APIs or open real URLs.

## Phase 6: Business Loop Verification

Run this verification matrix after deployment:

| Scenario | Expected result |
| --- | --- |
| Login as `rc_demo_pm` | Normal Octo UI opens |
| Open demo group | Group contains text and rich-card messages |
| Click open matter | Matter detail panel opens with real seeded matter |
| Click complete matter | Matter status changes to done |
| Complete matter from card | A new status-return card is sent back to group |
| Open done matter card | Detail panel opens readably |
| Open blocked matter card | Detail panel shows blocked status/reason |
| Click summary feedback | Opens/submits through real summary flow if backend exists |
| Click external link | Opens configured link |
| Browser refresh | All cards and statuses remain |
| Login as another demo user | Same group and cards are visible |

## Phase 6.5: Summary Feedback Backend Verification

The frontend card handler already calls:

```text
POST /summary/api/v1/summaries/:taskId/respond
body: { "action": "accept" | "reject" }
```

Deployment requirements:

- [ ] Set `COMPOSE_PROFILES=summary` in the richcard stack `.env`, or run setup with `--summary`.
- [ ] Start `summary-api` and `summary-worker`.
- [ ] Verify nginx route:

```bash
curl -fsS "http://<host>:<port>/summary/health"
```

- [ ] Verify API route exists after login token is available:

```bash
curl -i \
  -H "token: <demo-user-token>" \
  -H "X-Space-Id: rc_demo_space" \
  "http://<host>:<port>/summary/api/v1/summaries"
```

- [ ] Create or locate a completed summary task for the demo group.
- [ ] Send a `summary_feedback` business card with `entity_id` equal to the real numeric `task_id`.
- [ ] Click `summary_accept`; confirm the API call succeeds.
- [ ] Click `summary_reject`; confirm the API call succeeds.

If `summary-api` cannot create a completed task because no real `LLM_API_KEY` is configured:

- [ ] Keep `summary-api` enabled for route/action verification.
- [ ] Add a seed path for `octo_summary` after inspecting the live schema with `SHOW TABLES` and `SHOW CREATE TABLE`.
- [ ] Seed exactly one completed summary task and one completed result row under the `rc_demo_` namespace.
- [ ] Document the seeded rows in `octo-deployment/richcard-demo/README.md`.

Current server-specific summary state:

- `COMPOSE_PROFILES=summary` is not set in `/opt/octo-richcard/octo-deployment/docker/.env`.
- `summary-api` and `summary-worker` are absent from `docker compose ps`.
- `/summary/health` returns `502`.
- `octo_summary` exists but has no tables, so enabling the profile must initialize/migrate it before card testing.

## Phase 6.6: Backend Image Deployment Gap

Current server-specific deployment tools under `/opt/octo-richcard/deploy-tools` only build and deploy the web image:

- `build-web-image.sh`
- `deploy-web-image.sh`
- `restart-stack.sh`
- `sync-deployment-assets.sh`

Add backend deployment support before claiming full business closure:

- [x] Build `octo-matter` image from `/home/zhangqianxiao/Matter-test-richcard/octo-matter`.
- [x] Set `OCTO_MATTER_IMAGE=<branch-built-image>` in `/opt/octo-richcard/octo-deployment/docker/.env`.
- [x] Run `docker compose up -d matter`.
- [x] Verify Matter migrations include v2 tables:
  - `matter_projects`
  - `matter_summaries`
- [x] Enable `/v1/message/send` for the richcard validation stack with `TS_MESSAGE_SENDMESSAGEON: "true"` and restart `octo-server`.
- [ ] Build/deploy `octo-server` from the repository only if richcard message delivery or card content type requires backend changes beyond the public image.
- [ ] Add deploy scripts:
  - `/opt/octo-richcard/deploy-tools/build-matter-image.sh`
  - `/opt/octo-richcard/deploy-tools/deploy-matter-image.sh`
  - `/opt/octo-richcard/deploy-tools/build-server-image.sh`
  - `/opt/octo-richcard/deploy-tools/deploy-server-image.sh`

## Phase 7: Rollback

1. Stop the `richcard` stack.
2. Redeploy the previous recorded image/revision.
3. Run `99-cleanup.sql` only if demo data must be removed.
4. Restore DB backups if any non-demo rows were touched.

Rollback must not require deleting the filespace deployment.

## Open Items Before Execution

1. Need target DB names and credentials for the server.
2. Need to locate the current filespace Compose project on `10.172.49.131`.
3. Need to confirm whether the richcard stack should clone filespace DB data or start from a fresh stack with only demo data.
4. Need to confirm whether a real `LLM_API_KEY` is available. If not, summary task data must be seeded after inspecting the live `octo_summary` schema.
5. Need to inspect exact Octo user/group/space APIs on the deployed server before deciding API seeding vs SQL seeding.

## 2026-06-22 Execution Notes

Target stack:

- Server: `10.172.49.131`
- Compose dir: `/opt/octo-richcard/octo-deployment/docker`
- Compose project: `octo-richcard`
- Public URL used by nginx: `http://10.172.49.131:443/`

Actions completed:

- Backed up `octo`, `octo_matter`, and `octo_summary` to `/home/zhangqianxiao/octo-deploy-backups/richcard-20260622120652/richcard-databases.sql.gz`.
- Built and deployed `octo-matter:richcard-18c3515-20260622121237` after switching Docker build `GOPROXY` to `https://goproxy.cn,direct`.
- Updated `/opt/octo-richcard/octo-deployment/docker/.env` with `OCTO_MATTER_IMAGE=octo-matter:richcard-18c3515-20260622121237`.
- Added `TS_MESSAGE_SENDMESSAGEON: "true"` to the richcard compose `octo-server` environment and restarted `octo-server`/`nginx`.
- `TS_MESSAGE_SENDMESSAGEON=true` is intentionally enabled only for the Richcard acceptance stack so demo cards can be injected through the real `/v1/message/send` path. Before production or security-sensitive staging, confirm the target policy and either disable this switch or replace demo injection with an approved backend job.
- Seeded real Octo rows for `rc_demo_space`, `rc_demo_group_contract`, and users `rc_demo_pm`, `rc_demo_sales`, `rc_demo_legal`, `rc_demo_bot`.
- Seeded Matter rows in `octo_matter` for one `in_progress`, one `done`, and one `blocked` matter under project `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`.
- Sent five cards through the real `/v1/message/send` API, using login token in both the `token` header and request body:
  - `matter_status` / `Matter 事项状态更新`
  - `matter_status` / `Matter 已完成`
  - `matter_status` / `Matter 阻塞提醒`
  - `external_link` / `外部链接预览卡片`
  - `group_summary_feedback` / `群总结已生成`
- Guarded `/matter-richcard-preview` behind `import.meta.env.DEV`, so production builds no longer load the mock rich-card preview route.

Verification:

- `GET /api/v1/health` returned `{"db":"up","redis":"up","status":"up"}`.
- `GET /matter/health` returned `{"status":"ok"}`.
- `POST /v1/message/channel/sync` for `rc_demo_group_contract` returned 5 messages with the expected card types and titles.
- `summary-api` is still not enabled: `/summary/health` returns 502 and `octo_summary` has no tables. The group-summary card is delivered through the real message path, but final accept/reject feedback remains blocked until the real summary backend is enabled and has a real summary task.

## Execution Order

- [x] Confirm target environment and backup access.
- [x] Confirm filespace does not need to be cloned from `/opt/octo-zqx`; keep a separate richcard stack.
- [x] Use the existing isolated richcard stack and seed deterministic demo data.
- [x] Add `octo-deployment/richcard-demo` seed package.
- [x] Remove or dev-gate preview mock route.
- [ ] Enable `COMPOSE_PROFILES=summary` for richcard stack.
- [x] Build and deploy Matter from the richcard branch; keep the existing richcard web image and public octo-server image.
- [x] Run DB migrations.
- [x] Run demo seed scripts.
- [x] Send real business-card messages through Octo message API.
- [x] Verify message/matter matrix through API.
- [x] Capture final deployment notes and rollback commands.
