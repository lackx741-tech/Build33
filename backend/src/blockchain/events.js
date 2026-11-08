import { EventEmitter } from 'node:events';
import { logger } from '../logging/logger.js';

/**
 * Event bus that bridges on-chain events, transaction lifecycle updates and
 * system events to the WebSocket hub and the Telegram notifier.
 *
 * Event names are namespaced (e.g. "transaction.confirmed", "contract.event")
 * and match the WebSocket event catalogue in the specification.
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    this.history = [];
    this.historyLimit = 200;
  }

  /** Emit and retain the event so late subscribers can replay recent history. */
  publish(name, payload = {}) {
    const envelope = {
      event: name,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.history.push(envelope);
    if (this.history.length > this.historyLimit) this.history.shift();
    logger.debug('event.publish', { event: name });
    this.emit(name, envelope);
    this.emit('*', envelope);
    return envelope;
  }

  recent(limit = 50) {
    return this.history.slice(-limit);
  }
}

export const eventBus = new EventBus();
export default eventBus;
