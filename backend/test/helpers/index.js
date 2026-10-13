'use strict';

const { Writable } = require('node:stream');
const { createLogger } = require('../../src/utils/logger');
const { loadConfig } = require('../../src/config');

/** Logger that captures every JSON log line so tests can assert on what was logged. */
function createCapturingLogger(level = 'debug') {
  const chunks = [];
  const destination = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  const logger = createLogger({ level, destination });
  return {
    logger,
    raw: () => chunks.join(''),
    entries: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
  };
}

function silentLogger() {
  return createLogger({ level: 'silent' });
}

function testConfig(overrides = {}) {
  const base = loadConfig({
    TRANSLATION_PROVIDER: 'google',
    GOOGLE_TRANSLATE_API_KEY: 'test-key',
    CORS_ORIGIN: 'http://localhost:3000',
  });
  return { ...base, ...overrides };
}

module.exports = { createCapturingLogger, silentLogger, testConfig };
