#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/samvio/app"
ENV_FILE="/etc/samvio/samvio.env"
BRANCH="${1:-main}"
HEALTH_URL="http://127.0.0.1:3000/healthz"

cd "$APP_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Avbryter: arbeidsmappen har lokale endringer." >&2
  exit 1
fi

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Avbryter: kan ikke lese production-env: $ENV_FILE" >&2
  exit 1
fi

dump_service_diagnostics() {
  echo "--- samvio.service status ---" >&2
  systemctl status samvio.service --no-pager -l >&2 || true
  echo "--- siste samvio.service logger ---" >&2
  journalctl -u samvio.service -n 120 --no-pager >&2 || true
}

wait_for_health() {
  curl \
    --fail \
    --silent \
    --show-error \
    --retry 30 \
    --retry-delay 2 \
    --retry-connrefused \
    --retry-all-errors \
    "$HEALTH_URL"
}

git fetch --prune origin
git switch "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run check
npm run build
node --env-file="$ENV_FILE" scripts/migrate.mjs

sudo -n systemctl restart samvio.service

if ! wait_for_health; then
  echo "Health check feilet etter første restart. Dumper diagnostikk og prøver én kontrollert restart til." >&2
  dump_service_diagnostics
  sudo -n systemctl restart samvio.service || true

  if ! wait_for_health; then
    echo "Samvio kom ikke opp etter andre restart." >&2
    dump_service_diagnostics
    exit 1
  fi
fi

echo "Samvio er deployet og svarer på health check."
