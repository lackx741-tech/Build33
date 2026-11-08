/** GET /api/health — shallow by default, deep when ?deep=1. */
export function healthController(monitoring) {
  return async function health(req, res) {
    const deep = req.query.deep === '1' || req.query.deep === 'true';
    const snapshot = await monitoring.snapshot({ deep });
    res.status(snapshot.ok ? 200 : 503).json({ ok: snapshot.ok, data: snapshot });
  };
}

export default healthController;
