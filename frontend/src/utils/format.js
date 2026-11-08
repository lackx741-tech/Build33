/** Formatting helpers for display values. */

export function shortenAddress(address, chars = 4) {
  if (typeof address !== 'string' || address.length < 2 + chars * 2) return address || '';
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** Format a wei string using ethers' utils when available, else a manual fallback. */
export function formatUnits(value, decimals = 18, ethersLib) {
  if (ethersLib?.utils?.formatUnits) return ethersLib.utils.formatUnits(value, decimals);
  const str = String(value);
  const neg = str.startsWith('-');
  const digits = neg ? str.slice(1) : str;
  const padded = digits.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals) || '0';
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole}${frac ? `.${frac}` : ''}`;
}

export function formatNumber(value, { maximumFractionDigits = 6 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(n);
}

export function formatTimestamp(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export function truncate(text, max = 80) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
