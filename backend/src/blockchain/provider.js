import { Web3 } from 'web3';
import { logger } from '../logging/logger.js';
import { networks, getNetworkByChainId } from '../config/networks.js';

/** Upper bound on a single health probe, so a dead RPC cannot hang a request. */
const HEALTH_TIMEOUT_MS = 8000;

/** Reject after `ms` even if the underlying promise never settles. */
function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
      timer.unref?.();
    }),
  ]);
}

/**
 * Owns one Web3 instance per configured network. Instances are created lazily
 * and reused; the provider never logs the upstream URL (it may embed an API key).
 */
export class BlockchainProvider {
  constructor(config) {
    this.config = config;
    this.instances = new Map();
    this.status = new Map();
  }

  rpcUrlFor(network) {
    return this.config[network.rpcEnvVar];
  }

  /** Get (or build) the Web3 instance for a network key or chain id. */
  get(networkOrChainId) {
    const network =
      typeof networkOrChainId === 'number' || /^\d+$/.test(String(networkOrChainId))
        ? getNetworkByChainId(networkOrChainId)
        : networks[networkOrChainId];

    if (!network) throw new Error(`Unsupported network: ${networkOrChainId}`);

    const url = this.rpcUrlFor(network);
    if (!url) throw new Error(`No RPC URL configured for ${network.key} (${network.rpcEnvVar})`);

    if (!this.instances.has(network.key)) {
      const web3 = new Web3(new Web3.providers.HttpProvider(url, { keepAlive: true, timeout: 15000 }));
      this.instances.set(network.key, web3);
    }
    return { web3: this.instances.get(network.key), network };
  }

  /** Query chain id and block height; caches the last status. */
  async health(networkKey = 'bsc') {
    const { web3, network } = this.get(networkKey);
    try {
      const [chainId, blockNumber] = await withTimeout(
        Promise.all([web3.eth.getChainId(), web3.eth.getBlockNumber()]),
        HEALTH_TIMEOUT_MS,
        `Blockchain health check timed out for ${network.key}`,
      );
      const status = {
        network: network.key,
        ok: Number(chainId) === network.chainId,
        chainId: Number(chainId),
        blockNumber: Number(blockNumber),
        checkedAt: new Date().toISOString(),
      };
      this.status.set(network.key, status);
      return status;
    } catch (err) {
      const status = {
        network: network.key,
        ok: false,
        error: err.message,
        checkedAt: new Date().toISOString(),
      };
      this.status.set(network.key, status);
      logger.warn('Blockchain health check failed', { network: network.key, error: err.message });
      return status;
    }
  }

  lastStatus() {
    return Object.fromEntries(this.status.entries());
  }
}

export default BlockchainProvider;
