import { validateRpcPayload } from '../middleware/validation.js';
import { upstreamError } from '../../utils/errors.js';
import { logger } from '../../logging/logger.js';

/**
 * POST /api/rpc — JSON-RPC proxy. Validates the payload, forwards it to the
 * configured upstream provider for the requested network and returns the
 * upstream response unchanged. The upstream URL is never echoed back.
 */
export function rpcController({ config, provider }) {
  return async function rpc(req, res, next) {
    try {
      const calls = validateRpcPayload(req.body);
      const network = req.get('x-network') || req.query.network || 'bsc';
      const { web3 } = provider.get(network);

      const send = (call) =>
        web3.currentProvider.request({
          jsonrpc: '2.0',
          id: call.id ?? null,
          method: call.method,
          params: call.params || [],
        });

      const result = Array.isArray(req.body)
        ? await Promise.all(calls.map(send))
        : await send(calls[0]);

      res.json(result);
    } catch (err) {
      if (err.status && err.status < 500) return next(err);
      logger.warn('rpc.proxy failed', { error: err.message });
      return next(upstreamError('Upstream RPC request failed', { reason: err.message }));
    }
  };
}

export default rpcController;
