/**
 * Derive the WebSocket URL from the current page origin so the default build
 * works behind the reverse proxy without extra configuration.
 */
function defaultWsUrl() {
  if (typeof window === 'undefined' || !window.location?.host) return '/ws';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

/** Application-wide runtime configuration resolved from Vite env vars. */
export const appConfig = {
  // Empty string means "same origin", i.e. served behind the reverse proxy.
  apiUrl: import.meta.env?.VITE_API_URL ?? '',
  phpApiUrl: import.meta.env?.VITE_PHP_API_URL ?? '',
  wsUrl: import.meta.env?.VITE_WS_URL || defaultWsUrl(),
  apiKey: import.meta.env?.VITE_API_KEY || '',
  defaultChainId: Number(import.meta.env?.VITE_CHAIN_ID || 56),
  requestTimeoutMs: 15000,
  wsReconnectMs: 3000,
  maxWsReconnectAttempts: 10,
};

export default appConfig;
