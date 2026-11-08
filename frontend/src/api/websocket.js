import { appConfig } from '../config/app.config.js';

/**
 * Reconnecting WebSocket client for the backend event hub. Supports
 * subscribe/ping frames and exposes an event handler map.
 */
export function createEventSocket({ url = appConfig.wsUrl, apiKey = appConfig.apiKey, reconnectMs = appConfig.wsReconnectMs, maxAttempts = appConfig.maxWsReconnectAttempts, WebSocketImpl } = {}) {
  const WS = WebSocketImpl || globalThis.WebSocket;
  const handlers = new Map();
  let socket = null;
  let attempts = 0;
  let closedByUser = false;

  function emit(event, payload) {
    handlers.get(event)?.forEach((fn) => fn(payload));
  }

  function connect() {
    const target = apiKey ? `${url}?apiKey=${encodeURIComponent(apiKey)}` : url;
    socket = new WS(target);

    socket.addEventListener('open', () => {
      attempts = 0;
      emit('open', {});
    });

    socket.addEventListener('message', (msg) => {
      let envelope;
      try {
        envelope = JSON.parse(typeof msg.data === 'string' ? msg.data : msg.data.toString());
      } catch {
        return;
      }
      emit(envelope.event, envelope.payload);
    });

    socket.addEventListener('close', () => {
      emit('close', {});
      if (closedByUser || attempts >= maxAttempts) return;
      attempts += 1;
      setTimeout(connect, reconnectMs * attempts);
    });

    socket.addEventListener('error', () => emit('error', {}));
  }

  return {
    connect,
    on(event, fn) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(fn);
      return () => handlers.get(event)?.delete(fn);
    },
    send(frame) {
      if (socket?.readyState === 1) socket.send(JSON.stringify(frame));
    },
    subscribe(events) {
      this.send({ type: 'subscribe', events });
    },
    ping() {
      this.send({ type: 'ping' });
    },
    close() {
      closedByUser = true;
      socket?.close();
    },
  };
}

export default createEventSocket;
