'use strict';

const express = require('express');
const request = require('supertest');
const { expect } = require('chai');
const requestContext = require('../../src/middleware/requestContext');
const errorHandler = require('../../src/middleware/errorHandler');
const { createRateLimiter } = require('../../src/middleware/rateLimiter');
const { silentLogger } = require('../helpers');

describe('rate limiter middleware', () => {
  function buildApp(max) {
    const logger = silentLogger();
    const app = express();
    app.use(requestContext(logger));
    app.get('/limited', createRateLimiter({ windowMs: 60000, max }), (req, res) =>
      res.json({ ok: true })
    );
    app.use(errorHandler({ logger }));
    return app;
  }

  it('allows requests under the limit and advertises it', async () => {
    const res = await request(buildApp(2)).get('/limited').expect(200);
    expect(res.headers).to.have.property('ratelimit');
  });

  it('rejects requests over the limit with a 429 in the standard error shape', async () => {
    const app = buildApp(2);
    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);
    const res = await request(app).get('/limited').expect(429);
    expect(res.body).to.have.all.keys('status', 'message', 'requestId');
    expect(res.body.status).to.equal(429);
    expect(res.body.message).to.match(/try again/i);
  });
});
