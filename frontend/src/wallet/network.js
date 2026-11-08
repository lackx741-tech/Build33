import { networkByChainId, isSupportedChain, addChainParams, networks } from '../config/network.config.js';
import { NetworkError, isUserRejection } from '../utils/errors.js';

/** Read the current chain id (number) from an EIP-1193 provider. */
export async function getChainId(eip1193) {
  const hex = await eip1193.request({ method: 'eth_chainId' });
  return Number.parseInt(hex, 16);
}

/**
 * Ensure the wallet is on `targetChainId`. Attempts wallet_switchEthereumChain
 * and falls back to wallet_addEthereumChain when the chain is unknown (4902).
 */
export async function switchNetwork(eip1193, targetChainId) {
  const network = networkByChainId(targetChainId);
  if (!network) throw new NetworkError(`Unsupported target chain: ${targetChainId}`, { code: 'unsupported_chain' });

  try {
    await eip1193.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainIdHex }],
    });
    return true;
  } catch (err) {
    if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
      await eip1193.request({ method: 'wallet_addEthereumChain', params: [addChainParams(network)] });
      return true;
    }
    if (isUserRejection(err)) return false;
    throw new NetworkError(`Could not switch network: ${err.message}`, { cause: err });
  }
}

/** Subscribe to chainChanged. Returns an unsubscribe function. */
export function onChainChanged(eip1193, handler) {
  if (!eip1193?.on) return () => {};
  const listener = (hexChainId) => handler(Number.parseInt(hexChainId, 16));
  eip1193.on('chainChanged', listener);
  return () => eip1193.removeListener?.('chainChanged', listener);
}

export function describeNetwork(chainId) {
  const network = networkByChainId(chainId);
  if (network) return network;
  return { key: 'unknown', chainId: Number(chainId), name: `Unknown (${chainId})`, nativeCurrency: { symbol: '?', decimals: 18 } };
}

export { isSupportedChain, networks };
