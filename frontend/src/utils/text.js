import { config } from '../appConfig';

/** Counts characters the way the backend does (code points), so an emoji counts once. */
export function countCharacters(text) {
  return Array.from(text).length;
}

/** Returns a user-facing message when `text` cannot be sent, otherwise null. */
export function validateText(text, maxLength = config.maxTextLength) {
  if (text.trim().length === 0) return 'Enter some text to translate.';
  if (countCharacters(text) > maxLength) {
    return `Shorten your text to ${maxLength} characters or fewer.`;
  }
  return null;
}
