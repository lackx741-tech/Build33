# FULL BUILD SPECIFICATION
# WEB3 INFRASTRUCTURE — RECONSTRUCTION & IMPLEMENTATION

**Project:** Blower Architecture Reconstruction  
**Specification:** V1 — Complete Engineering Build  
**Architecture:** JavaScript + PHP + Node.js + EVM  
**Primary Network:** BNB Smart Chain (BSC)  
**Status:** Implementation specification

---

# 1. PROJECT OBJECTIVE

Build a complete, modular Web3 application infrastructure using the supplied repository as the architectural reference.

The implementation must contain:

- Web3 frontend and wallet connectivity.
- Smart contract interaction infrastructure.
- PHP API and RPC proxy.
- Node.js application backend.
- Telegram administration bot.
- WebSocket event infrastructure.
- Configuration management.
- Blockchain integration.
- Transaction monitoring.
- Logging, testing and deployment infrastructure.

The result must be a working, interconnected application rather than a collection of disconnected modules.

# 2. TECHNOLOGY STACK

## 2.1 Frontend

| Dependency | Version / Technology |
|---|---|
| JavaScript | ES Modules |
| ethers.js | 5.x |
| Web3.js | 4.x |
| WalletConnect | AppKit / WalletConnect v2 |
| HTML | HTML5 |
| CSS | Modern CSS |
| QRCode | 1.5.x |
| WebSocket | Native WebSocket |

Frontend responsibilities:

- Wallet connection and disconnection.
- Account and network detection.
- Chain switching.
- Contract interaction.
- Token balances.
- Transaction history.
- Transaction status.
- Signature-based authentication.
- Network error handling.
- Responsive interface.
- Wallet connection modal.

All signatures and transactions must be initiated through explicit user actions and display the requested operation before wallet approval.

## 2.2 PHP Backend

**Runtime:** PHP 8.x

Required capabilities:

- cURL HTTP requests.
- Request header processing.
- JSON request/response handling.
- RPC gateway.
- API authentication.
- Request validation.
- Rate limiting.
- Temporary file management.
- Error reporting.

Core files:

```text
php/
├── index.php
├── secureproxy.php
├── bootstrap.php
├── config/
│   ├── app.php
│   └── networks.php
├── middleware/
│   ├── authentication.php
│   ├── rate-limit.php
│   └── validation.php
├── services/
│   ├── RpcService.php
│   ├── ContractService.php
│   └── HttpService.php
└── routes/
    ├── health.php
    ├── rpc.php
    ├── contracts.php
    └── configuration.php
```

The RPC gateway must use configured upstream providers, validate supported JSON-RPC methods, enforce request limits and avoid exposing provider credentials.

## 2.3 Node.js Backend

**Runtime:** Node.js 20+

Dependencies:

```json
{
  "dependencies": {
    "telegraf": "^4.15.0",
    "web3": "^4.2.0",
    "dotenv": "^16.3.1",
    "qrcode": "^1.5.3",
    "ws": "^8.14.0",
    "node-cache": "^5.1.2",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "nodemon": "^3.0.0",
    "eslint": "^8.0.0"
  }
}
```

Node.js responsibilities:

- Application API.
- Telegram bot.
- WebSocket server.
- Blockchain event subscriptions.
- Contract event processing.
- Application configuration.
- Caching.
- Logging.
- Health monitoring.
- Background jobs.

# 3. SYSTEM ARCHITECTURE

```text
                  WEB APPLICATION
                        |
             +----------+----------+
             |                     |
         FRONTEND              WALLET SDK
             |                     |
             +----------+----------+
                        |
                   API GATEWAY
                        |
              +---------+---------+
              |                   |
          PHP SERVICE         NODE.JS SERVICE
              |                   |
          RPC GATEWAY         APPLICATION API
              |                   |
          BSC PROVIDER       WEBSOCKET SERVER
              |                   |
              +---------+---------+
                        |
                   BNB CHAIN
                        |
                 SMART CONTRACTS

                  NODE.JS SERVICE
                        |
                  TELEGRAM BOT
                        |
                 ADMIN OPERATIONS
```

