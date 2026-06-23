#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

: "${DEMO_GROUP_NO:?DEMO_GROUP_NO is required}"

echo "[reset] marking old acceptance messages deleted for group $DEMO_GROUP_NO"
{
  printf "SET @group_no='%s';\n" "$(sql_quote "$DEMO_GROUP_NO")"
  cat <<'SQL'
UPDATE message_extra
   SET is_deleted = 1, updated_at = NOW()
 WHERE channel_id = @group_no
   AND channel_type = 2;
SQL
} | mysql_root "octo"

echo "[reset] done"
