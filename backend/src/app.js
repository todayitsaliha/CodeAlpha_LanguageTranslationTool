'use strict';

const express = require('express');
const cors = require('cors');
const requestContext = require('./middleware/requestContext');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { createRateLimiter } = require('./middleware/rateLimiter');
const { createApiRouter } = require('./routes');

/**
 * Builds the Express application. All collaborators are injected so tests can run the full
 * HTTP stack against a fake provider.
 */
function createApp({ config, logger, translationService, languageService }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(requestContext(logger));
  app.use(
    cors({
      origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['X-Request-Id', 'Retry-After'],
      maxAge: 600,
    })
  );

  const rateLimiter = createRateLimiter(config.rateLimit);
  app.use('/api', createApiRouter({ config, translationService, languageService, rateLimiter }));

  app.use(notFound);
  app.use(errorHandler({ logger }));
  return app;
}

module.exports = { createApp };
