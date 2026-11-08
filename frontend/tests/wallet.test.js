import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { detectProviders, hasInjectedProvider, toEthersProvider } from '../src/wallet/provider.js';
import { normalizeAccount, getAccounts, onAccountsChanged } from '../src/wallet/account.js';
import { getChainId, switchNetwork, onChainChanged } from '../src/wallet/network.js';
import * as ethers from 'ethers';

function mockProvider({ accounts = [], chainId = '0x38', failSwitch = null } = {}) {
  const listeners = {};
  return {
    isMetaMask: true,
    request: jest.fn(async ({ method, params }) => {
      if (method === 'eth_accounts') return accounts;
      if (method === 'eth_requestAccounts') return accounts;
      if (method === 'eth_chainId') return chainId;
      if (method === 'wallet_switchEthereumChain') {
        if (failSwitch) throw failSwitch;
        return null;
      }
      if (method === 'wallet_addEthereumChain') return null;
      return null;
    }),
    on: (event, fn) => { (listeners[event] ||= []).push(fn); },
    removeListener: (event, fn) => { listeners[event] = (listeners[event] || []).filter((f) => f !== fn); },
    emit: (event, value) => (listeners[event] || []).forEach((fn) => fn(value)),
  };
}

beforeEach(() => {
  delete global.window;
  global.window = {};
});

describe('provider detection', () => {
  it('returns nothing when no injected provider exists', () => {
    expect(hasInjectedProvider()).toBe(false);
    expect(detectProviders()).toEqual([]);
  });

  it('detects MetaMask', () => {
    global.window.ethereum = mockProvider();
    expect(hasInjectedProvider()).toBe(true);
    const found = detectProviders();
    expect(found[0].name).toBe('MetaMask');
  });

  it('builds an ethers Web3Provider', () => {
    const provider = toEthersProvider(mockProvider(), ethers);
    expect(provider.provider).toBeDefined();
  });
});

describe('account handling', () => {
  it('normalizes accounts to lowercase', () => {
    expect(normalizeAccount('0xABC')).toBe('0xabc');
    expect(normalizeAccount(null)).toBeNull();
  });

  it('reads accounts', async () => {
    const p = mockProvider({ accounts: ['0xABC'] });
    expect(await getAccounts(p)).toEqual(['0xabc']);
  });

  it('subscribes and unsubscribes to account changes', () => {
    const p = mockProvider();
    const handler = jest.fn();
    const off = onAccountsChanged(p, handler);
    p.emit('accountsChanged', ['0xDEF']);
    expect(handler).toHaveBeenCalledWith(['0xdef']);
    off();
    p.emit('accountsChanged', ['0x999']);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('network handling', () => {
  it('reads the chain id', async () => {
    expect(await getChainId(mockProvider({ chainId: '0x61' }))).toBe(97);
  });

  it('switches networks', async () => {
    const p = mockProvider();
    expect(await switchNetwork(p, 97)).toBe(true);
    expect(p.request).toHaveBeenCalledWith({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x61' }] });
  });

  it('adds unknown chains (4902)', async () => {
    const p = mockProvider({ failSwitch: Object.assign(new Error('unknown'), { code: 4902 }) });
    expect(await switchNetwork(p, 97)).toBe(true);
    expect(p.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'wallet_addEthereumChain' }));
  });

  it('returns false when the user rejects the switch', async () => {
    const p = mockProvider({ failSwitch: Object.assign(new Error('rejected'), { code: 4001 }) });
    expect(await switchNetwork(p, 97)).toBe(false);
  });

  it('rejects unsupported targets', async () => {
    await expect(switchNetwork(mockProvider(), 1)).rejects.toThrow(/Unsupported target chain/);
  });

  it('notifies on chain change', () => {
    const p = mockProvider();
    const handler = jest.fn();
    onChainChanged(p, handler);
    p.emit('chainChanged', '0x61');
    expect(handler).toHaveBeenCalledWith(97);
  });
});
