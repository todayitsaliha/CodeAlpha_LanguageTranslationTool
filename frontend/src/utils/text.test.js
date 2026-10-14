import { countCharacters, validateText } from './text';

describe('countCharacters', () => {
  it('counts plain text', () => {
    expect(countCharacters('Hello')).toBe(5);
    expect(countCharacters('')).toBe(0);
  });

  it('counts emoji and non-Latin characters once each, like the backend', () => {
    expect(countCharacters('😀😀')).toBe(2);
    expect(countCharacters('こんにちは')).toBe(5);
  });
});

describe('validateText', () => {
  it('accepts normal text', () => {
    expect(validateText('Hello', 10)).toBeNull();
  });

  it('rejects empty and whitespace-only text', () => {
    expect(validateText('', 10)).toMatch(/enter some text/i);
    expect(validateText('  \n\t ', 10)).toMatch(/enter some text/i);
  });

  it('rejects text over the limit but allows exactly the limit', () => {
    expect(validateText('x'.repeat(10), 10)).toBeNull();
    expect(validateText('x'.repeat(11), 10)).toMatch(/10 characters/);
  });

  it('defaults to the configured limit', () => {
    expect(validateText('x'.repeat(100))).toBeNull();
    expect(validateText('x'.repeat(101))).not.toBeNull();
  });
});
