'use strict';

const express = require('express');
const request = require('supertest');
const { expect } = require('chai');
const AppError = require('../../src/utils/AppError');
const requestContext = require('../../src/middleware/requestContext');
const notFound = require('../../src/middleware/notFound');
const errorHandler = require('../../src/middleware/errorHandler');
const { createCapturingLogger } = require('../helpers');

function buildApp(logger) {
  const app = express();
  app.use(requestContext(logger));
  app.post('/json', express.json(), (req, res) => res.json({ ok: true }));
  app.get('/app-error', (req, res, next) =>
    next(new AppError(400, 'Nope.', { code: 'VALIDATION_ERROR' }))
  );
  app.get('/provider-error', (req, res, next) =>
    next(
      new AppError(502, 'Safe provider message.', {
        code: 'PROVIDER_TIMEOUT',
        details: { providerStatus: 503, secret: 'internal-only' },
      })
    )
  );
  app.get('/boom', () => {
    throw new Error('database password is hunter2');
  });
  app.use(notFound);
  app.use(errorHandler({ logger }));
  return app;
}

describe('error handling middleware', () => {
  let capture;
  let app;

  beforeEach(() => {
    capture = createCapturingLogger();
    app = buildApp(capture.logger);
  });

  it('returns the consistent { status, message, requestId } shape for AppErrors', async () => {
    const res = await request(app).get('/app-error').expect(400);
    expect(res.body).to.have.all.keys('status', 'message', 'requestId');
    expect(res.body.status).to.equal(400);
    expect(res.body.message).to.equal('Nope.');
    expect(res.body.requestId).to.equal(res.headers['x-request-id']);
  });

  it('keeps provider internals out of the response but logs them', async () => {
    const res = await request(app).get('/provider-error').expect(502);
    expect(JSON.stringify(res.body)).to.not.contain('internal-only');
    expect(capture.raw()).to.contain('internal-only');
  });

  it('masks unexpected errors with a generic 500 and logs the stack', async () => {
    const res = await request(app).get('/boom').expect(500);
    expect(res.body.message).to.equal('An unexpected error occurred. Please try again later.');
    expect(JSON.stringify(res.body)).to.not.contain('hunter2');
    const logged = capture.entries().find((e) => e.code === 'UNHANDLED_ERROR');
    expect(logged.error.stack).to.contain('Error: database password');
  });

  it('returns 404 in the same shape for unknown routes', async () => {
    const res = await request(app).get('/nothing-here').expect(404);
    expect(res.body).to.have.all.keys('status', 'message', 'requestId');
  });

  it('returns 400 for malformed JSON without logging the payload', async () => {
    const res = await request(app)
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{"text": "my private sentence"')
      .expect(400);
    expect(res.body.message).to.equal('Request body must be valid JSON.');
    expect(capture.raw()).to.not.contain('private sentence');
  });

  it('logs each request with method, path, status and duration, but not the query string', async () => {
    await request(app).get('/app-error?secret=value').expect(400);
    const entry = capture.entries().find((e) => e.req && e.res && e.responseTime !== undefined);
    expect(entry.req.method).to.equal('GET');
    expect(entry.req.path).to.equal('/app-error');
    expect(entry.res.statusCode).to.equal(400);
    expect(entry.level).to.equal(40); // warn
    expect(capture.raw()).to.not.contain('secret=value');
  });
});
