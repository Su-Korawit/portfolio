# Deploying for free: Render + Turso + Cloudflare R2

No server to manage and no credit card required for this stack. It works because `src/db.js` and
`src/uploads.js` both fall back to a remote store when its env vars are set, instead of the local
SQLite file / local disk that dev and the tests use:

- **Render** (free web service) runs the Node app itself. Its free tier has no persistent disk and
  the container's filesystem resets on every deploy and on every sleep/wake cycle, which is fine
  here because nothing needs to survive locally.
- **Turso** (a hosted libSQL/SQLite service, free tier) holds `posts`, `projects`, etc. — the same
  schema, same SQL, just not on local disk.
- **Cloudflare R2** (S3-compatible object storage, free tier) holds uploaded images instead of
  `DATA_DIR/uploads`.

If this ever needs a real, always-on VM with a mounted disk instead (or outgrows the free tiers),
see `docs/DEPLOY-FLY.md` for a Fly.io alternative — that one costs a few USD/month.

## 1. Turso (database)

```bash
curl -sSfL https://get.tur.so/install.sh | sh   # installs the turso CLI
turso auth signup                               # or: turso auth login
turso db create talkalways
turso db show talkalways --url                  # -> TURSO_DATABASE_URL
turso db tokens create talkalways               # -> TURSO_AUTH_TOKEN
```

The app creates its own tables on startup (`src/schema.sql` via `ready` in `src/db.js`), so there's
nothing to migrate by hand.

## 2. Cloudflare R2 (uploads)

1. Cloudflare dashboard → R2 → create a bucket (e.g. `talkalways-uploads`).
2. R2 → "Manage API tokens" → create an API token scoped to that bucket → note the **Access Key
   ID** and **Secret Access Key**, and your **Account ID** (shown in the R2 overview page).
3. Bucket Settings → Public Access → enable it and copy the public `r2.dev` URL (or attach a custom
   domain) → `R2_PUBLIC_URL`.

## 3. Render (app)

1. render.com → New → Web Service → connect this repo.
2. Runtime: Node. Build command: `npm ci --omit=dev`. Start command: `npm start`. Plan: Free.
3. Environment variables (see `.env.example` for how to generate each one):

   ```
   NODE_ENV=production
   SITE_URL=https://<your-app>.onrender.com
   SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))">
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=<node scripts/hash-password.js '<passphrase>'>
   TURSO_DATABASE_URL=<from step 1>
   TURSO_AUTH_TOKEN=<from step 1>
   R2_ACCOUNT_ID=<from step 2>
   R2_ACCESS_KEY_ID=<from step 2>
   R2_SECRET_ACCESS_KEY=<from step 2>
   R2_BUCKET=<from step 2>
   R2_PUBLIC_URL=<from step 2>
   ```

   Optional: `GA_MEASUREMENT_ID=G-XXXXXXXXXX` to enable analytics.

4. Deploy. Render builds and starts the app; `SITE_URL` must match the exact URL Render gives you
   so canonical/og:url tags and the `Secure` admin cookie (only set when `NODE_ENV=production`)
   line up.

## Filling in the about page

Everything on `/about` — the name, the intro, the facts box, the swatches, the quote, the YouTube link and
the contact lines — is a setting, so a fresh database starts with none of it. Fill it in at
`/admin/settings`; each block stays hidden until it has a value.

## Free-tier limits worth knowing

- Render's free web service **sleeps after 15 minutes idle** and takes ~30-50s to wake on the next
  request — fine for a personal site, not for anything latency-sensitive. A paid Render plan or
  Fly.io (`docs/DEPLOY-FLY.md`) removes this if it matters later.
- Turso's and R2's free tiers cap storage/requests generously enough for a blog-scale app; check
  current numbers on their pricing pages before committing to this path long-term.

## Backups

`scripts/backup.sh` is for the local-SQLite-file path (self-hosted/VPS or `docs/DEPLOY-FLY.md`) and
does nothing useful here — there's no local `site.db` or populated `uploads/` to back up once
`TURSO_DATABASE_URL` and the `R2_*` vars are set. Rely on Turso's own backups/point-in-time
recovery for the database (`turso db shell talkalways .dump` also works for an ad hoc export), and
on R2's own durability for uploads.

## Updating later

Push to the branch Render is watching; it rebuilds and redeploys automatically. Because the
database and uploads live outside the container, redeploys never touch either.
