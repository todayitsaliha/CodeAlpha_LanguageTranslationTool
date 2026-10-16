import { canSwap, createInitialState, translatorReducer } from './translatorReducer';

const SUPPORTED = new Set(['en', 'es', 'fr']);

function stateWith(overrides) {
  return { ...createInitialState('es'), ...overrides };
}

function reduce(state, action) {
  return translatorReducer(state, action);
}

describe('translatorReducer', () => {
  it('starts idle with auto-detect and the default target', () => {
    expect(createInitialState('es')).toMatchObject({
      text: '',
      source: 'auto',
      target: 'es',
      status: 'idle',
      result: null,
      error: null,
    });
  });

  describe('editing', () => {
    it('updates text and clears the inline validation message', () => {
      const next = reduce(stateWith({ validationError: 'Enter some text.' }), {
        type: 'text_changed',
        text: 'Hi',
      });
      expect(next.text).toBe('Hi');
      expect(next.validationError).toBeNull();
    });

    it('drops a stale error view when the text changes', () => {
      const next = reduce(stateWith({ status: 'error', error: { message: 'x' } }), {
        type: 'text_changed',
        text: 'new',
      });
      expect(next.status).toBe('idle');
      expect(next.error).toBeNull();
    });

    it('keeps an existing result visible while the user edits', () => {
      const result = { translatedText: 'Hola', target: 'es' };
      const next = reduce(stateWith({ status: 'success', result }), {
        type: 'text_changed',
        text: 'Hello!',
      });
      expect(next.status).toBe('success');
      expect(next.result).toBe(result);
    });
  });

  describe('languages_loaded', () => {
    it('keeps a target the provider supports', () => {
      const state = stateWith({ target: 'fr' });
      expect(
        reduce(state, { type: 'languages_loaded', codes: ['en', 'fr'], defaultTarget: 'es' })
      ).toBe(state);
    });

    it('falls back to the default target, then to the first language', () => {
      const state = stateWith({ target: 'xx' });
      expect(
        reduce(state, { type: 'languages_loaded', codes: ['en', 'es'], defaultTarget: 'es' }).target
      ).toBe('es');
      expect(
        reduce(state, { type: 'languages_loaded', codes: ['en', 'fr'], defaultTarget: 'es' }).target
      ).toBe('en');
    });
  });

  describe('swap', () => {
    it('exchanges explicit languages when there is no translation yet', () => {
      const next = reduce(stateWith({ source: 'en', target: 'fr', text: 'Hello' }), {
        type: 'swap',
        supportedCodes: SUPPORTED,
      });
      expect(next).toMatchObject({ source: 'fr', target: 'en', text: 'Hello', result: null });
    });

    it('also swaps the texts when a translation is on screen', () => {
      const state = stateWith({
        source: 'en',
        target: 'fr',
        text: 'Hello',
        status: 'success',
        result: { translatedText: 'Bonjour', target: 'fr', provider: 'google' },
      });
      const next = reduce(state, { type: 'swap', supportedCodes: SUPPORTED });
      expect(next).toMatchObject({
        source: 'fr',
        target: 'en',
        text: 'Bonjour',
        status: 'success',
      });
      expect(next.result).toEqual({ translatedText: 'Hello', target: 'en' });
    });

    it('uses the detected language when the source is auto-detect', () => {
      const state = stateWith({
        source: 'auto',
        target: 'fr',
        text: 'Hello',
        status: 'success',
        result: { translatedText: 'Bonjour', detectedSource: 'en', target: 'fr' },
      });
      const next = reduce(state, { type: 'swap', supportedCodes: SUPPORTED });
      expect(next).toMatchObject({ source: 'fr', target: 'en', text: 'Bonjour' });
    });

    it('does nothing with auto-detect before anything has been detected', () => {
      const state = stateWith({ source: 'auto', target: 'fr', text: 'Hello' });
      expect(reduce(state, { type: 'swap', supportedCodes: SUPPORTED })).toBe(state);
    });

    it('does nothing when the detected language is not selectable', () => {
      const state = stateWith({
        source: 'auto',
        status: 'success',
        result: { translatedText: 'x', detectedSource: 'zz', target: 'es' },
      });
      expect(canSwap(state, SUPPORTED)).toBe(false);
      expect(reduce(state, { type: 'swap', supportedCodes: SUPPORTED })).toBe(state);
    });

    it('is blocked while a request is in flight', () => {
      const state = stateWith({ source: 'en', target: 'fr', status: 'loading' });
      expect(canSwap(state, SUPPORTED)).toBe(false);
      expect(reduce(state, { type: 'swap', supportedCodes: SUPPORTED })).toBe(state);
    });
  });

  describe('request lifecycle', () => {
    it('moves idle -> loading -> success and stores the result', () => {
      const loading = reduce(stateWith({ validationError: 'old' }), { type: 'request_started' });
      expect(loading).toMatchObject({ status: 'loading', validationError: null });

      const result = { translatedText: 'Hola', target: 'es', detectedSource: 'en' };
      expect(reduce(loading, { type: 'request_succeeded', result })).toMatchObject({
        status: 'success',
        result,
      });
    });

    it('stores the error but keeps the user text on failure', () => {
      const failed = reduce(stateWith({ text: 'Hello', status: 'loading' }), {
        type: 'request_failed',
        error: { message: 'Boom', requestId: 'r1' },
      });
      expect(failed).toMatchObject({
        status: 'error',
        text: 'Hello',
        error: { message: 'Boom', requestId: 'r1' },
      });
    });

    it('a new request clears the previous error', () => {
      const next = reduce(stateWith({ status: 'error', error: { message: 'x' } }), {
        type: 'request_started',
      });
      expect(next.error).toBeNull();
    });
  });

  it('clear resets text and output but keeps the chosen languages', () => {
    const next = reduce(
      stateWith({
        source: 'en',
        target: 'fr',
        text: 'Hello',
        status: 'success',
        result: { translatedText: 'Bonjour', target: 'fr' },
        validationError: 'x',
      }),
      { type: 'clear' }
    );
    expect(next).toMatchObject({
      text: '',
      source: 'en',
      target: 'fr',
      status: 'idle',
      result: null,
      error: null,
      validationError: null,
    });
  });

  it('records a validation failure without touching the request state', () => {
    const next = reduce(stateWith(), { type: 'validation_failed', message: 'Enter some text.' });
    expect(next).toMatchObject({ validationError: 'Enter some text.', status: 'idle' });
  });

  it('counts every validation failure, even with an unchanged message', () => {
    const action = { type: 'validation_failed', message: 'Enter some text.' };
    const once = reduce(stateWith(), action);
    const twice = reduce(once, action);
    expect(once.validationVersion).toBe(1);
    expect(twice.validationVersion).toBe(2);
  });

  it('ignores unknown actions', () => {
    const state = stateWith();
    expect(reduce(state, { type: 'nope' })).toBe(state);
  });
});
