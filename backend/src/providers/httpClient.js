'use strict';

const ProviderError = require('./providerError');

const MAX_DETAIL_LENGTH = 300;
const QUOTA_PATTERN = /quota|rate ?limit|limit exceeded/i;

function classifyStatus(status, bodyText) {
  if (status === 429) return 'quota';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 403 && QUOTA_PATTERN.test(bodyText)) return 'quota';
  if (status === 401 || status === 403) return 'auth';
  return 'http_error';
}

/**
 * Minimal JSON-over-HTTP helper for provider adapters. Applies a hard timeout and maps
 * every failure (timeout, network, non-2xx, malformed JSON) to a ProviderError.
 */
async function requestJson({
  provider,
  url,
  method = 'GET',
  headers = {},
  body,
  timeoutMs,
  fetchImpl = globalThis.fetch,
}) {
  const hasBody = body !== undefined;
  let status;
  let text;

  try {
    const response = await fetchImpl(url, {
      method,
      headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = response.status;
    text = await response.text();
  } catch (cause) {
    const timedOut = cause && (cause.name === 'TimeoutError' || cause.name === 'AbortError');
    if (timedOut) {
      throw new ProviderError('timeout', {
        provider,
        cause,
        detail: `no response within ${timeoutMs}ms`,
      });
    }
    throw new ProviderError('network', { provider, cause, detail: cause && cause.message });
  }

  if (status < 200 || status >= 300) {
    throw new ProviderError(classifyStatus(status, text), {
      provider,
      providerStatus: status,
      detail: String(text).slice(0, MAX_DETAIL_LENGTH),
    });
  }

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ProviderError('bad_response', {
      provider,
      providerStatus: status,
      cause,
      detail: 'response was not valid JSON',
    });
  }
}

module.exports = { requestJson };
