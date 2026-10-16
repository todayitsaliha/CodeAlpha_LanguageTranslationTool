import { act, renderHook } from '@testing-library/react';
import { mockSpeech } from '../test/browserMocks';
import { START_TIMEOUT_MS, useSpeech } from './useSpeech';

const SPANISH = { lang: 'es-MX', name: 'Spanish voice' };
const ENGLISH = { lang: 'en-US', name: 'English voice' };

let speech;
afterEach(() => speech?.restore());

function setup({ voices = [SPANISH], text = 'Hola. Adiós.', lang = 'es' } = {}) {
  speech = mockSpeech({ voices });
  return renderHook(() => useSpeech({ text, lang }));
}

describe('useSpeech availability', () => {
  it('is unsupported without the SpeechSynthesis API', () => {
    const { result } = renderHook(() => useSpeech({ text: 'Hola', lang: 'es' }));
    expect(result.current.availability).toBe('unsupported');
    act(() => result.current.speak());
    expect(result.current.status).toBe('idle');
  });

  it('is available when a voice matches the language', () => {
    expect(setup().result.current.availability).toBe('available');
  });

  it('reports no voice when voices exist but none match', () => {
    expect(setup({ voices: [ENGLISH] }).result.current.availability).toBe('no-voice');
  });

  it('stays available while the voice list is still empty (some browsers load it lazily)', () => {
    expect(setup({ voices: [] }).result.current.availability).toBe('available');
  });

  it('updates when the browser finishes loading voices', () => {
    const { result } = setup({ voices: [] });
    act(() => speech.setVoices([ENGLISH]));
    expect(result.current.availability).toBe('no-voice');
    act(() => speech.setVoices([ENGLISH, SPANISH]));
    expect(result.current.availability).toBe('available');
  });
});

describe('useSpeech playback', () => {
  it('queues the text with the matching voice and language, cancelling earlier speech first', () => {
    const { result } = setup({ text: 'Hola. Adiós.' });
    act(() => result.current.speak());

    expect(speech.synth.cancel).toHaveBeenCalled();
    expect(speech.spoken).toHaveLength(1);
    expect(speech.spoken[0]).toMatchObject({ text: 'Hola. Adiós.', lang: 'es-MX', voice: SPANISH });
    expect(result.current.status).toBe('speaking');
  });

  it('queues long text as several utterances and finishes after the last one', () => {
    const text = Array.from({ length: 12 }, (_, i) => `Frase número ${i} termina aquí.`).join(' ');
    const { result } = setup({ text });
    act(() => result.current.speak());
    expect(speech.spoken.length).toBeGreaterThan(1);

    act(() => speech.spoken[0].onend());
    expect(result.current.status).toBe('speaking');
    act(() => speech.spoken[speech.spoken.length - 1].onend());
    expect(result.current.status).toBe('idle');
  });

  it('stops on request and ignores late events from the stopped run', () => {
    const { result } = setup();
    act(() => result.current.speak());
    const [utterance] = speech.spoken;

    act(() => result.current.stop());
    expect(speech.synth.cancel).toHaveBeenCalledTimes(2); // once on speak, once on stop
    expect(result.current.status).toBe('idle');

    act(() => result.current.speak());
    act(() => utterance.onend()); // the old run finishing must not end the new one
    expect(result.current.status).toBe('speaking');
  });

  it('shows an error when playback fails', () => {
    const { result } = setup();
    act(() => result.current.speak());
    act(() => speech.spoken[0].onerror({ error: 'synthesis-failed' }));
    expect(result.current.status).toBe('error');
  });

  it('does not treat cancellation as an error', () => {
    const { result } = setup();
    act(() => result.current.speak());
    act(() => speech.spoken[0].onerror({ error: 'canceled' }));
    act(() => speech.spoken[0].onerror({ error: 'interrupted' }));
    expect(result.current.status).toBe('speaking');
  });

  it('will not start when no voice is available', () => {
    const { result } = setup({ voices: [ENGLISH] });
    act(() => result.current.speak());
    expect(speech.synth.speak).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('does nothing for text with no speakable content', () => {
    const { result } = setup({ text: '   ' });
    act(() => result.current.speak());
    expect(speech.synth.speak).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('cancels speech and stops listening for voice changes on unmount', () => {
    const { result, unmount } = setup();
    act(() => result.current.speak());
    speech.synth.cancel.mockClear();
    unmount();
    expect(speech.synth.cancel).toHaveBeenCalled();
    expect(speech.synth.removeEventListener).toHaveBeenCalledWith(
      'voiceschanged',
      expect.any(Function)
    );
  });
});

describe('useSpeech start watchdog', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('gives up with an error when audio never starts (a device with no working voices)', () => {
    const { result } = setup();
    act(() => result.current.speak());
    expect(result.current.status).toBe('speaking');

    act(() => jest.advanceTimersByTime(START_TIMEOUT_MS - 1));
    expect(result.current.status).toBe('speaking');
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.status).toBe('error');
    expect(speech.synth.cancel).toHaveBeenCalledTimes(2); // on speak, and on giving up
  });

  it('does nothing once the audio has started', () => {
    const { result } = setup();
    act(() => result.current.speak());
    act(() => speech.spoken[0].onstart());
    act(() => jest.advanceTimersByTime(START_TIMEOUT_MS * 2));
    expect(result.current.status).toBe('speaking');
  });

  it('is cancelled by Stop and by unmounting', () => {
    const first = setup();
    act(() => first.result.current.speak());
    act(() => first.result.current.stop());
    act(() => jest.advanceTimersByTime(START_TIMEOUT_MS * 2));
    expect(first.result.current.status).toBe('idle');

    const second = setup();
    act(() => second.result.current.speak());
    second.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('restarts for a new run and ignores the old run', () => {
    const { result } = setup();
    act(() => result.current.speak());
    act(() => jest.advanceTimersByTime(START_TIMEOUT_MS - 100));
    act(() => result.current.speak());
    act(() => jest.advanceTimersByTime(200)); // the first run's deadline passes
    expect(result.current.status).toBe('speaking');
    act(() => jest.advanceTimersByTime(START_TIMEOUT_MS));
    expect(result.current.status).toBe('error');
  });
});
