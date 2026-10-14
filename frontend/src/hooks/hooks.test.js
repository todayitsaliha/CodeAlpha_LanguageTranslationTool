import { act, renderHook, waitFor } from '@testing-library/react';
import { ApiError, fetchLanguages, translateText } from '../api/client';
import { useLanguages } from './useLanguages';
import { useTranslator } from './useTranslator';

jest.mock('../api/client', () => ({
  ...jest.requireActual('../api/client'),
  fetchLanguages: jest.fn(),
  translateText: jest.fn(),
}));

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => jest.resetAllMocks());

describe('useLanguages', () => {
  it('goes from loading to ready with the list', async () => {
    fetchLanguages.mockResolvedValue(LANGUAGES);
    const { result } = renderHook(() => useLanguages());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.languages).toEqual(LANGUAGES);
  });

  it('reports a displayable error and recovers on reload', async () => {
    fetchLanguages.mockRejectedValueOnce(
      new ApiError('Translation service is down.', { kind: 'http', status: 502, requestId: 'r9' })
    );
    const { result } = renderHook(() => useLanguages());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toEqual({
      message: 'Translation service is down.',
      requestId: 'r9',
    });

    fetchLanguages.mockResolvedValueOnce(LANGUAGES);
    act(() => result.current.reload());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('cancels the request on unmount', () => {
    fetchLanguages.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderHook(() => useLanguages());
    const { signal } = fetchLanguages.mock.calls[0][0];
    unmount();
    expect(signal.aborted).toBe(true);
  });
});

describe('useTranslator', () => {
  function setup() {
    return renderHook(() => useTranslator({ languages: LANGUAGES }));
  }

  it('translates the current text and stores the result', async () => {
    translateText.mockResolvedValue({ translatedText: 'Hola', detectedSource: 'en', target: 'es' });
    const { result } = setup();

    act(() => result.current.setText('Hello'));
    await act(() => result.current.submit());

    expect(translateText).toHaveBeenCalledWith(
      { text: 'Hello', source: 'auto', target: 'es' },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.current.state.status).toBe('success');
    expect(result.current.state.result.translatedText).toBe('Hola');
  });

  it('validates before calling the API', async () => {
    const { result } = setup();
    await act(() => result.current.submit());
    expect(translateText).not.toHaveBeenCalled();
    expect(result.current.state.validationError).toMatch(/enter some text/i);
    expect(result.current.state.status).toBe('idle');
  });

  it('ignores a second submit while a request is in flight', async () => {
    const pending = deferred();
    translateText.mockReturnValue(pending.promise);
    const { result } = setup();
    act(() => result.current.setText('Hello'));

    let first;
    act(() => {
      first = result.current.submit();
      result.current.submit();
    });
    expect(result.current.state.status).toBe('loading');
    expect(translateText).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ translatedText: 'Hola', target: 'es' });
      await first;
    });
    expect(result.current.state.status).toBe('success');
  });

  it('keeps the text and exposes a displayable error when the request fails', async () => {
    translateText.mockRejectedValue(
      new ApiError('Too many requests.', { kind: 'http', status: 429, requestId: 'r1' })
    );
    const { result } = setup();
    act(() => result.current.setText('Hello'));
    await act(() => result.current.submit());

    expect(result.current.state).toMatchObject({
      status: 'error',
      text: 'Hello',
      error: { message: 'Too many requests.', requestId: 'r1' },
    });
  });

  it('can retry after a failure and then succeeds', async () => {
    translateText.mockRejectedValueOnce(new ApiError('Down.', { kind: 'http', status: 502 }));
    translateText.mockResolvedValueOnce({ translatedText: 'Hola', target: 'es' });
    const { result } = setup();
    act(() => result.current.setText('Hello'));
    await act(() => result.current.submit());
    expect(result.current.state.status).toBe('error');

    await act(() => result.current.submit());
    expect(result.current.state.status).toBe('success');
  });

  it('cancels the request on clear and never shows its late response', async () => {
    const pending = deferred();
    translateText.mockReturnValue(pending.promise);
    const { result } = setup();
    act(() => result.current.setText('Hello'));

    let request;
    act(() => {
      request = result.current.submit();
    });
    const { signal } = translateText.mock.calls[0][1];

    act(() => result.current.clear());
    expect(signal.aborted).toBe(true);
    expect(result.current.state).toMatchObject({ status: 'idle', text: '' });

    await act(async () => {
      pending.resolve({ translatedText: 'Hola', target: 'es' });
      await request;
    });
    expect(result.current.state).toMatchObject({ status: 'idle', result: null });
  });

  it('allows a new request right after clearing a pending one', async () => {
    translateText.mockReturnValueOnce(new Promise(() => {}));
    translateText.mockResolvedValueOnce({ translatedText: 'Bonjour', target: 'fr' });
    const { result } = setup();
    act(() => result.current.setText('Hello'));
    act(() => {
      result.current.submit();
    });
    act(() => result.current.clear());

    act(() => result.current.setText('Hi'));
    await act(() => result.current.submit());
    expect(translateText).toHaveBeenCalledTimes(2);
    expect(result.current.state.status).toBe('success');
  });

  it('cancels the request on unmount', () => {
    translateText.mockReturnValue(new Promise(() => {}));
    const { result, unmount } = setup();
    act(() => result.current.setText('Hello'));
    act(() => {
      result.current.submit();
    });
    const { signal } = translateText.mock.calls[0][1];
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('exposes whether swapping is currently possible', async () => {
    translateText.mockResolvedValue({ translatedText: 'Hola', detectedSource: 'en', target: 'es' });
    const { result } = setup();
    expect(result.current.swapEnabled).toBe(false); // auto-detect, nothing detected yet

    act(() => result.current.setText('Hello'));
    await act(() => result.current.submit());
    expect(result.current.swapEnabled).toBe(true);

    act(() => result.current.swap());
    expect(result.current.state).toMatchObject({ source: 'es', target: 'en', text: 'Hola' });
  });

  it('falls back to a supported target language once languages are known', () => {
    const { result } = renderHook(() =>
      useTranslator({ languages: [{ code: 'de', name: 'German' }] })
    );
    expect(result.current.state.target).toBe('de');
  });
});
