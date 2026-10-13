'use strict';

const { expect } = require('chai');
const MicrosoftProvider = require('../../src/providers/microsoftProvider');
const { fakeFetch, jsonResponse } = require('../helpers/fakeFetch');

function build(responder, region = 'uksouth') {
  const fetchImpl = fakeFetch(responder);
  const provider = new MicrosoftProvider({ key: 'KEY', region, timeoutMs: 1000, fetchImpl });
  return { provider, fetchImpl };
}

describe('MicrosoftProvider', () => {
  describe('translate', () => {
    it('sends auth headers, wraps text in the v3 body and reads the detected language', async () => {
      const { provider, fetchImpl } = build(() =>
        jsonResponse([
          {
            detectedLanguage: { language: 'en', score: 1 },
            translations: [{ text: 'Hola', to: 'es' }],
          },
        ])
      );

      const result = await provider.translate({ text: 'Hello', source: 'auto', target: 'es' });

      expect(result).to.deep.equal({ translatedText: 'Hola', detectedSource: 'en' });
      const { url, init } = fetchImpl.calls[0];
      expect(url).to.contain('api-version=3.0');
      expect(url).to.contain('to=es');
      expect(url).to.not.contain('from=');
      expect(init.headers['Ocp-Apim-Subscription-Key']).to.equal('KEY');
      expect(init.headers['Ocp-Apim-Subscription-Region']).to.equal('uksouth');
      expect(JSON.parse(init.body)).to.deep.equal([{ Text: 'Hello' }]);
    });

    it('passes an explicit source and omits the region header when none is configured', async () => {
      const { provider, fetchImpl } = build(
        () => jsonResponse([{ translations: [{ text: 'Bonjour', to: 'fr' }] }]),
        ''
      );
      const result = await provider.translate({ text: 'Hello', source: 'en', target: 'fr' });
      expect(fetchImpl.calls[0].url).to.contain('from=en');
      expect(fetchImpl.calls[0].init.headers).to.not.have.property('Ocp-Apim-Subscription-Region');
      expect(result.detectedSource).to.equal(undefined);
    });

    it('rejects unexpected response shapes', async () => {
      const { provider } = build(() => jsonResponse({ nope: true }));
      try {
        await provider.translate({ text: 'Hello', source: 'auto', target: 'es' });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.reason).to.equal('bad_response');
      }
    });
  });

  describe('listLanguages', () => {
    it('maps the language dictionary to { code, name }', async () => {
      const { provider, fetchImpl } = build(() =>
        jsonResponse({
          translation: {
            fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
            'zh-Hans': { name: 'Chinese Simplified', nativeName: '中文', dir: 'ltr' },
          },
        })
      );
      const languages = await provider.listLanguages();
      expect(fetchImpl.calls[0].init.headers['Accept-Language']).to.equal('en');
      expect(languages).to.deep.equal([
        { code: 'fr', name: 'French' },
        { code: 'zh-Hans', name: 'Chinese Simplified' },
      ]);
    });
  });
});
