#!/usr/bin/env bash
# Vibe Station — SQLite Database Backup
# Schedule: 0 3 * * * /path/to/vibe-station/scripts/backup-db.sh
# Keeps 7 days of rolling backups.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_PATH="${DB_PATH:-$PROJECT_DIR/data/vibe-station.db}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/data/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# ── Guard: DB file must exist ────────────────────────────────
if [ ! -f "$DB_PATH" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] DB not found at $DB_PATH, skipping backup."
  exit 0
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_FILE="$BACKUP_DIR/vibe-station-$TIMESTAMP.db"

# ── Backup (SQLite safe copy via .backup) ───────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backing up $DB_PATH → $BACKUP_FILE"

sqlite3 "$DB_PATH" "VACUUM INTO '$BACKUP_FILE';" 2>/dev/null || {
  # Fallback: plain copy (WAL mode — WAL file is checkpointed on read)
  cp "$DB_PATH" "$BACKUP_FILE"
}

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete ($(du -h "$BACKUP_FILE" | cut -f1))"

# ── Rotate: delete backups older than N days ─────────────────
DELETED=$(find "$BACKUP_DIR" -name "vibe-station-*.db" -type f -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rotated $DELETED old backup(s)"
fi
