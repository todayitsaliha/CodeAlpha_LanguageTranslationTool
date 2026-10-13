'use strict';

/** POST /api/translate: thin HTTP adapter over TranslationService. */
function createTranslateController({ translationService }) {
  return async function translate(req, res, next) {
    try {
      const result = await translationService.translate(req.translateRequest);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createTranslateController };
