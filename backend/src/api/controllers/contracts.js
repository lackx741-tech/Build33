import { validateContractRead } from '../middleware/validation.js';
import { badRequest } from '../../utils/errors.js';
import { logger } from '../../logging/logger.js';
import CacheService from '../../services/cache.js';

/**
 * POST /api/contracts/read — read-only contract call. The caller supplies the
 * ABI (or a registered contract name), the method and params. Only view/pure
 * methods are accepted; state-changing methods are rejected.
 */
export function contractsReadController({ provider, registry, cache }) {
  return async function readContract(req, res, next) {
    try {
      const { address, abi, method, params } = validateContractRead(req.body);
      const chainId = Number(req.get('x-chain-id') || req.body.chainId || 56);
      const { web3 } = provider.get(chainId);

      const contract = new web3.eth.Contract(abi, address);
      const fn = contract.methods[method];
      if (typeof fn !== 'function') throw badRequest(`Method not found in ABI: ${method}`);

      const abiEntry = abi.find((e) => e.type === 'function' && e.name === method);
      if (abiEntry && abiEntry.stateMutability && !['view', 'pure'].includes(abiEntry.stateMutability)) {
        throw badRequest(`Method ${method} is state-changing and cannot be called via contracts/read`);
      }

      const run = async () => fn(...params).call();
      const cacheKey = cache
        ? CacheService.key('contract', chainId, address, method, JSON.stringify(params))
        : null;

      const result = cacheKey ? await cache.remember(cacheKey, run, 15) : await run();
      res.json({ ok: true, data: { method, address, chainId, result } });
    } catch (err) {
      if (err.status && err.status < 500) return next(err);
      logger.warn('contracts.read failed', { error: err.message });
      return next(err);
    }
  };
}

export default contractsReadController;
