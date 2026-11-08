import { appConfig } from './config/app.config.js';
import { detectProviders } from './wallet/provider.js';
import { connect as connectWallet, availableOptions } from './wallet/connector.js';
import { getAccounts, onAccountsChanged, displayAccount } from './wallet/account.js';
import { getChainId, onChainChanged, describeNetwork, isSupportedChain } from './wallet/network.js';
import { signAuthMessage } from './wallet/signatures.js';
import { disconnect as disconnectWallet, clearSessionStorage } from './wallet/disconnect.js';
import { createWalletModal } from './components/wallet-modal.js';
import { createNetworkSelector } from './components/network-selector.js';
import { createAccountPanel } from './components/account-panel.js';
import { createTransactionPanel } from './components/transaction-panel.js';
import { apiClient, phpClient } from './api/client.js';
import { makeApi } from './api/endpoints.js';
import { createEventSocket } from './api/websocket.js';
import { prepareTransfer, toWei } from './transactions/prepare.js';
import { simulate } from './transactions/simulate.js';
import { submit } from './transactions/submit.js';
import { waitForReceipt } from './transactions/monitor.js';
import { readTokenBalance } from './contracts/contract-reader.js';
import { validateTransfer } from './utils/validation.js';
import { describeWalletError, isUserRejection } from './utils/errors.js';

/**
 * Application controller. Wires the wallet session lifecycle:
 *   INITIALIZE → DETECT PROVIDERS → DISPLAY OPTIONS → CONNECT → READ ACCOUNT
 *   → VERIFY NETWORK → READY → MONITOR SESSION → DISCONNECT
 */
export class App {
  constructor({ root, ethersLib, api = makeApi(apiClient), phpApi = makeApi(phpClient), socket = null } = {}) {
    this.root = root;
    this.ethersLib = ethersLib;
    this.api = api;
    this.phpApi = phpApi;
    this.socket = socket;
    this.session = null;
    this.chainId = appConfig.defaultChainId;
    this.unsubscribers = [];
    this.ui = {};
  }

  async init() {
    this.render();
    this.bindUi();
    await this.checkBackend();
    this.connectSocket();
    this.log('Ready. Connect a wallet to begin.');
    return this;
  }

  render() {
    this.root.innerHTML = `
      <header class="app-header">
        <h1>Blower</h1>
        <div class="app-header__status" data-status></div>
      </header>
      <main class="app-main">
        <section class="card">
          <h2>Wallet</h2>
          <button data-connect class="primary">Connect wallet</button>
          <div data-wallet-slot></div>
        </section>
        <section class="card">
          <h2>Send BNB</h2>
          <form data-transfer-form>
            <input name="to" placeholder="Recipient 0x…" autocomplete="off" />
            <input name="amount" placeholder="Amount (BNB)" inputmode="decimal" autocomplete="off" />
            <button type="submit" class="primary">Review</button>
          </form>
        </section>
        <section class="card">
          <h2>Token balance</h2>
          <form data-balance-form>
            <input name="token" placeholder="Token address 0x…" autocomplete="off" />
            <button type="submit">Read balance</button>
          </form>
          <div data-balance-result></div>
        </section>
        <section class="card">
          <h2>Events</h2>
          <ul data-events class="event-log"></ul>
        </section>
      </main>`;

    this.ui.status = this.root.querySelector('[data-status]');
    this.ui.connectBtn = this.root.querySelector('[data-connect]');
    this.ui.walletSlot = this.root.querySelector('[data-wallet-slot]');
    this.ui.transferForm = this.root.querySelector('[data-transfer-form]');
    this.ui.balanceForm = this.root.querySelector('[data-balance-form]');
    this.ui.balanceResult = this.root.querySelector('[data-balance-result]');
    this.ui.events = this.root.querySelector('[data-events]');

    this.ui.accountPanel = createAccountPanel({ root: this.ui.walletSlot, onDisconnect: () => this.disconnect() });
    this.ui.txPanel = createTransactionPanel({
      root: this.ui.walletSlot,
      onConfirm: () => this.confirmPending(),
      onReject: () => this.log('Transaction rejected by user.'),
    });
    this.ui.modal = createWalletModal({ root: this.root, ethersLib: this.ethersLib });
  }

