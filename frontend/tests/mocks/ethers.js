/** Minimal ethers v5 surface used by unit tests. */
export const utils = {
  formatUnits: (value, decimals = 18) => {
    const s = BigInt(value).toString().padStart(decimals + 1, '0');
    const whole = s.slice(0, s.length - decimals);
    const frac = s.slice(s.length - decimals).replace(/0+$/, '');
    return frac ? `${whole}.${frac}` : whole;
  },
  parseUnits: (value, decimals = 18) => {
    const [whole, frac = ''] = String(value).split('.');
    return BigInt(`${whole || '0'}${(frac + '0'.repeat(decimals)).slice(0, decimals)}`);
  },
};

export const providers = {
  Web3Provider: class Web3Provider {
    constructor(provider) { this.provider = provider; }
    getSigner() { return { sendTransaction: async (tx) => ({ hash: '0x' + 'ab'.repeat(32), tx }) }; }
    getBalance() { return Promise.resolve(0n); }
  },
};

export class Contract {
  constructor(address, abi, signerOrProvider) {
    this.address = address;
    this.abi = abi;
    this.signer = signerOrProvider;
  }
}

export default { utils, providers, Contract };
