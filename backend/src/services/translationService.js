'use strict';

const AppError = require('../utils/AppError');
const { matchLanguage } = require('./languageService');

/**
 * Orchestrates a translation: confirms the language codes are supported, calls the
 * provider adapter, and normalises the result to the API contract (STS 6.2).
 *
 * Only metadata (lengths, language pair, outcome, duration) is logged, never the text.
 */
class TranslationService {
  constructor({ provider, languageService, logger, now = Date.now }) {
    this.provider = provider;
    this.languageService = languageService;
    this.logger = logger;
    this.now = now;
  }

  /**
   * @param {{ text: string, source?: string, target: string }} request  already shape-validated
   */
  async translate({ text, source, target }) {
    const started = this.now();
    const wantsAuto = !source || source.toLowerCase() === 'auto';
    const resolved = await this.#resolveLanguages({ source: wantsAuto ? 'auto' : source, target });
    const meta = {
      provider: this.provider.name,
      source: resolved.source,
      target: resolved.target,
      textLength: text.length,
    };

    try {
      const result = await this.provider.translate({ text, ...resolved });
      const response = {
        translatedText: result.translatedText,
        target: resolved.target,
        provider: this.provider.name,
      };
      if (wantsAuto && result.detectedSource) response.detectedSource = result.detectedSource;

      this.logger.info(
        {
          ...meta,
          detectedSource: result.detectedSource,
          outcome: 'success',
          durationMs: this.#since(started),
        },
        'translation completed'
      );
      return response;
    } catch (err) {
      this.logger.warn(
        { ...meta, outcome: 'failed', code: err.code, durationMs: this.#since(started) },
        'translation failed'
      );
      throw err;
    }
  }

  async #resolveLanguages({ source, target }) {
    let languages;
    try {
      languages = await this.languageService.getLanguages();
    } catch (err) {
      // The check is a safeguard, not a prerequisite: if the list cannot be loaded the
      // provider remains the final authority on unsupported languages.
      this.logger.warn(
        { code: err.code },
        'language list unavailable; skipping supported-language check'
      );
      return { source, target };
    }

    const resolvedTarget = matchLanguage(languages, target);
    if (!resolvedTarget) {
      throw new AppError(400, 'Target language is not supported.', {
        code: 'UNSUPPORTED_LANGUAGE',
      });
    }
    if (source === 'auto') return { source, target: resolvedTarget };

    const resolvedSource = matchLanguage(languages, source);
    if (!resolvedSource) {
      throw new AppError(400, 'Source language is not supported.', {
        code: 'UNSUPPORTED_LANGUAGE',
      });
    }
    return { source: resolvedSource, target: resolvedTarget };
  }

  #since(started) {
    return this.now() - started;
  }
}

module.exports = TranslationService;