  bindUi() {
    this.ui.connectBtn.addEventListener('click', () => this.connect());
    this.ui.transferForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.reviewTransfer(new FormData(e.target));
    });
    this.ui.balanceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.readBalance(new FormData(e.target));
    });
  }

  async checkBackend() {
    try {
      const res = await this.api.health();
      this.setStatus(`backend: ${res?.ok ? 'ok' : 'degraded'}`);
    } catch (err) {
      this.setStatus(`backend: unavailable (${err.code})`);
    }
  }

  connectSocket() {
    if (!this.socket) return;
    for (const event of ['transaction.confirmed', 'transaction.failed', 'system.health', 'system.error', 'contract.event']) {
      this.socket.on(event, (payload) => this.log(`${event}: ${JSON.stringify(payload).slice(0, 120)}`));
    }
    this.socket.connect();
  }

  async connect() {
    try {
      this.session = await this.ui.modal.open();
      this.ethersProvider = this.session.ethersProvider;
      this.signer = this.ethersProvider?.getSigner?.() || null;
      this.chainId = await getChainId(this.session.eip1193);

      this.ui.accountPanel.setAccount(this.session.account);
      this.renderNetworkSelector();
      this.watchSession();
      await this.refreshBalance();

      this.setStatus(`${describeNetwork(this.chainId).name} · ${displayAccount(this.session.account)}`);
      this.log(`Connected ${this.session.type} as ${displayAccount(this.session.account)}`);
      this.socket?.subscribe(['transaction.confirmed', 'transaction.failed', 'system.error']);
    } catch (err) {
      if (err?.message !== 'cancelled') this.log(`Connect failed: ${describeWalletError(err)}`);
    }
  }

  renderNetworkSelector() {
    this.ui.networkSelector?.element?.remove();
    this.ui.networkSelector = createNetworkSelector({
      root: this.ui.walletSlot,
      eip1193: this.session.eip1193,
      currentChainId: this.chainId,
      onChange: (chainId) => {
        this.chainId = chainId;
        this.refreshBalance();
      },
    });
  }

  watchSession() {
    this.unsubscribers.push(
      onAccountsChanged(this.session.eip1193, (accounts) => {
        if (accounts.length === 0) return this.disconnect();
        this.session.account = accounts[0];
        this.ui.accountPanel.setAccount(accounts[0]);
        this.refreshBalance();
      }),
    );
    this.unsubscribers.push(
      onChainChanged(this.session.eip1193, (chainId) => {
        this.chainId = chainId;
        this.ui.networkSelector?.update(chainId);
        if (!isSupportedChain(chainId)) this.setStatus(`Unsupported network ${chainId}`);
        this.refreshBalance();
      }),
    );
  }

  async refreshBalance() {
    if (!this.ethersProvider || !this.session?.account) return;
    try {
      const wei = await this.ethersProvider.getBalance(this.session.account);
      const network = describeNetwork(this.chainId);
      this.ui.accountPanel.setBalance(wei, network.nativeCurrency?.decimals ?? 18, network.nativeCurrency?.symbol ?? 'BNB', this.ethersLib);
    } catch {
      this.ui.accountPanel.setBalance(null);
    }
  }

  reviewTransfer(form) {
    if (!this.session) return this.log('Connect a wallet first.');
    const to = form.get('to');
    const amount = form.get('amount');
    const error = validateTransfer({ to, amount });
    if (error) return this.log(error);

    const valueWei = toWei(amount, 18, this.ethersLib);
    const { tx, describe } = prepareTransfer({
      to,
      amountWei: valueWei.toString(),
      from: this.session.account,
      chainId: this.chainId,
    });

    this.pending = { kind: 'transfer', tx, describe };
    this.ui.txPanel.show({ ...describe, value: `${amount} ${describeNetwork(this.chainId).nativeCurrency?.symbol}` });
    this.log('Review the transaction and confirm to sign.');
  }

  async confirmPending() {
    if (!this.pending) return;
    const { tx } = this.pending;
    const panel = this.ui.txPanel;

    try {
      panel.setStatus('Estimating…');
      const sim = await simulate({ provider: this.ethersProvider, tx });
      if (!sim.ok) {
        panel.setStatus(`Simulation failed: ${sim.revertReason}`);
        return;
      }
      panel.setStatus('Waiting for wallet approval…');
      const { hash } = await submit({ signer: this.signer, tx });
      panel.setStatus(`Submitted ${hash}`);
      this.log(`Transaction submitted: ${hash}`);
      this.socket?.send({ type: 'ping' });

      const result = await waitForReceipt({
        provider: this.ethersProvider,
        hash,
        onUpdate: (u) => panel.setStatus(`Status: ${u.status}`),
      });
      panel.setStatus(`Transaction ${result.status}`);
      this.log(`Transaction ${result.status}: ${hash}`);
      panel.hide();
      this.pending = null;
    } catch (err) {
      panel.setStatus(describeWalletError(err));
      if (!isUserRejection(err)) this.log(`Transaction error: ${err.message}`);
    }
  }

  async readBalance(form) {
    if (!this.session) return this.log('Connect a wallet first.');
    const token = form.get('token');
    try {
      const result = await readTokenBalance({
        ethersLib: this.ethersLib,
        provider: this.ethersProvider,
        tokenAddress: token,
        account: this.session.account,
      });
      this.ui.balanceResult.textContent = `${result.formatted} ${result.symbol}`;
    } catch (err) {
      this.ui.balanceResult.textContent = `Error: ${err.message}`;
    }
  }

  async disconnect() {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    await disconnectWallet(this.session);
    clearSessionStorage();
    this.session = null;
    this.ethersProvider = null;
    this.signer = null;
    this.ui.accountPanel.hide();
    this.ui.networkSelector?.element?.remove();
    this.setStatus('Disconnected');
    this.log('Wallet disconnected.');
  }

  setStatus(text) {
    this.ui.status.textContent = text;
  }

  log(message) {
    const li = document.createElement('li');
    li.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
    this.ui.events.prepend(li);
    while (this.ui.events.children.length > 50) this.ui.events.lastChild.remove();
  }
}

export default App;
