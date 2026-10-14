'use strict';

const { randomUUID } = require('node:crypto');
const pinoHttp = require('pino-http');

const SYNTHETIC_ERROR = /^failed with status code \d+$/;

function isSynthetic(err, res) {
  return !res.err && err instanceof Error && SYNTHETIC_ERROR.test(err.message);
}

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
    // The error handler already logs every failed request once, with its code and details.
    // This completion line is therefore 'warn' for any 4xx/5xx and 'error' only for genuine
    // transport errors (for example a socket that broke mid-response).
    customLogLevel(req, res, err) {
      if (err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: () => 'request completed',
    // pino-http invents an Error("failed with status code N") for every 5xx. It carries no
    // information we do not already log, so leave it out of the completion line.
    customErrorObject(req, res, err, fields) {
      if (!isSynthetic(err, res)) return fields;
      const withoutError = { ...fields };
      delete withoutError.err;
      return withoutError;
    },
    customErrorMessage: (req, res, err) =>
      isSynthetic(err, res) ? 'request completed' : 'request errored',
  });
}

module.exports = requestContext;
