# Deploying to Fly.io

Chosen for this app because it's a single Node/Express process backed by a SQLite file
(`data/site.db`) plus local uploads (`data/uploads/`). Fly Volumes give that data a persistent,
single-machine disk that survives deploys, and if this ever needs to scale beyond one machine,
Fly's LiteFS lets SQLite itself replicate across regions/machines — a path Render's or Railway's
disks don't offer. Until then this runs as exactly **one machine** (SQLite is single-writer
anyway, so extra replicas against the same volume would not help).

## One-time setup

```bash
fly auth login
fly launch --no-deploy --copy-config   # uses fly.toml in this repo; pick a unique app name
fly volumes create data --region sin --size 1
```

Set the required secrets (see `.env.example` for how to generate each value):

```bash
fly secrets set \
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))") \
  ADMIN_USERNAME=admin \
  ADMIN_PASSWORD_HASH='<paste bcrypt hash from scripts/hash-password.js>' \
  SITE_URL=https://<your-app>.fly.dev
```

Optional: `fly secrets set GA_MEASUREMENT_ID=G-XXXXXXXXXX` to enable analytics.

## Deploy

```bash
fly deploy
```

`fly.toml` builds from the repo's `Dockerfile`, mounts the `data` volume at `/app/data`
(`DATA_DIR`), and forces HTTPS so the admin cookie's `Secure` flag (set whenever
`NODE_ENV=production`, which the Dockerfile sets) works correctly.

## Nightly backups

`scripts/backup.sh` (VACUUM INTO + uploads tar + `rclone copy`) still applies unchanged — run it
via `fly ssh console -C` on a cron schedule, or from a separate machine, pointing `DATA_DIR` at
`/app/data` and `RCLONE_REMOTE` at wherever the backups should land.

## Updating later

```bash
fly deploy
```

Fly rebuilds the image and rolls it onto the existing machine; the volume (and therefore
`site.db` and uploads) is untouched across deploys.
