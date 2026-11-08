/**
 * Displays transaction parameters and requires an explicit confirmation click
 * before anything is signed. The confirm button is the only path to signing.
 */
export function createTransactionPanel({ root, onConfirm, onReject }) {
  const panel = document.createElement('div');
  panel.className = 'tx-panel hidden';
  panel.innerHTML = `
    <h3>Review transaction</h3>
    <dl class="tx-panel__details"></dl>
    <div class="tx-panel__actions">
      <button class="tx-panel__confirm">Confirm &amp; sign</button>
      <button class="tx-panel__reject">Reject</button>
    </div>
    <p class="tx-panel__status" role="status"></p>`;

  const details = panel.querySelector('.tx-panel__details');
  const status = panel.querySelector('.tx-panel__status');

  panel.querySelector('.tx-panel__confirm').addEventListener('click', () => {
    panel.querySelector('.tx-panel__confirm').disabled = true;
    onConfirm?.();
  });
  panel.querySelector('.tx-panel__reject').addEventListener('click', () => {
    hide();
    onReject?.();
  });

  root.appendChild(panel);

  function hide() {
    panel.classList.add('hidden');
    panel.querySelector('.tx-panel__confirm').disabled = false;
  }

  return {
    element: panel,
    show(describe) {
      details.innerHTML = '';
      for (const [key, value] of Object.entries(describe)) {
        if (value === undefined || value === null) continue;
        const dt = document.createElement('dt');
        dt.textContent = key;
        const dd = document.createElement('dd');
        dd.textContent = typeof value === 'object' ? JSON.stringify(value) : String(value);
        details.append(dt, dd);
      }
      status.textContent = '';
      panel.classList.remove('hidden');
    },
    setStatus(text) {
      status.textContent = text;
    },
    hide,
  };
}

export default createTransactionPanel;
