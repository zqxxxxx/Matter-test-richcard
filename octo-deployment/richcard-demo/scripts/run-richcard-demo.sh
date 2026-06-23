#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/backup-richcard-db.sh"
"$SCRIPT_DIR/deploy-matter-image.sh"
"$SCRIPT_DIR/enable-message-proxy-send.sh"
"$SCRIPT_DIR/seed-databases.sh"
"$SCRIPT_DIR/enable-summary-profile.sh"
"$SCRIPT_DIR/seed-summary-acceptance.sh"
"$SCRIPT_DIR/send-richcard-messages.sh"

echo "[demo] complete"
