#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

if sudo -n grep -q '^COMPOSE_PROFILES=' "$COMPOSE_DIR/.env"; then
  sudo -n sed -i 's#^COMPOSE_PROFILES=.*#COMPOSE_PROFILES=summary#' "$COMPOSE_DIR/.env"
else
  printf '\nCOMPOSE_PROFILES=summary\n' | sudo -n tee -a "$COMPOSE_DIR/.env" >/dev/null
fi

echo "[summary] starting summary-api and summary-worker"
compose up -d summary-api summary-worker nginx
compose ps summary-api summary-worker nginx

echo "[summary] probing /summary/health"
for _ in $(seq 1 45); do
  if curl -fsS "$PUBLIC_BASE_URL/summary/health" >/dev/null 2>&1; then
    echo "[summary] healthy"
    exit 0
  fi
  sleep 2
done

echo "[summary] /summary/health is still unavailable" >&2
compose logs --tail=120 summary-api summary-worker nginx >&2 || true
exit 1

