import App from './app.js';

/** Bootstraps the application with the ethers v5 library. */
async function boot() {
  const ethers = await import('ethers');
  const root = document.getElementById('app');
  const app = new App({ root, ethersLib: ethers });
  await app.init();
  window.blower = app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
