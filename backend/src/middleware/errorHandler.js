'use strict';

const AppError = require('../utils/AppError');

const GENERIC_MESSAGE = 'An unexpected error occurred. Please try again later.';

/**
 * Translates any error into the API's consistent shape: { status, message, requestId }.
 * Internals (stack traces, provider responses) are logged but never returned.
 *
 * Errors raised by the body parser can carry the raw request body, which is user text,
 * so for those only the error type is logged.
 */
function errorHandler({ logger }) {
  // Express identifies error middleware by its four-argument signature.
  return function handleError(err, req, res, next) {
    if (res.headersSent) return next(err);

    const log = req.log || logger;
    let status;
    let message;

    if (err instanceof AppError) {
      status = err.status;
      message = err.message;
      const entry = { code: err.code, status, details: err.details };
      if (status >= 500) {
        log.error({ ...entry, error: describe(err) }, 'request failed');
      } else {
        log.warn(entry, 'request rejected');
      }
    } else if (err && err.type === 'entity.parse.failed') {
      status = 400;
      message = 'Request body must be valid JSON.';
      log.warn({ code: 'INVALID_JSON', status }, 'request rejected');
    } else if (err && err.type === 'entity.too.large') {
      status = 400;
      message = 'Request body is too large.';
      log.warn({ code: 'BODY_TOO_LARGE', status }, 'request rejected');
    } else if (err && typeof err.type === 'string' && err.status >= 400 && err.status < 500) {
      status = err.status;
      message = 'Invalid request.';
      log.warn({ code: 'BAD_REQUEST', type: err.type, status }, 'request rejected');
    } else {
      status = 500;
      message = GENERIC_MESSAGE;
      log.error({ code: 'UNHANDLED_ERROR', status, error: describe(err) }, 'unhandled error');
    }

    res.status(status).json({ status, message, requestId: req.id });
  };
}

function describe(err) {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { name: 'NonError', message: String(err) };
}

module.exports = errorHandler;
