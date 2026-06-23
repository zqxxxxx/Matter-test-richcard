#!/usr/bin/env bash
set -euo pipefail

# Sync the SQL demo groups into WuKongIM and send real messages so the Octo web
# "最近" and "关注" tabs have reproducible business conversations to verify.
#
# Run after scripts/seed-document-demo.sql and after octo-server/WuKongIM start:
#   OCTO_TOKEN=<login-token> bash octo-server/scripts/seed-document-demo-im.sh

WK_API_URL="${WK_API_URL:-http://127.0.0.1:5001}"
OCTO_API_URL="${OCTO_API_URL:-http://127.0.0.1:8090/v1}"
OCTO_TOKEN="${OCTO_TOKEN:-}"
OCTO_SPACE_ID="${OCTO_SPACE_ID:-space-demo-octo}"

if [[ -z "$OCTO_TOKEN" ]]; then
  echo "OCTO_TOKEN is required. Log in with a real demo account and pass its token." >&2
  exit 1
fi

post_json() {
  local url="$1"
  local body="$2"
  curl -fsS "$url" \
    -H 'content-type: application/json' \
    -d "$body" >/dev/null
}

sync_group() {
  local group_no="$1"
  local subscribers_json="$2"
  post_json "$WK_API_URL/channel/subscriber_add" \
    "{\"channel_id\":\"$group_no\",\"channel_type\":2,\"reset\":1,\"subscribers\":$subscribers_json}"
}

send_group_text() {
  local group_no="$1"
  local content="$2"
  curl -fsS "$OCTO_API_URL/message/send" \
    -H 'content-type: application/json' \
    -H "token: $OCTO_TOKEN" \
    -H "X-Space-ID: $OCTO_SPACE_ID" \
    -d "{\"token\":\"$OCTO_TOKEN\",\"receive_channel_id\":\"$group_no\",\"receive_channel_type\":2,\"payload\":{\"type\":1,\"content\":\"$content\"}}" >/dev/null
}

send_group_file() {
  local group_no="$1"
  local name="$2"
  local extension="$3"
  local size="$4"
  local url="$5"
  curl -fsS "$OCTO_API_URL/message/send" \
    -H 'content-type: application/json' \
    -H "token: $OCTO_TOKEN" \
    -H "X-Space-ID: $OCTO_SPACE_ID" \
    -d "{\"token\":\"$OCTO_TOKEN\",\"receive_channel_id\":\"$group_no\",\"receive_channel_type\":2,\"payload\":{\"type\":8,\"name\":\"$name\",\"extension\":\"$extension\",\"size\":$size,\"url\":\"$url\"}}" >/dev/null
}

sync_group "grp_product_docs" '["pm_chen","delivery_liu","admin_zhou"]'
sync_group "grp_delivery_docs" '["pm_chen","delivery_liu","admin_zhou"]'
sync_group "grp_policy_docs" '["pm_chen","hr_zhao","admin_zhou"]'

send_group_text "grp_product_docs" "文档中心验收消息：上传、预览、下载已完成。"
send_group_text "grp_delivery_docs" "交付资料验收消息：计划、截图和来源会话已完成。"
send_group_text "grp_policy_docs" "制度空间验收消息：制度文档和回收站流程已完成。"

send_group_file "grp_product_docs" "Octo 文件空间需求清单.xlsx" ".xlsx" 2100000 "common/documents/demo/octo-file-requirements.xlsx"
send_group_file "grp_delivery_docs" "Q3 客户现场实施计划.pdf" ".pdf" 18400000 "common/documents/demo/q3-delivery-plan.pdf"
send_group_file "grp_delivery_docs" "客户账号权限确认截图.png" ".png" 820000 "common/documents/demo/account-confirm.png"
send_group_file "grp_policy_docs" "制度更新说明.docx" ".docx" 1600000 "common/documents/demo/policy-update.docx"
send_group_file "grp_policy_docs" "离职交接资料包.zip" ".zip" 76900000 "common/documents/demo/offboarding.zip"
send_group_file "grp_policy_docs" "旧版制度说明.docx" ".docx" 1300000 "common/documents/demo/old-policy.docx"

echo "Seeded WuKongIM subscribers and demo conversations."
