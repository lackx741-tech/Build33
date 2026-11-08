/**
 * Wait for a transaction receipt and report confirmations. Prefers the ethers
 * provider; falls back to polling through the backend status endpoint.
 */
export async function waitForReceipt({ provider, hash, confirmations = 1, timeoutMs = 180000, onUpdate }) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const receipt = await provider.getTransactionReceipt(hash).catch(() => null);
    if (receipt) {
      if (receipt.confirmations >= confirmations) {
        onUpdate?.({ status: receipt.status === 1 ? 'confirmed' : 'failed', receipt });
        return { status: receipt.status === 1 ? 'confirmed' : 'failed', receipt };
      }
      onUpdate?.({ status: 'mining', confirmations: receipt.confirmations });
    } else {
      onUpdate?.({ status: 'pending' });
    }
    await sleep(3000);
  }

  onUpdate?.({ status: 'timeout' });
  return { status: 'timeout', receipt: null };
}

export async function pollViaApi(api, hash, { network, intervalMs = 4000, timeoutMs = 180000, onUpdate } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const res = await api.txStatus(hash, network).catch(() => null);
    const status = res?.data?.status;
    onUpdate?.({ status, receipt: res?.data?.receipt || null });
    if (status === 'confirmed' || status === 'failed') return { status, receipt: res?.data?.receipt || null };
    await sleep(intervalMs);
  }
  return { status: 'timeout', receipt: null };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
