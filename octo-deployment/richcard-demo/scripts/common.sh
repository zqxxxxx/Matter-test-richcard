#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="${SEED_ENV:-$DEMO_DIR/seed.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a
fi

COMPOSE_DIR="${COMPOSE_DIR:-/opt/octo-richcard/octo-deployment/docker}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-octo-richcard}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://127.0.0.1:443}"
EXTERNAL_LINK_URL="${EXTERNAL_LINK_URL:-https://www.deepseek.com/}"
LLM_API_URL="${LLM_API_URL:-https://llm-gateway.mlamp.cn/v1}"
LLM_MODEL="${LLM_MODEL:-deepseek-chat}"

DEMO_SPACE_ID="${DEMO_SPACE_ID:-rc_demo_space}"
DEMO_GROUP_NO="${DEMO_GROUP_NO:-rc_demo_group_contract}"
DEMO_GROUP_NAME="${DEMO_GROUP_NAME:-Richcard 验收群}"
DEMO_PASSWORD="${DEMO_PASSWORD:-Octo@123456}"
DEMO_SENDER_UID="${DEMO_SENDER_UID:-rc_demo_pm}"
DEMO_SUMMARY_CREATOR_UID="${DEMO_SUMMARY_CREATOR_UID:-rc_demo_legal}"

DEMO_MATTER_OPEN_ID="${DEMO_MATTER_OPEN_ID:-11111111-1111-4111-8111-111111111111}"
DEMO_MATTER_REVIEW_ID="${DEMO_MATTER_REVIEW_ID:-44444444-4444-4444-8444-444444444444}"
DEMO_MATTER_DONE_ID="${DEMO_MATTER_DONE_ID:-22222222-2222-4222-8222-222222222222}"
DEMO_MATTER_BLOCKED_ID="${DEMO_MATTER_BLOCKED_ID:-33333333-3333-4333-8333-333333333333}"
DEMO_PROJECT_ID="${DEMO_PROJECT_ID:-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa}"
DEMO_SUMMARY_TASK_ID="${DEMO_SUMMARY_TASK_ID:-}"
DEMO_SUMMARY_ACTION_TASK_ID="${DEMO_SUMMARY_ACTION_TASK_ID:-}"
DEMO_SUMMARY_REJECT_TASK_ID="${DEMO_SUMMARY_REJECT_TASK_ID:-}"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-${COMPOSE_PROJECT_NAME}-mysql-1}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

compose() {
  (cd "$COMPOSE_DIR" && sudo -n docker compose "$@")
}

mysql_root() {
  local db="$1"
  sudo -n docker exec -i "$MYSQL_CONTAINER" sh -lc "MYSQL_PWD=\"\$MYSQL_ROOT_PASSWORD\" mysql -uroot ${db}"
}

sql_quote() {
  printf "%s" "$1" | sed "s/'/''/g"
}

emit_seed_vars_sql() {
  printf "SET @demo_space_id='%s';\n" "$(sql_quote "$DEMO_SPACE_ID")"
  printf "SET @demo_group_no='%s';\n" "$(sql_quote "$DEMO_GROUP_NO")"
  printf "SET @demo_password='%s';\n" "$(sql_quote "$DEMO_PASSWORD")"
  printf "SET @demo_project_id='%s';\n" "$(sql_quote "$DEMO_PROJECT_ID")"
  printf "SET @demo_matter_open_id='%s';\n" "$(sql_quote "$DEMO_MATTER_OPEN_ID")"
  printf "SET @demo_matter_review_id='%s';\n" "$(sql_quote "$DEMO_MATTER_REVIEW_ID")"
  printf "SET @demo_matter_done_id='%s';\n" "$(sql_quote "$DEMO_MATTER_DONE_ID")"
  printf "SET @demo_matter_blocked_id='%s';\n" "$(sql_quote "$DEMO_MATTER_BLOCKED_ID")"
}
