# CONTRACT_ANALYSIS.md

Analysis of the Solidity contracts in `contracts/src/`. All contracts compile
with Solidity `0.8.24` (EVM target `paris`) and are covered by Hardhat tests.

## Common design

- **Role-based authorization.** `AccessControl` is an OpenZeppelin-style role
  store used as a base by three registries. `DEFAULT_ADMIN_ROLE` (the zero
  role) governs role grants.
- **No upgradeability.** Contracts are immutable; configuration lives in the
  `ConfigurationRegistry` so it can change without redeploying logic.
- **Explicit authorization.** No contract has a payable fallback or a
  `delegatecall`; every state change is behind a role or an explicit
  per-account authorization check.

## AccessControl.sol

Base contract. `grantRole`/`revokeRole` are `DEFAULT_ADMIN_ROLE`-only. Emits
`RoleGranted` / `RoleRevoked`.

| Member | Type | Notes |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `bytes32` const | `0x00` |
| `hasRole(role, account)` | view | |
| `grantRole(role, account)` | external | admin only |
| `revokeRole(role, account)` | external | admin only |

## ConfigurationRegistry.sol

Typed key/value store with an audit-friendly event per write.

| Role | Purpose |
|---|---|
| `CONFIG_ROLE` | set / clear configuration entries |

Types: `Uint`, `Address`, `Bool`, `String`. Each entry records `ValueType` and
`updatedAt`. `setString` bounds length to prevent unbounded storage growth, and
`setAddress` rejects the zero address. Reads are type-checked: `getUint`,
`getAddress`, `getBool`, `getString` each revert if the stored value has a
different type. `exists(key)` and `keys()` enumerate entries.

Events: `ConfigurationSet(key, valueType, updatedAt)`, `ConfigurationCleared(key)`.

## PermissionRegistry.sol

Application-level capability grants, independent of chain roles.

| Role | Purpose |
|---|---|
| `PERMISSION_ADMIN_ROLE` | define / grant / revoke permissions |

A permission must be `definePermission`d before it can be granted (prevents
typos creating phantom capabilities). Reads: `hasPermission`, `isDefined`.

Events: `PermissionDefined`, `PermissionGranted`, `PermissionRevoked`.

## UserAuthorization.sol

Per-account authorization with an expiry timestamp and a tier.

- `operator` — the single account allowed to authorize others; transferable via
  `setOperator` (operator-only).
- `authorizeSelf(expiresAt)` — an account may self-enroll at the default tier.
- `authorize(account, tier, expiresAt)` — operator-only, sets tier + expiry.
- `isAuthorized(account)` — returns `false` once `expiresAt` has passed.
- `setTier`, `deauthorize` — operator-only.

Events: `Authorized`, `Deauthorized`, `TierChanged`, `OperatorChanged`.

## TransactionRegistry.sol

On-chain metadata records for transactions, keyed by an application-supplied
`refId` (a `bytes32` reference, **not** the on-chain tx hash). The name `refId`
is used deliberately: `reference` is a reserved keyword in Solidity 0.8.24.

| Role | Purpose |
|---|---|
| `RECORDER_ROLE` | record transactions and change status |

- `record(refId, account, operation, value)` — stores a record and emits
  `TransactionRecorded`. Rejects a duplicate `refId` and requires the account to
  be authorized (`authorization.isAuthorized(account)`).
- `setStatus(refId, status)` — `RECORDER_ROLE`-only; only a `PENDING` record can
  change status; emits `TransactionStatusChanged`.
- `TxStatus` enum: `PENDING → CONFIRMED | FAILED` (terminal states are final).
- Reads: `get(refId)` → `(account, operation, value, status, createdAt)`,
  `count()`, `refIdAt(index)`, `totalRecorded`.

Events:
```solidity
event TransactionRecorded(bytes32 indexed refId, address indexed account,
                          bytes32 indexed operation, uint256 value, TxStatus status);
event TransactionStatusChanged(bytes32 indexed refId, TxStatus status);
```

## Security notes

- All administrative operations are role-gated (`onlyRole`).
- No contract accepts arbitrary `call`/`delegatecall` targets.
- String storage is length-bounded.
- Expiry checks are evaluated at read time, so an expired authorization cannot
  be used even if it was never explicitly deauthorized.
- `TransactionRegistry` stores a reference, never signing material.
