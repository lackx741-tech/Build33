import { CacheService } from '../../src/services/cache.js';
import { EventBus } from '../../src/blockchain/events.js';
import { TransactionMonitor } from '../../src/blockchain/monitor.js';
import { BlockchainProvider } from '../../src/blockchain/provider.js';
import { networks, getNetworkByChainId, defaultNetwork } from '../../src/config/networks.js';
import { ConfigurationService } from '../../src/services/configuration.js';

/** Node.js test category: cache, event processing and provider initialization. */

describe('CacheService', () => {
  test('stores and retrieves values', () => {
    const cache = new CacheService({ ttl: 60 });
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.has('a')).toBe(true);
    cache.del('a');
    expect(cache.get('a')).toBeUndefined();
  });

  test('remember computes once and reuses the cached value', async () => {
    const cache = new CacheService({ ttl: 60 });
    let calls = 0;
    const loader = async () => {
      calls += 1;
      return 'value';
    };
    expect(await cache.remember('k', loader)).toBe('value');
    expect(await cache.remember('k', loader)).toBe('value');
    expect(calls).toBe(1);
  });

  test('namespaced keys are stable', () => {
    expect(CacheService.key('contract', 56, '0xabc', 'totalSupply')).toBe('contract:56:0xabc:totalSupply');
  });
});

describe('EventBus', () => {
  test('publishes namespaced envelopes and retains history', () => {
    const bus = new EventBus();
    const seen = [];
    bus.on('transaction.confirmed', (e) => seen.push(e));
    bus.publish('transaction.confirmed', { txHash: '0x1' });
    expect(seen).toHaveLength(1);
    expect(seen[0].event).toBe('transaction.confirmed');
    expect(bus.recent(5)).toHaveLength(1);
  });

  test('wildcard listeners receive every event', () => {
    const bus = new EventBus();
    const seen = [];
    bus.on('*', (e) => seen.push(e.event));
    bus.publish('system.health', { ok: true });
    bus.publish('system.error', { message: 'x' });
    expect(seen).toEqual(['system.health', 'system.error']);
  });
});

describe('TransactionMonitor', () => {
  test('emits transaction.confirmed when a receipt is mined', async () => {
    const bus = new EventBus();
    const provider = {
      get: () => ({
        web3: {
          eth: {
            getTransactionReceipt: async () => ({ status: 1n, blockNumber: 100n, gasUsed: 21000n }),
          },
        },
      }),
    };
    const monitor = new TransactionMonitor({ provider, bus, pollIntervalMs: 100000 });
    const events = [];
    bus.on('transaction.confirmed', (e) => events.push(e));

    monitor.watch('0xabc', { network: 'bsc' });
    await monitor.tick();

    expect(events).toHaveLength(1);
    expect(events[0].payload.txHash).toBe('0xabc');
    expect(events[0].payload.blockNumber).toBe(100);
    expect(monitor.pending()).toHaveLength(0);
    monitor.stop();
  });

  test('emits transaction.failed for a reverted receipt', async () => {
    const bus = new EventBus();
    const provider = {
      get: () => ({
        web3: { eth: { getTransactionReceipt: async () => ({ status: 0n, blockNumber: 5n, gasUsed: 1n }) } },
      }),
    };
    const monitor = new TransactionMonitor({ provider, bus, pollIntervalMs: 100000 });
    const failed = [];
    bus.on('transaction.failed', (e) => failed.push(e));

    monitor.watch('0xdead', { network: 'bsc' });
    await monitor.tick();

    expect(failed).toHaveLength(1);
    monitor.stop();
  });
});

describe('Network configuration', () => {
  test('defines BSC mainnet and testnet', () => {
    expect(networks.bsc.chainId).toBe(56);
    expect(networks.bscTestnet.chainId).toBe(97);
    expect(getNetworkByChainId(56).key).toBe('bsc');
    expect(getNetworkByChainId(9999)).toBeNull();
  });

  test('resolves the default network from config', () => {
    expect(defaultNetwork({ BSC_CHAIN_ID: 97 }).key).toBe('bscTestnet');
    expect(defaultNetwork({}).key).toBe('bsc');
  });
});

describe('BlockchainProvider', () => {
  test('builds a Web3 instance for a supported network', () => {
    const provider = new BlockchainProvider({ BSC_RPC_URL: 'http://localhost:8545' });
    const { web3, network } = provider.get('bsc');
    expect(network.chainId).toBe(56);
    expect(web3).toBeDefined();
  });

  test('rejects unsupported networks', () => {
    const provider = new BlockchainProvider({ BSC_RPC_URL: 'http://localhost:8545' });
    expect(() => provider.get('polygon')).toThrow(/Unsupported network/);
  });

  test('requires an RPC url', () => {
    const provider = new BlockchainProvider({});
    expect(() => provider.get('bsc')).toThrow(/No RPC URL configured/);
  });

  // Regression: a dead/black-holing RPC must not hang the health probe.
  test('health() resolves to ok:false instead of hanging on a dead RPC', async () => {
    const net = await import('node:net');
    const sockets = new Set();
    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.on('data', () => {}); // accept the request but never reply
      socket.on('close', () => sockets.delete(socket));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address();

    const provider = new BlockchainProvider({ BSC_RPC_URL: `http://127.0.0.1:${port}` });
    const started = Date.now();
    const status = await provider.health('bsc');
    const elapsed = Date.now() - started;

    expect(status.ok).toBe(false);
    expect(elapsed).toBeLessThan(20000);

    for (const socket of sockets) socket.destroy();
    await new Promise((r) => server.close(r));
  }, 25000);
});

describe('ConfigurationService', () => {
  const baseConfig = {
    NODE_ENV: 'test',
    CACHE_TTL: '300',
    API_KEY: 'secret',
    BSC_RPC_URL: 'https://rpc.example',
    TELEGRAM_BOT_TOKEN: '',
  };

  test('redacts secrets in the public view', () => {
    const svc = new ConfigurationService({ config: baseConfig });
    const view = svc.publicView();
    expect(view.API_KEY).toBe('***');
    expect(view.BSC_RPC_URL).toBe('***');
    expect(view.TELEGRAM_BOT_TOKEN).toBe('');
    expect(view.CACHE_TTL).toBe('300');
  });

  test('rejects unknown keys', async () => {
    const svc = new ConfigurationService({ config: baseConfig });
    await expect(svc.set('NOT_A_KEY', 'x')).rejects.toThrow(/Unknown configuration key/);
  });

  test('rejects secret keys', async () => {
    const svc = new ConfigurationService({ config: baseConfig });
    await expect(svc.set('API_KEY', 'x')).rejects.toThrow(/cannot be changed at runtime/);
  });

  test('applies and returns a non-secret override', async () => {
    const svc = new ConfigurationService({ config: baseConfig });
    const result = await svc.set('CACHE_TTL', '120');
    expect(result).toEqual({ key: 'CACHE_TTL', value: '120' });
    expect(svc.get('CACHE_TTL')).toBe('120');
  });
});
