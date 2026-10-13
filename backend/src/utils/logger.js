'use strict';

const pino = require('pino');

/**
 * Creates the application logger. Request bodies (user text) are never passed to the
 * logger; the redact list is a second line of defence for credentials in headers.
 */
function createLogger({ level = 'info', destination } = {}) {
  return pino(
    {
      level,
      base: { service: 'ai-translator-backend' },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-goog-api-key"]',
          'req.headers["ocp-apim-subscription-key"]',
        ],
        censor: '[REDACTED]',
      },
    },
    destination
  );
}

module.exports = { createLogger };
