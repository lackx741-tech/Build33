-- 002_seed_reference_data.sql
-- Idempotent reference data (spec §5 network configuration, §11 tables).

INSERT INTO networks (chain_id, key, name, native_symbol, native_decimals, explorer, rpc_env_var, enabled)
VALUES
    (56, 'bsc',        'BNB Smart Chain',         'BNB',  18, 'https://bscscan.com',         'BSC_RPC_URL',          TRUE),
    (97, 'bscTestnet', 'BNB Smart Chain Testnet', 'tBNB', 18, 'https://testnet.bscscan.com', 'BSC_TESTNET_RPC_URL',  TRUE)
ON CONFLICT (chain_id) DO UPDATE
    SET name          = EXCLUDED.name,
        native_symbol = EXCLUDED.native_symbol,
        explorer      = EXCLUDED.explorer,
        rpc_env_var   = EXCLUDED.rpc_env_var;

-- Baseline runtime configuration (secrets are never seeded here).
INSERT INTO configuration (key, value, updated_by)
VALUES
    ('CACHE_TTL', '300', 'seed'),
    ('LOG_LEVEL', 'info', 'seed')
ON CONFLICT (key) DO NOTHING;
