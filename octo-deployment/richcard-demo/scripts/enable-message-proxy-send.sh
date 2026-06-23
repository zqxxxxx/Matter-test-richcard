#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

compose_file="$COMPOSE_DIR/docker-compose.yaml"

echo "[message] enabling TS_MESSAGE_SENDMESSAGEON for demo card delivery"
if sudo -n grep -q 'TS_MESSAGE_SENDMESSAGEON:' "$compose_file"; then
  sudo -n sed -i 's#^[[:space:]]*TS_MESSAGE_SENDMESSAGEON:.*#      TS_MESSAGE_SENDMESSAGEON: "true"#' "$compose_file"
else
  tmp="$(mktemp)"
  awk '{print} /TS_ADMINPWD:/ {print "      TS_MESSAGE_SENDMESSAGEON: \"true\""}' "$compose_file" > "$tmp"
  sudo -n cp "$tmp" "$compose_file"
  rm -f "$tmp"
fi

compose config >/dev/null
compose up -d octo-server nginx

echo "[message] waiting for octo-server health"
for _ in $(seq 1 45); do
  if curl -fsS "$PUBLIC_BASE_URL/api/v1/health" >/dev/null 2>&1; then
    echo "[message] octo-server healthy"
    exit 0
  fi
  sleep 2
done

echo "[message] octo-server health did not become ready" >&2
compose logs --tail=120 octo-server nginx >&2 || true
exit 1
