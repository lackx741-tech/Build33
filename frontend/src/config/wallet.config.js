/** Wallet connection options surfaced in the connect modal. */
export const WALLET_TYPES = {
  INJECTED: 'injected',
  WALLETCONNECT: 'walletconnect',
  COINBASE: 'coinbase',
};

export const WALLET_LABELS = {
  [WALLET_TYPES.INJECTED]: 'Browser Wallet',
  [WALLET_TYPES.WALLETCONNECT]: 'WalletConnect',
  [WALLET_TYPES.COINBASE]: 'Coinbase Wallet',
};

export const walletConfig = {
  walletConnectProjectId: import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID || '',
  appName: 'Blower',
  appDescription: 'Web3 infrastructure application',
  appUrl: typeof window !== 'undefined' ? window.location?.origin || '' : '',
  appIcons: [],
};

/** Injected EIP-1193 providers to probe, in detection order. */
export const INJECTED_PROVIDER_FLAGS = [
  { flag: 'isMetaMask', name: 'MetaMask' },
  { flag: 'isTrust', name: 'Trust Wallet' },
  { flag: 'isCoinbaseWallet', name: 'Coinbase Wallet' },
  { flag: 'isBraveWallet', name: 'Brave Wallet' },
];

export default walletConfig;
