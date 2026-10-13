'use strict';

const { randomUUID } = require('node:crypto');
const pinoHttp = require('pino-http');

/**
 * Assigns a request id (returned as X-Request-Id and in error bodies) and logs every
 * request/response with method, path, status and duration. Query strings, headers and
 * bodies are deliberately not logged.
 */
function requestContext(logger) {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const id = randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    serializers: {
      req(req) {
        const raw = req.raw || req;
        const url = raw.originalUrl || raw.url || '';
        return { id: req.id, method: req.method, path: url.split('?')[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',
  });
}

module.exports = requestContext;
