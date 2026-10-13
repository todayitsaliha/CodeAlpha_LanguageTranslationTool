'use strict';

/**
 * Builds a fetch stand-in that records calls and replies with real Response objects.
 * `responder` receives (url, init) and returns a Response, or throws to simulate network errors.
 */
function fakeFetch(responder) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    return responder(String(url), init);
  };
  fn.calls = calls;
  return fn;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

module.exports = { fakeFetch, jsonResponse };
