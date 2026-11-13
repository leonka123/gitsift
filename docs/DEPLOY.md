# Deployment

GitSift needs a persistent disk because SQLite is the database. The simplest production setups are
Docker with a volume, Fly.io with a volume, or a small VPS.

## Before you deploy

1. Build once locally:

   ```bash
   npm ci
   npm run db:reset
   npm run build
   ```

2. Set a long random `CRON_SECRET`:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

3. Decide the public origin and set `NEXT_PUBLIC_SITE_URL` to it. Canonical links, the sitemap, RSS
   and OG images use this value.

4. Add a GitHub token if you want daily refresh. A classic token with `public_repo` scope is enough.

## Docker

```bash
docker build -t gitsift .
docker run -d \
  --name gitsift \
  -p 3000:3000 \
  -v gitsift-data:/app/data \
  -e NEXT_PUBLIC_SITE_URL=https://gitsift.example \
  -e CRON_SECRET=replace-me \
  -e GITHUB_TOKEN=ghp_replace_me \
  gitsift
```

The image contains a seeded database at `/app/seed/gitsift.db`. The entrypoint copies it to
`/app/data/gitsift.db` on first boot if the volume is empty. Later ingests write to the volume, so
the demo data is replaced gradually by live data.

To run an ingest manually:

```bash
curl -X POST http://localhost:3000/api/cron/ingest \
  -H "Authorization: Bearer $CRON_SECRET"
```

Without `GITHUB_TOKEN`, a full ingest makes sixteen search requests plus READMEs and will exhaust the
60/hour unauthenticated limit. Use `?maxQueries=4` for a smoke test.

## Fly.io

The repository includes a `fly.toml` with a volume mount. Change `app` to a name that is free in
your organization.

```bash
fly auth login
fly apps create gitsift            # or change app in fly.toml
fly volumes create gitsift_data --size 3 --region ams
fly secrets set \
  GITHUB_TOKEN=ghp_replace_me \
  CRON_SECRET=replace-me
fly deploy
```

`fly.toml` already sets:

- `DATABASE_PATH=/data/gitsift.db`
- a persistent volume at `/data`
- an HTTP service on port 3000
- one shared CPU / 1 GB RAM machine

After the first deploy:

```bash
fly open
fly logs
```

If the app boots with the bundled seed, the home page should show roughly 1.2k repositories. Run a
small ingest to verify the token and the volume:

```bash
curl -X POST https://your-app.fly.dev/api/cron/ingest?maxQueries=2 \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Scheduling on Fly

Use GitHub Actions (included), Fly Machines cron, or any external scheduler. A daily run is enough;
running every hour mostly burns API quota. The included workflow expects:

- repository secret `CRON_SECRET`
- repository variable `GITSIFT_URL` (for example `https://gitsift.fly.dev`)

## VPS with systemd

```ini
# /etc/systemd/system/gitsift.service
[Unit]
Description=GitSift
After=network.target

[Service]
Type=simple
User=gitsift
WorkingDirectory=/srv/gitsift
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/srv/gitsift/.env
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Build with `npm run build`, copy `.next/standalone`, `.next/static` and the seeded database, then put
Caddy or nginx in front for TLS. A minimal Caddyfile:

```caddy
gitsift.example {
  reverse_proxy 127.0.0.1:3000
}
```

Schedule ingestion with a systemd timer or a cron entry:

```cron
17 6 * * * curl -fsS -X POST https://gitsift.example/api/cron/ingest -H "Authorization: Bearer $CRON_SECRET" >/dev/null
```

## Backups

SQLite in WAL mode consists of the main file plus `-wal` and `-shm` companions. The safe backup is
the online backup command, not a raw copy while the app is writing:

```bash
sqlite3 /data/gitsift.db ".backup '/backups/gitsift-$(date +%F).db'"
```

If `sqlite3` is not available, stop the app, run a WAL checkpoint, and copy the main file. Test a
restore before you need one.

## Security checklist

- [ ] `CRON_SECRET` is set and long.
- [ ] `GITHUB_TOKEN`, `LLM_API_KEY` and `OPENAI_API_KEY` live in secrets, not the image.
- [ ] The app is behind HTTPS.
- [ ] The database volume is not publicly readable.
- [ ] `NEXT_PUBLIC_SITE_URL` uses the real HTTPS origin.
- [ ] Backups run on a schedule and are stored off the host.

## Updating

```bash
git pull
npm ci
npm run build
# restart the app / fly deploy
```

If a migration is added, it runs automatically on the first request. Back up the database before a
major version update.
