import { useCallback, useEffect, useState } from 'react';
import { fetchLanguages } from '../api/client';
import { toDisplayError } from '../utils/errors';

const LOADING = { status: 'loading', languages: [], error: null };

/** Loads the supported-language list once, with a manual reload for the error state. */
export function useLanguages() {
  const [state, setState] = useState(LOADING);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchLanguages({ signal: controller.signal })
      .then((languages) => setState({ status: 'ready', languages, error: null }))
      .catch((error) => {
        if (controller.signal.aborted || error?.name === 'AbortError') return;
        setState({ status: 'error', languages: [], error: toDisplayError(error) });
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => {
    setState(LOADING);
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, reload };
}
