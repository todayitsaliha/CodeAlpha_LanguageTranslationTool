'use strict';

const AppError = require('../utils/AppError');

/**
 * Client-safe messages per failure reason (STS 7.3: provider failures are 502 with a
 * generic, safe message). Credential problems and raw provider responses are never
 * exposed; they live in `details` for logging only.
 */
const PUBLIC_MESSAGES = {
  timeout: 'The translation service took too long to respond. Please try again.',
  quota: 'The translation service is temporarily over capacity. Please try again later.',
  unavailable: 'The translation service is temporarily unavailable. Please try again later.',
};

const PUBLIC_REASON = { timeout: 'timeout', quota: 'quota' };

class ProviderError extends AppError {
  /**
   * @param {'timeout'|'quota'|'auth'|'network'|'http_error'|'bad_response'} reason
   */
  constructor(reason, { provider, providerStatus, detail, cause } = {}) {
    const messageKey = PUBLIC_REASON[reason] || 'unavailable';
    super(502, PUBLIC_MESSAGES[messageKey], {
      code: `PROVIDER_${reason.toUpperCase()}`,
      details: { provider, reason, providerStatus, detail },
      cause,
    });
    this.name = 'ProviderError';
    this.reason = reason;
  }
}

module.exports = ProviderError;
