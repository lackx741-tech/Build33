import { describe, it, expect } from '@jest/globals';
import { shortenAddress, formatUnits, truncate } from '../src/utils/format.js';
import { isAddress, isTransactionHash, validateTransfer } from '../src/utils/validation.js';
import { describeWalletError, isUserRejection } from '../src/utils/errors.js';

describe('format utils', () => {
  it('shortens addresses', () => {
    expect(shortenAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });

  it('formats wei without ethers', () => {
    expect(formatUnits('1000000000000000000', 18)).toBe('1');
    expect(formatUnits('1500000000000000000', 18)).toBe('1.5');
    expect(formatUnits('1', 18)).toBe('0.000000000000000001');
  });

  it('truncates long strings', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});

describe('validation', () => {
  it('validates addresses', () => {
    expect(isAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(true);
    expect(isAddress('0x123')).toBe(false);
    expect(isAddress('not-an-address')).toBe(false);
  });

  it('validates tx hashes', () => {
    expect(isTransactionHash('0x' + 'a'.repeat(64))).toBe(true);
    expect(isTransactionHash('0xabc')).toBe(false);
  });

  it('validates transfers', () => {
    expect(validateTransfer({ to: '0x1234567890abcdef1234567890abcdef12345678', amount: '1' })).toBeNull();
    expect(validateTransfer({ to: 'bad', amount: '1' })).toMatch(/valid 0x address/);
    expect(validateTransfer({ to: '0x1234567890abcdef1234567890abcdef12345678', amount: '0' })).toMatch(/greater than zero/);
  });
});

describe('wallet errors', () => {
  it('maps EIP-1193 codes to messages', () => {
    expect(describeWalletError({ code: 4001 })).toMatch(/rejected/);
    expect(isUserRejection({ code: 4001 })).toBe(true);
    expect(isUserRejection({ code: 5000 })).toBe(false);
  });
});
