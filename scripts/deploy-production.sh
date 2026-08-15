#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/samvio/app"
BRANCH="${1:-main}"
cd "$APP_DIR"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Avbryter: arbeidsmappen har lokale endringer." >&2
  exit 1
fi
git fetch --prune origin
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"
npm ci
npm run migrate
npm run check
npm run build
sudo systemctl restart samvio.service
curl --fail --silent --show-error --retry 5 --retry-delay 2 http://127.0.0.1:3000/healthz
echo "Samvio er deployet og svarer på health check."
