#!/usr/bin/env sh
# Automated PostgreSQL backup (spec §14: persistent storage + automated backups).
# Usage: ./backup.sh [output-dir]   (default: ./backups)
set -eu

OUT_DIR="${1:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${OUT_DIR}/blower-${STAMP}.sql.gz"

mkdir -p "$OUT_DIR"

if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "$DATABASE_URL" | gzip -9 > "$FILE"
else
  PGPASSWORD="${POSTGRES_PASSWORD:-blower}" pg_dump \
    -h "${POSTGRES_HOST:-postgres}" \
    -U "${POSTGRES_USER:-blower}" \
    -d "${POSTGRES_DB:-blower}" | gzip -9 > "$FILE"
fi

echo "backup written: $FILE"

# Prune backups older than the retention window.
find "$OUT_DIR" -name 'blower-*.sql.gz' -type f -mtime "+${RETENTION_DAYS}" -delete
echo "pruned backups older than ${RETENTION_DAYS} days"
