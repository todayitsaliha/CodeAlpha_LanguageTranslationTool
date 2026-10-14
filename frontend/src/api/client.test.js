import { ApiError, fetchLanguages, translateText } from './client';

function respond(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError('no body');
      return body;
    },
  };
}

async function failureOf(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to fail');
}

describe('api client', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });
  afterEach(() => {
    delete global.fetch;
  });

  describe('translateText', () => {
    it('POSTs the request as JSON and returns the response body', async () => {
      const body = {
        translatedText: 'Hola',
        detectedSource: 'en',
        target: 'es',
        provider: 'google',
      };
      fetch.mockResolvedValue(respond(body));

      const result = await translateText({ text: 'Hello', source: 'auto', target: 'es' });

      expect(result).toEqual(body);
      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe('/api/translate');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(init.body)).toEqual({ text: 'Hello', source: 'auto', target: 'es' });
    });

    it('passes the abort signal to fetch', async () => {
      fetch.mockResolvedValue(respond({ translatedText: 'x' }));
      const controller = new AbortController();
      await translateText(
        { text: 'a', source: 'auto', target: 'es' },
        { signal: controller.signal }
      );
      expect(fetch.mock.calls[0][1].signal).toBe(controller.signal);
    });

    it('turns API error bodies into ApiError with the server message and request id', async () => {
      fetch.mockResolvedValue(
        respond(
          { status: 429, message: 'Too many requests. Please wait.', requestId: 'req-1' },
          { ok: false, status: 429 }
        )
      );
      const error = await failureOf(translateText({ text: 'a', source: 'auto', target: 'es' }));
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        kind: 'http',
        status: 429,
        requestId: 'req-1',
        message: 'Too many requests. Please wait.',
      });
    });

    it('falls back to a safe message when an error response has no JSON body', async () => {
      fetch.mockResolvedValue(respond(undefined, { ok: false, status: 502 }));
      const error = await failureOf(translateText({ text: 'a', source: 'auto', target: 'es' }));
      expect(error.kind).toBe('http');
      expect(error.message).toMatch(/isn't responding/);
    });

    it('reports network failures with a friendly message', async () => {
      fetch.mockRejectedValue(new TypeError('Failed to fetch'));
      const error = await failureOf(translateText({ text: 'a', source: 'auto', target: 'es' }));
      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe('network');
      expect(error.message).not.toMatch(/Failed to fetch/);
    });

    it('rethrows aborts untouched so callers can ignore them', async () => {
      const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
      fetch.mockRejectedValue(abort);
      const error = await failureOf(translateText({ text: 'a', source: 'auto', target: 'es' }));
      expect(error).toBe(abort);
    });

    it('rejects a 200 response that is missing translatedText', async () => {
      fetch.mockResolvedValue(respond({ nope: true }));
      const error = await failureOf(translateText({ text: 'a', source: 'auto', target: 'es' }));
      expect(error.kind).toBe('response');
    });
  });

  describe('fetchLanguages', () => {
    it('returns the language list', async () => {
      const languages = [{ code: 'fr', name: 'French' }];
      fetch.mockResolvedValue(respond(languages));
      await expect(fetchLanguages()).resolves.toEqual(languages);
      expect(fetch.mock.calls[0][0]).toBe('/api/languages');
      expect(fetch.mock.calls[0][1].method).toBe('GET');
    });

    it('rejects malformed lists', async () => {
      fetch.mockResolvedValue(respond([{ code: 'fr' }]));
      expect((await failureOf(fetchLanguages())).kind).toBe('response');
      fetch.mockResolvedValue(respond({ languages: [] }));
      expect((await failureOf(fetchLanguages())).kind).toBe('response');
    });

    it('surfaces provider outages as ApiError', async () => {
      fetch.mockResolvedValue(
        respond(
          { status: 502, message: 'Translation is down.', requestId: 'r' },
          { ok: false, status: 502 }
        )
      );
      const error = await failureOf(fetchLanguages());
      expect(error).toMatchObject({ kind: 'http', status: 502, message: 'Translation is down.' });
    });
  });
});
