import { TelegramAuthorizer } from '../../src/telegram/auth.js';
import { redact, statusLine } from '../../src/telegram/commands/index.js';

/** Node.js test category: Telegram authorization. */

describe('TelegramAuthorizer', () => {
  test('authorizes configured admin ids only', () => {
    const authorizer = new TelegramAuthorizer({ TELEGRAM_ADMIN_IDS: ['42', '99'] });
    expect(authorizer.isAuthorized(42)).toBe(true);
    expect(authorizer.isAuthorized('99')).toBe(true);
    expect(authorizer.isAuthorized(7)).toBe(false);
    expect(authorizer.isAuthorized(undefined)).toBe(false);
  });

  test('middleware blocks unauthorized users and replies', async () => {
    const authorizer = new TelegramAuthorizer({ TELEGRAM_ADMIN_IDS: ['42'] });
    const replies = [];
    const ctx = { from: { id: 7, username: 'intruder' }, reply: async (msg) => replies.push(msg) };
    let nextCalled = false;

    await authorizer.middleware()(ctx, async () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(replies[0]).toMatch(/Unauthorized/);
  });

  test('middleware lets authorized users through', async () => {
    const authorizer = new TelegramAuthorizer({ TELEGRAM_ADMIN_IDS: ['42'] });
    let nextCalled = false;
    await authorizer.middleware()({ from: { id: 42 } }, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });
});

describe('Telegram output redaction', () => {
  test('redacts transaction hashes and secrets', () => {
    const text = `hash 0x${'a'.repeat(64)} token=super-secret-value`;
    const safe = redact(text);
    expect(safe).not.toContain('a'.repeat(64));
    expect(safe).not.toContain('super-secret-value');
  });

  test('statusLine maps booleans to indicators', () => {
    expect(statusLine(true)).toBe('🟢');
    expect(statusLine(false)).toBe('🔴');
  });
});
