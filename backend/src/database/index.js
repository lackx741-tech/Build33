import { Pool } from 'pg';
import { logger } from '../logging/logger.js';

/**
 * PostgreSQL access layer. The pool is created lazily so that services that do
 * not need persistence (tests, health checks) never open a socket.
 */
export class Database {
  constructor({ connectionString, ssl = false, max = 10 } = {}) {
    this.connectionString = connectionString;
    this.ssl = ssl;
    this.max = max;
    this.pool = null;
    this.available = Boolean(connectionString);
  }

  pool_() {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: this.ssl ? { rejectUnauthorized: false } : false,
        max: this.max,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
      this.pool.on('error', (err) => logger.error('Postgres pool error', { error: err.message }));
    }
    return this.pool;
  }

  async query(text, params = []) {
    const started = Date.now();
    const res = await this.pool_().query(text, params);
    logger.debug('db.query', { durationMs: Date.now() - started, rows: res.rowCount });
    return res;
  }

  /** Connectivity probe used by /api/health. */
  async ping() {
    if (!this.available) return { ok: false, reason: 'not_configured' };
    try {
      await this.query('SELECT 1');
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err.message };
    }
  }

  async transaction(fn) {
    const client = await this.pool_().connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export default Database;
