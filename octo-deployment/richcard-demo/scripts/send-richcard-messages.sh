#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

require_cmd python3
require_cmd curl

DEMO_CARD_RUN_ID="${DEMO_CARD_RUN_ID:-$(date +%Y%m%d%H%M%S)}"

login_json="$(python3 - <<PY
import json
print(json.dumps({"username": "$DEMO_SENDER_UID", "password": "$DEMO_PASSWORD"}, ensure_ascii=False))
PY
)"

echo "[cards] login as $DEMO_SENDER_UID"
login_resp="$(curl -fsS -X POST "$PUBLIC_BASE_URL/v1/user/usernamelogin" \
  -H 'Content-Type: application/json' \
  --data "$login_json")"

token="$(python3 - <<'PY' "$login_resp"
import json, sys
data = json.loads(sys.argv[1])
for path in (("token",), ("data","token"), ("data","user","token")):
    cur = data
    for key in path:
        if isinstance(cur, dict) and key in cur:
            cur = cur[key]
        else:
            break
    else:
        if cur:
            print(cur)
            raise SystemExit
raise SystemExit("token not found in login response")
PY
)"

send_card() {
  local payload_json="$1"
  local req_json
  req_json="$(python3 - <<'PY' "$token" "$DEMO_GROUP_NO" "$payload_json"
import json, sys
token, group_no, payload = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
print(json.dumps({
    "token": token,
    "receive_channel_id": group_no,
    "receive_channel_type": 2,
    "payload": payload,
    "is_verify": 1,
}, ensure_ascii=False))
PY
)"
  curl -fsS -X POST "$PUBLIC_BASE_URL/v1/message/send" \
    -H 'Content-Type: application/json' \
    -H "token: $token" \
    -H "X-Space-Id: $DEMO_SPACE_ID" \
    --data "$req_json" >/dev/null
}

echo "[cards] sending matter open card"
send_card "$(python3 - <<PY
import json
print(json.dumps({
  "type": 17,
  "card_id": "card-$DEMO_MATTER_OPEN_ID-$DEMO_CARD_RUN_ID",
  "card_type": "matter_status",
  "title": "客户合同审批进入法务复核",
  "subtitle": "Matter · 进行中",
  "body": "合同 v3 已提交法务复核，需要确认付款和违约条款。",
  "status": "in_progress",
  "priority": "P0",
  "source": "Matter",
  "actor": "Brooks",
  "time": "验收数据",
  "entity_id": "$DEMO_MATTER_OPEN_ID",
  "entity_type": "matter",
  "source_channel_id": "$DEMO_GROUP_NO",
  "source_channel_type": 2,
  "metrics": [
    {"label": "现在该谁处理", "value": "法务同学"},
    {"label": "截止", "value": "今天 18:00"},
    {"label": "进度", "value": "2 / 4"}
  ],
  "actions": [
    {"label": "进入 Matter", "type": "open_matter_workspace", "kind": "primary"},
    {"label": "查看详情", "type": "open_matter", "kind": "secondary"},
    {"label": "标记完成", "type": "complete_matter", "kind": "secondary"}
  ],
  "extra": {
    "matterNo": "MAT-RC-001",
    "statusText": "法务同学正在处理",
    "sourceText": "从客户群消息创建事项：请确认合同 v3 的付款和违约条款。",
    "sourceName": "$DEMO_GROUP_NAME",
    "agentName": "Brooks",
    "agentRole": "带队",
    "participantText": "3 个参与者",
    "participantRoles": ["法务", "销售"],
    "progress": "2 / 4",
    "trail": [
      {"label": "创建", "title": "从客户消息创建事项"},
      {"label": "编排", "title": "分派给法务与销售"},
      {"label": "当前", "title": "法务复核条款"},
      {"label": "下一步", "title": "PM 确认结论"}
    ]
  }
}, ensure_ascii=False))
PY
)"

echo "[cards] sending matter review card"
send_card "$(python3 - <<PY
import json
print(json.dumps({
  "type": 17,
  "card_id": "card-$DEMO_MATTER_REVIEW_ID-$DEMO_CARD_RUN_ID",
  "card_type": "matter_status",
  "title": "风险说明已回传，等待 PM 确认",
  "subtitle": "Matter · 审核中",
  "body": "法务已给出红线条款说明，销售补充了客户侧承诺口径。",
  "status": "review",
  "priority": "P0",
  "source": "Matter",
  "actor": "Brooks",
  "time": "验收数据",
  "entity_id": "$DEMO_MATTER_REVIEW_ID",
  "entity_type": "matter",
  "source_channel_id": "$DEMO_GROUP_NO",
  "source_channel_type": 2,
  "metrics": [
    {"label": "现在该谁处理", "value": "赵倩笑 PM"},
    {"label": "需要你确认", "value": "风险口径"},
    {"label": "进度", "value": "3 / 4"}
  ],
  "actions": [
    {"label": "看东西", "type": "open_matter_workspace", "kind": "primary"},
    {"label": "行", "type": "complete_matter", "kind": "secondary"},
    {"label": "圈一笔", "type": "open_matter_workspace", "kind": "secondary"},
    {"label": "查看详情", "type": "open_matter", "kind": "secondary"}
  ],
  "extra": {
    "matterNo": "MAT-RC-004",
    "statusText": "东西回来了，等你确认",
    "sourceText": "法务：付款节点可接受；违约上限建议不超过合同总额 20%。销售：客户已确认口径。",
    "sourceName": "$DEMO_GROUP_NAME",
    "agentName": "Brooks",
    "agentRole": "已汇总",
    "participantText": "3 个参与者",
    "participantRoles": ["Research", "Review"],
    "progress": "3 / 4",
    "outputs": ["风险说明", "审批结论"],
    "trail": [
      {"label": "法务", "title": "提交风险说明"},
      {"label": "销售", "title": "补充客户口径"},
      {"label": "Agent", "title": "生成确认建议"},
      {"label": "PM", "title": "等待确认"}
    ]
  }
}, ensure_ascii=False))
PY
)"

