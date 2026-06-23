#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$SCRIPT_DIR/common.sh"

require_cmd curl
require_cmd python3

REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DOCKER_ENV_FILE="${DOCKER_ENV_FILE:-$COMPOSE_DIR/.env}"

if [ -f "$DOCKER_ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$DOCKER_ENV_FILE"
  set +a
fi

LLM_API_URL="${LLM_API_URL:-https://llm-gateway.mlamp.cn/v1}"
LLM_MODEL="${LLM_MODEL:-deepseek-chat}"

redact() {
  sed -E 's/sk-[A-Za-z0-9._-]+/[REDACTED]/g'
}

need_env() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    echo "[llm] missing required env: $name" >&2
    exit 1
  fi
}

echo "[llm] checking env"
need_env LLM_API_URL
need_env LLM_API_KEY
need_env LLM_MODEL

case "$LLM_API_KEY" in
  changeme-*|CHANGE_ME*|CHG_ME*)
    echo "[llm] LLM_API_KEY is still a placeholder" >&2
    exit 1
    ;;
esac

echo "[llm] api url: $LLM_API_URL"
echo "[llm] model: $LLM_MODEL"

echo "[llm] checking OpenAI-compatible /models endpoint"
python3 - <<PY | redact
import json
import os
import urllib.request

base = os.environ["LLM_API_URL"].rstrip("/")
key = os.environ["LLM_API_KEY"]
req = urllib.request.Request(
    base + "/models",
    headers={"Authorization": "Bearer " + key},
)
with urllib.request.urlopen(req, timeout=20) as resp:
    data = json.loads(resp.read().decode("utf-8", "replace"))
models = [item.get("id") for item in data.get("data", []) if isinstance(item, dict)]
target = os.environ["LLM_MODEL"]
print("[llm] models endpoint ok")
if target not in models:
    print(f"[llm] WARN: configured model {target!r} not listed; first models: {models[:8]}")
else:
    print(f"[llm] configured model {target!r} is available")
PY

echo "[llm] checking docker compose services"
compose ps matter summary-api summary-worker || true

echo "[llm] checking summary-worker health"
compose exec -T summary-worker wget -q -O - http://localhost:8082/internal/healthz >/dev/null
echo "[llm] summary-worker health ok"

if [ -d "$REPO_ROOT/octo-matter" ]; then
  echo "[llm] running octo-matter live LLM smoke tests"
  (
    cd "$REPO_ROOT/octo-matter"
    LLM_SMOKE=1 \
      LLM_API_URL="$LLM_API_URL" \
      LLM_API_KEY="$LLM_API_KEY" \
      LLM_MODEL="$LLM_MODEL" \
      go test ./internal/service -run 'TestSmoke_ExtractMatter|TestSmoke_ExtractMatterProgress' -count=1 -v
  ) 2>&1 | redact
else
  echo "[llm] WARN: $REPO_ROOT/octo-matter not found; skipping Go smoke tests"
fi

echo "[llm] runtime preflight complete"
