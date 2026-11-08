import { isAddress } from '../utils/validation.js';
import { WalletError } from '../utils/errors.js';

/**
 * Build an unsigned transaction and a human-readable description. Nothing is
 * signed here; the description is what the UI must show before approval.
 */
export function prepareTransfer({ to, amountWei, from, data = '0x', chainId }) {
  if (!isAddress(to)) throw new WalletError('Invalid recipient address', { code: 'invalid_recipient' });
  return {
    tx: { from, to, value: amountWei, data },
    describe: {
      kind: 'transfer',
      from,
      to,
      valueWei: String(amountWei),
      data,
      chainId,
    },
  };
}

export function prepareContractCall({ address, abi, method, params = [], overrides = {}, from, chainId }) {
  if (!isAddress(address)) throw new WalletError('Invalid contract address', { code: 'invalid_contract' });
  return {
    request: { address, abi, method, params, overrides },
    describe: {
      kind: 'contract',
      from,
      to: address,
      method,
      params,
      valueWei: overrides.value ? String(overrides.value) : '0',
      chainId,
    },
  };
}

/** Convert a decimal amount string to wei without floating point error. */
export function toWei(amount, decimals = 18, ethersLib) {
  if (ethersLib?.utils?.parseUnits) return ethersLib.utils.parseUnits(String(amount), decimals);
  const [whole, frac = ''] = String(amount).split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(`${whole || '0'}${fracPadded}`.replace(/^0+(?=\d)/, ''));
}
