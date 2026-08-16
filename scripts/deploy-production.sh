#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/samvio/app"
ENV_FILE="/etc/samvio/samvio.env"
BRANCH="${1:-main}"

cd "$APP_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Avbryter: arbeidsmappen har lokale endringer." >&2
  exit 1
fi

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Avbryter: kan ikke lese production-env: $ENV_FILE" >&2
  exit 1
fi

git fetch --prune origin
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run check
npm run build
node --env-file="$ENV_FILE" scripts/migrate.mjs

sudo -n systemctl restart samvio.service
curl \
  --fail \
  --silent \
  --show-error \
  --retry 10 \
  --retry-delay 2 \
  --retry-connrefused \
  http://127.0.0.1:3000/healthz

echo "Samvio er deployet og svarer på health check."
