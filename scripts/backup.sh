#!/bin/sh
# scripts/backup.sh runs nightly from a cron job, from the app folder (spec 3.6).
set -e
: "${DATA_DIR:?DATA_DIR must be set, because cron does not load .env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/talkalways}"
RCLONE_REMOTE="${RCLONE_REMOTE:-remote:site-backups}"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d-%H%M%S)
# VACUUM INTO gets a consistent snapshot without stopping the app. Opening the source DB OPEN_READONLY, together
# with the DATA_DIR guard above, matters because a plain (non-readonly) open of a wrong path silently creates a
# fresh empty database file, and this script would then back up that empty file with exit 0 every night with
# nobody noticing. Never copy site.db directly either, because its -wal file lives next to it.
node -e "new (require('sqlite3').Database)(process.argv[1], require('sqlite3').OPEN_READONLY).run('VACUUM INTO ?', [process.argv[2]], e => { if (e) throw e })" "$DATA_DIR/site.db" "$BACKUP_DIR/site-$TS.db"
tar czf "$BACKUP_DIR/uploads-$TS.tgz" -C "$DATA_DIR" uploads
# The destination file name carries the timestamp because VACUUM INTO fails if the target already exists.
rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE"
# Matches only this script's own file naming (site-*.db, uploads-*.tgz), and -mindepth 1 keeps BACKUP_DIR itself
# out of the match set, so retention can never touch anything this script did not create even if BACKUP_DIR is
# ever pointed at a shared directory again.
find "$BACKUP_DIR" -mindepth 1 -type f \( -name 'site-*.db' -o -name 'uploads-*.tgz' \) -mtime +7 -delete
