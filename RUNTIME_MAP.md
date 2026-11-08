# RUNTIME_MAP.md

How the application runs: processes, ports, startup order, and health checks.

## Ports

| Service | Port | Protocol | Exposure |
|---|---|---|---|
| nginx | 80, 443 | HTTP/HTTPS | public |
| frontend (static) | 80 | HTTP | internal (behind nginx) |
| backend (Node.js) | 3000 | HTTP + WebSocket | internal (behind nginx) |
| php gateway | 8080 | HTTP | internal (behind nginx) |
| postgres | 5432 | TCP | internal only |

## nginx routing

| Path | Upstream |
|---|---|
| `/` | `frontend:80` |
| `/api/` | `node-service:3000` |
| `/rpc/` | `php-service:8080` |
| `/ws` | `node-service:3000` (Upgrade / Connection headers) |
| `/healthz` | nginx itself (200 OK) |

The `/rpc/` prefix is stripped before proxying, so the PHP gateway's own
`/api/*` routes are reached externally as `/rpc/api/*` (for example
`/rpc/api/health`).

## Startup order (docker compose)

```
postgres (healthcheck: pg_isready)
    └── node-service (waits for postgres healthy; runs migrations via
        /docker-entrypoint-initdb.d on first boot)
            └── php-service
                    └── frontend
                            └── nginx (waits for frontend, node, php)
```

## Process lifecycle

### Node.js backend (`backend/src/index.js`)

1. `loadConfig({exitOnError:true})` — validates env, exits 1 on failure.
2. Construct services: cache, database pool, blockchain provider, contract
   registry, transaction monitor, configuration service, monitoring service.
3. `configService.init()` — loads configuration overrides from PostgreSQL.
4. Build Express app + `http.Server`.
5. Attach `WebSocketHub` to the server.
6. Create Telegram bot (null when no token).
7. Start a 60 s health poller (`monitoring.publishHealth`).
8. `server.listen(PORT)` → publishes `application.ready`.
9. `bot.launch()` (if configured).
10. `SIGINT`/`SIGTERM` → stop bot, stop monitor, close WS hub, close server,
    close DB pool, exit 0.

### PHP gateway

Stateless per-request under `php -S` (dev) or php-fpm (production).
`bootstrap.php` loads `.env`, configures the logger, and builds `AppConfig`.
`index.php` (dev) or `secureproxy.php` (hardened) dispatches the router.

### Frontend

Static build served by nginx. `src/main.js` boots `src/app.js`, which
initializes the wallet, contract providers and the WebSocket client.

## Health checks

| Service | Check | Interval |
|---|---|---|
| postgres | `pg_isready -U blower -d blower` | 10 s |
| node-service | `GET /api/health` | 60 s (internal poller) |
| nginx | `GET /healthz` | 30 s |
| php-service | `GET /api/health` | on demand |

## Resource defaults

| Setting | Value |
|---|---|
| Node JSON body limit | 256 kb |
| WebSocket max message | 16 kb |
| WebSocket heartbeat | 30 s |
| Cache TTL | 300 s (configurable) |
| RPC request timeout | 15 s |
| Rate limit | 120 requests / 60 s per IP |
