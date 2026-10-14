import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OutputPanel from './OutputPanel';

const NAMES = { en: 'English', es: 'Spanish' };
const languageName = (code) => NAMES[code] ?? code;

function renderPanel(props = {}) {
  const onRetry = jest.fn();
  const view = render(
    <OutputPanel
      status="idle"
      result={null}
      error={null}
      languageName={languageName}
      onRetry={onRetry}
      {...props}
    />
  );
  return { onRetry, ...view };
}

describe('OutputPanel', () => {
  it('invites the person to translate when idle', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'Translation' })).toBeInTheDocument();
    expect(screen.getByText('Your translation appears here.')).toBeInTheDocument();
  });

  it('shows progress while translating', () => {
    renderPanel({ status: 'loading' });
    expect(screen.getByText('Translating…')).toBeInTheDocument();
    expect(screen.queryByText('Your translation appears here.')).not.toBeInTheDocument();
  });

  it('shows the translation with its language and the detected source', () => {
    renderPanel({
      status: 'success',
      result: { translatedText: 'Hola, ¿cómo estás?', detectedSource: 'en', target: 'es' },
    });
    const text = screen.getByText('Hola, ¿cómo estás?');
    expect(text).toHaveAttribute('lang', 'es');
    expect(text).toHaveAttribute('dir', 'auto');
    expect(screen.getByText('Detected language: English')).toBeInTheDocument();
  });

  it('omits the detected-language note when the source was chosen by the user', () => {
    renderPanel({ status: 'success', result: { translatedText: 'Hola', target: 'es' } });
    expect(screen.queryByText(/detected language/i)).not.toBeInTheDocument();
  });

  it('keeps line breaks of multi-line translations', () => {
    renderPanel({ status: 'success', result: { translatedText: 'Uno\nDos', target: 'es' } });
    expect(screen.getByText(/Uno/)).toHaveClass('output-text');
  });

  it('explains an error, shows the reference and lets the person retry', async () => {
    const { onRetry } = renderPanel({
      status: 'error',
      error: { message: 'Too many requests. Please wait a moment.', requestId: 'req-42' },
    });
    expect(screen.getByText("Couldn't translate")).toBeInTheDocument();
    expect(screen.getByText('Too many requests. Please wait a moment.')).toBeInTheDocument();
    expect(screen.getByText('Your text is still in the box.')).toBeInTheDocument();
    expect(screen.getByText('Reference: req-42')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the reference when the error has no request id', () => {
    renderPanel({ status: 'error', error: { message: 'Offline.' } });
    expect(screen.queryByText(/reference/i)).not.toBeInTheDocument();
  });

  it('renders every state inside one polite live region', () => {
    const { container } = renderPanel({ status: 'loading' });
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toContainElement(screen.getByText('Translating…'));
  });
});
