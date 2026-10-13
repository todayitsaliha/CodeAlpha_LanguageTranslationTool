'use strict';

const GoogleProvider = require('./googleProvider');
const MicrosoftProvider = require('./microsoftProvider');

/**
 * Builds the configured provider adapter. This is the single place where the vendor is
 * chosen; the rest of the application only sees { name, translate, listLanguages }.
 */
function createProvider(config, { fetchImpl } = {}) {
  const { name, timeoutMs, google, microsoft } = config.provider;
  switch (name) {
    case 'google':
      return new GoogleProvider({ apiKey: google.apiKey, timeoutMs, fetchImpl });
    case 'microsoft':
      return new MicrosoftProvider({
        key: microsoft.key,
        region: microsoft.region,
        timeoutMs,
        fetchImpl,
      });
    default:
      throw new Error(`Unsupported translation provider: ${name}`);
  }
}

module.exports = { createProvider };
