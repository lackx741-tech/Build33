# DATAFLOW.md

Request and event lifecycles across the Blower services.

## 1. Wallet connection (spec §4)

```
User clicks Connect
  → frontend/src/wallet/provider.js      detect injected providers
  → frontend/src/wallet/connector.js     eth_requestAccounts (user approves)
  → frontend/src/wallet/account.js       read + normalize address
  → frontend/src/wallet/network.js       eth_chainId; verify against BSC
        ├─ wrong chain → wallet_switchEthereumChain
        └─ unknown chain → wallet_addEthereumChain (EIP-3085 payload)
  → frontend/src/contracts/contract-loader.js   initialize contract providers
  → WebSocket publish wallet.connected
  → APPLICATION READY
```

## 2. Read-only contract call

```
frontend/src/contracts/contract-reader.js
  → POST /api/contracts/read  {address, abi, method, params, chainId}
  → backend: validation → cache lookup → web3 eth_call
        └─ cache miss → upstream RPC → cache.set(key, result, CACHE_TTL)
  → { ok, data: { result } }
```

## 3. Transaction lifecycle

```
frontend/src/transactions/prepare.js    build + validate transfer
  → simulate.js                          POST /api/transactions/estimate
  → UI displays parameters; user must confirm explicitly
  → submit.js                            signer.sendTransaction (wallet prompt)
  → POST /api/transactions/watch         {txHash, network}
        └─ backend emits transaction.submitted
        └─ TransactionMonitor polls eth_getTransactionReceipt every 5s
              ├─ receipt.status == 1 → transaction.confirmed
              └─ receipt.status == 0 → transaction.failed
  → WebSocket fan-out to subscribed clients
  → Telegram notification to admins
  → frontend/src/transactions/monitor.js resolves receipt
```

## 4. JSON-RPC proxy

```
Client → POST /api/rpc {jsonrpc, method, params}
  → php: Validation::rpcPayload  (allow-list + batch cap)
  → RpcService::networkFor       (X-Network header / ?network)
  → HttpService (cURL, timeout)  → upstream BSC provider
  → upstream JSON-RPC response returned verbatim
```

## 5. WebSocket event flow

```
EventBus.publish(event, payload)
  ├─ retain in replay history (200 entries)
  ├─ emit(event)  → named listeners (Telegram notifications)
  └─ emit('*')    → WebSocketHub.broadcast
        └─ for each client with matching subscription → JSON frame
```

## 6. Health check flow

```
GET /api/health (Node)
  → MonitoringService.snapshot({deep})
        ├─ process  : uptime, memory, pid
        ├─ cache    : node-cache stats
        ├─ websocket: connected client count
        ├─ database : SELECT 1  (pg)
        └─ blockchain: eth_chainId + eth_blockNumber
  → 200 if process+blockchain+database ok, else 503

GET /api/health (PHP)
  → per-network eth_chainId via RpcService
  → { ok, data: { networks: { bsc: { chainId: 56 }, … } } }
```

## 7. Telegram admin flow

```
Operator sends /health
  → TelegramAuthorizer.middleware()   check TELEGRAM_ADMIN_IDS
        ├─ unauthorized → reply + stop
        └─ authorized   → command handler
  → MonitoringService.snapshot({deep})
  → redact()   strip secrets + tx hashes
  → reply to chat
```

## 8. Configuration override flow

```
PATCH /api/configuration {key, value}   (or Telegram /reload)
  → ConfigurationService.set
        ├─ reject unknown / secret keys
        ├─ update in-memory override
        ├─ cache.flush()
        ├─ UPSERT configuration table
        └─ INSERT audit_logs
```
