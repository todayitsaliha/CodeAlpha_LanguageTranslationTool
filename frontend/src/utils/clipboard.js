/** Fallback for pages without the async Clipboard API (plain HTTP, older browsers). */
function copyWithSelection(text) {
  const previouslyFocused = document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  field.style.position = 'fixed';
  field.style.top = '0';
  field.style.left = '-9999px';
  document.body.appendChild(field);

  let copied = false;
  try {
    field.select();
    field.setSelectionRange(0, text.length);
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    document.body.removeChild(field);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  }
  return copied;
}

/**
 * Copies text to the clipboard. Uses the Clipboard API where it is available (it needs a
 * secure context: HTTPS or localhost), otherwise a selection-based fallback.
 * Resolves to true when the text was copied.
 */
export async function copyText(text) {
  if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or document not focused: try the fallback below.
    }
  }
  return copyWithSelection(text);
}
