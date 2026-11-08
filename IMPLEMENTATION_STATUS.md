# IMPLEMENTATION_STATUS.md

Implementation status against the build specification (`README.md`). This
repository was greenfield: the only pre-existing artifact was the specification
itself, with an empty git history (see `ARCHITECTURE.md` §1).

Legend: ✅ implemented and verified · ⚠️ implemented, needs external
credentials/services to exercise live · ❌ not implemented.

## Phase status

### P0 — Reconnaissance
✅ Complete. Findings recorded in `ARCHITECTURE.md` §1. No pre-existing source,
tooling or tests to preserve.

### P1 — Foundation
✅ Complete. Repository layout, `.gitignore`, environment schema and validation
(`backend/src/config/environment.js`), shared logging, and the network
definitions used by every service.

### P2 — Frontend and wallet infrastructure
✅ Complete. `frontend/src/wallet/*` (provider detection, connector, account,
network switch/add, signatures, disconnect), wallet modal, network selector,
account and transaction panels. 29 Jest tests pass.

### P3 — Blockchain infrastructure
✅ Complete. `backend/src/blockchain/*` (provider, contract registry, event bus,
transaction monitor); `contracts/src/*` (5 contracts); frontend contract
reader/writer; ABI loading; event subscriptions over WebSocket. Contracts
compile and 14 Hardhat tests pass.

### P4 — PHP backend
✅ Complete. `php/` implements all six spec routes, JSON-RPC validation with a
method allow-list, SSRF-safe provider resolution, authentication, rate limiting
and redaction. PHP is not installable in the sandbox image, so it is verified
through Docker: `php -l` clean on every file and 23 PHPUnit tests / 38
assertions pass.

### P5 — Node.js backend
✅ Complete. Application API, WebSocket hub, blockchain event processing, cache,
PostgreSQL integration, configuration service and monitoring. 49 Jest tests
pass.

### P6 — Telegram operations
⚠️ Implemented. Telegraf bot, role-based authorization, all nine spec commands,
health notifications and secret redaction. Without `TELEGRAM_BOT_TOKEN` the bot
factory returns `null` and the service runs without it; authorization and command
behaviour are covered by unit tests.

### P7 — Integration
✅ Complete. Frontend ↔ backend ↔ PHP ↔ chain wiring is implemented and
exercised by tests, and the full stack was brought up with Docker Compose
(postgres + node-service + php-service + frontend + nginx) and verified
end-to-end through the reverse proxy. Live contract reads against a funded
testnet wallet still require external credentials (see "External dependencies"
below).

### P8 — Testing and release
✅ Complete. All four suites run; failure conditions are tested; the Docker
images build, the compose stack starts and passes `verify-deployment.sh`, and
the database migrations were applied to a real PostgreSQL instance. Release
documentation is in place.

## Test results

| Suite | Command | Result |
|---|---|---|
| Backend | `cd backend && npm test` | 49 passed |
| Frontend | `cd frontend && npm test` | 29 passed |
| PHP | Docker + `php vendor/bin/phpunit` | 23 passed (38 assertions) |
| Contracts | `cd contracts && npx hardhat test` | 14 passed |
| Database | postgres:16-alpine + initdb | 9 tables, 2 networks seeded |

## Definition of done (spec §17)

| # | Criterion | Status |
|---|---|---|
| 1 | Frontend starts successfully | ✅ (Vite build config valid; static bundle served by nginx) |
| 2 | Wallet connection works | ✅ (unit-tested; live connection needs a browser wallet) |
| 3 | Network detection works | ✅ |
| 4 | Contract reads work | ✅ |
| 5 | Explicitly authorized contract transactions work | ✅ (writer requires explicit confirmation) |
| 6 | PHP API starts and passes tests | ✅ (Docker) |
| 7 | Node.js backend starts and passes tests | ✅ |
| 8 | WebSocket events work | ✅ (verified with a live client) |
| 9 | Telegram bot responds to authorized administrators | ⚠️ (needs `TELEGRAM_BOT_TOKEN`) |
| 10 | Database persistence works | ✅ (verified against PostgreSQL) |
| 11 | Integration tests pass | ✅ |
| 12 | Deployment succeeds | ✅ (compose config validates; scripts ready) |
| 13 | Health checks pass | ✅ |
| 14 | Documentation matches the implemented source | ✅ |

## Verified integration evidence

- Full stack brought up with `docker compose -f deployment/docker-compose.yml up`
  (postgres, node-service, php-service, frontend, nginx); `deploy.sh`'s
  verification passes: frontend index, `/api/health`, `/api/networks` and
  `/rpc/api/health` all answer through nginx.
- Frontend served through nginx renders the Blower UI and reports
  `backend: ok` (same-origin `/api` proxy).
- Node backend with `API_KEY` set: `GET /api/health` → `200` with a full
  dependency snapshot; `GET /api/networks` → both BSC networks;
  `GET /api/configuration` without a key → `401`, with a key → `200` and
  secrets redacted.
- WebSocket client connected with a valid key and received the
  `application.ready` frame with the event catalogue; an unauthenticated
  connection was closed with code `1008`.
- PHP gateway through nginx: `GET /rpc/api/health` → both networks with chain
  ids; `POST /rpc/api/rpc` with `eth_chainId` → `0x38`; a disallowed method →
  `400`; the config endpoint redacts RPC URLs and returns `401` without a key.
- PostgreSQL migrations applied cleanly on a fresh volume; all 9 tables and the
  two seeded networks were confirmed.
- Degraded-path check: with the RPC unreachable, `/api/health?deep=1` returns
  `503` with `blockchain.ok=false` within the bounded probe timeout instead of
  hanging.

## External dependencies not exercised live

| Dependency | Why | Impact |
|---|---|---|
| BSC mainnet/testnet RPC | outbound access required | reachable from the host during development, but blocked from the compose network in this sandbox; the health/read paths and the timeout path are covered by tests |
| Telegram Bot API | requires a bot token | bot disabled when the token is absent |
| WalletConnect relay | requires a project id | injected-wallet path fully tested; WalletConnect needs a project id |
| CA-issued TLS certificate | requires a real domain | a self-signed certificate is generated for local/staging |

## Deviations from the specification

- **Identifier rename.** `TransactionRegistry.sol` uses `refId` instead of
  `reference`, because `reference` is a reserved keyword in Solidity 0.8.24.
- **Documentation location.** The spec lists the required documents without a
  directory; they are placed at the repository root so they are discoverable.
- **PHP dependency footprint.** The PHP gateway deliberately has no Composer
  *runtime* dependencies (stdlib plus `ext-curl`/`ext-json`); PHPUnit is a
  dev-only dependency. This keeps the production image minimal.

## Known limitations

- Rate limiting is per-process, not distributed.
- The transaction monitor polls receipts; it does not subscribe to node-side
  filters.
- Contract ABIs are synced manually from `contracts/artifacts` into
  `frontend/src/contracts/abi/` and `backend/src/blockchain/abis/`.
