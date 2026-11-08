import { describe, it, expect, jest } from '@jest/globals';
import { prepareTransfer, toWei } from '../src/transactions/prepare.js';
import { simulate } from '../src/transactions/simulate.js';
import { submit } from '../src/transactions/submit.js';
import { waitForReceipt } from '../src/transactions/monitor.js';
import * as ethers from 'ethers';

const TO = '0x1234567890abcdef1234567890abcdef12345678';

describe('transaction preparation', () => {
  it('builds a transfer with a description', () => {
    const { tx, describe } = prepareTransfer({ to: TO, amountWei: '1000', from: '0xFROM', chainId: 56 });
    expect(tx.to).toBe(TO);
    expect(tx.value).toBe('1000');
    expect(describe.kind).toBe('transfer');
  });

  it('rejects invalid recipients', () => {
    expect(() => prepareTransfer({ to: 'nope', amountWei: '1' })).toThrow(/Invalid recipient/);
  });

  it('converts amounts to wei exactly', () => {
    expect(toWei('1', 18, ethers).toString()).toBe('1000000000000000000');
    expect(toWei('0.5', 18, ethers).toString()).toBe('500000000000000000');
    expect(toWei('1.23456789', 18, ethers).toString()).toBe('1234567890000000000');
  });
});

describe('simulation', () => {
  it('estimates gas and cost', async () => {
    const provider = {
      estimateGas: jest.fn(async () => ({ toString: () => '21000', mul: (x) => ({ toString: () => '21000000000000' }) })),
      getGasPrice: jest.fn(async () => ({ toString: () => '1000000000' })),
      call: jest.fn(),
    };
    const res = await simulate({ ethersLib: ethers, provider, tx: { to: TO, value: 1n } });
    expect(res.ok).toBe(true);
    expect(res.gasLimit).toBe('21000');
  });

  it('reports revert reasons', async () => {
    const provider = {
      estimateGas: jest.fn(async () => { throw new Error('execution reverted'); }),
      getGasPrice: jest.fn(async () => null),
    };
    const res = await simulate({ ethersLib: ethers, provider, tx: { to: TO } });
    expect(res.ok).toBe(false);
    expect(res.revertReason).toMatch(/reverted/);
  });
});

describe('submission', () => {
  it('sends via the signer', async () => {
    const signer = { sendTransaction: jest.fn(async () => ({ hash: '0xdead' })) };
    const res = await submit({ signer, tx: { to: TO } });
    expect(res.hash).toBe('0xdead');
  });

  it('maps user rejection', async () => {
    const signer = { sendTransaction: jest.fn(async () => { throw Object.assign(new Error('no'), { code: 4001 }); }) };
    await expect(submit({ signer, tx: {} })).rejects.toThrow(/rejected/i);
  });

  it('requires a signer', async () => {
    await expect(submit({ signer: null, tx: {} })).rejects.toThrow(/not connected/i);
  });
});

describe('monitor', () => {
  it('resolves confirmed receipts', async () => {
    const provider = {
      getTransactionReceipt: jest.fn(async () => ({ status: 1, confirmations: 2 })),
    };
    const res = await waitForReceipt({ provider, hash: '0xabc', confirmations: 1 });
    expect(res.status).toBe('confirmed');
  });

  it('reports failures', async () => {
    const provider = { getTransactionReceipt: jest.fn(async () => ({ status: 0, confirmations: 1 })) };
    const res = await waitForReceipt({ provider, hash: '0xabc' });
    expect(res.status).toBe('failed');
  });
});
