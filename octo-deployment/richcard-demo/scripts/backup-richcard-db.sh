#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

BACKUP_DIR="${BACKUP_DIR:-$HOME/octo-deploy-backups/richcard-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$BACKUP_DIR"

echo "[backup] writing $BACKUP_DIR/richcard-databases.sql.gz"
sudo -n docker exec "$MYSQL_CONTAINER" sh -lc \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --events --databases octo octo_matter octo_summary' \
  | gzip -c > "$BACKUP_DIR/richcard-databases.sql.gz"

echo "[backup] writing compose/env metadata"
sudo -n cp "$COMPOSE_DIR/.env" "$BACKUP_DIR/env.copy"
sudo -n docker compose -f "$COMPOSE_DIR/docker-compose.yaml" --env-file "$COMPOSE_DIR/.env" ps -a > "$BACKUP_DIR/compose-ps.txt" || true
sudo -n docker images > "$BACKUP_DIR/docker-images.txt" || true

echo "[backup] complete: $BACKUP_DIR"

