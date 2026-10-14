/**
 * Pure state machine for the translator screen.
 *
 * status:  'idle' -> 'loading' -> 'success' | 'error'
 * result:  { translatedText, detectedSource?, target, provider? } | null
 * error:   { message, requestId? } | null
 * validationError: inline message about the input (never involves the network)
 */
export function createInitialState(defaultTarget) {
  return {
    text: '',
    source: 'auto',
    target: defaultTarget,
    status: 'idle',
    result: null,
    error: null,
    validationError: null,
  };
}

/**
 * Swapping needs a concrete source language. With "Detect language" selected that is only
 * possible once a translation has reported which language it detected.
 */
export function canSwap(state, supportedCodes) {
  if (state.status === 'loading') return false;
  if (state.source !== 'auto') return true;
  const detected = state.status === 'success' && state.result ? state.result.detectedSource : null;
  return Boolean(detected) && supportedCodes.has(detected);
}

function swap(state, supportedCodes) {
  if (!canSwap(state, supportedCodes)) return state;

  const source = state.target;
  const target = state.source === 'auto' ? state.result.detectedSource : state.source;

  if (state.status !== 'success' || !state.result) {
    return { ...state, source, target, validationError: null };
  }

  // A translation is on screen: the two texts trade places along with the languages,
  // so the old input becomes the output of the reverse direction.
  return {
    ...state,
    source,
    target,
    text: state.result.translatedText,
    result: { translatedText: state.text, target },
    validationError: null,
  };
}

export function translatorReducer(state, action) {
  switch (action.type) {
    case 'text_changed':
      return {
        ...state,
        text: action.text,
        validationError: null,
        // A stale error (and its Try again button) no longer describes what is in the box.
        ...(state.status === 'error' ? { status: 'idle', error: null } : {}),
      };
    case 'source_changed':
      return { ...state, source: action.code, validationError: null };
    case 'target_changed':
      return { ...state, target: action.code };
    case 'languages_loaded': {
      if (action.codes.includes(state.target)) return state;
      const target = action.codes.includes(action.defaultTarget)
        ? action.defaultTarget
        : action.codes[0];
      return { ...state, target };
    }
    case 'swap':
      return swap(state, action.supportedCodes);
    case 'clear':
      return {
        ...state,
        text: '',
        status: 'idle',
        result: null,
        error: null,
        validationError: null,
      };
    case 'validation_failed':
      return { ...state, validationError: action.message };
    case 'request_started':
      return { ...state, status: 'loading', error: null, validationError: null };
    case 'request_succeeded':
      return { ...state, status: 'success', result: action.result, error: null };
    case 'request_failed':
      return { ...state, status: 'error', error: action.error };
    default:
      return state;
  }
}
