'use strict';

/** Finds the provider's canonical code for `code`, ignoring case. Returns null if unsupported. */
function matchLanguage(languages, code) {
  if (typeof code !== 'string') return null;
  const wanted = code.toLowerCase();
  const found = languages.find((language) => language.code.toLowerCase() === wanted);
  return found ? found.code : null;
}

/**
 * Supplies the supported-language list. The list is cached (it changes rarely and every
 * call would otherwise cost a provider round trip); concurrent refreshes are coalesced and
 * a stale copy is served if a refresh fails.
 */
class LanguageService {
  constructor({ provider, ttlMs, logger, now = Date.now }) {
    this.provider = provider;
    this.ttlMs = ttlMs;
    this.logger = logger;
    this.now = now;
    this.cache = null;
    this.inflight = null;
  }

  async getLanguages() {
    if (this.cache && this.now() - this.cache.loadedAt < this.ttlMs) {
      return this.cache.languages;
    }

    if (!this.inflight) {
      this.inflight = this.provider
        .listLanguages()
        .then((list) => {
          const languages = [...list].sort((a, b) => a.name.localeCompare(b.name));
          this.cache = { languages, loadedAt: this.now() };
          return languages;
        })
        .finally(() => {
          this.inflight = null;
        });
    }

    try {
      return await this.inflight;
    } catch (err) {
      if (this.cache) {
        this.logger.warn(
          { code: err.code, details: err.details },
          'language list refresh failed; serving stale list'
        );
        return this.cache.languages;
      }
      throw err;
    }
  }
}

module.exports = { LanguageService, matchLanguage };
