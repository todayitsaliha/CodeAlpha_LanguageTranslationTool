'use strict';

const { requestJson } = require('./httpClient');
const ProviderError = require('./providerError');

const BASE_URL = 'https://translation.googleapis.com/language/translate/v2';

/** Adapter for Google Cloud Translation (Basic, v2). */
class GoogleProvider {
  constructor({ apiKey, timeoutMs, fetchImpl, baseUrl = BASE_URL }) {
    this.name = 'google';
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl;
  }

  /**
   * @param {{ text: string, source: string, target: string }} input  source may be "auto"
   * @returns {Promise<{ translatedText: string, detectedSource?: string }>}
   */
  async translate({ text, source, target }) {
    const body = { q: text, target, format: 'text' };
    if (source && source !== 'auto') body.source = source;

    const data = await this.#call({ method: 'POST', url: this.baseUrl, body });
    const first =
      data && data.data && Array.isArray(data.data.translations)
        ? data.data.translations[0]
        : undefined;

    if (!first || typeof first.translatedText !== 'string') {
      throw new ProviderError('bad_response', {
        provider: this.name,
        detail: 'missing data.translations[0].translatedText',
      });
    }
    return { translatedText: first.translatedText, detectedSource: first.detectedSourceLanguage };
  }

  /** @returns {Promise<Array<{ code: string, name: string }>>} names are in English */
  async listLanguages() {
    const data = await this.#call({ url: `${this.baseUrl}/languages?target=en` });
    const languages = data && data.data && data.data.languages;
    if (!Array.isArray(languages)) {
      throw new ProviderError('bad_response', {
        provider: this.name,
        detail: 'missing data.languages',
      });
    }
    return languages
      .filter((item) => item && item.language && item.name)
      .map((item) => ({ code: item.language, name: item.name }));
  }

  #call({ url, method = 'GET', body }) {
    return requestJson({
      provider: this.name,
      url,
      method,
      body,
      headers: { 'X-goog-api-key': this.apiKey },
      timeoutMs: this.timeoutMs,
      fetchImpl: this.fetchImpl,
    });
  }
}

module.exports = GoogleProvider;
