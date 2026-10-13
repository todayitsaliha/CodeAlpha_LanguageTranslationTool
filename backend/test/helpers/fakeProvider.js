'use strict';

const DEFAULT_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
];

/** A recording provider double. Override any behaviour via `overrides`. */
function fakeProvider(overrides = {}) {
  const provider = {
    name: 'fake',
    translateCalls: [],
    listCalls: 0,
    async translate(input) {
      provider.translateCalls.push(input);
      return { translatedText: `[${input.target}] ${input.text}`, detectedSource: 'en' };
    },
    async listLanguages() {
      provider.listCalls += 1;
      return DEFAULT_LANGUAGES.map((language) => ({ ...language }));
    },
    ...overrides,
  };
  return provider;
}

module.exports = { fakeProvider, DEFAULT_LANGUAGES };
