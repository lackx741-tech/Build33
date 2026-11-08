import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { buildApiRouter, buildPublicRouter } from './api/routes/index.js';
import { createAuthMiddleware } from './api/middleware/authentication.js';
import { createRateLimiter } from './api/middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './api/middleware/error.js';
import { logger } from './logging/logger.js';

/**
 * Compose the Express application from injected dependencies. Kept free of
 * process concerns (listen, signals) so it can be instantiated in tests.
 */
export function createApp(deps) {
  const { config } = deps;
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: config.CORS_ORIGINS?.length ? config.CORS_ORIGINS : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Network', 'X-Chain-Id', 'Authorization'],
  }));
  app.use(express.json({ limit: '256kb' }));

  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      logger.debug('http.request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - started,
      });
    });
    next();
  });

  app.use(createRateLimiter({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
  }));

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'blower-backend', docs: '/api/health' });
  });

  app.use('/api', buildPublicRouter(deps));
  app.use('/api', createAuthMiddleware(config), buildApiRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
