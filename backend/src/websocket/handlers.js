import { EVENT_CATALOGUE } from './server.js';

export const MESSAGE_TYPES = ['subscribe', 'ping', 'replay'];

/** Parse an inbound frame, returning {ok, message} or {ok:false, code, error}. */
export function parseMessage(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw.toString());
  } catch {
    return { ok: false, code: 'bad_json', error: 'Message must be JSON' };
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
    return { ok: false, code: 'bad_schema', error: 'Missing "type"' };
  }
  if (!MESSAGE_TYPES.includes(parsed.type)) {
    return { ok: false, code: 'unknown_type', error: `Unknown type: ${parsed.type}` };
  }
  return { ok: true, message: parsed };
}

/** Validate a subscribe request against the event catalogue. */
export function validateSubscribe(events) {
  const names = Array.isArray(events) ? events : [];
  const invalid = names.filter((n) => !EVENT_CATALOGUE.includes(n));
  if (invalid.length) {
    return { ok: false, code: 'bad_event', error: `Unknown events: ${invalid.join(', ')}` };
  }
  return { ok: true, events: names };
}

/** Build the outbound envelope used on every frame. */
export function envelope(event, payload) {
  return JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
}
