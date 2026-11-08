# DEPENDENCY_MAP.md

Runtime and development dependencies, and the cross-service relationships
between modules.

## Internal dependency graph

```
frontend/  ──HTTP──►  php/ (RPC + REST gateway)  ──JSON-RPC──►  BSC
    │                                                 ▲
    │                                                 │
    └──HTTP/WS──►  backend/ (API + WS hub + bot) ─────┘
                        │
                        ├──► PostgreSQL (pg)
                        ├──► BSC (web3)
                        └──► Telegram Bot API (telegraf)

contracts/  ──deploy──►  BSC  ──ABI──►  frontend/, backend/
```

## Module-level dependencies

### backend
- `index.js` → `app.js`, `websocket/server.js`, `telegram/bot.js`,
  `blockchain/*`, `services/*`, `database/index.js`
- `app.js` → `api/routes/index.js`, `api/middleware/*`
- `api/controllers/*` → `api/middleware/validation.js`, `utils/errors.js`,
  `services/cache.js`
- `websocket/server.js` → `blockchain/events.js`
- `telegram/*` → `services/monitoring.js`, `blockchain/*`, `services/configuration.js`

### php
- `index.php` → `bootstrap.php` → `lib/*`, `config/*`, `middleware/*`,
  `services/*`
- `routes/*.php` → `middleware/validation.php`, `services/*`

### frontend
- `app.js` → `wallet/*`, `contracts/*`, `transactions/*`, `api/*`,
  `components/*`
- `contracts/*` → `contracts/abi/*.json`
- `transactions/*` → `wallet/*`, `contracts/*`

## Runtime dependencies

| Service | Package | Version | Purpose |
|---|---|---|---|
| backend | express | ^4.19 | HTTP framework |
| backend | helmet | ^7.1 | Secure headers |
| backend | cors | ^2.8 | CORS |
| backend | web3 | ^4.2 | BSC JSON-RPC client |
| backend | ws | ^8.14 | WebSocket server |
| backend | telegraf | ^4.15 | Telegram bot |
| backend | pg | ^8.11 | PostgreSQL |
| backend | node-cache | ^5.1 | TTL cache |
| backend | winston | ^3.11 | Logging |
| backend | dotenv | ^16.3 | Env loading |
| frontend | ethers | ^5.7 | Wallet + contract interaction |
| frontend | @walletconnect/ethereum-provider | ^2.11 | WalletConnect |
| frontend | web3 | ^4.2 | Fallback RPC client |
| frontend | qrcode | ^1.5 | WalletConnect QR |
| contracts | hardhat | ^2.22 | Build/test framework |
| contracts | @nomicfoundation/hardhat-toolbox | ^5.0 | Tooling bundle |
| contracts | dotenv | ^16.3 | Deploy key loading |
| php | (none) | — | Stdlib only; no Composer runtime deps |

## Development dependencies

| Service | Package | Purpose |
|---|---|---|
| backend | jest | Test runner |
| backend | supertest | HTTP assertions |
| backend | eslint | Linting |
| backend | nodemon | Dev reload |
| frontend | jest, jest-environment-jsdom | Test runner |
| frontend | vite | Dev server + build |

## External services

| Service | Endpoint | Required |
|---|---|---|
| BSC mainnet RPC | `BSC_RPC_URL` (default public dataseed) | yes |
| BSC testnet RPC | `BSC_TESTNET_RPC_URL` | no |
| PostgreSQL | `DATABASE_URL` | yes (persistence) |
| Telegram Bot API | `TELEGRAM_BOT_TOKEN` | no |
| WalletConnect relay | `WALLETCONNECT_PROJECT_ID` | no |
