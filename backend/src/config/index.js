'use strict';

const PROVIDERS = ['google', 'microsoft'];

function readInt(env, name, fallback, min = 1) {
  const raw = env[name];
  if (raw === undefined || String(raw).trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} must be an integer >= ${min} (received "${raw}")`);
  }
  return value;
}

function readString(env, name, fallback = '') {
  const raw = env[name];
  return raw === undefined ? fallback : String(raw).trim();
}

/**
 * Builds the validated, immutable runtime configuration from environment variables.
 * Throws with a descriptive message so the server fails fast on bad configuration.
 */
function loadConfig(env = process.env) {
  const providerName = readString(env, 'TRANSLATION_PROVIDER', 'google').toLowerCase();
  if (!PROVIDERS.includes(providerName)) {
    throw new Error(`TRANSLATION_PROVIDER must be one of: ${PROVIDERS.join(', ')}`);
  }

  const googleApiKey = readString(env, 'GOOGLE_TRANSLATE_API_KEY');
  const microsoftKey = readString(env, 'MICROSOFT_TRANSLATOR_KEY');
  const microsoftRegion = readString(env, 'MICROSOFT_TRANSLATOR_REGION');

  if (providerName === 'google' && !googleApiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is required when TRANSLATION_PROVIDER=google');
  }
  if (providerName === 'microsoft' && !microsoftKey) {
    throw new Error('MICROSOFT_TRANSLATOR_KEY is required when TRANSLATION_PROVIDER=microsoft');
  }

  const corsOrigins = readString(env, 'CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Object.freeze({
    env: readString(env, 'NODE_ENV', 'development'),
    port: readInt(env, 'PORT', 4000),
    logLevel: readString(env, 'LOG_LEVEL', 'info'),
    corsOrigins,
    trustProxy: readInt(env, 'TRUST_PROXY', 0, 0),
    languagesCacheTtlMs: readInt(env, 'LANGUAGES_CACHE_TTL_MS', 24 * 60 * 60 * 1000),
    translation: Object.freeze({
      maxTextLength: readInt(env, 'MAX_TEXT_LENGTH', 5000),
    }),
    rateLimit: Object.freeze({
      windowMs: readInt(env, 'RATE_LIMIT_WINDOW_MS', 60 * 1000),
      max: readInt(env, 'RATE_LIMIT_MAX', 30),
    }),
    provider: Object.freeze({
      name: providerName,
      timeoutMs: readInt(env, 'PROVIDER_TIMEOUT_MS', 8000),
      google: Object.freeze({ apiKey: googleApiKey }),
      microsoft: Object.freeze({ key: microsoftKey, region: microsoftRegion }),
    }),
  });
}

module.exports = { loadConfig, PROVIDERS };
