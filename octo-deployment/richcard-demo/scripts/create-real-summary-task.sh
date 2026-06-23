#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

require_cmd curl
require_cmd python3

SUMMARY_TITLE="${SUMMARY_TITLE:-LLM真实群总结 $(date +%m%d-%H%M%S)}"
SUMMARY_START="${SUMMARY_START:-2026-06-22T00:00:00+08:00}"
SUMMARY_END="${SUMMARY_END:-2026-06-23T23:59:59+08:00}"
SUMMARY_SEED_CHAT="${SUMMARY_SEED_CHAT:-1}"
SUMMARY_POLL_SECONDS="${SUMMARY_POLL_SECONDS:-360}"
DEMO_SUMMARY_CREATOR_UID="${DEMO_SUMMARY_CREATOR_UID:-rc_demo_legal}"

login_token() {
  local username="$1"
  python3 - <<PY
import json, urllib.request
base = "$PUBLIC_BASE_URL"
body = json.dumps({
    "username": "$username",
    "password": "$DEMO_PASSWORD",
    "flag": 1,
    "device": {"device_id": "richcard-real-summary-$username", "device_name": "richcard-real-summary"},
}).encode()
req = urllib.request.Request(base + "/v1/user/login", data=body, headers={"Content-Type": "application/json"}, method="POST")
data = json.loads(urllib.request.urlopen(req, timeout=30).read().decode())
token = (data.get("data") or data).get("token")
if not token:
    raise SystemExit("token not found")
print(token)
PY
}

send_text() {
  local token="$1"
  local content="$2"
  python3 - <<PY | curl -fsS -X POST "$PUBLIC_BASE_URL/v1/message/send" \
    -H 'Content-Type: application/json' \
    -H "token: $token" \
    -H "X-Space-Id: $DEMO_SPACE_ID" \
    --data-binary @- >/dev/null
import json
print(json.dumps({
    "token": "$token",
    "receive_channel_id": "$DEMO_GROUP_NO",
    "receive_channel_type": 2,
    "payload": {"type": 1, "content": "$content"},
    "is_verify": 1,
}, ensure_ascii=False))
PY
}

creator_token="$(login_token "$DEMO_SUMMARY_CREATOR_UID")"

if [ "$SUMMARY_SEED_CHAT" = "1" ]; then
  pm_token="$(login_token "$DEMO_SENDER_UID")"
  sales_token="$(login_token "rc_demo_sales")"
  legal_token="$(login_token "rc_demo_legal")"
  run_id="$(date +%H%M%S)"
  echo "[summary-real] sending source chat messages run=$run_id"
  send_text "$pm_token" "【LLM验收 $run_id】客户合同 v3 已进入评审，今天需要确认付款节点、违约责任和上线前交付范围。"
  send_text "$sales_token" "【LLM验收 $run_id】客户侧希望 6月24日 前拿到最终确认版，销售负责同步客户口径和补充业务背景。"
  send_text "$legal_token" "【LLM验收 $run_id】法务关注两点：逾期交付的责任边界、第三方 API 未确认时的免责条款，需要 PM 最终拍板。"
  send_text "$pm_token" "【LLM验收 $run_id】结论：法务今天 18点前输出风险说明，销售补齐客户承诺口径，PM 明天上午确认是否可以发正式版。"
fi

echo "[summary-real] creating BY_GROUP summary task: $SUMMARY_TITLE"
create_resp="$(
  python3 - <<PY
import json, urllib.request
base = "$PUBLIC_BASE_URL"
token = "$creator_token"
body = {
    "topic": "$SUMMARY_TITLE",
    "title": "$SUMMARY_TITLE",
    "summary_mode": 1,
    "origin_channel_id": "$DEMO_GROUP_NO",
    "origin_channel_type": 2,
    "sources": [{"source_type": 1, "source_id": "$DEMO_GROUP_NO", "source_name": "$DEMO_GROUP_NAME"}],
    "time_range": {"start": "$SUMMARY_START", "end": "$SUMMARY_END"},
    "confirm_timeout_hours": 1,
}
req = urllib.request.Request(
    base + "/summary/api/v1/summaries",
    data=json.dumps(body, ensure_ascii=False).encode(),
    headers={"Content-Type": "application/json", "token": token, "X-Space-Id": "$DEMO_SPACE_ID"},
    method="POST",
)
print(urllib.request.urlopen(req, timeout=60).read().decode())
PY
)"

task_id="$(python3 - <<'PY' "$create_resp"
import json, sys
data = json.loads(sys.argv[1])
print((data.get("data") or {}).get("task_id") or data.get("task_id") or "")
PY
)"
if [ -z "$task_id" ]; then
  echo "[summary-real] task_id not found in response: $create_resp" >&2
  exit 1
fi

echo "[summary-real] task id: $task_id"

deadline=$((SECONDS + SUMMARY_POLL_SECONDS))
while [ "$SECONDS" -lt "$deadline" ]; do
  detail="$(
    python3 - <<PY
import urllib.request
base = "$PUBLIC_BASE_URL"
req = urllib.request.Request(
    base + "/summary/api/v1/summaries/$task_id",
    headers={"token": "$creator_token", "X-Space-Id": "$DEMO_SPACE_ID"},
)
print(urllib.request.urlopen(req, timeout=60).read().decode())
PY
  )"
  status="$(python3 - <<'PY' "$detail"
import json, sys
data = (json.loads(sys.argv[1]).get("data") or json.loads(sys.argv[1]))
print(data.get("status"))
PY
)"
  content_len="$(python3 - <<'PY' "$detail"
import json, sys
data = (json.loads(sys.argv[1]).get("data") or json.loads(sys.argv[1]))
result = data.get("result") or {}
content = result.get("content") or data.get("content") or ""
print(len(str(content)))
PY
)"
  echo "[summary-real] poll status=$status content_len=$content_len"
  if [ "$status" = "3" ] && [ "$content_len" -gt 20 ]; then
    break
  fi
  sleep 5
done

if [ "$status" != "3" ] || [ "$content_len" -le 20 ]; then
  echo "[summary-real] summary did not complete in ${SUMMARY_POLL_SECONDS}s" >&2
  exit 1
fi

model_version="$(
  mysql_root octo_summary <<SQL | tail -n 1
SELECT model_version FROM summary_result WHERE task_id = $task_id ORDER BY version DESC, id DESC LIMIT 1;
SQL
)"
if [ -z "$model_version" ] || [ "$model_version" = "acceptance-seed-v1" ]; then
  echo "[summary-real] invalid model_version: $model_version" >&2
  exit 1
fi
echo "[summary-real] generated by model: $model_version"

if [ -f "$ENV_FILE" ] && [ -w "$ENV_FILE" ]; then
  python3 - <<PY
from pathlib import Path
path = Path("$ENV_FILE")
values = {"DEMO_SUMMARY_TASK_ID": "$task_id"}
lines = path.read_text().splitlines()
seen = set()
out = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line and not line.lstrip().startswith("#") else None
    if key in values:
        out.append(f"{key}={values[key]}")
        seen.add(key)
    else:
        out.append(line)
for key, value in values.items():
    if key not in seen:
        out.append(f"{key}={value}")
path.write_text("\\n".join(out) + "\\n")
PY
  echo "[summary-real] updated $ENV_FILE with DEMO_SUMMARY_TASK_ID=$task_id"
fi

echo "[summary-real] complete"
