import { shortenAddress } from '../utils/format.js';

/** Normalizes an account string and provides display helpers. */
export function normalizeAccount(account) {
  return typeof account === 'string' ? account.toLowerCase() : null;
}

export function displayAccount(account) {
  return shortenAddress(account || '');
}

/**
 * Subscribe to EIP-1193 account changes. Returns an unsubscribe function.
 * Handles both the modern `accountsChanged` event and provider.on absence.
 */
export function onAccountsChanged(eip1193, handler) {
  if (!eip1193?.on) return () => {};
  const listener = (accounts) => handler((accounts || []).map(normalizeAccount).filter(Boolean));
  eip1193.on('accountsChanged', listener);
  return () => eip1193.removeListener?.('accountsChanged', listener);
}

export async function getAccounts(eip1193) {
  if (!eip1193?.request) return [];
  const accounts = await eip1193.request({ method: 'eth_accounts' });
  return (accounts || []).map(normalizeAccount).filter(Boolean);
}
