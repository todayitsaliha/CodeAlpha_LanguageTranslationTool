'use strict';

/**
 * An error whose `message` is safe to show to API clients.
 * Internal diagnostics belong in `details` / `cause` and are only ever logged.
 */
class AppError extends Error {
  constructor(status, message, { code = 'APP_ERROR', details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message) {
    return new AppError(400, message, { code: 'VALIDATION_ERROR' });
  }
}

module.exports = AppError;
