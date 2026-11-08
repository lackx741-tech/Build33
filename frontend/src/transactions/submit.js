import { WalletError, isUserRejection } from '../utils/errors.js';

/**
 * Send an approved transaction via the signer. Only call after the user has
 * confirmed the displayed parameters in the transaction panel.
 */
export async function submit({ signer, tx }) {
  if (!signer) throw new WalletError('Wallet is not connected', { code: 'not_connected' });
  try {
    const response = await signer.sendTransaction(tx);
    return { hash: response.hash, response };
  } catch (err) {
    if (isUserRejection(err)) throw new WalletError('Transaction rejected in wallet', { code: 'transaction_rejected' });
    throw new WalletError(`Submission failed: ${err.message}`, { code: 'submission_failed', cause: err });
  }
}
