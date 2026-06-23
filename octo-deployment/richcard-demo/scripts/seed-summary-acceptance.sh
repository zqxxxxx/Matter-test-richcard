#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

require_cmd curl
require_cmd python3

SUMMARY_VIEW_TITLE="验收群 6月22日业务推进总结"
SUMMARY_REVIEW_TITLE="验收群 6月22日风险复盘总结"
SUMMARY_ACTION_TITLE="验收群 6月22日总结反馈确认"
SUMMARY_REJECT_TITLE="验收群 6月22日总结调整确认"

login_token() {
  local username="$1"
  python3 - <<PY
import json, urllib.request
base = "$PUBLIC_BASE_URL"
body = json.dumps({
    "username": "$username",
    "password": "$DEMO_PASSWORD",
    "flag": 1,
    "device": {"device_id": "richcard-seed-$username", "device_name": "richcard-seed"},
}).encode()
req = urllib.request.Request(base + "/v1/user/login", data=body, headers={"Content-Type": "application/json"}, method="POST")
data = json.loads(urllib.request.urlopen(req).read().decode())
token = (data.get("data") or data).get("token")
if not token:
    raise SystemExit("token not found")
print(token)
PY
}

create_summary_if_missing() {
  local title="$1"
  local token="$2"
  local existing
  existing="$(
    mysql_root octo_summary <<SQL | tail -n 1
SELECT COALESCE(MAX(id), 0)
FROM summary_task
WHERE space_id = '$(sql_quote "$DEMO_SPACE_ID")'
  AND origin_channel_id = '$(sql_quote "$DEMO_GROUP_NO")'
  AND title = '$(sql_quote "$title")'
  AND deleted_at IS NULL;
SQL
  )"
  if [ "$existing" != "0" ]; then
    echo "$existing"
    return
  fi

  python3 - <<PY
import json, urllib.request
base = "$PUBLIC_BASE_URL"
token = "$token"
body = {
    "topic": "$title",
    "title": "$title",
    "summary_mode": 1,
    "origin_channel_id": "$DEMO_GROUP_NO",
    "origin_channel_type": 2,
    "sources": [{"source_type": 1, "source_id": "$DEMO_GROUP_NO", "source_name": "$DEMO_GROUP_NAME"}],
    "participants": [{"user_id": "rc_demo_pm"}, {"user_id": "rc_demo_sales"}, {"user_id": "rc_demo_legal"}],
    "time_range": {"start": "2026-06-22T09:00:00+08:00", "end": "2026-06-22T18:00:00+08:00"},
    "confirm_timeout_hours": 24,
}
req = urllib.request.Request(
    base + "/summary/api/v1/summaries",
    data=json.dumps(body, ensure_ascii=False).encode(),
    headers={"Content-Type": "application/json", "token": token, "X-Space-Id": "$DEMO_SPACE_ID"},
    method="POST",
)
data = json.loads(urllib.request.urlopen(req).read().decode())
print((data.get("data") or {}).get("task_id"))
PY
}

summary_creator_token="$(login_token "$DEMO_SUMMARY_CREATOR_UID")"
view_task_id="$(create_summary_if_missing "$SUMMARY_VIEW_TITLE" "$summary_creator_token")"
review_task_id="$(create_summary_if_missing "$SUMMARY_REVIEW_TITLE" "$summary_creator_token")"
action_task_id="$(create_summary_if_missing "$SUMMARY_ACTION_TITLE" "$summary_creator_token")"
reject_task_id="$(create_summary_if_missing "$SUMMARY_REJECT_TITLE" "$summary_creator_token")"

mysql_root octo_summary <<SQL
SET NAMES utf8mb4;
SET @now = UTC_TIMESTAMP();

UPDATE summary_task
SET summary_mode = 1,
    status = 3,
    error_message = NULL,
    processing_deadline = NULL,
    updated_at = @now
WHERE id IN ($view_task_id, $review_task_id)
  AND space_id = '$(sql_quote "$DEMO_SPACE_ID")'
  AND origin_channel_id = '$(sql_quote "$DEMO_GROUP_NO")';

UPDATE summary_task
SET summary_mode = 1,
    status = 1,
    error_message = NULL,
    processing_deadline = NULL,
    updated_at = @now
WHERE id = $action_task_id
  AND space_id = '$(sql_quote "$DEMO_SPACE_ID")'
  AND origin_channel_id = '$(sql_quote "$DEMO_GROUP_NO")';

UPDATE summary_task
SET summary_mode = 1,
    status = 1,
    error_message = NULL,
    processing_deadline = NULL,
    updated_at = @now
