'use strict';

const { requestJson } = require('./httpClient');
const ProviderError = require('./providerError');

const BASE_URL = 'https://api.cognitive.microsofttranslator.com';

/** Adapter for Microsoft Translator Text API v3. */
class MicrosoftProvider {
  constructor({ key, region, timeoutMs, fetchImpl, baseUrl = BASE_URL }) {
    this.name = 'microsoft';
    this.key = key;
    this.region = region;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl;
  }

  /**
   * @param {{ text: string, source: string, target: string }} input  source may be "auto"
   * @returns {Promise<{ translatedText: string, detectedSource?: string }>}
   */
  async translate({ text, source, target }) {
    const params = new URLSearchParams({ 'api-version': '3.0', to: target, textType: 'plain' });
    if (source && source !== 'auto') params.set('from', source);

    const data = await requestJson({
      provider: this.name,
      url: `${this.baseUrl}/translate?${params}`,
      method: 'POST',
      body: [{ Text: text }],
      headers: this.#authHeaders(),
      timeoutMs: this.timeoutMs,
      fetchImpl: this.fetchImpl,
    });

    const item = Array.isArray(data) ? data[0] : undefined;
    const translation = item && Array.isArray(item.translations) ? item.translations[0] : undefined;
    if (!translation || typeof translation.text !== 'string') {
      throw new ProviderError('bad_response', {
        provider: this.name,
        detail: 'missing [0].translations[0].text',
      });
    }
    return {
      translatedText: translation.text,
      detectedSource: item.detectedLanguage ? item.detectedLanguage.language : undefined,
    };
  }

  /** @returns {Promise<Array<{ code: string, name: string }>>} names are in English */
  async listLanguages() {
    const data = await requestJson({
      provider: this.name,
      url: `${this.baseUrl}/languages?api-version=3.0&scope=translation`,
      headers: { 'Accept-Language': 'en' },
      timeoutMs: this.timeoutMs,
      fetchImpl: this.fetchImpl,
    });
    const map = data && data.translation;
    if (!map || typeof map !== 'object') {
      throw new ProviderError('bad_response', {
        provider: this.name,
        detail: 'missing translation language map',
      });
    }
    return Object.entries(map)
      .filter(([, value]) => value && value.name)
      .map(([code, value]) => ({ code, name: value.name }));
  }

  #authHeaders() {
    const headers = { 'Ocp-Apim-Subscription-Key': this.key };
    if (this.region) headers['Ocp-Apim-Subscription-Region'] = this.region;
    return headers;
  }
}

module.exports = MicrosoftProvider;
