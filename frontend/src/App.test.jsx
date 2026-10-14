import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, fetchLanguages, translateText } from './api/client';
import App from './App';

jest.mock('./api/client', () => ({
  ...jest.requireActual('./api/client'),
  fetchLanguages: jest.fn(),
  translateText: jest.fn(),
}));

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
];

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function renderApp() {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(screen.getByLabelText('From')).toBeEnabled());
  return user;
}

const translateButton = () => screen.getByRole('button', { name: /^Translat/ });

beforeEach(() => {
  jest.resetAllMocks();
  fetchLanguages.mockResolvedValue(LANGUAGES);
});

describe('App: first load', () => {
  it('shows the brand, loads languages and preselects the default target', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'blip360' })).toBeInTheDocument();
    expect(translateButton()).toBeDisabled();
    expect(screen.getByLabelText('From')).toBeDisabled();

    await waitFor(() => expect(screen.getByLabelText('From')).toBeEnabled());
    expect(screen.getByLabelText('From')).toHaveValue('auto');
    expect(screen.getByLabelText('To')).toHaveValue('es');
    expect(translateButton()).toBeEnabled();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'blip360 translator' })).toBeInTheDocument();
  });

  it('offers a retry when the languages cannot be loaded', async () => {
    fetchLanguages.mockRejectedValueOnce(
      new ApiError('The translation service is temporarily unavailable.', {
        kind: 'http',
        status: 502,
        requestId: 'req-lang',
      })
    );
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Couldn't load languages")).toBeInTheDocument();
    expect(
      screen.getByText('The translation service is temporarily unavailable.')
    ).toBeInTheDocument();
    expect(screen.getByText('Reference: req-lang')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Translat/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByLabelText('From')).toBeEnabled());
  });
});

describe('App: translating', () => {
  it('translates auto-detected text and shows the result with the detected language', async () => {
    translateText.mockResolvedValue({
      translatedText: 'Hola, ¿cómo estás?',
      detectedSource: 'en',
      target: 'es',
      provider: 'google',
    });
    const user = await renderApp();

    await user.type(screen.getByLabelText('Your text'), 'Hello, how are you?');
    await user.click(translateButton());

    expect(await screen.findByText('Hola, ¿cómo estás?')).toBeInTheDocument();
    expect(screen.getByText('Detected language: English')).toBeInTheDocument();
    expect(translateText).toHaveBeenCalledWith(
      { text: 'Hello, how are you?', source: 'auto', target: 'es' },
      expect.any(Object)
    );
  });

  it('sends the languages the person picked', async () => {
    translateText.mockResolvedValue({ translatedText: 'Bonjour', target: 'fr' });
    const user = await renderApp();

    await user.selectOptions(screen.getByLabelText('From'), 'en');
    await user.selectOptions(screen.getByLabelText('To'), 'fr');
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());

    expect(await screen.findByText('Bonjour')).toBeInTheDocument();
    expect(translateText.mock.calls[0][0]).toEqual({ text: 'Hello', source: 'en', target: 'fr' });
    expect(screen.queryByText(/detected language/i)).not.toBeInTheDocument();
  });

  it('shows progress, disables the button and ignores duplicate clicks while waiting', async () => {
    const pending = deferred();
    translateText.mockReturnValue(pending.promise);
    const user = await renderApp();
    await user.type(screen.getByLabelText('Your text'), 'Hello');

    await user.dblClick(translateButton());

    expect(screen.getByRole('button', { name: 'Translating…' })).toBeDisabled();
    expect(screen.getAllByText('Translating…').length).toBeGreaterThan(0);
    expect(translateText).toHaveBeenCalledTimes(1);

    pending.resolve({ translatedText: 'Hola', target: 'es' });
    expect(await screen.findByText('Hola')).toBeInTheDocument();
    expect(translateButton()).toBeEnabled();
  });

  it('asks for text instead of calling the API when the box is empty', async () => {
    const user = await renderApp();
    await user.click(translateButton());
    expect(screen.getByRole('alert')).toHaveTextContent('Enter some text to translate.');
    expect(translateText).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Your text'), 'a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('blocks text over the limit and tells the person how to fix it', async () => {
    const user = await renderApp();
    await user.click(screen.getByLabelText('Your text'));
    await user.paste('x'.repeat(101)); // test limit is 100
    expect(screen.getByText(/over limit/i)).toBeInTheDocument();

    await user.click(translateButton());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Shorten your text to 100 characters or fewer.'
    );
    expect(translateText).not.toHaveBeenCalled();
  });
});

