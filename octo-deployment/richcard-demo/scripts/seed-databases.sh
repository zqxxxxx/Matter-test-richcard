#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

echo "[seed] octo server data"
{
  emit_seed_vars_sql
  cat "$DEMO_DIR/sql/01-seed-octo-server.sql"
} | mysql_root "octo"

echo "[seed] matter data"
{
  emit_seed_vars_sql
  cat "$DEMO_DIR/sql/02-seed-octo-matter.sql"
} | mysql_root "octo_matter"

echo "[seed] done"

