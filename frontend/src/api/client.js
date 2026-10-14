import { config } from '../appConfig';

const NETWORK_MESSAGE = "We couldn't reach the server. Check your connection and try again.";
const HTTP_FALLBACK_MESSAGE = "The service isn't responding as expected. Please try again shortly.";
const BAD_RESPONSE_MESSAGE = 'The server sent a response we could not read. Please try again.';

/**
 * Every failure the UI needs to show is an ApiError whose `message` is safe to display.
 * `kind` is 'network' (no response), 'http' (non-2xx) or 'response' (2xx but malformed).
 */
export class ApiError extends Error {
  constructor(message, { kind, status, requestId, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.requestId = requestId;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    // Cancellations are intentional (user cleared the form, component unmounted); not errors.
    if (cause && cause.name === 'AbortError') throw cause;
    throw new ApiError(NETWORK_MESSAGE, { kind: 'network', cause });
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data && typeof data.message === 'string' && data.message;
    throw new ApiError(message || HTTP_FALLBACK_MESSAGE, {
      kind: 'http',
      status: response.status,
      requestId: data && data.requestId,
    });
  }
  return data;
}

function isLanguage(item) {
  return Boolean(item) && typeof item.code === 'string' && typeof item.name === 'string';
}

/** GET /api/languages -> [{ code, name }] */
export async function fetchLanguages({ signal } = {}) {
  const data = await request('/api/languages', { signal });
  if (!Array.isArray(data) || !data.every(isLanguage)) {
    throw new ApiError(BAD_RESPONSE_MESSAGE, { kind: 'response' });
  }
  return data;
}

/** POST /api/translate -> { translatedText, detectedSource?, target, provider } */
export async function translateText({ text, source, target }, { signal } = {}) {
  const data = await request('/api/translate', {
    method: 'POST',
    body: { text, source, target },
    signal,
  });
  if (!data || typeof data.translatedText !== 'string') {
    throw new ApiError(BAD_RESPONSE_MESSAGE, { kind: 'response' });
  }
  return data;
}
