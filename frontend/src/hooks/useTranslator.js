import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { translateText } from '../api/client';
import { config } from '../appConfig';
import { canSwap, createInitialState, translatorReducer } from '../state/translatorReducer';
import { toDisplayError } from '../utils/errors';
import { validateText } from '../utils/text';

/**
 * Owns the translator form and request lifecycle.
 * - Only one request can be in flight (duplicate submits are ignored).
 * - Clearing or unmounting cancels the request, and a cancelled response is never shown.
 * - A failed request keeps the user's text so they can retry without retyping.
 */
export function useTranslator({ languages }) {
  const [state, dispatch] = useReducer(
    translatorReducer,
    config.defaultTargetLanguage,
    createInitialState
  );
  const inFlight = useRef(null);

  const codes = useMemo(() => languages.map((language) => language.code), [languages]);
  const supportedCodes = useMemo(() => new Set(codes), [codes]);

  useEffect(() => {
    if (codes.length > 0) {
      dispatch({ type: 'languages_loaded', codes, defaultTarget: config.defaultTargetLanguage });
    }
  }, [codes]);

  useEffect(() => () => inFlight.current?.abort(), []);

  const submit = useCallback(async () => {
    if (inFlight.current) return;

    const problem = validateText(state.text);
    if (problem) {
      dispatch({ type: 'validation_failed', message: problem });
      return;
    }

    const controller = new AbortController();
    inFlight.current = controller;
    dispatch({ type: 'request_started' });

    try {
      const result = await translateText(
        { text: state.text, source: state.source, target: state.target },
        { signal: controller.signal }
      );
      if (!controller.signal.aborted) dispatch({ type: 'request_succeeded', result });
    } catch (error) {
      if (!controller.signal.aborted && error?.name !== 'AbortError') {
        dispatch({ type: 'request_failed', error: toDisplayError(error) });
      }
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [state.text, state.source, state.target]);

  const clear = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    dispatch({ type: 'clear' });
  }, []);

  const setText = useCallback((text) => dispatch({ type: 'text_changed', text }), []);
  const setSource = useCallback((code) => dispatch({ type: 'source_changed', code }), []);
  const setTarget = useCallback((code) => dispatch({ type: 'target_changed', code }), []);
  const swap = useCallback(() => dispatch({ type: 'swap', supportedCodes }), [supportedCodes]);

  return {
    state,
    swapEnabled: canSwap(state, supportedCodes),
    setText,
    setSource,
    setTarget,
    swap,
    submit,
    clear,
  };
}
