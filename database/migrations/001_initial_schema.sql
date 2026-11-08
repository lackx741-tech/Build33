-- 001_initial_schema.sql
-- Core schema for the Blower application (spec §11).
-- Idempotent so it can run on every container start.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Application users keyed by wallet address.
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    address       TEXT NOT NULL UNIQUE,
    label         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wallet session lifecycle (spec §4). Sessions are created on connect and
-- closed on disconnect; the backend never stores private keys.
CREATE TABLE IF NOT EXISTS wallet_sessions (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT REFERENCES users(id) ON DELETE CASCADE,
    address       TEXT NOT NULL,
    chain_id      INTEGER NOT NULL,
    provider      TEXT NOT NULL DEFAULT 'injected',
    connected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    disconnected_at TIMESTAMPTZ,
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_address ON wallet_sessions (address);
CREATE INDEX IF NOT EXISTS idx_wallet_sessions_open ON wallet_sessions (disconnected_at) WHERE disconnected_at IS NULL;

-- Supported networks (mirrors backend/src/config/networks.js).
CREATE TABLE IF NOT EXISTS networks (
    chain_id        INTEGER PRIMARY KEY,
    key             TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    native_symbol   TEXT NOT NULL,
    native_decimals INTEGER NOT NULL DEFAULT 18,
    explorer        TEXT,
    rpc_env_var     TEXT,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registered contracts with ABI and deployment metadata.
CREATE TABLE IF NOT EXISTS contracts (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    chain_id    INTEGER NOT NULL REFERENCES networks(chain_id),
    address     TEXT NOT NULL,
    abi         JSONB NOT NULL DEFAULT '[]'::jsonb,
    deployed_at TIMESTAMPTZ,
    verified    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name, chain_id)
);

-- Persisted transaction records. These must survive restarts (spec §11).
CREATE TABLE IF NOT EXISTS transactions (
    id             BIGSERIAL PRIMARY KEY,
    tx_hash        TEXT NOT NULL,
    chain_id       INTEGER NOT NULL REFERENCES networks(chain_id),
    from_address   TEXT,
    to_address     TEXT,
    value_wei      NUMERIC(78, 0),
    status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'confirmed', 'failed', 'dropped')),
    block_number   BIGINT,
    gas_used       NUMERIC(78, 0),
    reference      TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tx_hash, chain_id)
);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_chain ON transactions (chain_id, block_number);

-- Application event log (WebSocket event categories, spec §9).
CREATE TABLE IF NOT EXISTS application_events (
    id         BIGSERIAL PRIMARY KEY,
    event      TEXT NOT NULL,
    payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_application_events_event ON application_events (event, created_at DESC);

-- Telegram administrators and their roles (spec §8).
CREATE TABLE IF NOT EXISTS admin_users (
    id           BIGSERIAL PRIMARY KEY,
    telegram_id  BIGINT NOT NULL UNIQUE,
    username     TEXT,
    role         TEXT NOT NULL DEFAULT 'viewer'
                 CHECK (role IN ('viewer', 'operator', 'admin')),
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Runtime configuration overrides managed via the admin API / Telegram.
CREATE TABLE IF NOT EXISTS configuration (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable audit trail for administrative actions.
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    actor      TEXT NOT NULL,
    action     TEXT NOT NULL,
    target     TEXT,
    detail     JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor, created_at DESC);
