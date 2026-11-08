# API_MAP.md

Complete endpoint contract for the Blower services. The PHP gateway and the
Node.js API deliberately expose the *same* route shapes, so the frontend can be
pointed at either via `VITE_API_URL` / `VITE_PHP_API_URL`.

Envelope convention: success responses are `{ "ok": true, ... }`; failures are
`{ "ok": false, "error": { "code": string, "message": string } }`.
Exception: the JSON-RPC proxy returns the upstream JSON-RPC object verbatim.

## Public endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | none | Service banner (Node only) |
| GET | `/api/health` | none | Liveness + dependency snapshot |
| GET | `/api/networks` | none | Supported networks + default chain id |

`GET /api/health` returns HTTP `200` when healthy and `503` when a critical
dependency is down (Node). The PHP health route always returns `200` and reports
per-network chain id reachability.

## Protected endpoints

All routes below require `X-API-Key: <key>` (or `Authorization: Bearer <key>`).
When no key is configured the middleware is a no-op and logs a warning — this is
development-only behaviour.

| Method | Path | Description |
|---|---|---|
| GET | `/api/configuration` | Redacted runtime configuration |
| PATCH | `/api/configuration` | Set a non-secret override `{key, value}` |
| POST | `/api/rpc` | JSON-RPC proxy (single object or batch, max 20) |
| POST | `/api/contracts/read` | Read-only contract call |
| POST | `/api/transactions/estimate` | Gas estimate for a candidate tx |
| POST | `/api/transactions/watch` | Register a tx hash for monitoring (Node) |
| GET | `/api/transactions/:hash` | Receipt status for a tx hash (Node) |

### POST /api/rpc

Request (single):
```json
{ "jsonrpc": "2.0", "id": 1, "method": "eth_chainId", "params": [] }
```
Allowed methods: `eth_blockNumber`, `eth_chainId`, `eth_call`,
`eth_estimateGas`, `eth_gasPrice`, `eth_getBalance`, `eth_getBlockByNumber`,
`eth_getCode`, `eth_getLogs`, `eth_getTransactionByHash`,
`eth_getTransactionCount`, `eth_getTransactionReceipt`,
`eth_maxPriorityFeePerGas`, `eth_sendRawTransaction`, `net_version`,
`web3_clientVersion`.

Network selection: `X-Network: bsc|bscTestnet` header or `?network=` query.
Response: the upstream JSON-RPC result, unchanged.

### POST /api/contracts/read

```json
{
  "address": "0x…",
  "abi": [ { "type": "function", "name": "totalSupply", "stateMutability": "view", … } ],
  "method": "totalSupply",
  "params": [],
  "chainId": 56
}
```
Only `view` / `pure` methods are accepted; state-changing methods are rejected
with `400 bad_request`.

### POST /api/transactions/estimate

```json
{ "from": "0x…", "to": "0x…", "value": "1000", "data": "0x", "network": "bsc" }
```
Response: `{ ok, data: { gasLimit, gasPriceWei, estimatedCostWei, network } }`.
Never signs or sends.

### POST /api/transactions/watch

```json
{ "txHash": "0x…64 hex…", "network": "bsc" }
```
Returns `202` and emits `transaction.submitted`; the monitor then publishes
`transaction.confirmed` / `transaction.failed`.

## WebSocket

`ws://<host>/ws` — authentication via `?apiKey=<key>` query string or
`X-API-Key` header. Event catalogue (spec §9):

```
application.ready      wallet.connected       wallet.disconnected
network.changed        transaction.submitted  transaction.confirmed
transaction.failed     contract.event         system.health
system.error
```

Client frames: `{"type":"subscribe","events":[…]}`,
`{"type":"ping"}`, `{"type":"replay","limit":20}`.

Server envelope: `{"event": string, "payload": object, "timestamp": ISO8601}`.

## Telegram (spec §8)

Commands: `/start /help /status /health /networks /contracts /transactions
/logs /reload`. Restricted to configured `TELEGRAM_ADMIN_IDS`. Secrets and
transaction hashes are redacted before they reach a chat.
