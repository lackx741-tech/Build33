import { validate, schema } from '../../src/config/environment.js';

/** Node.js test category: configuration validation. */

describe('environment validation', () => {
  test('applies defaults and coerces types', () => {
    const { config, errors } = validate({ BSC_RPC_URL: 'https://rpc.example' });
    expect(errors).toEqual([]);
    expect(config.PORT).toBe(3000);
    expect(config.BSC_CHAIN_ID).toBe(56);
    expect(config.CACHE_TTL).toBe(300);
    expect(config.CORS_ORIGINS).toBe('http://localhost:5173');
  });

  test('parses comma separated lists', () => {
    const { config } = validate({
      BSC_RPC_URL: 'https://rpc.example',
      TELEGRAM_ADMIN_IDS: '1, 2 ,3',
      CORS_ORIGINS: 'https://a.example,https://b.example',
    });
    expect(config.TELEGRAM_ADMIN_IDS).toEqual(['1', '2', '3']);
    expect(config.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  });

  test('splits a single-origin CORS value into a list', () => {
    const { config } = validate({ BSC_RPC_URL: 'https://rpc.example', CORS_ORIGINS: 'http://localhost:5173' });
    expect(config.CORS_ORIGINS).toEqual(['http://localhost:5173']);
  });

  test('rejects non-integer numeric values', () => {
    const { errors } = validate({ BSC_RPC_URL: 'https://rpc.example', PORT: 'abc' });
    expect(errors.join(' ')).toMatch(/PORT must be an integer/);
  });

  test('rejects enum violations', () => {
    const { errors } = validate({ BSC_RPC_URL: 'https://rpc.example', NODE_ENV: 'banana' });
    expect(errors.join(' ')).toMatch(/NODE_ENV must be one of/);
  });

  test('the schema covers every documented variable', () => {
    const documented = [
      'NODE_ENV', 'PORT', 'BSC_RPC_URL', 'BSC_CHAIN_ID',
      'TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_IDS', 'LOG_LEVEL', 'CACHE_TTL',
    ];
    for (const key of documented) {
      expect(schema[key]).toBeDefined();
    }
  });
});
