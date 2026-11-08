/**
 * Canonical network definitions. Shared by the blockchain provider, the API
 * and the frontend (kept in sync manually; see frontend/src/config/network.config.js).
 */
export const networks = {
  bsc: {
    key: 'bsc',
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcEnvVar: 'BSC_RPC_URL',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    explorer: 'https://bscscan.com',
  },
  bscTestnet: {
    key: 'bscTestnet',
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    rpcEnvVar: 'BSC_TESTNET_RPC_URL',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    explorer: 'https://testnet.bscscan.com',
  },
};

export const SUPPORTED_CHAIN_IDS = Object.values(networks).map((n) => n.chainId);

export function getNetworkByChainId(chainId) {
  const id = Number(chainId);
  return Object.values(networks).find((n) => n.chainId === id) || null;
}

export function getNetworkByKey(key) {
  return networks[key] || null;
}

export function defaultNetwork(config) {
  const id = config?.BSC_CHAIN_ID ?? networks.bsc.chainId;
  return getNetworkByChainId(id) || networks.bsc;
}

export default networks;
