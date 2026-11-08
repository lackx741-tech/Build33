/**
 * Supported networks. Kept in sync with backend/src/config/networks.js.
 * Chain metadata follows EIP-3085 so it can be passed to wallet_addEthereumChain.
 */
export const networks = {
  bsc: {
    key: 'bsc',
    chainId: 56,
    chainIdHex: '0x38',
    name: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com'],
  },
  bscTestnet: {
    key: 'bscTestnet',
    chainId: 97,
    chainIdHex: '0x61',
    name: 'BNB Smart Chain Testnet',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
  },
};

export const DEFAULT_CHAIN_ID = Number(import.meta.env?.VITE_CHAIN_ID || 56);

export const SUPPORTED_CHAIN_IDS = Object.values(networks).map((n) => n.chainId);

export function networkByChainId(chainId) {
  const id = Number(chainId);
  return Object.values(networks).find((n) => n.chainId === id) || null;
}

export function isSupportedChain(chainId) {
  return SUPPORTED_CHAIN_IDS.includes(Number(chainId));
}

/** EIP-3085 payload used by wallet_addEthereumChain. */
export function addChainParams(network) {
  return {
    chainId: network.chainIdHex,
    chainName: network.name,
    nativeCurrency: network.nativeCurrency,
    rpcUrls: network.rpcUrls,
    blockExplorerUrls: network.blockExplorerUrls,
  };
}

export default networks;
