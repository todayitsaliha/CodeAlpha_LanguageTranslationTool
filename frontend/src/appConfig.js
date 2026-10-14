const env = import.meta.env ?? {};

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Runtime configuration. The application name lives here so it can be changed in one place. */
export const config = Object.freeze({
  appName: 'blip360',
  tagline: 'Translate anything, anywhere.',
  apiBaseUrl: (env.VITE_API_BASE_URL || '').replace(/\/+$/, ''),
  maxTextLength: positiveInt(env.VITE_MAX_TEXT_LENGTH, 5000),
  defaultTargetLanguage: env.VITE_DEFAULT_TARGET_LANGUAGE || 'es',
});
