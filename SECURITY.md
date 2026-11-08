# SECURITY.md

Security controls implemented across the Blower stack (spec §12).

## Authentication and authorization

| Layer | Control |
|---|---|
| HTTP API (Node + PHP) | `X-API-Key` or `Authorization: Bearer`; constant-time comparison (`hash_equals` in PHP) |
| Development mode | When no key is configured, auth is a no-op and a warning is logged |
| WebSocket | API key via `?apiKey=` query or `X-API-Key` header; unauthenticated sockets closed with code `1008` |
| Telegram | `TelegramAuthorizer` middleware rejects any user not in `TELEGRAM_ADMIN_IDS` before a handler runs |
| Contracts | Role-based access control (`onlyRole`) on every administrative function |
| Contract reads | Only `view`/`pure` methods are proxied by `/api/contracts/read` |

## Input validation

- Every request body is validated before use (`backend/src/api/middleware/validation.js`,
  `php/middleware/validation.php`).
- JSON-RPC methods are checked against an allow-list; batch size is capped at 20.
- Addresses must match `^0x[a-fA-F0-9]{40}$`; tx hashes `^0x[a-fA-F0-9]{64}$`.
- Request body size is capped at 256 kb (Node) and 1 MB (nginx).

## Upstream destination restrictions

- The PHP gateway only proxies to RPC URLs resolved from its own configuration
  keyed by network name. A caller can select `bsc` / `bscTestnet`, never an
  arbitrary URL — this blocks SSRF.
- The Node backend resolves networks from `config/networks.js` only.

## Secret handling

- Secrets live only in `.env` files (never committed); `.env.example` documents
  the schema with empty values.
- `ConfigurationService.publicView()` and `AppConfig::publicView()` redact
  secret keys (`API_KEY`, `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, RPC URLs) before
  any response.
- The Telegram `redact()` helper strips secret-looking values and truncates
  transaction hashes before messages are sent.
- Provider URLs are never logged (they may embed an API key).

## Transport and headers

- nginx terminates TLS 1.2/1.3 and sets HSTS, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- `secureproxy.php` sets the same headers and rejects non-JSON POST bodies
  (`415`) and disallowed methods (`405`) — a CSRF mitigation for form posts.
- Node uses `helmet` and `cors` with an explicit origin allow-list; the
  `X-Powered-By` header is disabled.

## Rate limiting

- Application-level fixed-window limiter (120 req / 60 s per IP, configurable).
- nginx adds a second layer: `api_limit` 10 r/s, `rpc_limit` 20 r/s.
- Rate limiting is per-process; it is a guard rail, not a distributed quota.

## Reliability

- RPC calls have explicit timeouts (15 s).
- The transaction monitor and health poller are bounded and cancellable.
- Graceful shutdown on `SIGINT`/`SIGTERM` closes the WS hub and DB pool.
- Persistent transaction records live in PostgreSQL; the cache is never the
  only copy of a record.

## Reporting

Report security issues to the repository maintainers. Do not open a public
issue for an unfixed vulnerability.
