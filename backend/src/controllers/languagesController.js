'use strict';

/** GET /api/languages: returns [{ code, name }] for the language dropdowns. */
function createLanguagesController({ languageService }) {
  return async function languages(req, res, next) {
    try {
      const list = await languageService.getLanguages();
      res.set('Cache-Control', 'public, max-age=3600');
      res.status(200).json(list);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { createLanguagesController };
