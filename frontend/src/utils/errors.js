/** Frontend error taxonomy with user-facing messages. */
export class WalletError extends Error {
  constructor(message, { code = 'wallet_error', cause } = {}) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

export class NetworkError extends Error {
  constructor(message, { code = 'network_error', cause } = {}) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    if (cause) this.cause = cause;
  }
}

export class ApiError extends Error {
  constructor(message, { code = 'api_error', status = 0, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/** EIP-1193 provider error codes we translate into friendly messages. */
const EIP1193_MESSAGES = {
  4001: 'You rejected the request in your wallet.',
  4100: 'The requested account is not authorized.',
  4200: 'The wallet does not support this method.',
  4900: 'The wallet is disconnected.',
  4901: 'The wallet is not connected to the requested chain.',
};

export function describeWalletError(err) {
  if (err?.code && EIP1193_MESSAGES[err.code]) return EIP1193_MESSAGES[err.code];
  if (err?.code === 'ACTION_REJECTED') return EIP1193_MESSAGES[4001];
  return err?.message || 'Unknown wallet error';
}

export function isUserRejection(err) {
  return err?.code === 4001 || err?.code === 'ACTION_REJECTED';
}
