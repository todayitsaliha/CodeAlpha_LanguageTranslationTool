'use strict';

const { expect } = require('chai');
const { LanguageService, matchLanguage } = require('../../src/services/languageService');
const ProviderError = require('../../src/providers/providerError');
const { fakeProvider } = require('../helpers/fakeProvider');
const { createCapturingLogger } = require('../helpers');

function build(overrides = {}, ttlMs = 1000) {
  const clock = { now: 0 };
  const provider = fakeProvider(overrides);
  const capture = createCapturingLogger();
  const service = new LanguageService({
    provider,
    ttlMs,
    logger: capture.logger,
    now: () => clock.now,
  });
  return { service, provider, clock, capture };
}

describe('LanguageService', () => {
  it('returns languages sorted by name', async () => {
    const { service } = build();
    const names = (await service.getLanguages()).map((language) => language.name);
    expect(names).to.deep.equal([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('caches within the TTL and refreshes after it expires', async () => {
    const { service, provider, clock } = build();
    await service.getLanguages();
    clock.now = 999;
    await service.getLanguages();
    expect(provider.listCalls).to.equal(1);
    clock.now = 1001;
    await service.getLanguages();
    expect(provider.listCalls).to.equal(2);
  });

  it('coalesces concurrent refreshes into one provider call', async () => {
    const { service, provider } = build();
    await Promise.all([service.getLanguages(), service.getLanguages(), service.getLanguages()]);
    expect(provider.listCalls).to.equal(1);
  });

  it('serves the stale list when a refresh fails', async () => {
    let fail = false;
    const { service, clock, capture } = build({
      async listLanguages() {
        if (fail) throw new ProviderError('timeout', { provider: 'fake' });
        return [{ code: 'en', name: 'English' }];
      },
    });
    await service.getLanguages();
    fail = true;
    clock.now = 5000;
    const languages = await service.getLanguages();
    expect(languages).to.deep.equal([{ code: 'en', name: 'English' }]);
    expect(capture.raw()).to.contain('serving stale list');
  });

  it('propagates the provider error when there is no cached list', async () => {
    const { service } = build({
      async listLanguages() {
        throw new ProviderError('network', { provider: 'fake' });
      },
    });
    try {
      await service.getLanguages();
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.status).to.equal(502);
    }
  });

  it('retries after a failed refresh rather than caching the failure', async () => {
    let calls = 0;
    const { service } = build({
      async listLanguages() {
        calls += 1;
        if (calls === 1) throw new ProviderError('network', { provider: 'fake' });
        return [{ code: 'en', name: 'English' }];
      },
    });
    await service.getLanguages().catch(() => {});
    expect(await service.getLanguages()).to.have.length(1);
  });
});

describe('matchLanguage', () => {
  const languages = [
    { code: 'zh-CN', name: 'Chinese' },
    { code: 'es', name: 'Spanish' },
  ];

  it('matches case-insensitively and returns the canonical code', () => {
    expect(matchLanguage(languages, 'ZH-cn')).to.equal('zh-CN');
    expect(matchLanguage(languages, 'es')).to.equal('es');
  });

  it('returns null for unknown or non-string codes', () => {
    expect(matchLanguage(languages, 'xx')).to.equal(null);
    expect(matchLanguage(languages, undefined)).to.equal(null);
  });
});
