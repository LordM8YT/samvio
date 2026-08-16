#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/samvio/app}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/lib/samvio/uploads}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/samvio}"
DB_NAME="${DB_NAME:-samvio}"
MYSQL_RESTORE_CNF="${MYSQL_RESTORE_CNF:-/etc/samvio/mysql-restore.cnf}"
APP_SERVICE="${APP_SERVICE:-samvio.service}"

usage() {
  cat <<'EOF'
Bruk:
  sudo bash scripts/restore-production.sh /var/backups/samvio/snapshots/<timestamp> --confirm

Valgfritt:
  --skip-safety-backup   Hopper over automatisk backup av dagens tilstand før restore.
EOF
}

snapshot="${1:-}"
confirm="${2:-}"
third="${3:-}"
skip_safety=0

if [[ "$confirm" == "--skip-safety-backup" || "$third" == "--skip-safety-backup" ]]; then
  skip_safety=1
fi
if [[ "$confirm" != "--confirm" && "$third" != "--confirm" ]]; then
  usage
  echo "Avbryter: --confirm mangler." >&2
  exit 2
fi
if [[ -z "$snapshot" ]]; then
  usage
  exit 2
fi
if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Restore må kjøres som root." >&2
  exit 1
fi

snapshot="$(readlink -f "$snapshot")"
backup_root_real="$(readlink -f "$BACKUP_ROOT/snapshots")"
case "$snapshot" in
  "$backup_root_real"/*) ;;
  *) echo "Avbryter: snapshot må ligge under $backup_root_real" >&2; exit 1 ;;
esac

for file in database.sql.gz uploads.tar.gz metadata.txt SHA256SUMS; do
  if [[ ! -f "$snapshot/$file" ]]; then
    echo "Snapshot mangler $file: $snapshot" >&2
    exit 1
  fi
done

if command -v mariadb >/dev/null 2>&1; then
  DB_BIN="$(command -v mariadb)"
elif command -v mysql >/dev/null 2>&1; then
  DB_BIN="$(command -v mysql)"
else
  echo "Fant verken mariadb eller mysql-klienten." >&2
  exit 1
fi

DB_ARGS=()
if [[ -f "$MYSQL_RESTORE_CNF" ]]; then
  DB_ARGS+=("--defaults-extra-file=$MYSQL_RESTORE_CNF")
fi

if ! "$DB_BIN" "${DB_ARGS[@]}" "$DB_NAME" -Nse 'SELECT 1' >/dev/null 2>&1; then
  echo "Restore-brukeren har ikke tilgang til $DB_NAME. Root/socket-auth feilet og $MYSQL_RESTORE_CNF ga ikke gyldig tilgang." >&2
  echo "Se docs/BACKUP.md for separat restore-config." >&2
  exit 1
fi

echo "Verifiserer snapshot..."
(
  cd "$snapshot"
  sha256sum -c SHA256SUMS
)
gzip -t "$snapshot/database.sql.gz"
tar -tzf "$snapshot/uploads.tar.gz" >/dev/null

if [[ "$skip_safety" -eq 0 ]]; then
  echo "Tar safety-backup av nåværende production før restore..."
  bash "$APP_DIR/scripts/backup-production.sh"
fi

rollback_uploads="${UPLOAD_DIR}.pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"

echo "Stopper $APP_SERVICE..."
systemctl stop "$APP_SERVICE"

restore_failed=1
on_exit() {
  if [[ "$restore_failed" -ne 0 ]]; then
    systemctl stop "$APP_SERVICE" >/dev/null 2>&1 || true
    echo "RESTORE FEILET. $APP_SERVICE er stoppet for å unngå å kjøre med delvis gjenopprettede data." >&2
    if [[ -d "$rollback_uploads" ]]; then
      echo "Forrige uploads-map ligger i: $rollback_uploads" >&2
    fi
  fi
}
trap on_exit EXIT

echo "Gjenoppretter database..."
gzip -dc "$snapshot/database.sql.gz" | "$DB_BIN" "${DB_ARGS[@]}" "$DB_NAME"

echo "Gjenoppretter uploads..."
if [[ -e "$UPLOAD_DIR" ]]; then
  mv "$UPLOAD_DIR" "$rollback_uploads"
fi
install -d -o samvio -g samvio -m 0750 "$UPLOAD_DIR"
tar -C "$UPLOAD_DIR" -xzf "$snapshot/uploads.tar.gz"
chown -R samvio:samvio "$UPLOAD_DIR"

echo "Starter $APP_SERVICE..."
systemctl start "$APP_SERVICE"

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/healthz >/dev/null; then
    restore_failed=0
    trap - EXIT
    echo "Restore OK. Samvio svarer på health check."
    if [[ -d "$rollback_uploads" ]]; then
      echo "Forrige uploads beholdes midlertidig i: $rollback_uploads"
    fi
    exit 0
  fi
  sleep 2
done

echo "Health check feilet etter restore." >&2
exit 1
