import { tooManyRequests } from '../../utils/errors.js';

/**
 * Fixed-window in-process rate limiter keyed by client IP (or a custom key
 * resolver). Guard rail only — not a distributed quota.
 */
export function createRateLimiter({ windowMs = 60000, max = 120, keyResolver } = {}) {
  const hits = new Map();

  // Periodic sweep so the map cannot grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  sweep.unref?.();

  const middleware = (req, res, next) => {
    const key = keyResolver ? keyResolver(req) : req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(tooManyRequests());
    }
    return next();
  };

  middleware.stop = () => clearInterval(sweep);
  middleware.size = () => hits.size;
  return middleware;
}

export default createRateLimiter;
