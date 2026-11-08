import { EventBus } from '../../src/blockchain/events.js';
import { CacheService } from '../../src/services/cache.js';

/**
 * Shared fakes for API tests. They implement only the surface the controllers
 * actually call, so tests exercise the real routing/middleware code without
 * opening sockets to BSC or PostgreSQL.
 */

export function makeConfig(overrides = {}) {
  return {
    NODE_ENV: 'test',
    PORT: 0,
    BSC_RPC_URL: 'http://127.0.0.1:0',
    BSC_TESTNET_RPC_URL: 'http://127.0.0.1:0',
    BSC_CHAIN_ID: 56,
    BSC_TESTNET_CHAIN_ID: 97,
    API_KEY: 'test-key',
    CORS_ORIGINS: ['http://localhost:5173'],
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX: 1000,
    CACHE_TTL: 300,
    TELEGRAM_ADMIN_IDS: ['42'],
    DATABASE_URL: '',
    ...overrides,
  };
}

export function makeMonitoring({ ok = true } = {}) {
  return {
    async snapshot() {
      return {
        ok,
        service: 'blower-backend',
        environment: 'test',
        checks: {
          process: { ok: true, uptimeSeconds: 1, memory: { rssMb: 10 }, pid: 1, node: process.version },
          cache: { ok: true, stats: null },
          websocket: { ok: true, clients: 0 },
          database: { ok: true, skipped: true },
          blockchain: { ok: true, skipped: true },
        },
        timestamp: new Date().toISOString(),
      };
    },
    async publishHealth() {
      return this.snapshot();
    },
  };
}

export function makeConfigService(overrides = {}) {
  const store = { NODE_ENV: 'test', PORT: 3000, CACHE_TTL: 300, API_KEY: '***', ...overrides };
  return {
    async init() {},
    get: (key) => store[key],
    publicView: () => ({ ...store }),
    async set(key, value) {
      store[key] = value;
      return { key, value };
    },
  };
}

export function makeProvider() {
  const calls = [];
  return {
    calls,
    get(networkOrChainId) {
      calls.push(networkOrChainId);
      return {
        web3: {
          eth: {
            Contract: class {
              constructor(abi, address) {
                this.abi = abi;
                this.address = address;
                this.methods = Object.fromEntries(
                  abi
                    .filter((e) => e.type === 'function')
                    .map((e) => [e.name, (...params) => ({ call: async () => ({ method: e.name, params }) })]),
                );
              }
            },
          },
          currentProvider: {
            async request(payload) {
              return { jsonrpc: '2.0', id: payload.id, result: `0x${payload.method.length.toString(16)}` };
            },
          },
        },
      };
    },
  };
}

export function makeRegistry() {
  return {
    async list() {
      return ['UserAuthorization'];
    },
    async verifyDeployment() {
      return [{ name: 'UserAuthorization', configured: true, deployed: true, address: '0xabc' }];
    },
  };
}

export function makeMonitor() {
  const watched = [];
  return {
    watched,
    watch(hash) {
      watched.push(hash);
    },
    pending: () => watched,
    stop() {},
  };
}

export function makeDeps(overrides = {}) {
  const bus = new EventBus();
  return {
    config: makeConfig(),
    monitoring: makeMonitoring(),
    configService: makeConfigService(),
    provider: makeProvider(),
    registry: makeRegistry(),
    cache: new CacheService({ ttl: 60 }),
    monitor: makeMonitor(),
    bus,
    ...overrides,
  };
}
