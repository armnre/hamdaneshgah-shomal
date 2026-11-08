#!/usr/bin/env bash
# Full build + migrate. Run from the repo root on the server (Plesk SSH terminal), or put
# `bash deploy.sh` in Plesk → Git → "Additional deployment actions".
set -euo pipefail
cd "$(dirname "$0")"
# Plesk keeps Node versions under /opt/plesk/node/<ver>; prefer 22 when present.
if [ -d /opt/plesk/node/22/bin ]; then export PATH="/opt/plesk/node/22/bin:$PATH"; fi
node -v

echo "── frontend ──"
(cd web && npm ci --no-audit --no-fund && npm run build)

echo "── server ──"
(cd server && npm ci --include=dev --no-audit --no-fund && npm run build && npm test && npm run migrate)

# Tell Passenger to restart the app
mkdir -p server/tmp && touch server/tmp/restart.txt
echo "✓ deployed"
