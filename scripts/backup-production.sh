#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/samvio/app}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/lib/samvio/uploads}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/samvio}"
DB_NAME="${DB_NAME:-samvio}"
MYSQL_CNF="${MYSQL_CNF:-/etc/samvio/mysql-backup.cnf}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
REMOTE_DEST="${REMOTE_DEST:-}"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Backup må kjøres som root slik at database-credentials og alle uploads kan leses." >&2
  exit 1
fi

for path in "$UPLOAD_DIR" "$MYSQL_CNF"; do
  if [[ ! -e "$path" ]]; then
    echo "Mangler påkrevd sti: $path" >&2
    exit 1
  fi
done

if command -v mariadb-dump >/dev/null 2>&1; then
  DUMP_BIN="$(command -v mariadb-dump)"
elif command -v mysqldump >/dev/null 2>&1; then
  DUMP_BIN="$(command -v mysqldump)"
else
  echo "Fant verken mariadb-dump eller mysqldump." >&2
  exit 1
fi

install -d -m 0700 "$BACKUP_ROOT" "$BACKUP_ROOT/snapshots"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
snapshot="$BACKUP_ROOT/snapshots/$stamp"
tmp="$BACKUP_ROOT/.tmp-$stamp-$$"

cleanup() {
  rm -rf -- "$tmp"
}
trap cleanup EXIT
install -d -m 0700 "$tmp"

echo "[1/5] Dumper MariaDB..."
"$DUMP_BIN" \
  --defaults-extra-file="$MYSQL_CNF" \
  --single-transaction \
  --quick \
  --skip-lock-tables \
  --hex-blob \
  "$DB_NAME" | gzip -9 > "$tmp/database.sql.gz"
gzip -t "$tmp/database.sql.gz"

echo "[2/5] Arkiverer uploads..."
tar -C "$UPLOAD_DIR" -czf "$tmp/uploads.tar.gz" .
tar -tzf "$tmp/uploads.tar.gz" >/dev/null

echo "[3/5] Lager metadata og checksums..."
commit="unknown"
if [[ -d "$APP_DIR/.git" ]]; then
  commit="$(git -C "$APP_DIR" rev-parse HEAD 2>/dev/null || printf 'unknown')"
fi
cat > "$tmp/metadata.txt" <<EOF
created_utc=$stamp
hostname=$(hostname)
database=$DB_NAME
upload_dir=$UPLOAD_DIR
git_commit=$commit
EOF
(
  cd "$tmp"
  sha256sum database.sql.gz uploads.tar.gz metadata.txt > SHA256SUMS
  sha256sum -c SHA256SUMS
)

mv "$tmp" "$snapshot"
trap - EXIT
ln -sfn "$stamp" "$BACKUP_ROOT/snapshots/latest"

echo "[4/5] Rydder lokale snapshots eldre enn $RETENTION_DAYS dager..."
find "$BACKUP_ROOT/snapshots" \
  -mindepth 1 -maxdepth 1 -type d -name '20*T*Z' \
  -mtime "+$RETENTION_DAYS" -print -exec rm -rf -- {} +

if [[ -n "$REMOTE_DEST" ]]; then
  echo "[5/5] Kopierer snapshot off-server..."
  if ! command -v rclone >/dev/null 2>&1; then
    echo "REMOTE_DEST er satt, men rclone er ikke installert." >&2
    exit 1
  fi
  rclone copy "$snapshot" "${REMOTE_DEST%/}/$stamp" --checksum
else
  echo "[5/5] Off-server backup er ikke konfigurert ennå (REMOTE_DEST er tom)."
fi

printf 'Backup OK: %s\n' "$snapshot"
