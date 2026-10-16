import { findVoice, isSpeechSupported, splitIntoChunks } from './speech';
import { mockSpeech } from '../test/browserMocks';

const voice = (lang) => ({ lang, name: lang });

describe('findVoice', () => {
  it('prefers an exact regional match', () => {
    const voices = [voice('es-ES'), voice('es-MX')];
    expect(findVoice(voices, 'es-MX').lang).toBe('es-MX');
  });

  it('falls back to any voice with the same base language', () => {
    expect(findVoice([voice('en-US'), voice('es-MX')], 'es').lang).toBe('es-MX');
    expect(findVoice([voice('es-MX')], 'es-ES').lang).toBe('es-MX');
  });

  it('accepts underscore tags and ignores case', () => {
    expect(findVoice([voice('fr_FR')], 'FR').lang).toBe('fr_FR');
  });

  it('maps provider codes to the tags voices use', () => {
    expect(findVoice([voice('zh-CN')], 'zh-CN').lang).toBe('zh-CN');
    expect(findVoice([voice('zh-CN')], 'zh-TW').lang).toBe('zh-CN');
    expect(findVoice([voice('zh-HK')], 'zh-Hant').lang).toBe('zh-HK');
    expect(findVoice([voice('nb-NO')], 'no').lang).toBe('nb-NO');
    expect(findVoice([voice('iw-IL')], 'he').lang).toBe('iw-IL');
    expect(findVoice([voice('fil-PH')], 'fil').lang).toBe('fil-PH');
  });

  it('returns null when there is no suitable voice or nothing to look in', () => {
    expect(findVoice([voice('en-US')], 'xx')).toBeNull();
    expect(findVoice([], 'en')).toBeNull();
    expect(findVoice(undefined, 'en')).toBeNull();
    expect(findVoice([voice('en-US')], undefined)).toBeNull();
  });
});

describe('splitIntoChunks', () => {
  const squash = (value) => value.replace(/\s+/g, '');

  it('returns nothing for empty text', () => {
    expect(splitIntoChunks('')).toEqual([]);
    expect(splitIntoChunks('  \n ')).toEqual([]);
  });

  it('keeps short text in one chunk', () => {
    expect(splitIntoChunks('Hello, how are you today?')).toEqual(['Hello, how are you today?']);
  });

  it('does not break up punctuation runs', () => {
    expect(splitIntoChunks('Wait... what?!')).toEqual(['Wait... what?!']);
  });

  it('packs sentences up to the limit without exceeding it', () => {
    const text = 'One two three. Four five six. Seven eight nine. Ten eleven twelve.';
    const chunks = splitIntoChunks(text, 32);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => expect(Array.from(chunk).length).toBeLessThanOrEqual(32));
    expect(squash(chunks.join(' '))).toBe(squash(text));
  });

  it('splits an over-long sentence at spaces', () => {
    const text = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    const chunks = splitIntoChunks(text, 50);
    chunks.forEach((chunk) => expect(Array.from(chunk).length).toBeLessThanOrEqual(50));
    expect(chunks.join(' ')).toBe(text);
  });

  it('splits text with no spaces (for example Japanese) and keeps every character', () => {
    const text = 'こんにちは、'.repeat(60);
    const chunks = splitIntoChunks(text, 40);
    chunks.forEach((chunk) => expect(Array.from(chunk).length).toBeLessThanOrEqual(40));
    expect(chunks.join('')).toBe(text);
  });

  it('recognises CJK sentence endings and line breaks', () => {
    expect(splitIntoChunks('你好。再见。', 3)).toEqual(['你好。', '再见。']);
    expect(splitIntoChunks('Line one\nLine two', 10)).toEqual(['Line one', 'Line two']);
  });

  it('keeps stray leading punctuation', () => {
    expect(squash(splitIntoChunks('...hello').join(''))).toBe('...hello');
  });
});

describe('isSpeechSupported', () => {
  it('is false without the API and true with it', () => {
    expect(isSpeechSupported()).toBe(false);
    const speech = mockSpeech();
    expect(isSpeechSupported()).toBe(true);
    speech.restore();
  });
});
