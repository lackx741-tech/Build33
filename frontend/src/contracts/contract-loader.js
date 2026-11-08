import { appConfig } from '../config/app.config.js';

/** Bundled ABIs keyed by contract name. */
const ABIS = {
  ConfigurationRegistry: () => import('./abi/ConfigurationRegistry.json', { with: { type: 'json' } }),
  PermissionRegistry: () => import('./abi/PermissionRegistry.json', { with: { type: 'json' } }),
  UserAuthorization: () => import('./abi/UserAuthorization.json', { with: { type: 'json' } }),
  TransactionRegistry: () => import('./abi/TransactionRegistry.json', { with: { type: 'json' } }),
};

/**
 * Deployment addresses per chain id. Injected at build time via
 * VITE_CONTRACT_<NAME>_ADDRESS_<CHAINID>; falls back to a runtime registry.
 */
const runtimeAddresses = new Map();

export function registerAddress(name, chainId, address) {
  runtimeAddresses.set(`${name}:${chainId}`, address);
}

export function resolveAddress(name, chainId) {
  const runtime = runtimeAddresses.get(`${name}:${chainId}`);
  if (runtime) return runtime;
  const envKey = `VITE_CONTRACT_${name.toUpperCase()}_ADDRESS_${chainId}`;
  return import.meta.env?.[envKey] || null;
}

export function loadAbi(name) {
  const loader = ABIS[name];
  if (!loader) throw new Error(`Unknown contract: ${name}`);
  return loader().then((mod) => mod.default ?? mod);
}

export function listContracts() {
  return Object.keys(ABIS);
}

export { appConfig };
