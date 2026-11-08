import { WALLET_TYPES } from '../config/wallet.config.js';

/**
 * Disconnect a wallet session. Injected providers cannot be truly disconnected
 * (the account stays authorized in the extension), so we only clear local
 * state; WalletConnect sessions are terminated explicitly.
 */
export async function disconnect(session) {
  if (!session) return { disconnected: true };

  if (session.type === WALLET_TYPES.WALLETCONNECT && session.eip1193?.disconnect) {
    try {
      await session.eip1193.disconnect();
    } catch {
      // Best effort: session may already be closed.
    }
  }

  return { disconnected: true, type: session.type };
}

/** Remove any locally persisted session identifier. */
export function clearSessionStorage(storage = globalThis.localStorage) {
  try {
    storage?.removeItem?.('blower.session');
  } catch {
    // storage may be unavailable (private mode)
  }
}
