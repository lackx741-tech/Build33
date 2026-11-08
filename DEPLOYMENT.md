# DEPLOYMENT.md

How to build, deploy and verify the Blower stack (spec §14).

## Prerequisites

- Docker Engine 24+ with the Compose plugin (`docker compose`).
- A TLS certificate (self-signed is fine for staging; see below).
- Outbound HTTPS to the BSC RPC endpoint(s).
- Optional: a Telegram bot token and a WalletConnect project id.

## Configuration

Copy the example env files and fill in real values:

```bash
cp backend/.env.example backend/.env
cp php/.env.example php/.env
```

Never commit populated `.env` files. The compose file also reads shell
environment variables for `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
`HTTP_PORT` and `HTTPS_PORT` with safe defaults.

## TLS certificates

```bash
sh deployment/scripts/generate-certs.sh          # self-signed, localhost
TLS_HOSTNAME=app.example.com FORCE=1 sh deployment/scripts/generate-certs.sh
```

For production, replace `deployment/nginx/certs/{fullchain,privkey}.pem` with
CA-issued certificates (e.g. from Let's Encrypt) and reload nginx.

## Deploy

```bash
sh deployment/scripts/deploy.sh
```

The script builds images, starts the stack, waits for `/api/health`, applies
migrations, and runs the verification script. To skip a rebuild:

```bash
sh deployment/scripts/deploy.sh --no-build
```

Or drive compose directly:

```bash
docker compose -f deployment/docker-compose.yml up -d --build
docker compose -f deployment/docker-compose.yml ps
```

## Services and ports

| Service | Internal | Published |
|---|---|---|
| nginx | 80, 443 | `${HTTP_PORT:-80}`, `${HTTPS_PORT:-443}` |
| node-service | 3000 | internal |
| php-service | 8080 | internal |
| frontend | 80 | internal |
| postgres | 5432 | internal |

Routing (see `RUNTIME_MAP.md`): `/` → frontend, `/api/` → Node,
`/rpc/` → PHP, `/ws` → Node WebSocket.

## Database migrations

Migrations in `database/migrations/` are mounted at
`/docker-entrypoint-initdb.d` and run automatically on the **first** boot of an
empty PostgreSQL data volume. To re-apply manually:

```bash
docker compose -f deployment/docker-compose.yml exec -T postgres \
  sh -c 'for f in /docker-entrypoint-initdb.d/*.sql; do psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"; done'
```

All migration statements are idempotent (`IF NOT EXISTS` / `ON CONFLICT`), so
re-running is safe.

## Verification

```bash
sh deployment/scripts/verify-deployment.sh
```

Checks the frontend, Node `/api/health` and `/api/networks`, the PHP
`/api/health`, and TLS certificate validity. Override targets with `BASE_URL`,
`API_URL`, `RPC_URL`, `FRONTEND_URL`. The default nginx config uses a
self-signed certificate, so set `CURL_INSECURE=1` to skip strict TLS
verification (the `deploy.sh` script does this automatically).

## Backups and log rotation

```bash
sh deployment/scripts/backup.sh /var/backups/blower     # pg_dump + gzip + prune
```

Schedule it daily via cron. Install `deployment/scripts/logrotate.conf` at
`/etc/logrotate.d/blower` to rotate nginx and application logs (14-day
retention, compressed).

## Rolling updates

```bash
docker compose -f deployment/docker-compose.yml build node-service php-service
docker compose -f deployment/docker-compose.yml up -d --no-deps node-service
sh deployment/scripts/verify-deployment.sh
```

## Rollback

```bash
docker compose -f deployment/docker-compose.yml down
git checkout <previous-tag>
sh deployment/scripts/deploy.sh
```

Database migrations are additive and idempotent; take a backup before deploying
a release that changes the schema.

## Health and monitoring

- `GET /healthz` — nginx liveness.
- `GET /api/health` — Node dependency snapshot (`200` healthy, `503` degraded).
- `GET /rpc/api/health` — PHP gateway per-network reachability.
- Container health checks are defined in each Dockerfile and in compose.
- The backend publishes a `system.health` WebSocket event every 60 s.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| nginx 502 on `/api/` | node-service not ready | check `docker compose logs node-service`; confirm `/api/health` |
| `/api/health` returns 503 | database or RPC unreachable | verify `DATABASE_URL` and `BSC_RPC_URL` |
| WebSocket closes with 1008 | missing/invalid API key | pass `?apiKey=` or set `API_KEY=` empty in dev |
| Migrations didn't run | non-empty data volume | run them manually (see above) |
| TLS warning in browser | self-signed certificate | use a CA-issued certificate for production |
