import { logger } from '../logging/logger.js';
import { badRequest } from '../utils/errors.js';

/**
 * Runtime configuration registry. Environment values are the source of truth;
 * an optional PostgreSQL `configuration` table provides overrides that an
 * administrator can change without a redeploy.
 *
 * Overrides are validated against the same schema used at startup and secrets
 * are never returned by `publicView()`.
 */
const SECRET_KEYS = new Set([
  'API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'DATABASE_URL',
  'BSC_RPC_URL',
  'BSC_TESTNET_RPC_URL',
]);

export class ConfigurationService {
  constructor({ config, db = null, cache = null }) {
    this.config = config;
    this.db = db;
    this.cache = cache;
    this.overrides = new Map();
  }

  /** Load overrides from the database, if available. */
  async init() {
    if (!this.db?.available) return;
    try {
      const { rows } = await this.db.query('SELECT key, value FROM configuration');
      for (const row of rows) this.overrides.set(row.key, row.value);
      logger.info('configuration.loaded', { count: rows.length });
    } catch (err) {
      logger.warn('configuration.load failed', { error: err.message });
    }
  }

  get(key) {
    return this.overrides.has(key) ? this.overrides.get(key) : this.config[key];
  }

  /** All configuration with secrets redacted. */
  publicView() {
    const out = {};
    for (const [key, value] of Object.entries(this.config)) {
      out[key] = SECRET_KEYS.has(key) ? (value ? '***' : '') : value;
    }
    for (const [key, value] of this.overrides) {
      out[key] = SECRET_KEYS.has(key) ? '***' : value;
    }
    return out;
  }

  /** Update one override. Rejects unknown or secret keys. */
  async set(key, value, { actor = 'system' } = {}) {
    if (!(key in this.config)) throw badRequest(`Unknown configuration key: ${key}`);
    if (SECRET_KEYS.has(key)) throw badRequest(`Configuration key ${key} cannot be changed at runtime`);

    this.overrides.set(key, value);
    if (this.cache) this.cache.flush();

    if (this.db?.available) {
      await this.db.query(
        `INSERT INTO configuration (key, value, updated_by, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
                                         updated_by = EXCLUDED.updated_by,
                                         updated_at = now()`,
        [key, String(value), actor],
      );
      await this.db.query(
        `INSERT INTO audit_logs (actor, action, target, detail) VALUES ($1, $2, $3, $4)`,
        [actor, 'config.update', key, JSON.stringify({ value: String(value) })],
      );
    }

    logger.info('configuration.updated', { key, actor });
    return { key, value };
  }
}

export default ConfigurationService;
