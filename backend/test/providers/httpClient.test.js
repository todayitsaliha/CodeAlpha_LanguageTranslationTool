'use strict';

const { expect } = require('chai');
const { requestJson } = require('../../src/providers/httpClient');
const ProviderError = require('../../src/providers/providerError');
const { fakeFetch, jsonResponse } = require('../helpers/fakeFetch');

async function failureOf(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected the request to fail');
}

function call(fetchImpl, extra = {}) {
  return requestJson({
    provider: 'test',
    url: 'https://x.test',
    timeoutMs: 50,
    fetchImpl,
    ...extra,
  });
}

describe('providers/httpClient.requestJson', () => {
  it('returns parsed JSON for 2xx responses and serialises the body', async () => {
    const fetchImpl = fakeFetch(() => jsonResponse({ ok: 1 }));
    const result = await call(fetchImpl, { method: 'POST', body: { a: 1 } });
    expect(result).to.deep.equal({ ok: 1 });
    expect(fetchImpl.calls[0].init.body).to.equal('{"a":1}');
    expect(fetchImpl.calls[0].init.headers['Content-Type']).to.equal('application/json');
  });

  it('maps a timeout to a safe 502 ProviderError', async () => {
    const fetchImpl = (url, init) =>
      new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
      });
    const err = await failureOf(call(fetchImpl));
    expect(err).to.be.instanceOf(ProviderError);
    expect(err.status).to.equal(502);
    expect(err.reason).to.equal('timeout');
    expect(err.message).to.match(/too long/);
  });

  it('maps network failures to ProviderError', async () => {
    const err = await failureOf(
      call(
        fakeFetch(() => {
          throw new TypeError('fetch failed');
        })
      )
    );
    expect(err.reason).to.equal('network');
    expect(err.details.detail).to.equal('fetch failed');
    expect(err.message).to.not.contain('fetch failed');
  });

  it('classifies HTTP statuses', async () => {
    const reasonFor = async (status, body = {}) =>
      (await failureOf(call(fakeFetch(() => jsonResponse(body, status))))).reason;

    expect(await reasonFor(429)).to.equal('quota');
    expect(await reasonFor(403, { error: { message: 'Daily Limit Exceeded' } })).to.equal('quota');
    expect(await reasonFor(403, { error: { message: 'API key not valid' } })).to.equal('auth');
    expect(await reasonFor(401)).to.equal('auth');
    expect(await reasonFor(504)).to.equal('timeout');
    expect(await reasonFor(500)).to.equal('http_error');
  });

  it('never exposes credential problems to clients', async () => {
    const err = await failureOf(
      call(fakeFetch(() => jsonResponse({ error: { message: 'API key not valid' } }, 400)))
    );
    expect(err.message).to.equal(
      'The translation service is temporarily unavailable. Please try again later.'
    );
    expect(err.details.providerStatus).to.equal(400);
  });

  it('maps malformed JSON to bad_response', async () => {
    const err = await failureOf(call(fakeFetch(() => new Response('<html>oops</html>'))));
    expect(err.reason).to.equal('bad_response');
  });

  it('truncates provider error detail used for logging', async () => {
    const err = await failureOf(
      call(fakeFetch(() => new Response('x'.repeat(5000), { status: 500 })))
    );
    expect(err.details.detail).to.have.length(300);
  });
});
