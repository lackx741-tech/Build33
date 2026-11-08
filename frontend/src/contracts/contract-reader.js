import { loadAbi, resolveAddress } from './contract-loader.js';
import { ApiError } from '../utils/errors.js';

/**
 * Read-only contract access. Two strategies:
 *  1. Directly through the connected ethers provider (preferred, no backend hop).
 *  2. Through the backend /api/contracts/read endpoint as a fallback.
 */
export async function readContract({ ethersLib, provider, address, abi, method, params = [] }) {
  const contract = new ethersLib.Contract(address, abi, provider);
  if (typeof contract[method] !== 'function') throw new ApiError(`Unknown method: ${method}`);
  return contract[method](...params);
}

export async function readByName({ ethersLib, provider, name, method, params = [], chainId }) {
  const [abi] = await Promise.all([loadAbi(name)]);
  const address = resolveAddress(name, chainId);
  if (!address) throw new ApiError(`No address registered for ${name} on chain ${chainId}`, { code: 'no_address' });
  return readContract({ ethersLib, provider, address, abi, method, params });
}

/** Fallback read through the backend gateway. */
export async function readViaApi(apiClient, { address, abi, method, params = [], chainId }) {
  const res = await apiClient.post('/api/contracts/read', { address, abi, method, params, chainId });
  return res?.data?.result;
}

export async function readTokenBalance({ ethersLib, provider, tokenAddress, account, decimals = 18 }) {
  const erc20 = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
  ];
  const contract = new ethersLib.Contract(tokenAddress, erc20, provider);
  const [raw, dec, symbol] = await Promise.all([
    contract.balanceOf(account),
    contract.decimals().catch(() => decimals),
    contract.symbol().catch(() => 'TOKEN'),
  ]);
  return { raw, formatted: ethersLib.utils.formatUnits(raw, dec), decimals: Number(dec), symbol };
}
