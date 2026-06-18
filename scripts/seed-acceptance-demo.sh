#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-demo}"
DOCUMENT_DB="${DOCUMENT_DB:-test}"
MATTER_DB="${MATTER_DB:-octo_matters}"
OCTO_BASE="${OCTO_BASE:-http://127.0.0.1:8090}"
OCTO_TOKEN="${OCTO_TOKEN:-mock-token}"

export MYSQL_PWD="$MYSQL_PASSWORD"

mysql_args=(
  -h"$MYSQL_HOST"
  -P"$MYSQL_PORT"
  -u"$MYSQL_USER"
  --default-character-set=utf8mb4
)

echo "Restoring document demo data in ${DOCUMENT_DB}..."
mysql "${mysql_args[@]}" "$DOCUMENT_DB" < "$ROOT_DIR/octo-server/scripts/seed-document-demo.sql"

echo "Restoring document demo IM conversations via ${OCTO_BASE}..."
OCTO_BASE="$OCTO_BASE" OCTO_TOKEN="$OCTO_TOKEN" \
  bash "$ROOT_DIR/octo-server/scripts/seed-document-demo-im.sh"

echo "Restoring matter demo data in ${MATTER_DB}..."
mysql "${mysql_args[@]}" "$MATTER_DB" < "$ROOT_DIR/octo-matter/scripts/seed-demo.sql"

echo "Acceptance demo data is ready."
