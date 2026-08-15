#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/samvio/mysql}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
install -d -m 0700 "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mysqldump --defaults-extra-file=/etc/samvio/mysql-backup.cnf --single-transaction --routines samvio | gzip -9 > "$BACKUP_DIR/samvio-$stamp.sql.gz"
find "$BACKUP_DIR" -type f -name 'samvio-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
