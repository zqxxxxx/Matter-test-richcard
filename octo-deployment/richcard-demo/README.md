# Richcard Demo Deployment Tools

This folder contains the deployment and seed utilities for the richcard validation stack.

## Target

- Default compose directory: `/opt/octo-richcard/octo-deployment/docker`
- Default compose project: `octo-richcard`
- Default public base URL: `http://127.0.0.1:443`

## Setup On Server

```bash
cd /home/zhangqianxiao/Matter-test-richcard/octo-deployment/richcard-demo
cp seed.env.example seed.env
```

Edit `seed.env` only on the server if you need to change ports, IDs, or the summary task id.

## Run

Backup, build/deploy the branch Matter backend, enable the real `/v1/message/send` path, seed users/groups/matters/summary acceptance tasks, and send real richcard messages:

```bash
./scripts/run-richcard-demo.sh
```

The run script sets `TS_MESSAGE_SENDMESSAGEON: "true"` on the richcard compose stack and restarts `octo-server` before sending cards. The card sender uses the normal login token in both the `token` request header and the request body, matching the production handler's two-stage auth path.

The run script also enables the summary profile. If you need to run summary setup alone:

```bash
./scripts/enable-summary-profile.sh
./scripts/seed-summary-acceptance.sh
```

`seed-summary-acceptance.sh` prints the created/updated task ids. Set these in `seed.env` before rerunning only the card sender:

```text
DEMO_SUMMARY_TASK_ID=<completed task id for viewing generated summary>
DEMO_SUMMARY_ACTION_TASK_ID=<waiting-confirm task id for accept/reject buttons>
```

The current summary backend accepts `respond` only for waiting-confirm tasks. Therefore the demo uses two summary cards: one completed card to verify opening generated summary content, and one waiting-confirm card to verify the `summary_accept` / `summary_reject` button loop.

The Matter demo data covers four acceptance states in the same group: `in_progress`, `review`, `blocked`, and `done`. The primary card action enters the Matter module; the secondary detail action opens the lightweight chat-side detail panel.

## Demo Login

All demo users use the password from `DEMO_PASSWORD`, default:

```text
Octo@123456
```

Users:

```text
rc_demo_pm
rc_demo_sales
rc_demo_legal
rc_demo_bot
```

Group:

```text
rc_demo_group_contract
```

Server URL used in the current validation stack:

```text
http://10.172.49.131:443/
```

The server-side health checks are:

```text
http://10.172.49.131:443/api/v1/health
http://10.172.49.131:443/matter/health
http://10.172.49.131:443/summary/health
```

## Cleanup

Cleanup removes only deterministic `rc_demo_*` rows and demo Matter UUIDs:

```bash
./scripts/cleanup-demo.sh
```
