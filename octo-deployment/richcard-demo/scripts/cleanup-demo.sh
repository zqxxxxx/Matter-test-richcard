#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

echo "[cleanup] matter demo data"
{
  emit_seed_vars_sql
  cat "$DEMO_DIR/sql/99-cleanup-octo-matter.sql"
} | mysql_root "octo_matter"

echo "[cleanup] octo server demo data"
{
  emit_seed_vars_sql
  cat "$DEMO_DIR/sql/99-cleanup-octo-server.sql"
} | mysql_root "octo"

echo "[cleanup] done"

