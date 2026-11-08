# AGENTS.md

Repository knowledge for automated agents working on this codebase.

## Layout

```
frontend/    ES-module web app (ethers v5, WalletConnect, Web3.js)
backend/     Node.js 20+ service: REST API, WebSocket hub, Telegram bot
php/         PHP 8 gateway: RPC proxy + REST API
contracts/   Solidity sources for registry / permissions / records
database/    PostgreSQL migrations + seeds
deployment/  Dockerfiles, docker-compose.yml, nginx, operational scripts
*.md         Required project documentation (spec §16), at the repo root
```

## Commands

```bash
# Node backend
cd backend && npm install
npm run dev          # nodemon
npm start            # production
npm test             # jest (49 tests)
npm run lint         # eslint

# Frontend
cd frontend && npm install
npm run dev          # vite dev server on :5173
npm test             # jest + jsdom (29 tests)
npm run build        # production bundle

# PHP (PHP is NOT installed in the sandbox image; use Docker)
docker run --rm -v "$PWD":/app -w /app php:8.2-cli \
  sh -c 'find . -name "*.php" -not -path "./vendor/*" -exec php -l {} \;'
docker run --rm -v "$PWD":/app -w /app composer:2 \
  sh -c "composer install -q && php vendor/bin/phpunit"   # 23 tests

# Contracts
cd contracts && npm install && npx hardhat compile && npx hardhat test

# Full stack
sh deployment/scripts/deploy.sh
```

## Conventions

- **ES Modules** everywhere (`"type": "module"` in every package.json).
- No secrets in source. Only `.env.example` is committed.
- Logging goes through the shared `logger` (winston) — never `console.log`
  in backend service code.
- Every network call that can fail has an explicit timeout and a normalized
  error response.
- Contract writes require explicit user authorization; never auto-sign.
- Keep the php and backend error envelopes identical (see `API_MAP.md`).
- Contract ABIs are synced manually: copy the `abi` array from
  `contracts/artifacts/contracts/src/<Name>.sol/<Name>.json` into
  `frontend/src/contracts/abi/` and `backend/src/blockchain/abis/`.

## Testing

- Backend and frontend use Jest; PHP uses PHPUnit; contracts use Hardhat.
- Tests must exercise real code paths; mock only external I/O boundaries
  (`backend/tests/helpers/fakes.js` is the shared fake set).
- Integration tests target BSC testnet (chainId 97).

## Gotchas

- `ethers` is pinned to **v5** on the frontend (`ethers.providers.*` API);
  the backend uses `web3` v4. Do not mix the two provider styles.
- The PHP gateway and the Node API intentionally expose the *same* route
  shapes so the frontend can be pointed at either one via `PHP_API_URL`.
- Behind nginx, `/rpc/` is stripped before proxying, so the PHP gateway's own
  `/api/*` routes are reached externally as `/rpc/api/*` (e.g.
  `/rpc/api/health`). The frontend therefore defaults to same-origin URLs
  (`/api` and `/rpc`); `VITE_API_URL`/`VITE_PHP_API_URL` are only set for
  local `vite dev`.
- Async Express controllers must be wrapped with `asyncHandler`
  (`backend/src/api/middleware/async-handler.js`); Express 4 does not await
  handlers, so an unhandled rejection hangs the request.
- Rate limiting is in-process (per service). It is a guard rail, not a
  distributed quota.
- `reference` is a **reserved keyword** in Solidity 0.8.24 — `TransactionRegistry`
  uses `refId` instead.
- PHP cannot be installed in the sandbox image (no root/apt); always verify PHP
  changes through the Docker images (`php:8.2-cli`, `composer:2`).
