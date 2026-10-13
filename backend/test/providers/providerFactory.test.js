'use strict';

const { expect } = require('chai');
const { createProvider } = require('../../src/providers');
const GoogleProvider = require('../../src/providers/googleProvider');
const MicrosoftProvider = require('../../src/providers/microsoftProvider');
const { loadConfig } = require('../../src/config');

describe('providers.createProvider', () => {
  it('builds the Google adapter from configuration', () => {
    const config = loadConfig({ TRANSLATION_PROVIDER: 'google', GOOGLE_TRANSLATE_API_KEY: 'k' });
    const provider = createProvider(config);
    expect(provider).to.be.instanceOf(GoogleProvider);
    expect(provider.name).to.equal('google');
  });

  it('switches to Microsoft by configuration only', () => {
    const config = loadConfig({
      TRANSLATION_PROVIDER: 'microsoft',
      MICROSOFT_TRANSLATOR_KEY: 'k',
      MICROSOFT_TRANSLATOR_REGION: 'uksouth',
    });
    const provider = createProvider(config);
    expect(provider).to.be.instanceOf(MicrosoftProvider);
    expect(provider.name).to.equal('microsoft');
  });

  it('exposes the same interface for every provider', () => {
    for (const env of [
      { TRANSLATION_PROVIDER: 'google', GOOGLE_TRANSLATE_API_KEY: 'k' },
      { TRANSLATION_PROVIDER: 'microsoft', MICROSOFT_TRANSLATOR_KEY: 'k' },
    ]) {
      const provider = createProvider(loadConfig(env));
      expect(provider.translate).to.be.a('function');
      expect(provider.listLanguages).to.be.a('function');
    }
  });
});
