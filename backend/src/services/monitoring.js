import os from 'node:os';
import { logger } from '../logging/logger.js';

/**
 * Collects process and dependency health for the REST API, the WebSocket
 * status endpoint and the Telegram /health command.
 */
export class MonitoringService {
  constructor({ provider, db, cache, bus, wsHub = null, startedAt = Date.now() }) {
    this.provider = provider;
    this.db = db;
    this.cache = cache;
    this.bus = bus;
    this.wsHub = wsHub;
    this.startedAt = startedAt;
  }

  uptimeSeconds() {
    return Math.round((Date.now() - this.startedAt) / 1000);
  }

  memory() {
    const m = process.memoryUsage();
    return {
      rssMb: +(m.rss / 1048576).toFixed(1),
      heapUsedMb: +(m.heapUsed / 1048576).toFixed(1),
    };
  }

  /** Full health snapshot; `ok` is false if any critical dependency is down. */
  async snapshot({ deep = true } = {}) {
    const checks = {
      process: { ok: true, uptimeSeconds: this.uptimeSeconds(), memory: this.memory(), pid: process.pid, node: process.version },
      cache: { ok: true, stats: this.cache ? this.cache.stats() : null },
      websocket: { ok: true, clients: this.wsHub ? this.wsHub.clientCount : 0 },
      database: { ok: true, skipped: true },
      blockchain: { ok: true, skipped: true },
    };

    if (deep) {
      const [db, chain] = await Promise.all([
        this.db?.ping ? this.db.ping() : { ok: false, reason: 'not_configured' },
        this.provider?.health ? this.provider.health('bsc') : { ok: false, reason: 'not_configured' },
      ]);
      checks.database = db;
      checks.blockchain = chain;
    }

    const critical = deep ? ['process', 'blockchain', 'database'] : ['process'];
    const ok = critical.every((k) => checks[k].ok !== false);

    return {
      ok,
      service: 'blower-backend',
      hostname: os.hostname(),
      environment: process.env.NODE_ENV || 'development',
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  /** Emit a system.health event on the bus (used by the health poller). */
  async publishHealth() {
    const snap = await this.snapshot({ deep: true });
    this.bus?.publish('system.health', { ok: snap.ok, checks: snap.checks });
    return snap;
  }
}

export default MonitoringService;
