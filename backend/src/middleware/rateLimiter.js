'use strict';

const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

/** Per-client-IP limiter that reports 429 using the API's standard error shape. */
function createRateLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req, res, next) {
      next(
        new AppError(429, 'Too many requests. Please wait a moment and try again.', {
          code: 'RATE_LIMITED',
        })
      );
    },
  });
}

module.exports = { createRateLimiter };
