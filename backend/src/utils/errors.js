/** Typed application error with an HTTP status and stable machine code. */
export class AppError extends Error {
  constructor(message, { status = 500, code = 'internal_error', details = null, cause } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    if (cause) this.cause = cause;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (msg, details) => new AppError(msg, { status: 400, code: 'bad_request', details });
export const unauthorized = (msg = 'Unauthorized') => new AppError(msg, { status: 401, code: 'unauthorized' });
export const forbidden = (msg = 'Forbidden') => new AppError(msg, { status: 403, code: 'forbidden' });
export const notFound = (msg = 'Not found') => new AppError(msg, { status: 404, code: 'not_found' });
export const tooManyRequests = (msg = 'Rate limit exceeded') => new AppError(msg, { status: 429, code: 'rate_limited' });
export const upstreamError = (msg, details) => new AppError(msg, { status: 502, code: 'upstream_error', details });

/** Normalize any thrown value into the shared error envelope. */
export function toEnvelope(err) {
  const isApp = err instanceof AppError;
  return {
    ok: false,
    error: {
      code: isApp ? err.code : 'internal_error',
      message: isApp ? err.message : 'Internal server error',
      ...(isApp && err.details ? { details: err.details } : {}),
    },
  };
}
