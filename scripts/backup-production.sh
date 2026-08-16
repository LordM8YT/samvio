#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/samvio/app}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/lib/samvio/uploads}"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups/samvio}"
ENV_FILE="${ENV_FILE:-/etc/samvio/samvio.env}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
REMOTE_DEST="${REMOTE_DEST:-}"
RCLONE_CONFIG="${RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"

if [[ ! -r "$ENV_FILE" ]]; then
  echo "Kan ikke lese production-env: $ENV_FILE" >&2
  exit 1
fi
if [[ ! -d "$UPLOAD_DIR" || ! -r "$UPLOAD_DIR" ]]; then
  echo "Kan ikke lese uploads-mappen: $UPLOAD_DIR" >&2
  exit 1
fi

if command -v mariadb-dump >/dev/null 2>&1; then
  DUMP_BIN="$(command -v mariadb-dump)"
elif command -v mysqldump >/dev/null 2>&1; then
  DUMP_BIN="$(command -v mysqldump)"
else
  echo "Fant verken mariadb-dump eller mysqldump." >&2
  exit 1
fi

mapfile -d '' -t DB_PARTS < <(
  node --env-file="$ENV_FILE" -e '
    const raw = process.env.DATABASE_URL;
    if (!raw) { console.error("DATABASE_URL mangler"); process.exit(2); }
    const url = new URL(raw);
    if (!["mysql:", "mariadb:"].includes(url.protocol)) {
      console.error(`Ustøttet databaseprotokoll: ${url.protocol}`);
      process.exit(2);
    }
    const parts = [
      decodeURIComponent(url.username),
      decodeURIComponent(url.password),
      url.hostname || "localhost",
      url.port || "3306",
      decodeURIComponent(url.pathname.replace(/^\/+/, ""))
    ];
    if (!parts[0] || !parts[4]) { console.error("DATABASE_URL mangler bruker eller databasenavn"); process.exit(2); }
    process.stdout.write(parts.join("\0") + "\0");
  '
)

if [[ ${#DB_PARTS[@]} -lt 5 ]]; then
  echo "Kunne ikke lese databaseinformasjon fra DATABASE_URL." >&2
  exit 1
fi
DB_USER="${DB_PARTS[0]}"
DB_PASSWORD="${DB_PARTS[1]}"
DB_HOST="${DB_PARTS[2]}"
DB_PORT="${DB_PARTS[3]}"
DB_NAME="${DB_PARTS[4]}"
unset DB_PARTS

install -d -m 0700 "$BACKUP_ROOT" "$BACKUP_ROOT/snapshots"
if command -v flock >/dev/null 2>&1; then
  exec 9>"$BACKUP_ROOT/.backup.lock"
  if ! flock -n 9; then
    echo "En annen Samvio-backup kjører allerede." >&2
    exit 1
  fi
fi

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
snapshot="$BACKUP_ROOT/snapshots/$stamp"
tmp="$BACKUP_ROOT/.tmp-$stamp-$$"

cleanup() {
  rm -rf -- "$tmp"
}
trap cleanup EXIT
install -d -m 0700 "$tmp"

echo "[1/5] Dumper MariaDB..."
MYSQL_PWD="$DB_PASSWORD" "$DUMP_BIN" \
  --user="$DB_USER" \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --protocol=tcp \
  --single-transaction \
  --quick \
  --skip-lock-tables \
  --hex-blob \
  "$DB_NAME" | gzip -9 > "$tmp/database.sql.gz"
unset DB_PASSWORD
gzip -t "$tmp/database.sql.gz"

if [[ ! -s "$tmp/database.sql.gz" ]]; then
  echo "Databasedumpen er tom." >&2
  exit 1
fi

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
backup_user=$(id -un)
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
    echo "REMOTE_DEST er satt, men rclone er ikke tilgjengelig." >&2
    exit 1
  fi
  rclone_args=(copy "$snapshot" "${REMOTE_DEST%/}/$stamp" --checksum)
  if [[ -r "$RCLONE_CONFIG" ]]; then
    rclone_args+=(--config "$RCLONE_CONFIG")
  fi
  rclone "${rclone_args[@]}"
else
  echo "[5/5] Off-server backup er ikke konfigurert ennå (REMOTE_DEST er tom)."
fi

printf 'Backup OK: %s\n' "$snapshot"
