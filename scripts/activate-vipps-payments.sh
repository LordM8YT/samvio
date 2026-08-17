#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/samvio/app}"
ENV_FILE="${SAMVIO_ENV_FILE:-/etc/samvio/samvio.env}"

cd "$APP_DIR"

if [[ ! -r "$ENV_FILE" || ! -w "$ENV_FILE" ]]; then
  echo "Vipps-kassa åpnes ikke: $ENV_FILE må være lesbar og skrivbar for deploy-brukeren."
  exit 0
fi

read_env() {
  /usr/bin/node --env-file="$ENV_FILE" -e "process.stdout.write(process.env.$1 ?? '')"
}

API_BASE_URL="$(read_env VIPPS_API_BASE_URL)"
PUBLIC_URL="$(read_env SAMVIO_PUBLIC_URL)"

if [[ "$API_BASE_URL" != "https://api.vipps.no" ]]; then
  echo "Vipps-kassa åpnes ikke: VIPPS_API_BASE_URL er ikke produksjon (https://api.vipps.no)."
  exit 0
fi

if [[ "$PUBLIC_URL" != "https://samvio.no" ]]; then
  echo "Vipps-kassa åpnes ikke: SAMVIO_PUBLIC_URL må være https://samvio.no."
  exit 0
fi

for key in VIPPS_CLIENT_ID VIPPS_CLIENT_SECRET VIPPS_SUBSCRIPTION_KEY VIPPS_MERCHANT_SERIAL_NUMBER; do
  if [[ -z "$(read_env "$key")" ]]; then
    echo "Vipps-kassa åpnes ikke: $key mangler."
    exit 0
  fi
done

/usr/bin/node --env-file="$ENV_FILE" scripts/register-vipps-webhook.mjs \
  --write-env="$ENV_FILE" \
  --enable-payments

# Reload app environment after VIPPS_WEBHOOK_SECRET / VIPPS_PAYMENTS_ENABLED changed.
sudo -n systemctl restart samvio.service

# Install the recurring renewal timer if deploy sudo permissions allow it.
if sudo -n /usr/bin/bash "$APP_DIR/scripts/install-subscription-timer.sh"; then
  echo "Vipps fornyelsestimer er installert."
else
  echo "ADVARSEL: Vipps-kassa er aktiv, men fornyelsestimeren kunne ikke installeres automatisk." >&2
  echo "Kjør én gang som root: bash $APP_DIR/scripts/install-subscription-timer.sh" >&2
fi

curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-connrefused http://127.0.0.1:3000/healthz >/dev/null

echo "Vipps-kassa er aktivert for produksjon."
