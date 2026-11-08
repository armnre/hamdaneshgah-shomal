#!/usr/bin/env bash
# Full build + migrate. Run from the repo root on the server (Plesk SSH terminal), or put
# `bash deploy.sh` in Plesk → Git → "Additional deployment actions".
set -euo pipefail
cd "$(dirname "$0")"
# Plesk keeps Node versions under /opt/plesk/node/<ver>; use the same one Passenger runs (24), else system node.
for v in 24 22 26; do if [ -d /opt/plesk/node/$v/bin ]; then export PATH="/opt/plesk/node/$v/bin:$PATH"; break; fi; done
node -v

echo "── frontend ──"
(cd web && npm ci --no-audit --no-fund && npm run build)

echo "── server ──"
(cd server && npm ci --include=dev --no-audit --no-fund && npm run build && npm test && npm run migrate)

# Tell Passenger to restart the app
mkdir -p server/tmp && touch server/tmp/restart.txt
echo "✓ deployed"
