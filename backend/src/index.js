import http from 'node:http';
import { loadConfig } from './config/environment.js';
import { logger } from './logging/logger.js';
import { createApp } from './app.js';
import { BlockchainProvider } from './blockchain/provider.js';
import { ContractRegistry } from './blockchain/contracts.js';
import { TransactionMonitor } from './blockchain/monitor.js';
import { eventBus } from './blockchain/events.js';
import { WebSocketHub } from './websocket/server.js';
import { authenticateCredential } from './api/middleware/authentication.js';
import { CacheService } from './services/cache.js';
import { ConfigurationService } from './services/configuration.js';
import { MonitoringService } from './services/monitoring.js';
import { Database } from './database/index.js';
import { createBot } from './telegram/bot.js';

const HEALTH_INTERVAL_MS = 60000;

async function main() {
  const config = loadConfig({ exitOnError: true });

  const cache = new CacheService({ ttl: config.CACHE_TTL });
  const db = new Database({ connectionString: config.DATABASE_URL, ssl: config.PGSSLMODE === 'require' });
  const provider = new BlockchainProvider(config);
  const registry = new ContractRegistry(config, provider);
  const monitor = new TransactionMonitor({ provider, bus: eventBus });
  const configService = new ConfigurationService({ config, db, cache });
  const monitoring = new MonitoringService({ provider, db, cache, bus: eventBus, startedAt: Date.now() });

  await configService.init();

  const app = createApp({ config, monitoring, configService, provider, registry, cache, monitor, bus: eventBus });
  const server = http.createServer(app);

  const wsHub = new WebSocketHub({
    server,
    config,
    bus: eventBus,
    authenticate: (creds) => authenticateCredential(config, creds),
  });
  monitoring.wsHub = wsHub;

  const bot = createBot({ config, monitoring, provider, registry, configService, monitor, bus: eventBus, authorizer: null });

  const healthTimer = setInterval(() => {
    monitoring.publishHealth().catch((err) => logger.error('health.poll failed', { error: err.message }));
  }, HEALTH_INTERVAL_MS);
  healthTimer.unref?.();

  server.listen(config.PORT, () => {
    logger.info('server.started', { port: config.PORT, env: config.NODE_ENV });
    eventBus.publish('application.ready', { port: config.PORT });
  });

  if (bot) {
    bot.launch().then(() => logger.info('telegram.launched')).catch((err) =>
      logger.error('telegram.launch failed', { error: err.message }),
    );
  }

  const shutdown = async (signal) => {
    logger.info('server.shutdown', { signal });
    clearInterval(healthTimer);
    bot?.stop(signal);
    monitor.stop();
    await wsHub.close().catch(() => {});
    server.close();
    await db.close().catch(() => {});
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', { reason: reason?.message || String(reason) });
    eventBus.publish('system.error', { message: 'unhandledRejection' });
  });
}

main().catch((err) => {
  logger.error('fatal.startup', { error: err.message, stack: err.stack });
  process.exit(1);
});
