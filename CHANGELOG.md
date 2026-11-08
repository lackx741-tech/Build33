# CHANGELOG.md

All notable changes to the Blower architecture reconstruction. This project was
built greenfield from `README.md` (the build specification); there is no prior
release history.

## [1.0.0] — Initial implementation

### Added

**Frontend** (`frontend/`)
- Wallet layer: injected-provider detection (MetaMask, Trust, Coinbase, Brave),
  WalletConnect connector, account/network handling, signatures, disconnect.
- Contract layer: ABI loader, read-only reader, authorized writer.
- Transaction layer: prepare, simulate, submit, monitor.
- API layer: fetch client with timeout, typed endpoints, reconnecting WebSocket.
- Components: wallet modal, network selector, account panel, transaction panel.
- Config for BSC mainnet (56) and testnet (97) with EIP-3085 payloads.

**Backend** (`backend/`)
- Express application with helmet, CORS allow-list and rate limiting.
- Public and API-key-protected routers with controllers for health, networks,
  configuration, RPC, contract reads and transactions.
- Blockchain provider (one Web3 instance per network), contract registry,
  event bus and transaction monitor.
- WebSocket hub with API-key auth, event subscriptions, replay and heartbeat.
- Telegram admin bot with role-based authorization and secret redaction.
- Services: configuration overrides + audit, monitoring, TTL cache.
- PostgreSQL persistence layer and Winston logging.

**PHP gateway** (`php/`)
- Hardened front controller (`secureproxy.php`) and dev controller
  (`index.php`).
- JSON-RPC proxy with method allow-list, batch cap and SSRF-safe network
  resolution.
- Read-only contract calls and gas estimation.
- Constant-time API-key auth, rate limiting, and request validation.
- Configuration endpoint with secret redaction.

**Contracts** (`contracts/`)
- `AccessControl`, `ConfigurationRegistry`, `PermissionRegistry`,
  `UserAuthorization`, `TransactionRegistry` (Solidity 0.8.24).
- Hardhat build/test setup and a deploy script.

**Database** (`database/`)
- Initial schema: 9 tables per spec §11.
- Idempotent reference-data seed (networks, baseline configuration).

**Deployment** (`deployment/`)
- Dockerfiles for the Node, PHP and frontend services.
- `docker-compose.yml` for the full stack.
- nginx configuration: TLS, reverse proxy, WebSocket upgrade, rate limiting.
- Scripts: deploy, verify, backup, log rotation, certificate generation.

**Documentation** (repository root)
- AGENTS.md, ARCHITECTURE.md, BUILD_SPEC.md, COMPONENTS.md,
  DEPENDENCY_MAP.md, DATAFLOW.md, API_MAP.md, CONTRACT_ANALYSIS.md,
  RUNTIME_MAP.md, SECURITY.md, TESTING.md, DEPLOYMENT.md,
  IMPLEMENTATION_STATUS.md, CHANGELOG.md.

### Fixed during implementation
- `backend/src/blockchain/provider.js`: the `web3` instance was declared inside
  a conditional block, causing a `ReferenceError` on return; the declaration was
  moved to the correct scope.
- `contracts/src/TransactionRegistry.sol`: `reference` is a reserved keyword in
  Solidity 0.8.24; the identifier was renamed to `refId` throughout.
- `contracts/package.json`: added the `dotenv` dev dependency required by
  `hardhat.config.js`.
- `contracts/src/ConfigurationRegistry.sol`: bounded `setString` length via
  `MAX_STRING_LENGTH`.
- `backend/src/api/routes/index.js`: async controllers were not wrapped, so a
  rejected promise (e.g. `PATCH /api/configuration` with a secret or unknown
  key) left the request hanging instead of returning an error. Added
  `asyncHandler` middleware and applied it to every async route.
- `frontend/src/contracts/abi/*.json` and `backend/src/blockchain/abis/*.json`:
  regenerated from the compiled contract artifacts so the ABIs match the
  deployed sources.
- `deployment/nginx/nginx.conf`: `location /` served the nginx image's default
  page instead of the frontend container. Added a `frontend_service` upstream
  and proxied `/` to it.
- `backend/src/blockchain/provider.js`: `health()` could hang indefinitely when
  an RPC endpoint accepted the connection but never replied, so
  `/api/health?deep=1` returned a gateway timeout. The probe is now bounded by
  `HEALTH_TIMEOUT_MS` and reports `ok:false` with a timeout error.
- `frontend/src/config/app.config.js`: the API and WebSocket defaults pointed at
  `localhost:3000`, which fails behind the reverse proxy. They now default to
  same-origin (`/api`, and a WebSocket URL derived from `window.location`).
  `frontend/src/api/client.js` likewise routes `phpClient` through `/rpc`.
- `deployment/scripts/verify-deployment.sh`: probed the PHP health at
  `/rpc/health` (the route is `/rpc/api/health`) and now accepts
  `CURL_INSECURE=1` for self-signed certificates.
- `.gitignore`: ignore `contracts/artifacts/` and `contracts/cache/`.

### Tests
- Backend: 49 tests (Jest).
- Frontend: 29 tests (Jest + jsdom).
- PHP: 23 tests / 38 assertions (PHPUnit, run via Docker).
- Contracts: 14 tests (Hardhat).
