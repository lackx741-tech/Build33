import { loadAbi, resolveAddress } from './contract-loader.js';
import { WalletError, isUserRejection } from '../utils/errors.js';

/**
 * State-changing contract access. Building a transaction never sends anything;
 * the caller must display the parameters and obtain explicit user approval
 * before `send` is invoked.
 */
export async function buildWrite({ ethersLib, signer, address, abi, method, params = [], overrides = {} }) {
  const contract = new ethersLib.Contract(address, abi, signer);
  if (typeof contract[method] !== 'function') throw new WalletError(`Unknown method: ${method}`, { code: 'unknown_method' });

  const gasLimit = await contract.estimateGas[method](...params, overrides).catch(() => undefined);
  return {
    contract,
    method,
    params,
    overrides: { ...overrides, ...(gasLimit ? { gasLimit: gasLimit.mul(120).div(100) } : {}) },
    describe: {
      address,
      method,
      params,
      value: overrides.value ? overrides.value.toString() : '0',
      gasLimit: gasLimit?.toString() || null,
    },
  };
}

export async function buildWriteByName({ ethersLib, signer, name, method, params = [], chainId, overrides }) {
  const abi = await loadAbi(name);
  const address = resolveAddress(name, chainId);
  if (!address) throw new WalletError(`No address registered for ${name}`, { code: 'no_address' });
  return buildWrite({ ethersLib, signer, address, abi, method, params, overrides });
}

/** Send an approved write. Returns the ethers transaction response. */
export async function sendWrite(prepared) {
  try {
    return await prepared.contract[prepared.method](...prepared.params, prepared.overrides);
  } catch (err) {
    if (isUserRejection(err)) throw new WalletError('Transaction was rejected in your wallet.', { code: 'transaction_rejected' });
    throw new WalletError(`Transaction failed: ${err.message}`, { code: 'transaction_failed', cause: err });
  }
}
