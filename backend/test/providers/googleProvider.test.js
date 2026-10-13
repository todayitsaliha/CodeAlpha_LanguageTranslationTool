'use strict';

const { expect } = require('chai');
const GoogleProvider = require('../../src/providers/googleProvider');
const ProviderError = require('../../src/providers/providerError');
const { fakeFetch, jsonResponse } = require('../helpers/fakeFetch');

function build(responder) {
  const fetchImpl = fakeFetch(responder);
  return { provider: new GoogleProvider({ apiKey: 'KEY', timeoutMs: 1000, fetchImpl }), fetchImpl };
}

describe('GoogleProvider', () => {
  describe('translate', () => {
    it('sends the key in a header (not the URL) and omits source for auto-detect', async () => {
      const { provider, fetchImpl } = build(() =>
        jsonResponse({
          data: { translations: [{ translatedText: 'Hola', detectedSourceLanguage: 'en' }] },
        })
      );

      const result = await provider.translate({ text: 'Hello', source: 'auto', target: 'es' });

      expect(result).to.deep.equal({ translatedText: 'Hola', detectedSource: 'en' });
      const { url, init } = fetchImpl.calls[0];
      expect(url).to.equal('https://translation.googleapis.com/language/translate/v2');
      expect(url).to.not.contain('KEY');
      expect(init.headers['X-goog-api-key']).to.equal('KEY');
      expect(init.method).to.equal('POST');
      expect(JSON.parse(init.body)).to.deep.equal({ q: 'Hello', target: 'es', format: 'text' });
    });

    it('passes an explicit source language', async () => {
      const { provider, fetchImpl } = build(() =>
        jsonResponse({ data: { translations: [{ translatedText: 'Bonjour' }] } })
      );
      const result = await provider.translate({ text: 'Hello', source: 'en', target: 'fr' });
      expect(JSON.parse(fetchImpl.calls[0].init.body).source).to.equal('en');
      expect(result.detectedSource).to.equal(undefined);
    });

    it('rejects unexpected response shapes', async () => {
      const { provider } = build(() => jsonResponse({ data: {} }));
      try {
        await provider.translate({ text: 'Hello', source: 'auto', target: 'es' });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).to.be.instanceOf(ProviderError);
        expect(err.reason).to.equal('bad_response');
      }
    });
  });

  describe('listLanguages', () => {
    it('requests English names and normalises the list', async () => {
      const { provider, fetchImpl } = build(() =>
        jsonResponse({
          data: {
            languages: [
              { language: 'fr', name: 'French' },
              { language: 'es', name: 'Spanish' },
              { language: 'bad' },
            ],
          },
        })
      );
      const languages = await provider.listLanguages();
      expect(fetchImpl.calls[0].url).to.contain('/languages?target=en');
      expect(languages).to.deep.equal([
        { code: 'fr', name: 'French' },
        { code: 'es', name: 'Spanish' },
      ]);
    });

    it('rejects unexpected response shapes', async () => {
      const { provider } = build(() => jsonResponse({}));
      try {
        await provider.listLanguages();
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.reason).to.equal('bad_response');
      }
    });
  });
});
