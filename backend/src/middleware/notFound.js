'use strict';

const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, 'Resource not found.', { code: 'NOT_FOUND' }));
}

module.exports = notFound;
