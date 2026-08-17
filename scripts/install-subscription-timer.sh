#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/samvio/app}"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Kjør med root, f.eks. sudo bash scripts/install-subscription-timer.sh" >&2
  exit 1
fi

for file in \
  "$APP_DIR/ops/samvio-subscriptions.service" \
  "$APP_DIR/ops/samvio-subscriptions.timer" \
  "$APP_DIR/scripts/process-subscriptions.mjs"; do
  if [[ ! -f "$file" ]]; then
    echo "Mangler $file" >&2
    exit 1
  fi
done

if [[ ! -r /etc/samvio/samvio.env ]]; then
  echo "Mangler lesbar /etc/samvio/samvio.env." >&2
  exit 1
fi

install -m 0644 "$APP_DIR/ops/samvio-subscriptions.service" /etc/systemd/system/samvio-subscriptions.service
install -m 0644 "$APP_DIR/ops/samvio-subscriptions.timer" /etc/systemd/system/samvio-subscriptions.timer

systemctl daemon-reload
systemctl enable --now samvio-subscriptions.timer

echo "Kjører abonnement-worker én gang nå..."
systemctl start samvio-subscriptions.service
systemctl --no-pager --full status samvio-subscriptions.service || true

echo
echo "Neste planlagte kjøring:"
systemctl list-timers samvio-subscriptions.timer --no-pager

echo
echo "Abonnement-timer er installert."
