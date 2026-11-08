import { networks, SUPPORTED_CHAIN_IDS } from '../../config/networks.js';

/** GET /api/networks — network metadata plus the configured default. */
export function networksController(config) {
  return async function listNetworks(_req, res) {
    res.json({
      ok: true,
      default: config.BSC_CHAIN_ID,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      networks: Object.values(networks).map((n) => ({
        key: n.key,
        chainId: n.chainId,
        name: n.name,
        nativeCurrency: n.nativeCurrency,
        explorer: n.explorer,
      })),
    });
  };
}

export default networksController;
