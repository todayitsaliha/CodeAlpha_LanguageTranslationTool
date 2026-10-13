'use strict';

const AppError = require('../utils/AppError');

// Accepts ISO 639-1/639-2 codes and regional variants such as zh-CN or zh-Hans.
// This is a format check only; the service verifies the code against the provider's list.
const LANGUAGE_CODE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

function readLanguage(value, label, { required }) {
  if (value === undefined || value === null || value === '') {
    if (required) throw AppError.badRequest(`${label} language is required.`);
    return 'auto';
  }
  if (typeof value !== 'string') {
    throw AppError.badRequest(`${label} language code is invalid.`);
  }
  const code = value.trim();
  // "auto" is the documented keyword for provider-side language detection (source only).
  if (!required && code.toLowerCase() === 'auto') return 'auto';
  if (!LANGUAGE_CODE_PATTERN.test(code)) {
    throw AppError.badRequest(`${label} language code is invalid.`);
  }
  return code;
}

/**
 * Validates POST /api/translate bodies (STS 6.1 / 7.3) before any provider call is made.
 * On success the cleaned request is available as `req.translateRequest`; the text itself
 * is passed through untouched.
 */
function validateTranslateRequest({ maxTextLength }) {
  const lengthMessage = `Text must be between 1 and ${maxTextLength} characters.`;

  return function validate(req, res, next) {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw AppError.badRequest('Request body must be a JSON object.');
      }

      const { text } = body;
      if (typeof text !== 'string') throw AppError.badRequest('Text must be a string.');
      if (text.trim().length === 0) throw AppError.badRequest(lengthMessage);
      // Count characters (code points), not UTF-16 units, so emoji count once.
      if ([...text].length > maxTextLength) throw AppError.badRequest(lengthMessage);

      const source = readLanguage(body.source, 'Source', { required: false });
      const target = readLanguage(body.target, 'Target', { required: true });

      req.translateRequest = { text, source, target };
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validateTranslateRequest, LANGUAGE_CODE_PATTERN };
