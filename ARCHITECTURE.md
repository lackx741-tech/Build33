# ARCHITECTURE.md

Blower Architecture Reconstruction — system architecture as implemented.

## 1. Reconnaissance summary (P0)

The repository shipped with a single artifact: `README.md` (the build
specification) and an empty git history. There was **no pre-existing source
code, no build tooling, and no tests**. Everything below is therefore a
greenfield implementation of the specification, not a modification of
existing modules.

Findings:

| Item | Result |
|---|---|
| Source files found | 0 (README.md only) |
| Existing entry points | none |
| Existing dependencies | none (no package.json / composer.json) |
| Existing contracts / ABIs | none |
| Working modules to preserve | none |
| Runtime available | Node.js 24, npm 11, Python 3 (PHP not installed in image) |

## 2. Service topology

```
                    Browser (ES Modules)
                           |
                 frontend/  (ethers v5 + WalletConnect)
                           |
        +------------------+------------------+
        |                                     |
   PHP API gateway                     Node.js application
   (php/)  /api/*                      (backend/)  /api/*  +  ws://
        |                                     |
   BSC JSON-RPC                        BSC JSON-RPC
   (upstream provider)                 (upstream provider)
        |                                     |
        +------------------+------------------+
                           |
                      BNB Smart Chain
                     (chainId 56 / 97)

                    Node.js application
                           |
                    Telegram admin bot
```

## 3. Component responsibilities

- **frontend/** — wallet connection, network detection, contract reads,
  transaction preparation/submission/monitoring. All signing is user-initiated.
- **php/** — transparent RPC + REST gateway. Validates JSON-RPC payloads,
  restricts upstream destinations, enforces rate limits, never leaks provider
  credentials.
- **backend/** — application REST API, WebSocket event hub, blockchain provider
  and event monitor, cache, PostgreSQL persistence, Telegram admin bot.
- **contracts/** — Solidity contract interfaces (registry, permissions,
  authorization, transaction records) with role-based access control.
- **database/** — PostgreSQL schema migrations.
- **deployment/** — Dockerfile, docker-compose, nginx reverse proxy.

## 4. Cross-service interfaces

| Interface | Producer | Consumer | Transport |
|---|---|---|---|
| REST `/api/*` | php, backend | frontend | HTTP/JSON |
| JSON-RPC proxy | php | frontend | HTTP/JSON |
| Events | backend | frontend | WebSocket |
| Admin ops | backend | operators | Telegram Bot API |
| Chain state | php, backend | BSC | JSON-RPC over HTTPS |

See `API_MAP.md` for the full endpoint contract and `DATAFLOW.md` for request
lifecycles.

## 5. Configuration

All runtime configuration is environment-driven and validated at startup
(`backend/src/config/environment.js`, `php/bootstrap.php`). See
`SECURITY.md` for the secret-handling policy and `.env.example` files for the
schema.
