/** Input validation helpers. Pure functions, no DOM access. */

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

export function isAddress(value) {
  return typeof value === 'string' && ADDRESS_RE.test(value);
}

export function isTransactionHash(value) {
  return typeof value === 'string' && TX_HASH_RE.test(value);
}

export function isPositiveAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function isNonNegativeAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

/** Returns null when valid, otherwise a human-readable message. */
export function validateTransfer({ to, amount }) {
  if (!to) return 'Recipient address is required.';
  if (!isAddress(to)) return 'Recipient must be a valid 0x address.';
  if (amount === '' || amount === undefined || amount === null) return 'Amount is required.';
  if (!isPositiveAmount(amount)) return 'Amount must be greater than zero.';
  return null;
}

export function requireChain(chainId, supported) {
  return supported.includes(Number(chainId));
}
