#!/bin/sh
# scripts/backup.sh runs nightly from a cron job, from the app folder (spec 3.6).
set -e
: "${DATA_DIR:?DATA_DIR must be set, because cron does not load .env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/talkalways}"
RCLONE_REMOTE="${RCLONE_REMOTE:-remote:site-backups}"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
# Only applies to a local SQLite file (no TURSO_DATABASE_URL). With Turso, the database lives on
# Turso's own storage instead of $DATA_DIR/site.db, and Turso covers backups on its side - see
# docs/DEPLOY.md.
: "${TURSO_DATABASE_URL:=}"
if [ -z "$TURSO_DATABASE_URL" ]; then
  # -f, together with the DATA_DIR guard above, matters because opening a wrong path for writing
  # would otherwise silently create a fresh empty database file, and this script would then back up
  # that empty file with exit 0 every night with nobody noticing.
  [ -f "$DATA_DIR/site.db" ] || { echo "$DATA_DIR/site.db not found" >&2; exit 1; }
  # VACUUM INTO gets a consistent snapshot without stopping the app. Never copy site.db directly
  # either, because its -wal file lives next to it.
  node -e "require('@libsql/client').createClient({ url: 'file:' + process.argv[1] }).execute({ sql: 'VACUUM INTO ?', args: [process.argv[2]] }).then(() => process.exit(0), e => { console.error(e); process.exit(1) })" "$DATA_DIR/site.db" "$BACKUP_DIR/site-$TS.db"
fi
tar czf "$BACKUP_DIR/uploads-$TS.tgz" -C "$DATA_DIR" uploads
# The destination file name carries the timestamp because VACUUM INTO fails if the target already exists.
rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE"
# Matches only this script's own file naming (site-*.db, uploads-*.tgz), and -mindepth 1 keeps BACKUP_DIR itself
# out of the match set, so retention can never touch anything this script did not create even if BACKUP_DIR is
# ever pointed at a shared directory again.
find "$BACKUP_DIR" -mindepth 1 -type f \( -name 'site-*.db' -o -name 'uploads-*.tgz' \) -mtime +7 -delete