echo "[cards] sending matter done card"
send_card "$(python3 - <<PY
import json
print(json.dumps({
  "type": 17,
  "card_id": "card-$DEMO_MATTER_DONE_ID-$DEMO_CARD_RUN_ID",
  "card_type": "matter_status",
  "title": "客户合同审批已完成",
  "subtitle": "Matter · 已完成",
  "body": "上线风险说明已整理完成，用于验证已完成 Matter 卡片可以打开详情。",
  "status": "done",
  "priority": "P1",
  "source": "Matter",
  "actor": "Brooks",
  "time": "验收数据",
  "entity_id": "$DEMO_MATTER_DONE_ID",
  "entity_type": "matter",
  "source_channel_id": "$DEMO_GROUP_NO",
  "source_channel_type": 2,
  "metrics": [
    {"label": "完成人", "value": "销售同学"},
    {"label": "最终输出", "value": "风险说明"},
    {"label": "进度", "value": "4 / 4"}
  ],
  "actions": [
    {"label": "进入 Matter", "type": "open_matter_workspace", "kind": "primary"},
    {"label": "查看详情", "type": "open_matter", "kind": "secondary"}
  ],
  "extra": {
    "matterNo": "MAT-RC-002",
    "statusText": "已验收完成，结果可回看",
    "sourceText": "上线风险说明已完成，结论：可按计划推进。",
    "sourceName": "$DEMO_GROUP_NAME",
    "agentName": "Brooks",
    "agentRole": "已归档",
    "participantText": "2 个参与者",
    "participantRoles": ["销售"],
    "progress": "4 / 4",
    "outputs": ["风险说明", "审批结论"],
    "trail": [
      {"label": "创建", "title": "客户合同审批"},
      {"label": "复核", "title": "风险说明完成"},
      {"label": "验收", "title": "PM 盖章通过"},
      {"label": "归档", "title": "进入战绩记录"}
    ]
  }
}, ensure_ascii=False))
PY
)"

echo "[cards] sending matter blocked card"
send_card "$(python3 - <<PY
import json
print(json.dumps({
  "type": 17,
  "card_id": "card-$DEMO_MATTER_BLOCKED_ID-$DEMO_CARD_RUN_ID",
  "card_type": "matter_status",
  "title": "外部系统回调未确认",
  "subtitle": "Matter · 受阻",
  "body": "客户审批系统 API 回调尚未返回，Matter 已暂停自动推进。",
  "status": "blocked",
  "priority": "P0",
  "source": "Matter",
  "actor": "Matter 助手",
  "time": "验收数据",
  "entity_id": "$DEMO_MATTER_BLOCKED_ID",
  "entity_type": "matter",
  "source_channel_id": "$DEMO_GROUP_NO",
  "source_channel_type": 2,
  "metrics": [
    {"label": "阻塞原因", "value": "等待外部系统确认"},
    {"label": "建议动作", "value": "@系统同学 排查"},
    {"label": "进度", "value": "2 / 4"}
  ],
  "actions": [
    {"label": "进入 Matter", "type": "open_matter_workspace", "kind": "primary"},
    {"label": "查看详情", "type": "open_matter", "kind": "secondary"}
  ],
  "extra": {
    "matterNo": "MAT-RC-003",
    "statusText": "卡住了：等待外部系统确认",
    "blockReason": "等待外部系统确认",
    "sourceText": "最近事件：13:57 发起回调；14:05 仍未收到确认，系统自动置为受阻。",
    "sourceName": "$DEMO_GROUP_NAME",
    "agentName": "Matter 助手",
    "agentRole": "检测到异常",
    "participantText": "2 个参与者",
    "participantRoles": ["系统"],
    "progress": "2 / 4",
    "trail": [
      {"label": "创建", "title": "外部系统联调"},
      {"label": "等待", "title": "API 回调未返回"},
      {"label": "系统", "title": "自动标记受阻"},
      {"label": "下一步", "title": "排查回调窗口"}
    ]
  }
}, ensure_ascii=False))
PY
)"

if [ -n "$DEMO_SUMMARY_TASK_ID" ]; then
  echo "[cards] sending summary feedback card for task $DEMO_SUMMARY_TASK_ID"
  send_card "$(python3 - <<PY
