import { useEffect, useRef } from 'react';
import { countCharacters } from '../utils/text';

/** The input side: text area, live character counter, Clear, and inline validation. */
export default function TextPanel({
  value,
  maxLength,
  validationMessage,
  focusSignal = 0,
  onChange,
  onClear,
}) {
  const textarea = useRef(null);

  // When validation fails, take the person straight to the field that needs fixing.
  useEffect(() => {
    if (focusSignal > 0) textarea.current?.focus();
  }, [focusSignal]);

  // Clear disables itself once the box is empty, which would drop keyboard focus.
  function handleClear() {
    onClear();
    textarea.current?.focus();
  }

  const count = countCharacters(value);
  const overLimit = count > maxLength;
  const describedBy = ['char-count', validationMessage ? 'source-text-error' : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="panel panel--input">
      <label className="panel__title" htmlFor="source-text">
        Your text
      </label>
      <textarea
        ref={textarea}
        id="source-text"
        className="panel__textarea"
        value={value}
        placeholder="Type or paste text to translate"
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={describedBy}
        aria-invalid={Boolean(validationMessage) || overLimit}
      />
      <div className="panel__footer">
        <span id="char-count" className={overLimit ? 'counter counter--over' : 'counter'}>
          {count}/{maxLength}
          <span className="sr-only"> characters</span>
          {overLimit && <span className="counter__flag"> Over limit</span>}
        </span>
        <button
          type="button"
          className="link-btn"
          onClick={handleClear}
          disabled={value.length === 0}
        >
          Clear
        </button>
      </div>
      {validationMessage && (
        <p id="source-text-error" className="field-error" role="alert">
          {validationMessage}
        </p>
      )}
    </div>
  );
}
