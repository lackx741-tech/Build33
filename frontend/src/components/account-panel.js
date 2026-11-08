import { displayAccount } from '../wallet/account.js';
import { formatUnits } from '../utils/format.js';

/** Shows the connected account, native balance and a disconnect button. */
export function createAccountPanel({ root, onDisconnect }) {
  const panel = document.createElement('div');
  panel.className = 'account-panel hidden';
  panel.innerHTML = `
    <div class="account-panel__address"></div>
    <div class="account-panel__balance"></div>
    <button class="account-panel__disconnect">Disconnect</button>`;

  panel.querySelector('.account-panel__disconnect').addEventListener('click', () => onDisconnect?.());
  root.appendChild(panel);

  return {
    element: panel,
    setAccount(account) {
      panel.classList.remove('hidden');
      panel.querySelector('.account-panel__address').textContent = displayAccount(account);
    },
    setBalance(wei, decimals = 18, symbol = 'BNB', ethersLib) {
      panel.querySelector('.account-panel__balance').textContent =
        wei == null ? '—' : `${formatUnits(wei, decimals, ethersLib)} ${symbol}`;
    },
    hide() {
      panel.classList.add('hidden');
    },
  };
}

export default createAccountPanel;
