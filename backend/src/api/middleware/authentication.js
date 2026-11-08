import { unauthorized } from '../../utils/errors.js';

/**
 * API-key authentication. When no API_KEY is configured the middleware is a
 * no-op (development only) — production config validation warns about this.
 */
export function createAuthMiddleware(config) {
  const expected = config.API_KEY;
  const required = Boolean(expected);

  return function authenticate(req, _res, next) {
    if (!required) return next();
    const provided = req.get('x-api-key') || (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!provided || provided !== expected) {
      return next(unauthorized('Invalid or missing API key'));
    }
    return next();
  };
}

/**
 * Standalone credential check reused by the WebSocket hub.
 * @returns {{ok: boolean, reason?: string}}
 */
export function authenticateCredential(config, { apiKey } = {}) {
  if (!config.API_KEY) return { ok: true, reason: 'auth_disabled' };
  if (apiKey && apiKey === config.API_KEY) return { ok: true };
  return { ok: false, reason: 'invalid_api_key' };
}

export default createAuthMiddleware;