The architecture must have clearly defined interfaces between every service.

# 4. FRONTEND ARCHITECTURE

Directory structure:

```text
frontend/
├── index.html
├── package.json
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── app.config.js
│   │   ├── network.config.js
│   │   └── wallet.config.js
│   ├── wallet/
│   │   ├── provider.js
│   │   ├── connector.js
│   │   ├── account.js
│   │   ├── network.js
│   │   ├── signatures.js
│   │   └── disconnect.js
│   ├── contracts/
│   │   ├── contract-loader.js
│   │   ├── contract-reader.js
│   │   ├── contract-writer.js
│   │   └── abi/
│   ├── transactions/
│   │   ├── prepare.js
│   │   ├── simulate.js
│   │   ├── submit.js
│   │   └── monitor.js
│   ├── api/
│   │   ├── client.js
│   │   └── endpoints.js
│   ├── components/
│   │   ├── wallet-modal.js
│   │   ├── network-selector.js
│   │   ├── account-panel.js
│   │   └── transaction-panel.js
│   └── utils/
│       ├── format.js
│       ├── validation.js
│       └── errors.js
├── styles/
└── assets/
```

### Required functionality

1. Detect injected wallets.
2. Connect through WalletConnect.
3. Display connected address.
4. Detect chain ID.
5. Request supported network changes.
6. Read token balances.
7. Load contract ABIs.
8. Read contract state.
9. Prepare transactions.
10. Display transaction parameters.
11. Request explicit wallet confirmation.
12. Monitor transaction receipts.
13. Handle rejected signatures.
14. Disconnect wallet sessions.

### Wallet session lifecycle

```text
INITIALIZE
    |
DETECT PROVIDERS
    |
DISPLAY CONNECT OPTIONS
    |
USER CONNECTS
    |
READ ACCOUNT
    |
VERIFY NETWORK
    |
INITIALIZE CONTRACT PROVIDERS
    |
APPLICATION READY
    |
MONITOR SESSION
    |
DISCONNECT
```

# 5. BLOCKCHAIN INFRASTRUCTURE

Primary network:

BNB Smart Chain.

Configuration:

```javascript
export const networks = {
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18
    },
    explorer: "https://bscscan.com"
  },
  bscTestnet: {
    chainId: 97,
    name: "BNB Smart Chain Testnet",
    nativeCurrency: {
      name: "tBNB",
      symbol: "tBNB",
      decimals: 18
    },
    explorer: "https://testnet.bscscan.com"
  }
};
```

### Blockchain modules

- Provider initialization.
- Network configuration.
- Contract deployment.
- Contract ABI loading.
- Read-only contract calls.
- Explicitly authorized transactions.
- Event subscriptions.
- Receipt verification.
- Gas estimation.
- Transaction monitoring.

### Contract interfaces

Implement documented interfaces for:

- Configuration registry.
- Application permissions.
- User authorization.
- Transaction records.
- Event emission.
- Administrative configuration.

All contract administrative operations must use role-based authorization.

# 6. PHP RPC AND API INFRASTRUCTURE

The PHP service acts as a transparent HTTP gateway.

Required operations:

```text
GET  /api/health
GET  /api/configuration
POST /api/rpc
POST /api/contracts/read
POST /api/transactions/estimate
GET  /api/networks
```

Requirements:

- Validate JSON-RPC payloads.
- Restrict upstream destinations.
- Validate request methods.
- Apply request timeouts.
- Enforce rate limits.
- Protect credentials.
- Return normalized error responses.
- Record request metadata.
- Never expose internal environment variables.

# 7. NODE.JS APPLICATION INFRASTRUCTURE

Directory structure:

