import { availableOptions, connect } from '../wallet/connector.js';
import { describeWalletError } from '../utils/errors.js';

/**
 * Wallet connection modal. Renders one button per available option and
 * resolves with the connected session, or rejects on failure.
 */
export function createWalletModal({ root, ethersLib }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Connect wallet">
      <header class="modal__header">
        <h2>Connect a wallet</h2>
        <button class="modal__close" aria-label="Close">×</button>
      </header>
      <div class="modal__body"></div>
      <p class="modal__error" role="alert"></p>
    </div>`;

  const body = overlay.querySelector('.modal__body');
  const errorEl = overlay.querySelector('.modal__error');
  root.appendChild(overlay);

  let resolveFn;
  let rejectFn;

  function render() {
    body.innerHTML = '';
    const options = availableOptions();
    if (options.length === 0) {
      body.innerHTML = '<p>No wallets detected. Install a browser wallet or use WalletConnect.</p>';
      return;
    }
    for (const option of options) {
      const btn = document.createElement('button');
      btn.className = 'wallet-option';
      btn.textContent = option.label;
      btn.disabled = Boolean(option.disabled);
      btn.addEventListener('click', async () => {
        errorEl.textContent = '';
        try {
          const session = await connect(option.type, { ethersLib });
          close();
          resolveFn?.(session);
        } catch (err) {
          errorEl.textContent = describeWalletError(err);
        }
      });
      body.appendChild(btn);
    }
  }

  function open() {
    render();
    overlay.classList.remove('hidden');
    return new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
  }

  function close() {
    overlay.classList.add('hidden');
  }

  overlay.querySelector('.modal__close').addEventListener('click', () => {
    close();
    rejectFn?.(new Error('cancelled'));
  });

  return { open, close, element: overlay };
}

export default createWalletModal;
