'use strict';

/** GET /api/health: liveness probe. Deliberately makes no provider calls. */
function createHealthController({ config }) {
  return function health(req, res) {
    res.status(200).json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      provider: config.provider.name,
    });
  };
}

module.exports = { createHealthController };
