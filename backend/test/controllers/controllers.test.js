'use strict';

const { expect } = require('chai');
const { createTranslateController } = require('../../src/controllers/translateController');
const { createLanguagesController } = require('../../src/controllers/languagesController');
const { createHealthController } = require('../../src/controllers/healthController');
const { testConfig } = require('../helpers');

function fakeRes() {
  const res = { statusCode: undefined, body: undefined, headers: {} };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  res.set = (name, value) => {
    res.headers[name] = value;
    return res;
  };
  return res;
}

describe('controllers', () => {
  describe('translateController', () => {
    it('passes the validated request to the service and returns 200 with the result', async () => {
      const received = [];
      const translationService = {
        async translate(input) {
          received.push(input);
          return { translatedText: 'Hola', target: 'es', provider: 'fake' };
        },
      };
      const req = { translateRequest: { text: 'Hello', source: 'auto', target: 'es' } };
      const res = fakeRes();

      await createTranslateController({ translationService })(req, res, () => {
        throw new Error('next should not be called');
      });

      expect(received).to.deep.equal([req.translateRequest]);
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.deep.equal({ translatedText: 'Hola', target: 'es', provider: 'fake' });
    });

    it('forwards service errors to next()', async () => {
      const failure = new Error('boom');
      const translationService = {
        async translate() {
          throw failure;
        },
      };
      let forwarded;
      await createTranslateController({ translationService })(
        { translateRequest: {} },
        fakeRes(),
        (err) => {
          forwarded = err;
        }
      );
      expect(forwarded).to.equal(failure);
    });
  });

  describe('languagesController', () => {
    it('returns the language list with a cache header', async () => {
      const languageService = { getLanguages: async () => [{ code: 'fr', name: 'French' }] };
      const res = fakeRes();
      await createLanguagesController({ languageService })({}, res, () => {});
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.deep.equal([{ code: 'fr', name: 'French' }]);
      expect(res.headers['Cache-Control']).to.match(/max-age/);
    });

    it('forwards errors to next()', async () => {
      const failure = new Error('down');
      const languageService = {
        getLanguages: async () => {
          throw failure;
        },
      };
      let forwarded;
      await createLanguagesController({ languageService })({}, fakeRes(), (err) => {
        forwarded = err;
      });
      expect(forwarded).to.equal(failure);
    });
  });

  describe('healthController', () => {
    it('reports ok with uptime, timestamp and provider name', () => {
      const res = fakeRes();
      createHealthController({ config: testConfig() })({}, res);
      expect(res.statusCode).to.equal(200);
      expect(res.body.status).to.equal('ok');
      expect(res.body.provider).to.equal('google');
      expect(res.body.uptimeSeconds).to.be.a('number');
      expect(new Date(res.body.timestamp).toString()).to.not.equal('Invalid Date');
    });
  });
});
