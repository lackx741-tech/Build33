/**
 * Dry-run a transaction: gas estimate plus a static call where possible.
 * Failures here should block submission before the user is asked to sign.
 */
export async function simulate({ ethersLib, provider, tx }) {
  const result = { ok: false, gasLimit: null, gasPrice: null, estimatedCost: null, revertReason: null };

  try {
    const [gasLimit, gasPrice] = await Promise.all([
      provider.estimateGas(tx),
      provider.getGasPrice().catch(() => null),
    ]);
    result.gasLimit = gasLimit.toString();
    result.gasPrice = gasPrice ? gasPrice.toString() : null;
    result.estimatedCost = gasPrice ? gasLimit.mul(gasPrice).toString() : null;
    result.ok = true;
  } catch (err) {
    result.revertReason = err?.reason || err?.message || 'Estimation failed';
    return result;
  }

  // Static call gives a clearer revert reason for contract calls.
  if (tx.data && tx.data !== '0x') {
    try {
      await provider.call(tx);
    } catch (err) {
      result.ok = false;
      result.revertReason = err?.reason || err?.message || 'Static call reverted';
    }
  }

  return result;
}
