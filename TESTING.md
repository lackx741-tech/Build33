# TESTING.md

Test strategy, suites and how to run them (spec §13).

## Philosophy

- Tests exercise **real code paths**. Mocks are limited to external I/O
  boundaries (HTTP RPC, PostgreSQL, Telegram API) and are collected in a single
  fakes module per service.
- Every suite is runnable offline; nothing in CI depends on a live BSC node.
- Contract tests run against an in-process Hardhat EVM.

## Suites

### Backend (Jest, 49 tests / 5 suites)

| Suite | File | Coverage |
|---|---|---|
| API routes | `tests/api/routes.test.js` | public/protected routes, auth, envelopes, error mapping |
| WebSocket | `tests/websocket/server.test.js` | auth handshake, subscriptions, heartbeat, message-size cap |
| Telegram | `tests/telegram/auth.test.js` | authorization, rejection of non-admins |
| Services | `tests/services/services.test.js` | cache, configuration redaction/overrides, monitoring |
| Environment | `tests/config/environment.test.js` | schema defaults, coercion, enum + integer validation |

Shared fakes: `tests/helpers/fakes.js` (in-memory DB, cache, provider, bus).

Run:
```bash
cd backend
npm test                 # jest with --experimental-vm-modules
```

### Frontend (Jest + jsdom, 29 tests / 3 suites)

| Suite | File | Coverage |
|---|---|---|
| Wallet | `tests/wallet.test.js` | provider detection, account handling, network switch/add |
| Transactions | `tests/transactions.test.js` | prepare, simulate, submit, monitor, rejection mapping |
| Utils | `tests/utils.test.js` | formatting, validation, error helpers |

Run:
```bash
cd frontend
npm test
```

### PHP (PHPUnit, 23 tests / 38 assertions)

| Suite | File | Coverage |
|---|---|---|
| Configuration | `tests/ConfigurationTest.php` | config build, redaction |
| Middleware | `tests/MiddlewareTest.php` | authentication, rate limiting |
| RPC validation | `tests/RpcValidationTest.php` | JSON-RPC payload + method allow-list |

Run (PHP is not installed in the sandbox image; use Docker):
```bash
docker run --rm -v "$PWD":/app -w /app composer:2 \
  sh -c "composer install -q && php vendor/bin/phpunit"
```
Syntax-only check of every file:
```bash
docker run --rm -v "$PWD":/app -w /app php:8.2-cli \
  sh -c 'find . -name "*.php" -not -path "./vendor/*" -exec php -l {} \;'
```

### Contracts (Hardhat + Mocha/Chai, 14 tests)

| Suite | Coverage |
|---|---|
| `test/ConfigurationRegistry.test.js` | role grants, typed values, unauthorized writes, events, type-mismatch reads |
| `test/Registry.test.js` | UserAuthorization (self-auth, expiry, deauth) and TransactionRegistry (record, duplicate, status finality) |

Run:
```bash
cd contracts
npx hardhat compile
npx hardhat test
```

### Database

Migrations are verified by running them against a real PostgreSQL container:
```bash
docker run --rm -d --name blower-pg \
  -e POSTGRES_USER=blower -e POSTGRES_PASSWORD=blower -e POSTGRES_DB=blower \
  -v "$PWD/database/migrations":/docker-entrypoint-initdb.d:ro \
  postgres:16-alpine
docker exec blower-pg psql -U blower -d blower -c '\dt'
```
Expected: 9 tables and 2 seeded networks.

## Current results

| Suite | Result |
|---|---|
| Backend | 49 passed |
| Frontend | 29 passed |
| PHP | 23 passed (38 assertions) |
| Contracts | 14 passed |

## Failure-condition testing

- Invalid API key → `401`.
- Unauthorized Telegram user → rejected before handler.
- Disallowed JSON-RPC method → `400`.
- Non-JSON POST to the hardened PHP entry → `415`.
- Unsupported method → `405`.
- Contract write from an unauthorized account → revert.
- Contract type-mismatch read → revert.
