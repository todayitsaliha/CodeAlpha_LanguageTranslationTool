'use strict';

const { expect } = require('chai');
const { validateTranslateRequest } = require('../../src/middleware/validateTranslateRequest');

function run(body, maxTextLength = 10) {
  const req = { body };
  let error;
  validateTranslateRequest({ maxTextLength })(req, {}, (err) => {
    error = err;
  });
  return { req, error };
}

describe('validateTranslateRequest', () => {
  it('accepts a valid request and exposes the cleaned values', () => {
    const { req, error } = run({ text: 'Hello', source: 'en', target: 'es' });
    expect(error).to.equal(undefined);
    expect(req.translateRequest).to.deep.equal({ text: 'Hello', source: 'en', target: 'es' });
  });

  it('defaults a missing, empty or null source to auto', () => {
    for (const source of [undefined, null, '', 'auto']) {
      const { req } = run({ text: 'Hi', source, target: 'es' });
      expect(req.translateRequest.source).to.equal('auto');
    }
  });

  it('accepts "auto" in any case for source, but not as a target', () => {
    expect(run({ text: 'Hi', source: 'AUTO', target: 'es' }).req.translateRequest.source).to.equal(
      'auto'
    );
    expect(run({ text: 'Hi', target: 'auto' }).error.message).to.equal(
      'Target language code is invalid.'
    );
  });

  it('does not alter the text', () => {
    const { req } = run({ text: '  padded  ', target: 'es' });
    expect(req.translateRequest.text).to.equal('  padded  ');
  });

  it('rejects empty and whitespace-only text with the STS message', () => {
    for (const text of ['', '   ', '\n\t']) {
      const { error } = run({ text, target: 'es' });
      expect(error.status).to.equal(400);
      expect(error.message).to.equal('Text must be between 1 and 10 characters.');
    }
  });

  it('rejects text over the limit and counts emoji as one character', () => {
    expect(run({ text: 'x'.repeat(11), target: 'es' }).error.status).to.equal(400);
    expect(run({ text: 'x'.repeat(10), target: 'es' }).error).to.equal(undefined);
    expect(run({ text: '😀'.repeat(10), target: 'es' }).error).to.equal(undefined);
    expect(run({ text: '😀'.repeat(11), target: 'es' }).error.status).to.equal(400);
  });

  it('rejects non-string text', () => {
    for (const text of [undefined, null, 42, ['a'], { a: 1 }]) {
      const { error } = run({ text, target: 'es' });
      expect(error.message).to.equal('Text must be a string.');
    }
  });

  it('requires a target language', () => {
    for (const target of [undefined, null, '']) {
      expect(run({ text: 'Hi', target }).error.message).to.equal('Target language is required.');
    }
  });

  it('rejects malformed language codes', () => {
    for (const bad of ['e', '12', 'en us', '../etc', 'en;drop', 42, {}]) {
      expect(run({ text: 'Hi', target: bad }).error.message).to.equal(
        'Target language code is invalid.'
      );
      expect(run({ text: 'Hi', source: bad, target: 'es' }).error.message).to.equal(
        'Source language code is invalid.'
      );
    }
  });

  it('accepts regional and script variants', () => {
    for (const code of ['zh-CN', 'zh-Hans', 'pt-BR', 'fil']) {
      expect(run({ text: 'Hi', target: code }).error).to.equal(undefined);
    }
  });

  it('rejects bodies that are not JSON objects', () => {
    for (const body of [undefined, null, 'text', 5, [1, 2]]) {
      expect(run(body).error.message).to.equal('Request body must be a JSON object.');
    }
  });
});
