# COMPONENTS.md

Component inventory for the Blower architecture reconstruction. Every module
listed here exists in the repository and is exercised by tests.

## frontend/ (ES modules, ethers v5)

| Path | Responsibility |
|---|---|
| `src/app.js` | Application bootstrap: wires wallet, contracts, UI |
| `src/main.js` | DOM entry point |
| `src/config/app.config.js` | Runtime URLs, timeouts, API key |
| `src/config/network.config.js` | BSC networks + EIP-3085 payloads |
| `src/config/wallet.config.js` | Wallet options, injected-provider flags |
| `src/wallet/provider.js` | Injected provider detection (MetaMask, Trust, Coinbase, Brave) |
| `src/wallet/connector.js` | Connection orchestration (injected + WalletConnect) |
| `src/wallet/account.js` | Account read, normalize, change subscription |
| `src/wallet/network.js` | Chain detection, `wallet_switchEthereumChain`, `wallet_addEthereumChain` |
| `src/wallet/signatures.js` | Message signing / signature verification |
| `src/wallet/disconnect.js` | Session teardown |
| `src/contracts/contract-loader.js` | ABI loading |
| `src/contracts/contract-reader.js` | Read-only calls |
| `src/contracts/contract-writer.js` | Authorized writes (explicit user confirmation) |
| `src/contracts/abi/` | Compiled ABIs (synced from contracts/artifacts) |
| `src/transactions/prepare.js` | Build + validate a transfer |
| `src/transactions/simulate.js` | Gas estimate / revert detection |
| `src/transactions/submit.js` | Submit via signer |
| `src/transactions/monitor.js` | Receipt polling |
| `src/api/client.js` | Fetch wrapper with timeout + error mapping |
| `src/api/endpoints.js` | Typed endpoint helpers |
| `src/api/websocket.js` | WebSocket client with reconnection |
| `src/components/*.js` | Wallet modal, network selector, account panel, tx panel |
| `src/utils/*.js` | format / validation / error helpers |

## backend/ (Node.js 20+, ESM)

| Path | Responsibility |
|---|---|
| `src/index.js` | Composition root: HTTP server, WS hub, Telegram, signals |
| `src/app.js` | Express app assembly (helmet, cors, rate limit, routers) |
| `src/config/environment.js` | Declarative env schema + validation |
| `src/config/networks.js` | Canonical network definitions |
| `src/api/routes/index.js` | Public + protected routers |
| `src/api/controllers/*.js` | health, networks, configuration, rpc, contracts, transactions |
| `src/api/middleware/*.js` | authentication, rate-limit, validation, error |
| `src/blockchain/provider.js` | Web3 instance per network, health probe |
| `src/blockchain/contracts.js` | ABI registry, deployment verification |
| `src/blockchain/events.js` | Event bus with replay history |
| `src/blockchain/monitor.js` | Transaction receipt monitor |
| `src/websocket/server.js` | WS hub: auth, subscriptions, heartbeat |
| `src/websocket/handlers.js` | Frame parsing + validation |
| `src/telegram/bot.js` | Telegraf bot factory |
| `src/telegram/auth.js` | Role-based Telegram authorization |
| `src/telegram/commands/index.js` | Admin commands + redaction |
| `src/telegram/notifications.js` | Event → admin notifications |
| `src/services/configuration.js` | Runtime config overrides + audit |
| `src/services/monitoring.js` | Health snapshots |
| `src/services/cache.js` | TTL cache (node-cache) |
| `src/database/index.js` | PostgreSQL pool + transactions |
| `src/logging/logger.js` | Winston logger |
| `src/utils/errors.js` | Typed errors + envelopes |

## php/ (PHP 8.2+)

| Path | Responsibility |
|---|---|
| `bootstrap.php` | Class loading, env, logger, config |
| `index.php` | Development front controller |
| `secureproxy.php` | Hardened entry point (method/content-type checks, security headers) |
| `lib/env.php` | `.env` loader |
| `lib/logger.php` | Structured logger |
| `lib/http-exception.php` | Typed HTTP exception |
| `lib/response.php` | JSON response helper |
| `lib/request.php` | Request accessors |
| `lib/router.php` | Router with auth + rate limit hooks |
| `config/app.php` | Immutable config with `publicView()` redaction |
| `config/networks.php` | Network metadata |
| `middleware/authentication.php` | Constant-time API-key check |
| `middleware/rate-limit.php` | Fixed-window limiter |
| `middleware/validation.php` | JSON-RPC / contract / estimate validation |
| `services/HttpService.php` | cURL wrapper with timeout |
| `services/RpcService.php` | Upstream RPC forwarding, network resolution, gas estimate |
| `services/ContractService.php` | Read-only contract calls |
| `routes/*.php` | health, rpc, contracts, configuration |

## contracts/ (Solidity 0.8.24)

| Contract | Responsibility |
|---|---|
| `AccessControl.sol` | Role-based access control base |
| `ConfigurationRegistry.sol` | Typed key/value configuration with admin roles |
| `PermissionRegistry.sol` | Application permission grants |
| `UserAuthorization.sol` | Per-account authorization with expiry |
| `TransactionRegistry.sol` | Transaction metadata records + events |

## database/ and deployment/

| Path | Responsibility |
|---|---|
| `database/migrations/001_initial_schema.sql` | 9 tables per spec §11 |
| `database/migrations/002_seed_reference_data.sql` | Networks + baseline config |
| `deployment/Dockerfile` | Node.js image |
| `deployment/Dockerfile.php` | PHP image |
| `deployment/Dockerfile.frontend` | Frontend build + nginx |
| `deployment/docker-compose.yml` | Full stack orchestration |
| `deployment/nginx/nginx.conf` | TLS, reverse proxy, WS, rate limits |
| `deployment/scripts/*.sh` | backup, deploy, verify, cert generation |
