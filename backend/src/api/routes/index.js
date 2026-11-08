import { Router } from 'express';
import { healthController } from '../controllers/health.js';
import { networksController } from '../controllers/networks.js';
import { configurationController, updateConfigurationController } from '../controllers/configuration.js';
import { rpcController } from '../controllers/rpc.js';
import { contractsReadController } from '../controllers/contracts.js';
import { estimateController, watchController, statusController } from '../controllers/transactions.js';
import { asyncHandler } from '../middleware/async-handler.js';

/** Public router: endpoints safe to expose without an API key. */
export function buildPublicRouter({ config, monitoring }) {
  const router = Router();
  router.get('/health', asyncHandler(healthController(monitoring)));
  router.get('/networks', asyncHandler(networksController(config)));
  return router;
}

/**
 * Protected router: everything behind API-key auth. Dependencies are injected
 * so the router can be constructed in tests with fakes.
 */
export function buildApiRouter(deps) {
  const { config, monitoring, configService, provider, registry, cache, monitor, bus } = deps;
  const router = Router();

  router.get('/health', asyncHandler(healthController(monitoring)));
  router.get('/networks', asyncHandler(networksController(config)));
  router.get('/configuration', asyncHandler(configurationController(configService)));
  router.patch('/configuration', asyncHandler(updateConfigurationController(configService)));

  router.post('/rpc', asyncHandler(rpcController({ config, provider })));
  router.post('/contracts/read', asyncHandler(contractsReadController({ provider, registry, cache })));

  router.post('/transactions/estimate', asyncHandler(estimateController({ provider })));
  router.post('/transactions/watch', asyncHandler(watchController({ monitor, bus })));
  router.get('/transactions/:hash', asyncHandler(statusController({ provider })));

  return router;
}

export default buildApiRouter;