```text
backend/
├── src/
│   ├── index.js
│   ├── app.js
│   ├── config/
│   │   ├── environment.js
│   │   └── networks.js
│   ├── api/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── middleware/
│   ├── blockchain/
│   │   ├── provider.js
│   │   ├── contracts.js
│   │   ├── events.js
│   │   └── monitor.js
│   ├── websocket/
│   │   ├── server.js
│   │   └── handlers.js
│   ├── telegram/
│   │   ├── bot.js
│   │   ├── commands/
│   │   └── notifications.js
│   ├── services/
│   │   ├── configuration.js
│   │   ├── monitoring.js
│   │   └── cache.js
│   ├── database/
│   ├── logging/
│   │   └── logger.js
│   └── utils/
├── tests/
├── package.json
└── .env.example
```

# 8. TELEGRAM OPERATIONS

Implement a Telegraf administration bot.

Commands:

```text
/start
/help
/status
/health
/networks
/contracts
/transactions
/logs
/reload
```

Capabilities:

- Application health notifications.
- Backend availability.
- Blockchain connection status.
- Transaction event notifications.
- Error alerts.
- Administrative configuration.
- Authorized operator access.
- Service restart requests through controlled deployment operations.

Use Telegram user IDs and role-based authorization.

Never expose private keys, seed phrases, access tokens or provider credentials in messages.

# 9. WEBSOCKET INFRASTRUCTURE

Implement a persistent WebSocket service.

Event categories:

```text
application.ready
wallet.connected
wallet.disconnected
network.changed
transaction.submitted
transaction.confirmed
transaction.failed
contract.event
system.health
system.error
```

Requirements:

- Connection authentication.
- Message schema validation.
- Heartbeat monitoring.
- Reconnection handling.
- Subscription authorization.
- Event filtering.
- Structured event payloads.

# 10. CONFIGURATION AND STATE MANAGEMENT

Centralize configuration.

Environment variables:

```dotenv
NODE_ENV=development
PORT=3000

BSC_RPC_URL=
BSC_CHAIN_ID=56

WALLETCONNECT_PROJECT_ID=

PHP_API_URL=

TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_IDS=

LOG_LEVEL=info

CACHE_TTL=300
```

Requirements:

- Separate development, staging and production settings.
- Validate required variables at startup.
- Never commit populated secrets.
- Maintain a documented configuration schema.
- Support configuration validation.
- Provide safe configuration updates.

# 11. DATABASE AND CACHING

Use a persistent database for application records.

Recommended PostgreSQL tables:

```text
users
wallet_sessions
contracts
networks
transactions
application_events
admin_users
configuration
audit_logs
```

Node-cache handles temporary application caching.

Cache:

- Network metadata.
- Public contract metadata.
- Application configuration.
- Frequently requested read-only information.

Persistent transaction records must not depend exclusively on memory caching.

# 12. SECURITY AND RELIABILITY

Implement:

- API authentication.
- Role-based access.
- Input validation.
- Output encoding.
- Rate limiting.
- RPC destination restrictions.
- CORS configuration.
- Secure HTTP headers.
- Secret management.
- Dependency auditing.
- Audit logging.
- Request timeouts.
- Error isolation.
- Database access controls.

Wallet operations must have explicit user approval.

Transaction execution must show the destination, network, value and decoded contract operation where available.

# 13. TESTING INFRASTRUCTURE

Use Jest for automated tests.

Test categories:

**Frontend**
- Wallet initialization.
- Provider detection.
- Account changes.
- Network changes.
- Signature handling.
- Transaction preparation.

**PHP**
- RPC validation.
- API responses.
- Authentication.
- Rate limiting.
- Error handling.

**Node.js**
- API routes.
- Telegram authorization.
- WebSocket authentication.
- Cache operations.
- Blockchain provider initialization.
- Event processing.

**Smart contracts**
- Deployment.
- Access control.
- State transitions.
- Event emission.
- Invalid input handling.
- Administrative permissions.

Integration testing must use BSC testnet before production deployment.

# 14. DEPLOYMENT ARCHITECTURE

Recommended deployment:

```text
SERVER
│
├── nginx/
│
├── frontend/
│
├── php-service/
│
├── node-service/
│
├── database/
│
├── logs/
│
└── deployment/
    ├── Dockerfile
    ├── docker-compose.yml
    └── nginx.conf
```

