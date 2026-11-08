import { WalletError, isUserRejection } from '../utils/errors.js';

/**
 * Signature-based authentication. The server issues a nonce/challenge; the
 * user signs the human-readable message and the backend verifies it.
 *
 * Every call here is triggered by an explicit user action and the exact
 * message is displayed before the wallet prompt.
 */
export function buildAuthMessage({ domain, address, nonce, issuedAt, statement }) {
  return [
    `${statement || 'Sign in to Blower'}`,
    '',
    `Domain: ${domain}`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

/** Request a personal_sign signature. Returns { message, signature }. */
export async function signAuthMessage(eip1193, { address, nonce, domain, statement, issuedAt } = {}) {
  if (!eip1193?.request) throw new WalletError('Wallet is not connected.', { code: 'not_connected' });
  if (!address) throw new WalletError('No account selected.', { code: 'no_account' });

  const message = buildAuthMessage({
    domain: domain || (typeof window !== 'undefined' ? window.location?.host : 'localhost'),
    address,
    nonce: nonce || cryptoRandomNonce(),
    issuedAt: issuedAt || new Date().toISOString(),
    statement,
  });

  try {
    const signature = await eip1193.request({ method: 'personal_sign', params: [message, address] });
    return { message, signature };
  } catch (err) {
    if (isUserRejection(err)) throw new WalletError('Signature request was rejected.', { code: 'signature_rejected' });
    throw new WalletError(`Signature failed: ${err.message}`, { code: 'signature_failed', cause: err });
  }
}

export function cryptoRandomNonce() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
