'use strict';

const { expect } = require('chai');
const { loadConfig } = require('../../src/config');

const GOOGLE_ENV = { TRANSLATION_PROVIDER: 'google', GOOGLE_TRANSLATE_API_KEY: 'abc' };

describe('config.loadConfig', () => {
  it('applies documented defaults', () => {
    const config = loadConfig(GOOGLE_ENV);
    expect(config.port).to.equal(4000);
    expect(config.translation.maxTextLength).to.equal(5000);
    expect(config.provider.timeoutMs).to.equal(8000);
    expect(config.rateLimit).to.deep.equal({ windowMs: 60000, max: 30 });
    expect(config.corsOrigins).to.deep.equal(['http://localhost:3000']);
    expect(config.trustProxy).to.equal(0);
    expect(config.provider.name).to.equal('google');
  });

  it('defaults to google when no provider is set', () => {
    expect(loadConfig({ GOOGLE_TRANSLATE_API_KEY: 'abc' }).provider.name).to.equal('google');
  });

  it('reads overrides and parses comma separated CORS origins', () => {
    const config = loadConfig({
      ...GOOGLE_ENV,
      PORT: '5001',
      MAX_TEXT_LENGTH: '100',
      CORS_ORIGIN: 'http://a.test, https://b.test',
      TRUST_PROXY: '1',
    });
    expect(config.port).to.equal(5001);
    expect(config.translation.maxTextLength).to.equal(100);
    expect(config.corsOrigins).to.deep.equal(['http://a.test', 'https://b.test']);
    expect(config.trustProxy).to.equal(1);
  });

  it('fails fast when the google key is missing', () => {
    expect(() => loadConfig({ TRANSLATION_PROVIDER: 'google' })).to.throw(
      /GOOGLE_TRANSLATE_API_KEY/
    );
  });

  it('requires a key (but not a region) for microsoft', () => {
    expect(() => loadConfig({ TRANSLATION_PROVIDER: 'microsoft' })).to.throw(
      /MICROSOFT_TRANSLATOR_KEY/
    );
    const config = loadConfig({ TRANSLATION_PROVIDER: 'microsoft', MICROSOFT_TRANSLATOR_KEY: 'k' });
    expect(config.provider.microsoft).to.deep.equal({ key: 'k', region: '' });
  });

  describe('gemini', () => {
    const GEMINI_ENV = { TRANSLATION_PROVIDER: 'gemini', GEMINI_API_KEY: 'g-key' };

    it('requires an API key', () => {
      expect(() => loadConfig({ TRANSLATION_PROVIDER: 'gemini' })).to.throw(/GEMINI_API_KEY/);
    });

    it('defaults to the current Flash-Lite model and a longer timeout', () => {
      const config = loadConfig(GEMINI_ENV);
      expect(config.provider.name).to.equal('gemini');
      expect(config.provider.gemini).to.deep.equal({
        apiKey: 'g-key',
        model: 'gemini-3.5-flash-lite',
      });
      expect(config.provider.timeoutMs).to.equal(20000);
    });

    it('lets the model and timeout be overridden', () => {
      const config = loadConfig({
        ...GEMINI_ENV,
        GEMINI_MODEL: 'gemini-3.6-flash',
        PROVIDER_TIMEOUT_MS: '5000',
      });
      expect(config.provider.gemini.model).to.equal('gemini-3.6-flash');
      expect(config.provider.timeoutMs).to.equal(5000);
    });

    it('falls back to the default model when GEMINI_MODEL is blank', () => {
      expect(loadConfig({ ...GEMINI_ENV, GEMINI_MODEL: '  ' }).provider.gemini.model).to.equal(
        'gemini-3.5-flash-lite'
      );
    });

    it('rejects model names that could alter the request URL', () => {
      for (const model of ['a/b', 'x?key=1', 'model name', '../etc']) {
        expect(() => loadConfig({ ...GEMINI_ENV, GEMINI_MODEL: model })).to.throw(/GEMINI_MODEL/);
      }
    });

    it('does not change the timeout default for other providers', () => {
      expect(loadConfig(GOOGLE_ENV).provider.timeoutMs).to.equal(8000);
    });

    it('is not required when another provider is selected', () => {
      expect(() => loadConfig(GOOGLE_ENV)).to.not.throw();
    });
  });

  it('rejects unknown providers', () => {
    expect(() => loadConfig({ TRANSLATION_PROVIDER: 'deepl' })).to.throw(/must be one of/);
  });

  it('rejects non-numeric or out-of-range numbers', () => {
    expect(() => loadConfig({ ...GOOGLE_ENV, PORT: 'abc' })).to.throw(/PORT/);
    expect(() => loadConfig({ ...GOOGLE_ENV, MAX_TEXT_LENGTH: '0' })).to.throw(/MAX_TEXT_LENGTH/);
    expect(() => loadConfig({ ...GOOGLE_ENV, TRUST_PROXY: '-1' })).to.throw(/TRUST_PROXY/);
  });

  it('returns an immutable object', () => {
    const config = loadConfig(GOOGLE_ENV);
    expect(Object.isFrozen(config)).to.equal(true);
    expect(Object.isFrozen(config.provider)).to.equal(true);
  });
});