describe('App: errors', () => {
  it('explains the failure, keeps the text, and succeeds on retry', async () => {
    translateText.mockRejectedValueOnce(
      new ApiError('Too many requests. Please wait a moment and try again.', {
        kind: 'http',
        status: 429,
        requestId: 'req-7',
      })
    );
    translateText.mockResolvedValueOnce({ translatedText: 'Hola', target: 'es' });
    const user = await renderApp();

    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());

    expect(await screen.findByText("Couldn't translate")).toBeInTheDocument();
    expect(
      screen.getByText('Too many requests. Please wait a moment and try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Reference: req-7')).toBeInTheDocument();
    expect(screen.getByLabelText('Your text')).toHaveValue('Hello');
    expect(translateButton()).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Hola')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't translate")).not.toBeInTheDocument();
    expect(translateText).toHaveBeenCalledTimes(2);
  });

  it('reports an unreachable server in plain language', async () => {
    translateText.mockRejectedValue(
      new ApiError("We couldn't reach the server. Check your connection and try again.", {
        kind: 'network',
      })
    );
    const user = await renderApp();
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    expect(await screen.findByText(/couldn't reach the server/i)).toBeInTheDocument();
    expect(screen.queryByText(/reference:/i)).not.toBeInTheDocument();
  });

  it('retries with the edited text, not the text that failed', async () => {
    translateText.mockRejectedValueOnce(new ApiError('Down.', { kind: 'http', status: 502 }));
    translateText.mockResolvedValueOnce({ translatedText: 'Adiós', target: 'es' });
    const user = await renderApp();

    await user.type(screen.getByLabelText('Your text'), 'Helo');
    await user.click(translateButton());
    await screen.findByText("Couldn't translate");

    await user.type(screen.getByLabelText('Your text'), '!'); // editing hides the stale error
    expect(screen.queryByText("Couldn't translate")).not.toBeInTheDocument();
    await user.click(translateButton());

    expect(await screen.findByText('Adiós')).toBeInTheDocument();
    expect(translateText.mock.calls[1][0].text).toBe('Helo!');
  });
});

describe('App: swap and clear', () => {
  it('keeps swap disabled until auto-detect has found a language', async () => {
    translateText.mockResolvedValue({ translatedText: 'Hola', detectedSource: 'en', target: 'es' });
    const user = await renderApp();
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled();

    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    await screen.findByText('Hola');
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeEnabled();
  });

  it('swaps languages and trades the texts once a translation is shown', async () => {
    translateText.mockResolvedValue({ translatedText: 'Hola', detectedSource: 'en', target: 'es' });
    const user = await renderApp();
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    await screen.findByText('Hola');

    await user.click(screen.getByRole('button', { name: 'Swap languages' }));

    expect(screen.getByLabelText('From')).toHaveValue('es');
    expect(screen.getByLabelText('To')).toHaveValue('en');
    expect(screen.getByLabelText('Your text')).toHaveValue('Hola');
    expect(screen.getByText('Hello', { selector: '.output-text' })).toBeInTheDocument();
  });

  it('swaps explicit languages even before translating', async () => {
    const user = await renderApp();
    await user.selectOptions(screen.getByLabelText('From'), 'en');
    await user.selectOptions(screen.getByLabelText('To'), 'fr');
    await user.click(screen.getByRole('button', { name: 'Swap languages' }));
    expect(screen.getByLabelText('From')).toHaveValue('fr');
    expect(screen.getByLabelText('To')).toHaveValue('en');
  });

  it('clears the text and the translation but keeps the language choice', async () => {
    translateText.mockResolvedValue({ translatedText: 'Bonjour', target: 'fr' });
    const user = await renderApp();
    await user.selectOptions(screen.getByLabelText('To'), 'fr');
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    await screen.findByText('Bonjour');

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByLabelText('Your text')).toHaveValue('');
    expect(screen.queryByText('Bonjour')).not.toBeInTheDocument();
    expect(screen.getByText('Your translation appears here.')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toHaveValue('fr');
  });

  it('cancels a pending translation when the form is cleared', async () => {
    const pending = deferred();
    translateText.mockReturnValue(pending.promise);
    const user = await renderApp();
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    const { signal } = translateText.mock.calls[0][1];

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(signal.aborted).toBe(true);

    pending.resolve({ translatedText: 'Hola', target: 'es' });
    await waitFor(() => expect(translateButton()).toBeEnabled());
    expect(screen.queryByText('Hola')).not.toBeInTheDocument();
  });
});
