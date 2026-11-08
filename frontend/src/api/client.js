import { appConfig } from '../config/app.config.js';
import { ApiError } from '../utils/errors.js';

/**
 * Small fetch wrapper with a timeout, JSON handling, API-key injection and a
 * normalized error type. `baseUrl` is selectable so the app can talk to either
 * the Node service or the PHP gateway (same route shapes).
 */
export function createClient({ baseUrl = appConfig.apiUrl, apiKey = appConfig.apiKey, timeoutMs = appConfig.requestTimeoutMs, fetchImpl } = {}) {
  const doFetch = fetchImpl || globalThis.fetch?.bind(globalThis);

  async function request(path, { method = 'GET', body, headers = {}, signal } = {}) {
    if (!doFetch) throw new ApiError('fetch is not available in this environment', { code: 'no_fetch' });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const combined = signal ? AbortSignal.any?.([signal, controller.signal]) ?? controller.signal : controller.signal;

    try {
      const res = await doFetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: combined,
      });

      const text = await res.text();
      const json = text ? safeParse(text) : null;

      if (!res.ok) {
        throw new ApiError(json?.error?.message || `Request failed (${res.status})`, {
          code: json?.error?.code || 'http_error',
          status: res.status,
          details: json?.error?.details || null,
        });
      }
      return json;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err?.name === 'AbortError') throw new ApiError('Request timed out', { code: 'timeout' });
      throw new ApiError(err.message || 'Network error', { code: 'network_error' });
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    baseUrl,
    get: (path, opts) => request(path, { ...opts, method: 'GET' }),
    post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
    patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
    request,
  };
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const apiClient = createClient();
// The PHP gateway is reached through the reverse proxy at `/rpc`, which is
// stripped before forwarding, so its own `/api/*` routes stay unchanged.
export const phpClient = createClient({ baseUrl: appConfig.phpApiUrl || '/rpc' });
export default createClient;
