/** Typed wrappers over the shared API surface (Node service or PHP gateway). */

export const Endpoints = {
  health: '/api/health',
  networks: '/api/networks',
  configuration: '/api/configuration',
  rpc: '/api/rpc',
  contractsRead: '/api/contracts/read',
  estimate: '/api/transactions/estimate',
  watch: '/api/transactions/watch',
  txStatus: (hash) => `/api/transactions/${hash}`,
};

export function makeApi(client) {
  return {
    health: (deep = false) => client.get(`${Endpoints.health}${deep ? '?deep=1' : ''}`),
    networks: () => client.get(Endpoints.networks),
    configuration: () => client.get(Endpoints.configuration),
    rpc: (payload, network) => client.post(Endpoints.rpc, payload, { headers: network ? { 'X-Network': network } : {} }),
    readContract: (payload, chainId) =>
      client.post(Endpoints.contractsRead, payload, { headers: chainId ? { 'X-Chain-Id': String(chainId) } : {} }),
    estimate: (payload) => client.post(Endpoints.estimate, payload),
    watch: (txHash, network) => client.post(Endpoints.watch, { txHash, network }),
    txStatus: (hash, network) => client.get(`${Endpoints.txStatus(hash)}${network ? `?network=${network}` : ''}`),
  };
}

export default Endpoints;
