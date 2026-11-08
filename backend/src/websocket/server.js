import { WebSocketServer } from 'ws';
import { URL } from 'node:url';
import { logger } from '../logging/logger.js';

const HEARTBEAT_INTERVAL = 30000;
const MAX_MESSAGE_BYTES = 16 * 1024;

/** Event names a client may subscribe to (spec §9). */
export const EVENT_CATALOGUE = [
  'application.ready',
  'wallet.connected',
  'wallet.disconnected',
  'network.changed',
  'transaction.submitted',
  'transaction.confirmed',
  'transaction.failed',
  'contract.event',
  'system.health',
  'system.error',
];

/**
 * Persistent WebSocket service. Clients authenticate with an API key (query
 * string or first message), subscribe to event names and receive structured
 * envelopes. Connections are validated, filtered and heartbeat-monitored.
 */
export class WebSocketHub {
  constructor({ server, config, bus, authenticate }) {
    this.config = config;
    this.bus = bus;
    this.authenticate = authenticate;
    this.wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });
    this.clients = new Set();
    this.heartbeat = null;
    this.#bind();
  }

  #bind() {
    this.wss.on('connection', (socket, req) => this.#onConnection(socket, req));
    this.wss.on('error', (err) => logger.error('ws.server error', { error: err.message }));

    this.heartbeat = setInterval(() => this.#sweep(), HEARTBEAT_INTERVAL);
    this.heartbeat.unref?.();

    this.bus.on('*', (envelope) => this.broadcast(envelope));
  }

  #onConnection(socket, req) {
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return socket.close(1008, 'bad request');
    }

    const auth = this.authenticate({
      apiKey: url.searchParams.get('apiKey') || req.headers['x-api-key'],
    });
    if (!auth.ok) {
      logger.warn('ws.reject', { reason: auth.reason });
      return socket.close(1008, 'unauthorized');
    }

    socket.isAlive = true;
    socket.subscriptions = new Set(EVENT_CATALOGUE);
    this.clients.add(socket);

    socket.on('pong', () => { socket.isAlive = true; });
    socket.on('message', (data) => this.#onMessage(socket, data));
    socket.on('close', () => this.clients.delete(socket));
    socket.on('error', (err) => logger.warn('ws.client error', { error: err.message }));

    this.#send(socket, 'application.ready', { message: 'subscribed', catalogue: EVENT_CATALOGUE });
  }

  #onMessage(socket, data) {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return this.#send(socket, 'system.error', { code: 'bad_json', message: 'Message must be JSON' });
    }

    if (!msg || typeof msg.type !== 'string') {
      return this.#send(socket, 'system.error', { code: 'bad_schema', message: 'Missing "type"' });
    }

    switch (msg.type) {
      case 'subscribe': {
        const names = Array.isArray(msg.events) ? msg.events : [];
        const invalid = names.filter((n) => !EVENT_CATALOGUE.includes(n));
        if (invalid.length) {
          return this.#send(socket, 'system.error', { code: 'bad_event', message: `Unknown events: ${invalid.join(', ')}` });
        }
        socket.subscriptions = new Set(names);
        return this.#send(socket, 'system.health', { subscribed: [...socket.subscriptions] });
      }
      case 'ping':
        return this.#send(socket, 'system.health', { pong: true, timestamp: new Date().toISOString() });
      case 'replay': {
        const limit = Math.min(Number(msg.limit) || 20, 200);
        return this.#send(socket, 'system.health', { replay: this.bus.recent(limit) });
      }
      default:
        return this.#send(socket, 'system.error', { code: 'unknown_type', message: `Unknown type: ${msg.type}` });
    }
  }

  #send(socket, event, payload) {
    if (socket.readyState !== socket.OPEN) return;
    socket.send(JSON.stringify({ event, payload, timestamp: new Date().toISOString() }));
  }

  broadcast(envelope) {
    for (const socket of this.clients) {
      if (socket.readyState !== socket.OPEN) continue;
      if (socket.subscriptions && !socket.subscriptions.has(envelope.event)) continue;
      socket.send(JSON.stringify(envelope));
    }
  }

  #sweep() {
    for (const socket of this.clients) {
      if (socket.isAlive === false) {
        logger.debug('ws.terminate stale client');
        socket.terminate();
        this.clients.delete(socket);
        continue;
      }
      socket.isAlive = false;
      try { socket.ping(); } catch { /* ignore */ }
    }
  }

  get clientCount() {
    return this.clients.size;
  }

  async close() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    for (const socket of this.clients) socket.close(1001, 'server shutting down');
    await new Promise((res) => this.wss.close(res));
  }
}

export default WebSocketHub;
