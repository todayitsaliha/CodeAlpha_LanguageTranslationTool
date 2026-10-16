// Codes our providers use that differ from the language tags voices report.
const VOICE_LANGUAGE_ALIASES = {
  'zh-cn': ['zh-cn', 'zh-hans', 'zh'],
  'zh-tw': ['zh-tw', 'zh-hant', 'zh-hk', 'zh'],
  'zh-hans': ['zh-cn', 'zh-hans', 'zh'],
  'zh-hant': ['zh-tw', 'zh-hant', 'zh-hk', 'zh'],
  he: ['he', 'iw'],
  fil: ['fil', 'tl'],
  no: ['no', 'nb', 'nn'],
  nb: ['nb', 'no'],
  id: ['id', 'in'],
};

// A sentence is text up to and including its closing punctuation run (or line break).
const SENTENCES = /[^.!?。！？…\n]+(?:[.!?。！？…]+|\n+|$)\s*|[.!?。！？…\n]+\s*/gu;

export function isSpeechSupported() {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  );
}

const normalise = (tag) => String(tag).replace('_', '-').toLowerCase();

/**
 * Picks an installed voice for a language code. An exact regional match wins
 * (es-MX for "es-MX"); otherwise any voice with the same base language is used.
 */
export function findVoice(voices, code) {
  if (!code || !voices || voices.length === 0) return null;
  const wanted = normalise(code);
  const candidates = VOICE_LANGUAGE_ALIASES[wanted] || [wanted];

  for (const candidate of candidates) {
    const exact = voices.find((voice) => normalise(voice.lang) === candidate);
    if (exact) return exact;
  }
  for (const candidate of candidates) {
    const base = candidate.split('-')[0];
    const sameBase = voices.find((voice) => normalise(voice.lang).split('-')[0] === base);
    if (sameBase) return sameBase;
  }
  return null;
}

function splitLongSentence(sentence, maxLength) {
  const pieces = [];
  let rest = sentence;
  while (Array.from(rest).length > maxLength) {
    const characters = Array.from(rest);
    const window = characters.slice(0, maxLength).join('');
    const lastSpace = window.lastIndexOf(' ');
    const cut = lastSpace > maxLength / 2 ? lastSpace : window.length;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/**
 * Splits text into sentence-sized chunks. Some browsers (notably Chrome) cut off long
 * utterances after about 15 seconds, so long translations are queued as several short ones.
 */
export function splitIntoChunks(text, maxLength = 180) {
  const sentences = (text.match(SENTENCES) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .flatMap((sentence) => splitLongSentence(sentence, maxLength));

  const chunks = [];
  for (const sentence of sentences) {
    const last = chunks[chunks.length - 1];
    if (last && Array.from(last).length + 1 + Array.from(sentence).length <= maxLength) {
      chunks[chunks.length - 1] = `${last} ${sentence}`;
    } else {
      chunks.push(sentence);
    }
  }
  return chunks;
}