Requirements:

- Docker-based deployment.
- Nginx reverse proxy.
- HTTPS.
- Persistent database storage.
- Environment configuration.
- Process supervision.
- Health checks.
- Automated backups.
- Log rotation.
- Deployment verification.

# 15. IMPLEMENTATION PHASES

## P0 — Repository reconnaissance

- Inspect all source files.
- Identify real entry points.
- Map dependencies.
- Identify existing working modules.
- Record existing APIs and contracts.
- Establish the current runtime architecture.

Deliverable: `ARCHITECTURE.md`

## P1 — Project foundation

- Establish directory structure.
- Configure dependencies.
- Set up environment validation.
- Configure logging.
- Configure frontend and backend startup.

Deliverable: Working application foundation.

## P2 — Frontend and wallet infrastructure

- Build wallet modal.
- Integrate ethers v5.
- Integrate WalletConnect.
- Implement provider management.
- Implement network detection.
- Implement account management.

Deliverable: Working wallet application.

## P3 — Blockchain infrastructure

- Configure BSC.
- Implement contract interfaces.
- Implement ABI loading.
- Implement contract readers and writers.
- Implement transaction monitoring.
- Implement event subscriptions.

Deliverable: Working blockchain integration.

## P4 — PHP backend

- Implement API routes.
- Implement RPC gateway.
- Implement request validation.
- Implement provider configuration.
- Implement authentication and rate limiting.

Deliverable: Working PHP service.

## P5 — Node.js backend

- Implement application API.
- Implement WebSocket service.
- Implement blockchain event processing.
- Implement cache.
- Implement database integration.

Deliverable: Working Node.js service.

## P6 — Telegram operations

- Implement Telegraf.
- Configure administrator permissions.
- Implement health commands.
- Implement notifications.
- Implement operational controls.

Deliverable: Working Telegram administration bot.

## P7 — Integration

- Connect frontend to backend.
- Connect PHP to RPC providers.
- Connect Node.js to blockchain.
- Connect WebSocket events.
- Connect Telegram notifications.
- Verify end-to-end application behavior.

Deliverable: Integrated application.

## P8 — Testing and release

- Execute automated tests.
- Test failure conditions.
- Verify security controls.
- Test deployment.
- Verify application startup.
- Produce release documentation.

Deliverable: Deployment-ready application.

# 16. REQUIRED PROJECT DOCUMENTATION

Create:

```text
AGENTS.md
ARCHITECTURE.md
BUILD_SPEC.md
COMPONENTS.md
DEPENDENCY_MAP.md
DATAFLOW.md
API_MAP.md
CONTRACT_ANALYSIS.md
RUNTIME_MAP.md
SECURITY.md
TESTING.md
DEPLOYMENT.md
IMPLEMENTATION_STATUS.md
CHANGELOG.md
```

Maintain implementation status throughout development.

# 17. DEFINITION OF DONE

The project is complete when:

1. Frontend starts successfully.
2. Wallet connection works.
3. Network detection works.
4. Contract reads work.
5. Explicitly authorized contract transactions work.
6. PHP API starts and passes tests.
7. Node.js backend starts and passes tests.
8. WebSocket events work.
9. Telegram bot responds to authorized administrators.
10. Database persistence works.
11. Integration tests pass.
12. Deployment succeeds.
13. Health checks pass.
14. Documentation matches the implemented source code.

# 18. FINAL ENGINEERING REQUIREMENT

Build the actual application.

Do not stop after generating architecture documents.

Do not substitute placeholder modules for working implementations.

Do not claim an integration works until it has been tested.

Preserve useful existing functionality where verified. Record incompatible dependencies and resolve them deliberately.

Every implementation phase must produce executable code, tests and an updated implementation status.

**FINAL DELIVERABLE: A COMPLETE, MODULAR, TESTED AND DEPLOYABLE WEB3 APPLICATION INFRASTRUCTURE.**
