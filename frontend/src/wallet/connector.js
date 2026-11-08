import { detectProviders, getInjectedProvider } from './provider.js';
import { walletConfig, WALLET_TYPES } from '../config/wallet.config.js';
import { WalletError } from '../utils/errors.js';

/**
 * Connects the user to a wallet and returns a normalized session object.
 *
 * WalletConnect is imported lazily so the bundle still loads (and tests still
 * run) when no project id is configured or the package is unavailable.
 */
export async function connectInjected({ ethersLib } = {}) {
  const provider = getInjectedProvider();
  if (!provider) throw new WalletError('No injected wallet detected.', { code: 'no_injected_wallet' });

  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const account = accounts?.[0] || null;

  return {
    type: WALLET_TYPES.INJECTED,
    eip1193: provider,
    account,
    ethersProvider: ethersLib ? new ethersLib.providers.Web3Provider(provider, 'any') : null,
  };
}

export async function connectWalletConnect({ ethersLib } = {}) {
  if (!walletConfig.walletConnectProjectId) {
    throw new WalletError('WalletConnect project id is not configured.', { code: 'walletconnect_unconfigured' });
  }

  let EthereumProvider;
  try {
    ({ EthereumProvider } = await import('@walletconnect/ethereum-provider'));
  } catch (cause) {
    throw new WalletError('WalletConnect library is not available.', { code: 'walletconnect_unavailable', cause });
  }

  const wc = await EthereumProvider.init({
    projectId: walletConfig.walletConnectProjectId,
    chains: [1],
    showQrModal: true,
    metadata: {
      name: walletConfig.appName,
      description: walletConfig.appDescription,
      url: walletConfig.appUrl,
      icons: walletConfig.appIcons,
    },
  });

  await wc.connect();
  const accounts = wc.accounts || [];

  return {
    type: WALLET_TYPES.WALLETCONNECT,
    eip1193: wc,
    account: accounts[0] || null,
    ethersProvider: ethersLib ? new ethersLib.providers.Web3Provider(wc, 'any') : null,
  };
}

/** Dispatch to the right connector based on the requested wallet type. */
export async function connect(type, options = {}) {
  switch (type) {
    case WALLET_TYPES.INJECTED:
    case WALLET_TYPES.COINBASE:
      return connectInjected(options);
    case WALLET_TYPES.WALLETCONNECT:
      return connectWalletConnect(options);
    default:
      throw new WalletError(`Unknown wallet type: ${type}`, { code: 'unknown_wallet_type' });
  }
}

/** Options to render in the connect modal. */
export function availableOptions() {
  const options = [];
  const injected = detectProviders();
  if (injected.length) {
    options.push({ type: WALLET_TYPES.INJECTED, label: injected[0].name });
  }
  options.push({
    type: WALLET_TYPES.WALLETCONNECT,
    label: 'WalletConnect',
    disabled: !walletConfig.walletConnectProjectId,
  });
  return options;
}