WHERE id = $reject_task_id
  AND space_id = '$(sql_quote "$DEMO_SPACE_ID")'
  AND origin_channel_id = '$(sql_quote "$DEMO_GROUP_NO")';

UPDATE summary_participant
SET status = 1,
    confirmed_at = COALESCE(confirmed_at, @now),
    updated_at = @now
WHERE task_id IN ($view_task_id, $review_task_id);

UPDATE summary_participant
SET status = 0,
    confirmed_at = NULL,
    updated_at = @now
WHERE task_id = $action_task_id;

UPDATE summary_participant
SET status = 3,
    confirmed_at = COALESCE(confirmed_at, @now),
    updated_at = @now
WHERE task_id = $action_task_id
  AND user_id = '$(sql_quote "$DEMO_SUMMARY_CREATOR_UID")';

UPDATE summary_participant
SET status = 0,
    confirmed_at = NULL,
    updated_at = @now
WHERE task_id = $reject_task_id;

UPDATE summary_participant
SET status = 3,
    confirmed_at = COALESCE(confirmed_at, @now),
    updated_at = @now
WHERE task_id = $reject_task_id
  AND user_id = '$(sql_quote "$DEMO_SUMMARY_CREATOR_UID")';

DELETE FROM summary_result WHERE task_id IN ($view_task_id, $review_task_id);

INSERT INTO summary_result
(task_id, content, citations_json, team_citations_json, total_msg_count, total_token_used, model_version, version, generated_at, created_at, updated_at)
VALUES
($view_task_id,
'## 验收群 6月22日业务推进总结\n\n1. 合同审阅事项已进入推进阶段，PM、销售、法务三方已经明确下一步分工。\n2. Matter 卡片中的「采购合同审阅」仍处于进行中，需要法务在今日下班前补充风险意见。\n3. 「上线前资料归档」已完成，可以作为富格式卡片的已完成状态验收样例。\n4. 对外链接卡片使用 DeepSeek 官网作为外部分享链接样例，点击后应在新页面打开。\n\n建议：群内后续只需关注阻塞事项是否解除，以及完成后的状态回流卡片是否自动进入本群。',
'[{"index":1,"sender":"赵倩笑 PM","content":"请法务今天确认合同风险，销售同步客户侧时间。","sent_at":"2026-06-22T10:12:00+08:00","source":"Richcard 验收群","channel_id":"$(sql_quote "$DEMO_GROUP_NO")","channel_type":2}]',
'[]',
28, 1860, 'acceptance-seed-v1', 1, @now, @now, @now),
($review_task_id,
'## 验收群 6月22日风险复盘总结\n\n1. 当前主要风险来自接口联调依赖，Matter 阻塞卡片可用于提醒责任人处理。\n2. 群总结反馈卡片需要支持「认可」和「需要调整」两类反馈，反馈后应调用真实 summary respond 接口。\n3. 若后续接入真实 LLM，只需要替换 summary-worker 的模型配置，不需要改变前端卡片结构。',
'[{"index":1,"sender":"法务同学","content":"接口联调完成前，合同交付时间需要保留风险提示。","sent_at":"2026-06-22T14:30:00+08:00","source":"Richcard 验收群","channel_id":"$(sql_quote "$DEMO_GROUP_NO")","channel_type":2}]',
'[]',
16, 1240, 'acceptance-seed-v1', 1, @now, @now, @now);
SQL

echo "[summary] view task id: $view_task_id"
echo "[summary] review task id: $review_task_id"
echo "[summary] action task id: $action_task_id"
echo "[summary] reject task id: $reject_task_id"

if [ -f "$ENV_FILE" ] && [ -w "$ENV_FILE" ]; then
  python3 - <<PY
from pathlib import Path
path = Path("$ENV_FILE")
values = {
    "DEMO_SUMMARY_TASK_ID": "$view_task_id",
    "DEMO_SUMMARY_ACTION_TASK_ID": "$action_task_id",
    "DEMO_SUMMARY_REJECT_TASK_ID": "$reject_task_id",
}
lines = path.read_text().splitlines()
seen = set()
next_lines = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line and not line.lstrip().startswith("#") else None
    if key in values:
        next_lines.append(f"{key}={values[key]}")
        seen.add(key)
    else:
        next_lines.append(line)
for key, value in values.items():
    if key not in seen:
        next_lines.append(f"{key}={value}")
path.write_text("\\n".join(next_lines) + "\\n")
PY
  echo "[summary] updated $ENV_FILE with summary task ids"
else
  echo "[summary] set DEMO_SUMMARY_TASK_ID=$view_task_id, DEMO_SUMMARY_ACTION_TASK_ID=$action_task_id and DEMO_SUMMARY_REJECT_TASK_ID=$reject_task_id before sending cards"
fi
