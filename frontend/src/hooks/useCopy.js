import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from '../utils/clipboard';

/** Copy-to-clipboard with a short-lived confirmation: status is 'idle', 'copied' or 'failed'. */
export function useCopy(resetMs = 2000) {
  const [status, setStatus] = useState('idle');
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text) => {
      clearTimeout(timer.current);
      const copied = await copyText(text);
      setStatus(copied ? 'copied' : 'failed');
      // A failure message needs longer on screen than a confirmation.
      timer.current = setTimeout(() => setStatus('idle'), copied ? resetMs : resetMs * 3);
    },
    [resetMs]
  );

  return { status, copy };
}
