'use strict';

const request = require('supertest');
const { expect } = require('chai');
const { createApp } = require('../../src/app');
const { LanguageService } = require('../../src/services/languageService');
const TranslationService = require('../../src/services/translationService');
const ProviderError = require('../../src/providers/providerError');
const { fakeProvider } = require('../helpers/fakeProvider');
const { createCapturingLogger, testConfig } = require('../helpers');

function buildApp({ providerOverrides, configOverrides } = {}) {
  const capture = createCapturingLogger();
  const provider = fakeProvider(providerOverrides);
  const config = testConfig({
    translation: { maxTextLength: 50 },
    rateLimit: { windowMs: 60000, max: 100 },
    ...configOverrides,
  });
  const languageService = new LanguageService({ provider, ttlMs: 60000, logger: capture.logger });
  const translationService = new TranslationService({
    provider,
    languageService,
    logger: capture.logger,
  });
  const app = createApp({ config, logger: capture.logger, translationService, languageService });
  return { app, provider, capture };
}

describe('HTTP API', () => {
  describe('GET /api/health', () => {
    it('returns 200 ok', async () => {
      const { app } = buildApp();
      const res = await request(app).get('/api/health').expect(200);
      expect(res.body.status).to.equal('ok');
    });
  });

  describe('GET /api/languages', () => {
    it('returns the supported languages as { code, name } objects', async () => {
      const { app } = buildApp();
      const res = await request(app).get('/api/languages').expect(200);
      expect(res.body).to.be.an('array').that.is.not.empty;
      expect(res.body[0]).to.have.all.keys('code', 'name');
    });

    it('returns a safe 502 when the provider is down and nothing is cached', async () => {
      const { app } = buildApp({
        providerOverrides: {
          async listLanguages() {
            throw new ProviderError('timeout', { provider: 'fake' });
          },
        },
      });
      const res = await request(app).get('/api/languages').expect(502);
      expect(res.body).to.have.all.keys('status', 'message', 'requestId');
    });
  });

  describe('POST /api/translate', () => {
    it('translates text and matches the STS example response shape', async () => {
      const { app } = buildApp();
      const res = await request(app)
        .post('/api/translate')
        .send({ text: 'Hello, how are you?', source: 'auto', target: 'es' })
        .expect(200);
      expect(res.body).to.deep.equal({
        translatedText: '[es] Hello, how are you?',
        detectedSource: 'en',
        target: 'es',
        provider: 'fake',
      });
    });

    it('auto-detects when source is omitted', async () => {
      const { app, provider } = buildApp();
      await request(app).post('/api/translate').send({ text: 'Hello', target: 'fr' }).expect(200);
      expect(provider.translateCalls[0].source).to.equal('auto');
    });

    it('handles non-Latin text round-trip intact', async () => {
      const { app } = buildApp();
      const res = await request(app)
        .post('/api/translate')
        .send({ text: 'こんにちは 😀', target: 'es' })
        .expect(200);
      expect(res.body.translatedText).to.equal('[es] こんにちは 😀');
    });

    describe('validation (400, before any provider call)', () => {
      const cases = [
        ['empty text', { text: '', target: 'es' }, 'Text must be between 1 and 50 characters.'],
        [
          'text over limit',
          { text: 'x'.repeat(51), target: 'es' },
          'Text must be between 1 and 50 characters.',
        ],
        ['non-string text', { text: 7, target: 'es' }, 'Text must be a string.'],
        ['missing target', { text: 'Hi' }, 'Target language is required.'],
        ['malformed target', { text: 'Hi', target: 'e!' }, 'Target language code is invalid.'],
        ['unsupported target', { text: 'Hi', target: 'xx' }, 'Target language is not supported.'],
        [
          'unsupported source',
          { text: 'Hi', source: 'xx', target: 'es' },
          'Source language is not supported.',
        ],
      ];

      for (const [name, payload, message] of cases) {
        it(`rejects ${name}`, async () => {
          const { app, provider } = buildApp();
          const res = await request(app).post('/api/translate').send(payload).expect(400);
          expect(res.body.status).to.equal(400);
          expect(res.body.message).to.equal(message);
          expect(res.body.requestId).to.be.a('string');
          expect(provider.translateCalls).to.have.length(0);
        });
      }

      it('rejects a missing body', async () => {
        const { app } = buildApp();
        const res = await request(app).post('/api/translate').expect(400);
        expect(res.body.message).to.match(/JSON object|string/);
      });

      it('rejects malformed JSON', async () => {
        const { app } = buildApp();
        const res = await request(app)
          .post('/api/translate')
          .set('Content-Type', 'application/json')
          .send('{"text": ')
          .expect(400);
        expect(res.body.message).to.equal('Request body must be valid JSON.');
      });

      it('rejects oversized bodies without crashing', async () => {
        const { app } = buildApp();
        const res = await request(app)
          .post('/api/translate')
          .send({ text: 'x'.repeat(100000), target: 'es' })
          .expect(400);
        expect(res.body.message).to.equal('Request body is too large.');
      });
    });

    describe('provider failures (502)', () => {
      it('returns a generic, safe message and logs the details', async () => {
        const { app, capture } = buildApp({
          providerOverrides: {
            async translate() {
              throw new ProviderError('auth', {
                provider: 'fake',
                providerStatus: 403,
                detail: 'API key not valid: sk-live-SECRET',
              });
            },
          },
        });
        const res = await request(app)
          .post('/api/translate')
          .send({ text: 'Hello', target: 'es' })
          .expect(502);
        expect(res.body.message).to.equal(
          'The translation service is temporarily unavailable. Please try again later.'
        );
        expect(JSON.stringify(res.body)).to.not.contain('SECRET');
        expect(capture.raw()).to.contain('API key not valid');
      });

      it('returns a distinct safe message for timeouts', async () => {
        const { app } = buildApp({
          providerOverrides: {
            async translate() {
              throw new ProviderError('timeout', { provider: 'fake' });
            },
          },
        });
        const res = await request(app)
          .post('/api/translate')
          .send({ text: 'Hello', target: 'es' })
          .expect(502);
        expect(res.body.message).to.match(/too long/);
      });
    });

    it('returns 500 with a generic message for unexpected errors', async () => {
      const { app } = buildApp({
        providerOverrides: {
          async translate() {
            throw new Error('unexpected internal failure');
          },
        },
      });
      const res = await request(app)
        .post('/api/translate')
        .send({ text: 'Hello', target: 'es' })
        .expect(500);
      expect(res.body.message).to.equal('An unexpected error occurred. Please try again later.');
      expect(JSON.stringify(res.body)).to.not.contain('internal failure');
    });

    it('returns 429 once the rate limit is exceeded', async () => {
      const { app } = buildApp({ configOverrides: { rateLimit: { windowMs: 60000, max: 2 } } });
      const send = () => request(app).post('/api/translate').send({ text: 'Hi', target: 'es' });
      await send().expect(200);
      await send().expect(200);
      const res = await send().expect(429);
      expect(res.body).to.have.all.keys('status', 'message', 'requestId');
    });

    it('does not rate limit health or languages', async () => {
      const { app } = buildApp({ configOverrides: { rateLimit: { windowMs: 60000, max: 1 } } });
      await request(app).get('/api/health').expect(200);
      await request(app).get('/api/health').expect(200);
      await request(app).get('/api/languages').expect(200);
    });
  });

  describe('cross-cutting behaviour', () => {
    it('returns 404 in the standard shape for unknown routes', async () => {
      const { app } = buildApp();
      const res = await request(app).get('/api/nope').expect(404);
      expect(res.body).to.have.all.keys('status', 'message', 'requestId');
    });

    it('echoes the same request id in the header and the error body', async () => {
      const { app } = buildApp();
      const res = await request(app)
        .post('/api/translate')
        .send({ text: '', target: 'es' })
        .expect(400);
      expect(res.headers['x-request-id']).to.equal(res.body.requestId);
    });

    it('never writes user text to the logs', async () => {
      const { app, capture } = buildApp();
      await request(app)
        .post('/api/translate')
        .send({ text: 'highly sensitive medical note', target: 'es' })
        .expect(200);
      await request(app)
        .post('/api/translate')
        .send({ text: 'x'.repeat(60) + ' sensitive overflow', target: 'es' })
        .expect(400);
      expect(capture.raw()).to.not.contain('sensitive');
    });

    it('logs request metadata for every call', async () => {
      const { app, capture } = buildApp();
      await request(app).get('/api/health').expect(200);
      const entry = capture.entries().find((e) => e.req && e.req.path === '/api/health');
      expect(entry.res.statusCode).to.equal(200);
      expect(entry.responseTime).to.be.a('number');
    });

    describe('CORS', () => {
      it('allows the configured origin', async () => {
        const { app } = buildApp();
        const res = await request(app)
          .get('/api/health')
          .set('Origin', 'http://localhost:3000')
          .expect(200);
        expect(res.headers['access-control-allow-origin']).to.equal('http://localhost:3000');
      });

      it('does not grant access to other origins', async () => {
        const { app } = buildApp();
        const res = await request(app).get('/api/health').set('Origin', 'http://evil.test');
        expect(res.headers).to.not.have.property('access-control-allow-origin');
      });

      it('answers preflight requests', async () => {
        const { app } = buildApp();
        const res = await request(app)
          .options('/api/translate')
          .set('Origin', 'http://localhost:3000')
          .set('Access-Control-Request-Method', 'POST')
          .set('Access-Control-Request-Headers', 'content-type')
          .expect(204);
        expect(res.headers['access-control-allow-methods']).to.contain('POST');
      });
    });
  });
});
