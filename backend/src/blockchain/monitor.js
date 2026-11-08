import { logger } from '../logging/logger.js';

/**
 * Watches pending transactions submitted through the API until they are mined,
 * then publishes transaction.confirmed / transaction.failed on the event bus.
 */
export class TransactionMonitor {
  constructor({ provider, bus, pollIntervalMs = 5000, maxAttempts = 120 } = {}) {
    this.provider = provider;
    this.bus = bus;
    this.pollIntervalMs = pollIntervalMs;
    this.maxAttempts = maxAttempts;
    this.watched = new Map();
    this.timer = null;
  }

  watch(txHash, { network = 'bsc', meta = {} } = {}) {
    if (this.watched.has(txHash)) return;
    this.watched.set(txHash, { network, meta, attempts: 0 });
    logger.info('monitor.watch', { txHash, network });
    this.ensureTimer();
  }

  ensureTimer() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick().catch((err) => logger.error('monitor.tick failed', { error: err.message }));
    }, this.pollIntervalMs);
    this.timer.unref?.();
  }

  async tick() {
    if (this.watched.size === 0) {
      clearInterval(this.timer);
      this.timer = null;
      return;
    }

    for (const [txHash, entry] of this.watched) {
      entry.attempts += 1;
      try {
        const { web3 } = this.provider.get(entry.network);
        const receipt = await web3.eth.getTransactionReceipt(txHash);

        if (receipt) {
          const confirmed = Number(receipt.status) === 1;
          this.bus.publish(confirmed ? 'transaction.confirmed' : 'transaction.failed', {
            txHash,
            blockNumber: Number(receipt.blockNumber),
            status: Number(receipt.status),
            gasUsed: receipt.gasUsed?.toString(),
            ...entry.meta,
          });
          this.watched.delete(txHash);
        } else if (entry.attempts >= this.maxAttempts) {
          this.bus.publish('transaction.failed', { txHash, reason: 'timeout', ...entry.meta });
          this.watched.delete(txHash);
        }
      } catch (err) {
        logger.warn('monitor.poll error', { txHash, error: err.message });
      }
    }
  }

  pending() {
    return [...this.watched.keys()];
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.watched.clear();
  }
}

export default TransactionMonitor;
