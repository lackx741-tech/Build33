import http from 'node:http';
import { WebSocket } from 'ws';
import { WebSocketHub, EVENT_CATALOGUE } from '../../src/websocket/server.js';
import { EventBus } from '../../src/blockchain/events.js';
import { makeConfig } from '../helpers/fakes.js';

/**
 * Node.js test category: WebSocket authentication and event filtering.
 * These drive a real HTTP server and real ws clients over localhost.
 */

function startHub({ apiKey = 'test-key' } = {}) {
  const config = makeConfig({ API_KEY: apiKey });
  const bus = new EventBus();
  const server = http.createServer((_req, res) => res.end('ok'));
  const hub = new WebSocketHub({
    server,
    config,
    bus,
    authenticate: ({ apiKey: provided }) => {
      if (!apiKey) return { ok: true };
      return provided === apiKey ? { ok: true } : { ok: false, reason: 'invalid_api_key' };
    },
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ hub, bus, server, port, close: () => new Promise((r) => { hub.close().then(() => server.close(r)); }) });
    });
  });
}

function connect(port, query = '') {
  return new WebSocket(`ws://127.0.0.1:${port}/ws${query}`);
}

function nextMessage(socket, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for message')), timeoutMs);
    socket.once('message', (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function closeReason(socket, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for close')), timeoutMs);
    socket.once('close', (code, reason) => {
      clearTimeout(timer);
      resolve({ code, reason: reason.toString() });
    });
  });
}

describe('WebSocket hub', () => {
  test('rejects a connection without a valid API key', async () => {
    const ctx = await startHub();
    try {
      const socket = connect(ctx.port);
      const { code } = await closeReason(socket);
      expect(code).toBe(1008);
    } finally {
      await ctx.close();
    }
  });

  test('accepts a connection with a valid API key', async () => {
    const ctx = await startHub();
    try {
      const socket = connect(ctx.port, '?apiKey=test-key');
      const first = await nextMessage(socket);
      expect(first.event).toBe('application.ready');
      expect(first.payload.catalogue).toEqual(EVENT_CATALOGUE);
      socket.close();
    } finally {
      await ctx.close();
    }
  });

  test('responds to ping with a pong frame', async () => {
    const ctx = await startHub();
    try {
      const socket = connect(ctx.port, '?apiKey=test-key');
      await nextMessage(socket);
      socket.send(JSON.stringify({ type: 'ping' }));
      const pong = await nextMessage(socket);
      expect(pong.payload.pong).toBe(true);
      socket.close();
    } finally {
      await ctx.close();
    }
  });

  test('updates subscriptions and filters broadcasts', async () => {
    const ctx = await startHub();
    try {
      const socket = connect(ctx.port, '?apiKey=test-key');
      await nextMessage(socket);

      socket.send(JSON.stringify({ type: 'subscribe', events: ['transaction.confirmed'] }));
      const ack = await nextMessage(socket);
      expect(ack.payload.subscribed).toEqual(['transaction.confirmed']);

      // A non-subscribed event must not be delivered.
      ctx.bus.publish('system.health', { ok: true });

      ctx.bus.publish('transaction.confirmed', { txHash: '0xdead' });
      const delivered = await nextMessage(socket);
      expect(delivered.event).toBe('transaction.confirmed');
      expect(delivered.payload.txHash).toBe('0xdead');
      socket.close();
    } finally {
      await ctx.close();
    }
  });

  test('rejects unknown subscription names', async () => {
    const ctx = await startHub();
    try {
      const socket = connect(ctx.port, '?apiKey=test-key');
      await nextMessage(socket);
      socket.send(JSON.stringify({ type: 'subscribe', events: ['not.an.event'] }));
      const err = await nextMessage(socket);
      expect(err.event).toBe('system.error');
      expect(err.payload.code).toBe('bad_event');
      socket.close();
    } finally {
      await ctx.close();
    }
  });

  test('rejects malformed frames', async () => {
    const ctx = await startHub();
    try {
      const socket = connect(ctx.port, '?apiKey=test-key');
      await nextMessage(socket);
      socket.send('not-json');
      const err = await nextMessage(socket);
      expect(err.payload.code).toBe('bad_json');
      socket.close();
    } finally {
      await ctx.close();
    }
  });
});