import json
print(json.dumps({
  "type": 17,
  "card_id": "summary-$DEMO_SUMMARY_TASK_ID-$DEMO_CARD_RUN_ID",
  "card_type": "summary_feedback",
  "title": "Richcard 验收群会议总结",
  "subtitle": "群总结反馈",
  "body": "这是指向真实 summary-api task 的群总结反馈卡。点击查看总结或提交认可/需要调整。",
  "status": "done",
  "source": "智能总结",
  "actor": "智能总结",
  "time": "验收数据",
  "entity_id": "$DEMO_SUMMARY_TASK_ID",
  "entity_type": "summary",
  "source_channel_id": "$DEMO_GROUP_NO",
  "source_channel_type": 2,
  "metrics": [
    {"label": "消息数", "value": "28"},
    {"label": "来源", "value": "1 个"},
    {"label": "参与人", "value": "3 人"}
  ],
  "actions": [
    {"label": "查看总结", "type": "open_summary", "kind": "primary"},
    {"label": "认可", "type": "summary_accept", "kind": "secondary"},
    {"label": "需要调整", "type": "summary_reject", "kind": "secondary"}
  ]
}, ensure_ascii=False))
PY
)"
else
  echo "[cards] DEMO_SUMMARY_TASK_ID is empty; skipping summary_feedback card"
fi

if [ -n "$DEMO_SUMMARY_ACTION_TASK_ID" ]; then
  echo "[cards] sending summary action card for task $DEMO_SUMMARY_ACTION_TASK_ID"
  send_card "$(python3 - <<PY
import json
print(json.dumps({
  "type": 17,
  "card_id": "summary-actions-$DEMO_SUMMARY_ACTION_TASK_ID-$DEMO_CARD_RUN_ID",
  "card_type": "summary_feedback",
  "title": "验收群总结反馈确认",
  "subtitle": "群总结反馈 · 待确认",
  "body": "用于验收群总结反馈按钮闭环。点击认可或需要调整，会调用真实 summary-api respond 接口并更新任务状态。",
  "status": "in_progress",
  "source": "智能总结",
  "actor": "智能总结",
  "time": "验收数据",
  "entity_id": "$DEMO_SUMMARY_ACTION_TASK_ID",
  "entity_type": "summary",
  "source_channel_id": "$DEMO_GROUP_NO",
  "source_channel_type": 2,
  "metrics": [
    {"label": "状态", "value": "待确认"},
    {"label": "参与人", "value": "3 人"}
  ],
  "actions": [
    {"label": "查看确认", "type": "open_summary", "kind": "primary"},
    {"label": "认可", "type": "summary_accept", "kind": "secondary"},
    {"label": "需要调整", "type": "summary_reject", "kind": "secondary"}
  ]
}, ensure_ascii=False))
PY
)"
else
  echo "[cards] DEMO_SUMMARY_ACTION_TASK_ID is empty; skipping summary action card"
fi

if [ -n "$DEMO_SUMMARY_REJECT_TASK_ID" ]; then
  echo "[cards] sending summary reject card for task $DEMO_SUMMARY_REJECT_TASK_ID"
  send_card "$(python3 - <<PY
import json
print(json.dumps({
  "type": 17,
  "card_id": "summary-reject-$DEMO_SUMMARY_REJECT_TASK_ID-$DEMO_CARD_RUN_ID",
  "card_type": "summary_feedback",
  "title": "验收群总结调整确认",
  "subtitle": "群总结反馈 · 待调整",
  "body": "用于验收群总结的需要调整分支。点击需要调整，会调用真实 summary-api respond 接口并更新任务状态。",
  "status": "in_progress",
  "source": "智能总结",
  "actor": "智能总结",
  "time": "验收数据",
  "entity_id": "$DEMO_SUMMARY_REJECT_TASK_ID",
  "entity_type": "summary",
  "source_channel_id": "$DEMO_GROUP_NO",
  "source_channel_type": 2,
  "metrics": [
    {"label": "状态", "value": "待调整确认"},
    {"label": "参与人", "value": "3 人"}
  ],
  "actions": [
    {"label": "查看确认", "type": "open_summary", "kind": "primary"},
    {"label": "进入群总结", "type": "open_summary_workspace", "kind": "secondary"},
    {"label": "需要调整", "type": "summary_reject", "kind": "secondary"}
  ]
}, ensure_ascii=False))
PY
)"
else
  echo "[cards] DEMO_SUMMARY_REJECT_TASK_ID is empty; skipping summary reject card"
fi

echo "[cards] sending external link text with preview"
send_card "$(python3 - <<PY
import json
print(json.dumps({
  "type": 1,
  "content": "$EXTERNAL_LINK_URL",
  "link_preview": {
    "url": "$EXTERNAL_LINK_URL",
    "title": "DeepSeek | 深度求索",
    "description": "深度求索，专注于研究世界领先的通用人工智能。",
    "domain": "deepseek.com"
  }
}, ensure_ascii=False))
PY
)"

echo "[cards] done"
