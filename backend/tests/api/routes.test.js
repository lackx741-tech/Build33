import request from 'supertest';
import { createApp } from '../../src/app.js';
import { makeDeps } from '../helpers/fakes.js';
import { badRequest } from '../../src/utils/errors.js';

/** Node.js test category: API routes. */

function appWith(overrides) {
  return createApp(makeDeps(overrides));
}

const AUTH = { 'x-api-key': 'test-key' };

describe('API routes', () => {
  test('GET /api/health is public and returns a snapshot', async () => {
    const res = await request(appWith()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.service).toBe('blower-backend');
  });

  test('GET /api/health returns 503 when unhealthy', async () => {
    const deps = makeDeps();
    deps.monitoring = { snapshot: async () => ({ ok: false, checks: {}, service: 'blower-backend' }) };
    const res = await request(createApp(deps)).get('/api/health');
    expect(res.status).toBe(503);
  });

  test('GET /api/networks lists BSC networks', async () => {
    const res = await request(appWith()).get('/api/networks').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.networks.map((n) => n.chainId)).toEqual(expect.arrayContaining([56, 97]));
  });

  test('protected routes reject a missing API key', async () => {
    const res = await request(appWith()).get('/api/configuration');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });

  test('protected routes reject a wrong API key', async () => {
    const res = await request(appWith()).get('/api/configuration').set({ 'x-api-key': 'nope' });
    expect(res.status).toBe(401);
  });

  test('GET /api/configuration returns redacted configuration', async () => {
    const res = await request(appWith()).get('/api/configuration').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.API_KEY).toBe('***');
  });

  test('PATCH /api/configuration updates a non-secret key', async () => {
    const res = await request(appWith())
      .patch('/api/configuration')
      .set(AUTH)
      .send({ key: 'CACHE_TTL', value: 120 });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ key: 'CACHE_TTL', value: 120 });
  });

  // Regression: an async handler that throws must produce an error envelope
  // rather than leaving the request hanging (Express 4 does not await handlers).
  test('an async handler that rejects yields an error envelope, not a hang', async () => {
    const deps = makeDeps();
    deps.configService = {
      publicView: () => ({}),
      async set() {
        throw badRequest('Configuration key API_KEY cannot be changed at runtime');
      },
    };
    const res = await request(createApp(deps))
      .patch('/api/configuration')
      .set(AUTH)
      .send({ key: 'API_KEY', value: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  test('POST /api/rpc validates the payload', async () => {
    const res = await request(appWith())
      .post('/api/rpc')
      .set(AUTH)
      .send({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] });
    expect(res.status).toBe(200);
    expect(res.body.result).toBeDefined();
  });

  test('POST /api/rpc rejects a disallowed method', async () => {
    const res = await request(appWith())
      .post('/api/rpc')
      .set(AUTH)
      .send({ jsonrpc: '2.0', id: 1, method: 'debug_traceTransaction' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  test('POST /api/contracts/read performs a view call', async () => {
    const res = await request(appWith())
      .post('/api/contracts/read')
      .set(AUTH)
      .send({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        abi: [{ type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [] }],
        method: 'totalSupply',
        params: [],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('totalSupply');
  });

  test('POST /api/contracts/read rejects a state-changing method', async () => {
    const res = await request(appWith())
      .post('/api/contracts/read')
      .set(AUTH)
      .send({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        abi: [{ type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [], outputs: [] }],
        method: 'transfer',
        params: [],
      });
    expect(res.status).toBe(400);
  });

  test('POST /api/transactions/watch registers a hash', async () => {
    const hash = `0x${'a'.repeat(64)}`;
    const res = await request(appWith())
      .post('/api/transactions/watch')
      .set(AUTH)
      .send({ txHash: hash, network: 'bsc' });
    expect(res.status).toBe(202);
    expect(res.body.data.watching).toBe(true);
  });

  test('POST /api/transactions/watch rejects a malformed hash', async () => {
    const res = await request(appWith())
      .post('/api/transactions/watch')
      .set(AUTH)
      .send({ txHash: '0x123' });
    expect(res.status).toBe(400);
  });

  test('unknown routes return a 404 envelope', async () => {
    const res = await request(appWith()).get('/api/does-not-exist').set(AUTH);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
