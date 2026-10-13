'use strict';

const { expect } = require('chai');
const TranslationService = require('../../src/services/translationService');
const { LanguageService } = require('../../src/services/languageService');
const ProviderError = require('../../src/providers/providerError');
const { fakeProvider } = require('../helpers/fakeProvider');
const { createCapturingLogger } = require('../helpers');

function build(overrides = {}) {
  const provider = fakeProvider(overrides);
  const capture = createCapturingLogger();
  const languageService = new LanguageService({
    provider,
    ttlMs: 60000,
    logger: capture.logger,
  });
  const service = new TranslationService({ provider, languageService, logger: capture.logger });
  return { service, provider, capture };
}

async function failureOf(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected failure');
}

describe('TranslationService.translate', () => {
  it('returns the STS 6.2 response shape with the detected source for auto-detect', async () => {
    const { service } = build();
    const result = await service.translate({ text: 'Hello', source: 'auto', target: 'es' });
    expect(result).to.deep.equal({
      translatedText: '[es] Hello',
      detectedSource: 'en',
      target: 'es',
      provider: 'fake',
    });
  });

  it('treats a missing source as auto-detect', async () => {
    const { service, provider } = build();
    await service.translate({ text: 'Hello', target: 'es' });
    expect(provider.translateCalls[0].source).to.equal('auto');
  });

  it('omits detectedSource when the caller named the source language', async () => {
    const { service } = build();
    const result = await service.translate({ text: 'Hello', source: 'en', target: 'fr' });
    expect(result).to.not.have.property('detectedSource');
  });

  it('sends the provider canonical language codes', async () => {
    const { service, provider } = build();
    const result = await service.translate({ text: 'Hi', source: 'EN', target: 'zh-cn' });
    expect(provider.translateCalls[0]).to.deep.equal({ text: 'Hi', source: 'en', target: 'zh-CN' });
    expect(result.target).to.equal('zh-CN');
  });

  it('rejects unsupported languages with 400 before calling the provider', async () => {
    const { service, provider } = build();
    const badTarget = await failureOf(
      service.translate({ text: 'Hi', source: 'auto', target: 'xx' })
    );
    const badSource = await failureOf(
      service.translate({ text: 'Hi', source: 'xx', target: 'es' })
    );
    expect(badTarget.status).to.equal(400);
    expect(badTarget.message).to.equal('Target language is not supported.');
    expect(badSource.status).to.equal(400);
    expect(badSource.message).to.equal('Source language is not supported.');
    expect(provider.translateCalls).to.have.length(0);
  });

  it('still translates when the language list cannot be loaded', async () => {
    const { service, provider, capture } = build({
      async listLanguages() {
        throw new ProviderError('timeout', { provider: 'fake' });
      },
    });
    const result = await service.translate({ text: 'Hello', source: 'auto', target: 'es' });
    expect(result.translatedText).to.equal('[es] Hello');
    expect(provider.translateCalls).to.have.length(1);
    expect(capture.raw()).to.contain('skipping supported-language check');
  });

  it('propagates provider failures and logs the outcome', async () => {
    const { service, capture } = build({
      async translate() {
        throw new ProviderError('quota', { provider: 'fake', providerStatus: 429 });
      },
    });
    const err = await failureOf(service.translate({ text: 'Hello', source: 'auto', target: 'es' }));
    expect(err).to.be.instanceOf(ProviderError);
    const entry = capture.entries().find((e) => e.msg === 'translation failed');
    expect(entry).to.include({ outcome: 'failed', code: 'PROVIDER_QUOTA', textLength: 5 });
  });

  it('logs metadata only and never the user text', async () => {
    const { service, capture } = build();
    await service.translate({ text: 'my confidential sentence', source: 'auto', target: 'es' });
    const entry = capture.entries().find((e) => e.msg === 'translation completed');
    expect(entry).to.include({
      provider: 'fake',
      target: 'es',
      textLength: 24,
      outcome: 'success',
    });
    expect(entry).to.have.property('durationMs');
    expect(capture.raw()).to.not.contain('confidential');
  });
});
