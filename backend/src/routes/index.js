'use strict';

const express = require('express');
const { createHealthController } = require('../controllers/healthController');
const { createLanguagesController } = require('../controllers/languagesController');
const { createTranslateController } = require('../controllers/translateController');
const { validateTranslateRequest } = require('../middleware/validateTranslateRequest');

/** Wires URL -> middleware -> controller for the /api prefix. */
function createApiRouter({ config, translationService, languageService, rateLimiter }) {
  const router = express.Router();
  const { maxTextLength } = config.translation;

  // Worst case a character is escaped as a 6-byte \uXXXX sequence; leave room for the envelope.
  const bodyLimitBytes = maxTextLength * 8 + 4096;

  router.get('/health', createHealthController({ config }));
  router.get('/languages', createLanguagesController({ languageService }));
  router.post(
    '/translate',
    rateLimiter, // reject abusive clients before parsing or validating anything
    express.json({ limit: bodyLimitBytes }),
    validateTranslateRequest({ maxTextLength }),
    createTranslateController({ translationService })
  );

  return router;
}

module.exports = { createApiRouter };
