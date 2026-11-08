import { validateEstimate, validateTransactionHash } from '../middleware/validation.js';
import { badRequest } from '../../utils/errors.js';

/**
 * POST /api/transactions/estimate — gas estimate for a candidate transaction.
 * This never signs or sends anything; the client signs locally after the user
 * approves the displayed parameters.
 */
export function estimateController({ provider }) {
  return async function estimate(req, res, next) {
    try {
      const { from, to, value, data, network } = validateEstimate(req.body);
      const { web3 } = provider.get(network || 'bsc');

      const tx = { to, data, value };
      if (from) tx.from = from;

      const [gas, gasPrice] = await Promise.all([
        web3.eth.estimateGas(tx),
        web3.eth.getGasPrice().catch(() => null),
      ]);

      const gasLimit = gas.toString();
      const gasPriceWei = gasPrice ? gasPrice.toString() : null;
      const estimatedCostWei = gasPrice ? (BigInt(gas) * BigInt(gasPrice)).toString() : null;

      res.json({
        ok: true,
        data: { gasLimit, gasPriceWei, estimatedCostWei, network: network || 'bsc' },
      });
    } catch (err) {
      if (err.status && err.status < 500) return next(err);
      return next(badRequest('Gas estimation failed', { reason: err.message }));
    }
  };
}

/** POST /api/transactions/watch — register a submitted hash for monitoring. */
export function watchController({ monitor, bus }) {
  return async function watch(req, res, next) {
    try {
      const txHash = validateTransactionHash(req.body?.txHash);
      const network = req.body?.network || 'bsc';

      bus.publish('transaction.submitted', { txHash, network });
      monitor.watch(txHash, { network, meta: { source: 'api' } });

      res.status(202).json({ ok: true, data: { txHash, network, watching: true } });
    } catch (err) {
      return next(err);
    }
  };
}

/** GET /api/transactions/:hash — current receipt status. */
export function statusController({ provider }) {
  return async function status(req, res, next) {
    try {
      const txHash = validateTransactionHash(req.params.hash);
      const network = req.query.network || 'bsc';
      const { web3 } = provider.get(network);

      const [receipt, tx] = await Promise.all([
        web3.eth.getTransactionReceipt(txHash),
        web3.eth.getTransaction(txHash),
      ]);

      res.json({
        ok: true,
        data: {
          txHash,
          network,
          status: receipt ? (Number(receipt.status) === 1 ? 'confirmed' : 'failed') : (tx ? 'pending' : 'unknown'),
          receipt: receipt
            ? { blockNumber: Number(receipt.blockNumber), gasUsed: receipt.gasUsed?.toString(), status: Number(receipt.status) }
            : null,
        },
      });
    } catch (err) {
      return next(err);
    }
  };
}

export default estimateController;
