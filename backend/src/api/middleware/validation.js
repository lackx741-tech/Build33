import { badRequest } from '../../utils/errors.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const HEX_RE = /^0x[a-fA-F0-9]*$/;

export function isAddress(value) {
  return typeof value === 'string' && ADDRESS_RE.test(value);
}

export function isHex(value) {
  return typeof value === 'string' && HEX_RE.test(value);
}

export function isChainId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

/** Supported JSON-RPC methods the gateway is allowed to proxy. */
export const ALLOWED_RPC_METHODS = [
  'eth_blockNumber',
  'eth_chainId',
  'eth_call',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getLogs',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  'eth_sendRawTransaction',
  'net_version',
  'web3_clientVersion',
];

export function validateRpcPayload(body) {
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0) throw badRequest('Empty JSON-RPC payload');
  if (calls.length > 20) throw badRequest('Too many batched calls (max 20)');

  for (const call of calls) {
    if (!call || typeof call !== 'object') throw badRequest('JSON-RPC payload must be an object');
    if (call.jsonrpc !== '2.0') throw badRequest('jsonrpc must be "2.0"');
    if (typeof call.method !== 'string') throw badRequest('method must be a string');
    if (!ALLOWED_RPC_METHODS.includes(call.method)) {
      throw badRequest(`Method not allowed: ${call.method}`);
    }
    if (call.params !== undefined && !Array.isArray(call.params)) {
      throw badRequest('params must be an array');
    }
  }
  return calls;
}

export function validateContractRead(body) {
  const { address, abi, method, params = [] } = body || {};
  if (!isAddress(address)) throw badRequest('address must be a valid 0x-prefixed address');
  if (!Array.isArray(abi)) throw badRequest('abi must be an array');
  if (typeof method !== 'string' || !method) throw badRequest('method is required');
  if (!Array.isArray(params)) throw badRequest('params must be an array');
  return { address, abi, method, params };
}

export function validateEstimate(body) {
  const { from, to, value, data, network } = body || {};
  if (to !== undefined && !isAddress(to)) throw badRequest('to must be a valid address');
  if (from !== undefined && !isAddress(from)) throw badRequest('from must be a valid address');
  if (value !== undefined && !/^\d+$/.test(String(value))) throw badRequest('value must be a base-10 integer string');
  if (data !== undefined && !isHex(data)) throw badRequest('data must be 0x-prefixed hex');
  if (network !== undefined && typeof network !== 'string') throw badRequest('network must be a string');
  return { from, to, value, data, network };
}

export function validateTransactionHash(hash) {
  if (typeof hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    throw badRequest('txHash must be a 32-byte hex string');
  }
  return hash;
}

export default {
  isAddress,
  isHex,
  isChainId,
  validateRpcPayload,
  validateContractRead,
  validateEstimate,
  validateTransactionHash,
  ALLOWED_RPC_METHODS,
};
