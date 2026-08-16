#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/samvio/app}"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Kjør med root, f.eks. sudo bash scripts/install-backup-timer.sh" >&2
  exit 1
fi

for file in \
  "$APP_DIR/ops/samvio-backup.service" \
  "$APP_DIR/ops/samvio-backup.timer" \
  "$APP_DIR/scripts/backup-production.sh"; do
  if [[ ! -f "$file" ]]; then
    echo "Mangler $file" >&2
    exit 1
  fi
done

if [[ ! -f /etc/samvio/mysql-backup.cnf ]]; then
  cat >&2 <<'EOF'
Mangler /etc/samvio/mysql-backup.cnf.
Opprett en dedikert MariaDB backup-bruker og config først. Se docs/BACKUP.md.
EOF
  exit 1
fi

install -d -m 0700 /var/backups/samvio /var/backups/samvio/snapshots
install -m 0644 "$APP_DIR/ops/samvio-backup.service" /etc/systemd/system/samvio-backup.service
install -m 0644 "$APP_DIR/ops/samvio-backup.timer" /etc/systemd/system/samvio-backup.timer

if [[ ! -f /etc/samvio/backup.env ]]; then
  install -m 0600 "$APP_DIR/ops/backup.env.example" /etc/samvio/backup.env
fi

systemctl daemon-reload
systemctl enable --now samvio-backup.timer

echo "Kjører første backup nå..."
systemctl start samvio-backup.service
systemctl --no-pager --full status samvio-backup.service || true

echo
echo "Neste planlagte kjøring:"
systemctl list-timers samvio-backup.timer --no-pager

echo
echo "Backup-timer er installert."
