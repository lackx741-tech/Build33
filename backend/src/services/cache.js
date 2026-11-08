import NodeCache from 'node-cache';

/**
 * Thin wrapper around node-cache that adds namespaced keys and a
 * "get-or-load" helper used by the read paths.
 */
export class CacheService {
  constructor({ ttl = 300, checkPeriod = 120 } = {}) {
    this.ttl = ttl;
    this.store = new NodeCache({ stdTTL: ttl, checkperiod: checkPeriod, useClones: false });
  }

  static key(namespace, ...parts) {
    return [namespace, ...parts.map((p) => String(p))].join(':');
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value, ttl = this.ttl) {
    return this.store.set(key, value, ttl);
  }

  del(key) {
    return this.store.del(key);
  }

  flush() {
    return this.store.flushAll();
  }

  has(key) {
    return this.store.has(key);
  }

  stats() {
    return this.store.getStats();
  }

  /** Return the cached value, otherwise compute it, cache it and return it. */
  async remember(key, loader, ttl = this.ttl) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await loader();
    if (value !== undefined) this.set(key, value, ttl);
    return value;
  }
}

export default CacheService;
