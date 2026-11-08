import 'dotenv/config';
import { logger } from '../logging/logger.js';

/**
 * Declarative configuration schema. Each entry declares whether the variable
 * is required for the given NODE_ENV and how it should be coerced.
 */
const schema = {
  NODE_ENV: { required: false, default: 'development', enum: ['development', 'test', 'staging', 'production'] },
  PORT: { required: false, default: 3000, type: 'int' },
  LOG_LEVEL: { required: false, default: 'info', enum: ['error', 'warn', 'info', 'http', 'debug'] },

  BSC_RPC_URL: { required: true, default: 'https://bsc-dataseed.binance.org' },
  BSC_TESTNET_RPC_URL: { required: false, default: 'https://data-seed-prebsc-1-s1.binance.org:8545' },
  BSC_CHAIN_ID: { required: false, default: 56, type: 'int' },
  BSC_TESTNET_CHAIN_ID: { required: false, default: 97, type: 'int' },

  PHP_API_URL: { required: false, default: 'http://localhost:8080' },
  CORS_ORIGINS: { required: false, default: 'http://localhost:5173', type: 'list' },
  WALLETCONNECT_PROJECT_ID: { required: false },

  TELEGRAM_BOT_TOKEN: { required: false },
  TELEGRAM_ADMIN_IDS: { required: false, type: 'list' },

  DATABASE_URL: { required: false, default: 'postgres://blower:blower@localhost:5432/blower' },
  PGSSLMODE: { required: false, default: 'disable' },

  CACHE_TTL: { required: false, default: 300, type: 'int' },

  API_KEY: { required: false },
  RATE_LIMIT_WINDOW_MS: { required: false, default: 60000, type: 'int' },
  RATE_LIMIT_MAX: { required: false, default: 120, type: 'int' },
};

function coerce(name, def, raw) {
  if (raw === undefined || raw === '') return def.default;
  switch (def.type) {
    case 'int': {
      const n = Number.parseInt(raw, 10);
      if (Number.isNaN(n)) throw new Error(`Environment variable ${name} must be an integer`);
      return n;
    }
    case 'list':
      return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
    default:
      return raw;
  }
}

/**
 * Validate process.env against the schema.
 * @returns {{config: object, errors: string[], warnings: string[]}}
 */
export function validate(env = process.env) {
  const config = {};
  const errors = [];
  const warnings = [];

  for (const [name, def] of Object.entries(schema)) {
    let value;
    try {
      value = coerce(name, def, env[name]);
    } catch (err) {
      errors.push(err.message);
      continue;
    }

    if (value === undefined) {
      if (def.required) errors.push(`Missing required environment variable: ${name}`);
      else warnings.push(`Optional environment variable not set: ${name}`);
      config[name] = undefined;
      continue;
    }

    if (def.enum && !def.enum.includes(value)) {
      errors.push(`Environment variable ${name} must be one of: ${def.enum.join(', ')}`);
    }
    config[name] = value;
  }

  return { config, errors, warnings };
}

let cached = null;

/** Load and validate configuration once, throwing on invalid config. */
export function loadConfig({ exitOnError = false } = {}) {
  if (cached) return cached;
  const { config, errors, warnings } = validate();

  for (const w of warnings) logger.debug(w);
  if (errors.length) {
    for (const e of errors) logger.error(e);
    if (exitOnError) process.exit(1);
    throw new Error(`Invalid configuration:\n${errors.join('\n')}`);
  }

  cached = Object.freeze(config);
  return cached;
}

/** Test helper: drop the memoized configuration. */
export function resetConfig() {
  cached = null;
}

export { schema };
export default loadConfig;
