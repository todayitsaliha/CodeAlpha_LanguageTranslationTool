'use strict';

require('dotenv').config();

const { loadConfig } = require('./config');
const { createLogger } = require('./utils/logger');
const { createProvider } = require('./providers');
const { LanguageService } = require('./services/languageService');
const TranslationService = require('./services/translationService');
const { createApp } = require('./app');

const SHUTDOWN_TIMEOUT_MS = 10000;

/** Composition root: reads configuration, wires the layers together and starts listening. */
function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(`Configuration error: ${err.message}`);
    process.exit(1);
  }

  const logger = createLogger({ level: config.logLevel });
  const provider = createProvider(config);
  const languageService = new LanguageService({
    provider,
    ttlMs: config.languagesCacheTtlMs,
    logger,
  });
  const translationService = new TranslationService({ provider, languageService, logger });
  const app = createApp({ config, logger, translationService, languageService });

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, provider: provider.name, env: config.env },
      'server listening'
    );
  });

  const shutdown = (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error(
      { error: reason instanceof Error ? reason.stack : String(reason) },
      'unhandled rejection'
    );
  });
}

if (require.main === module) main();

module.exports = { main };
