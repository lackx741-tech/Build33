import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { logger } from '../logging/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads contract ABIs from backend/src/blockchain/abis/<name>.json and caches
 * them in memory. Deployment addresses come from the environment:
 *   CONTRACT_<NAME>_ADDRESS  (per network: CONTRACT_<NAME>_ADDRESS_97)
 */
export class ContractRegistry {
  constructor(config, provider) {
    this.config = config;
    this.provider = provider;
    this.abis = new Map();
    this.abisDir = resolve(__dirname, 'abis');
  }

  async loadAbi(name) {
    if (this.abis.has(name)) return this.abis.get(name);
    const file = resolve(this.abisDir, `${name}.json`);
    const raw = await readFile(file, 'utf8');
    const abi = JSON.parse(raw);
    this.abis.set(name, abi);
    return abi;
  }

  addressFor(name, chainId) {
    const suffix = `_${chainId}`;
    return this.config[`CONTRACT_${name.toUpperCase()}_ADDRESS${suffix}`]
      || this.config[`CONTRACT_${name.toUpperCase()}_ADDRESS`]
      || null;
  }

  /** Return a web3 Contract instance for a read/write call. */
  async contract(name, chainId) {
    const { web3 } = this.provider.get(chainId);
    const abi = await this.loadAbi(name);
    const address = this.addressFor(name, chainId);
    if (!address) {
      throw new Error(`No address configured for contract "${name}" on chain ${chainId}`);
    }
    return new web3.eth.Contract(abi, address);
  }

  async list() {
    return [...this.abis.keys()];
  }

  /** Verify that every configured contract address has bytecode deployed. */
  async verifyDeployment(chainId) {
    const results = [];
    for (const name of this.abis.keys()) {
      const address = this.addressFor(name, chainId);
      if (!address) {
        results.push({ name, configured: false });
        continue;
      }
      const { web3 } = this.provider.get(chainId);
      const code = await web3.eth.getCode(address);
      results.push({ name, configured: true, address, deployed: code !== '0x' });
    }
    if (results.some((r) => r.configured && !r.deployed)) {
      logger.warn('Contract registry found undeployed contracts', { chainId });
    }
    return results;
  }
}

export default ContractRegistry;
