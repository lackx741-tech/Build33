/** GET /api/configuration — public (redacted) configuration view. */
export function configurationController(configService) {
  return async function getConfiguration(_req, res) {
    res.json({ ok: true, data: configService.publicView() });
  };
}

/** PATCH-style update used by the Telegram /reload and admin API. */
export function updateConfigurationController(configService) {
  return async function updateConfiguration(req, res) {
    const { key, value } = req.body || {};
    const result = await configService.set(key, value, { actor: req.actor || 'api' });
    res.json({ ok: true, data: result });
  };
}

export default configurationController;
