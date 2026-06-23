#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

REPO_ROOT="${REPO_ROOT:-/home/zhangqianxiao/Matter-test-richcard}"
IMAGE_TAG="${1:-}"

if [ -z "$IMAGE_TAG" ]; then
  IMAGE_TAG="$("$SCRIPT_DIR/build-matter-image.sh" | tail -n 1)"
fi

echo "[deploy] setting OCTO_MATTER_IMAGE=$IMAGE_TAG"
if sudo -n grep -q '^OCTO_MATTER_IMAGE=' "$COMPOSE_DIR/.env"; then
  sudo -n sed -i "s#^OCTO_MATTER_IMAGE=.*#OCTO_MATTER_IMAGE=$IMAGE_TAG#" "$COMPOSE_DIR/.env"
else
  printf '\nOCTO_MATTER_IMAGE=%s\n' "$IMAGE_TAG" | sudo -n tee -a "$COMPOSE_DIR/.env" >/dev/null
fi

compose up -d matter
compose ps matter

echo "[deploy] waiting for matter health"
for _ in $(seq 1 30); do
  if curl -fsS "$PUBLIC_BASE_URL/matter/health" >/dev/null 2>&1; then
    echo "[deploy] matter healthy"
    exit 0
  fi
  sleep 2
done

echo "[deploy] matter health did not become ready" >&2
compose logs --tail=120 matter >&2 || true
exit 1

