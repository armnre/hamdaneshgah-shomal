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

# Voter list: put the Excel file at server/data/students.xlsx on the server (File Manager / scp).
# It is git-ignored (national IDs must never be committed). Imported once, then securely deleted.
if [ -f server/data/students.xlsx ]; then
  echo "── voters ──"
  (cd server && npm run import-voters -- data/students.xlsx --commit) && shred -u server/data/students.xlsx
fi

# Voter list (encrypted in git). Runs only while STUDENTS_KEY is in server/.env; remove it after the import.
if [ -f server/data/students.xlsx.enc ] && grep -q '^STUDENTS_KEY=' server/.env 2>/dev/null; then
  echo "── voters (encrypted list) ──"
  (cd server && export STUDENTS_KEY="$(grep '^STUDENTS_KEY=' .env | cut -d= -f2-)" \
    && node scripts/decrypt-students.mjs data/students.xlsx.enc /tmp/students.xlsx \
    && npm run import-voters -- /tmp/students.xlsx --commit; shred -u /tmp/students.xlsx 2>/dev/null || true)
fi

# Tell Passenger to restart the app
mkdir -p server/tmp && touch server/tmp/restart.txt
echo "✓ deployed"
