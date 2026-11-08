import { networks, isSupportedChain } from '../config/network.config.js';
import { switchNetwork } from '../wallet/network.js';

/** Dropdown that switches the connected wallet between supported networks. */
export function createNetworkSelector({ root, eip1193, currentChainId, onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'network-selector';
  wrap.innerHTML = '<label>Network</label>';

  const select = document.createElement('select');
  for (const network of Object.values(networks)) {
    const opt = document.createElement('option');
    opt.value = String(network.chainId);
    opt.textContent = network.name;
    select.appendChild(opt);
  }
  select.value = String(currentChainId);
  wrap.appendChild(select);

  const warning = document.createElement('span');
  warning.className = 'network-warning';
  if (!isSupportedChain(currentChainId)) warning.textContent = '⚠ Unsupported network';
  wrap.appendChild(warning);

  select.addEventListener('change', async () => {
    const target = Number(select.value);
    const ok = await switchNetwork(eip1193, target);
    if (!ok) {
      select.value = String(currentChainId);
      warning.textContent = 'Network switch was cancelled.';
      return;
    }
    onChange?.(target);
  });

  root.appendChild(wrap);
  return { element: wrap, update: (chainId) => { select.value = String(chainId); } };
}

export default createNetworkSelector;
