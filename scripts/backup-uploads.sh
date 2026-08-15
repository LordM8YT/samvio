#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_DIR="${UPLOAD_DIR:-/var/lib/samvio/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/samvio/uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
install -d -m 0700 "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
tar -C "$SOURCE_DIR" -czf "$BACKUP_DIR/uploads-$stamp.tar.gz" .
find "$BACKUP_DIR" -type f -name 'uploads-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete
