import { AppError, toEnvelope } from '../../utils/errors.js';
import { logger } from '../../logging/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    error: { code: 'not_found', message: `No route for ${req.method} ${req.path}` },
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err instanceof AppError ? err.status : 500;
  const envelope = toEnvelope(err);

  const log = status >= 500 ? logger.error : logger.warn;
  log('http.error', { method: req.method, path: req.path, status, code: envelope.error.code, message: err.message });

  res.status(status).json(envelope);
}

export default errorHandler;
