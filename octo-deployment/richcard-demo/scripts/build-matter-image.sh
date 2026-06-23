#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

REPO_ROOT="${REPO_ROOT:-/home/zhangqianxiao/Matter-test-richcard}"
GIT_SHA="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
IMAGE_TAG="${BUILD_IMAGE_TAG:-octo-matter:richcard-${GIT_SHA}-$(date +%Y%m%d%H%M%S)}"

echo "[build] $IMAGE_TAG from $REPO_ROOT/octo-matter"
sudo -n docker build -t "$IMAGE_TAG" "$REPO_ROOT/octo-matter"
echo "$IMAGE_TAG" > "$REPO_ROOT/.last-matter-image"
echo "$IMAGE_TAG"

