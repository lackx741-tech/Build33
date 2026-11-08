import { INJECTED_PROVIDER_FLAGS } from '../config/wallet.config.js';

/**
 * Provider detection and raw EIP-1193 access.
 *
 * `detectProviders` returns a list of { id, name, provider } for injected
 * wallets. WalletConnect is handled separately in connector.js because it is
 * an asynchronous, session-based provider.
 */
export function getInjectedProvider() {
  if (typeof window === 'undefined') return null;
  return window.ethereum || null;
}

export function detectProviders() {
  const eth = getInjectedProvider();
  if (!eth) return [];

  const found = [];
  const seen = new Set();

  // Multiple injected providers can advertise themselves via `providers`.
  const candidates = Array.isArray(eth.providers) ? eth.providers : [eth];

  for (const provider of candidates) {
    const match = INJECTED_PROVIDER_FLAGS.find(({ flag }) => provider?.[flag]);
    const name = match?.name || (provider?.isMetaMask ? 'MetaMask' : 'Injected Wallet');
    if (seen.has(name)) continue;
    seen.add(name);
    found.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name, provider });
  }

  return found;
}

export function hasInjectedProvider() {
  return Boolean(getInjectedProvider());
}

/**
 * Wrap an EIP-1193 provider as an ethers v5 Web3Provider.
 * ethers is passed in so tests can inject a stub.
 */
export function toEthersProvider(eip1193Provider, ethersLib) {
  if (!ethersLib?.providers?.Web3Provider) {
    throw new Error('ethers v5 is required to build a Web3Provider');
  }
  return new ethersLib.providers.Web3Provider(eip1193Provider, 'any');
}
