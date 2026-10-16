import { useCallback, useEffect, useRef, useState } from 'react';
import { findVoice, isSpeechSupported, splitIntoChunks } from '../utils/speech';

// Some devices accept speech but never produce audio (no voices installed). If nothing has
// started by then, give up instead of leaving the button on "Stop" forever.
export const START_TIMEOUT_MS = 5000;

/**
 * Reads text aloud with the browser's SpeechSynthesis.
 *
 * availability: 'unsupported' (no API), 'no-voice' (voices are installed but none for `lang`),
 *               or 'available'.
 * status:       'idle', 'speaking' or 'error'.
 *
 * Remount (change `key`) when the text changes: unmounting cancels any speech in progress.
 */
export function useSpeech({ text, lang }) {
  const supported = isSpeechSupported();
  const [voices, setVoices] = useState(() => (supported ? window.speechSynthesis.getVoices() : []));
  const [status, setStatus] = useState('idle');
  const run = useRef(0);
  const startTimer = useRef(null);

  useEffect(() => {
    if (!supported) return undefined;
    const synth = window.speechSynthesis;
    const refresh = () => setVoices(synth.getVoices());
    synth.addEventListener?.('voiceschanged', refresh);
    return () => {
      synth.removeEventListener?.('voiceschanged', refresh);
      clearTimeout(startTimer.current);
      run.current += 1;
      synth.cancel();
    };
  }, [supported]);

  const voice = findVoice(voices, lang);
  let availability = 'available';
  if (!supported) availability = 'unsupported';
  // Some browsers report no voices at all until first use, so an empty list is not "no voice".
  else if (voices.length > 0 && !voice) availability = 'no-voice';

  const speak = useCallback(() => {
    if (availability !== 'available') return;
    const synth = window.speechSynthesis;
    synth.cancel();
    run.current += 1;
    const current = run.current;
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) return;

    const fail = () => {
      clearTimeout(startTimer.current);
      run.current += 1;
      synth.cancel();
      setStatus('error');
    };

    setStatus('speaking');
    chunks.forEach((chunk, index) => {
      const utterance = new window.SpeechSynthesisUtterance(chunk);
      utterance.lang = voice ? voice.lang : lang;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (run.current === current) clearTimeout(startTimer.current);
      };
      utterance.onend = () => {
        if (run.current === current && index === chunks.length - 1) setStatus('idle');
      };
      utterance.onerror = (event) => {
        if (run.current !== current) return;
        // Cancelling (Stop, or starting again) is reported as an error by some browsers.
        if (event && (event.error === 'canceled' || event.error === 'interrupted')) return;
        fail();
      };
      synth.speak(utterance);
    });

    clearTimeout(startTimer.current);
    startTimer.current = setTimeout(() => {
      if (run.current === current) fail();
    }, START_TIMEOUT_MS);
  }, [availability, text, lang, voice]);

  const stop = useCallback(() => {
    clearTimeout(startTimer.current);
    run.current += 1;
    if (isSpeechSupported()) window.speechSynthesis.cancel();
    setStatus('idle');
  }, []);

  return { availability, status, speak, stop };
}
