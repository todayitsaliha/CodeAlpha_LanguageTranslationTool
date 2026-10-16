import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { ApiError, fetchLanguages, translateText } from './api/client';
import App from './App';
import { mockSpeech } from './test/browserMocks';

expect.extend(toHaveNoViolations);

// jsdom cannot compute colours, so contrast is checked separately in a real browser
// (see docs/accessibility.md). Everything else axe knows about runs here.
const axe = configureAxe({ rules: { 'color-contrast': { enabled: false } } });

jest.mock('./api/client', () => ({
  ...jest.requireActual('./api/client'),
  fetchLanguages: jest.fn(),
  translateText: jest.fn(),
}));

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
];

async function ready() {
  const user = userEvent.setup();
  const view = render(<App />);
  await waitFor(() => expect(screen.getByLabelText('From')).toBeEnabled());
  return { user, ...view };
}

const translateButton = () => screen.getByRole('button', { name: /^Translat/ });

beforeEach(() => {
  jest.resetAllMocks();
  fetchLanguages.mockResolvedValue(LANGUAGES);
});

describe('accessibility (axe) in every screen state', () => {
  it('while languages load', async () => {
    fetchLanguages.mockReturnValue(new Promise(() => {}));
    const { container } = render(<App />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('when languages fail to load', async () => {
    fetchLanguages.mockRejectedValue(
      new ApiError('Service down.', { kind: 'http', status: 502, requestId: 'r1' })
    );
    const { container } = render(<App />);
    await screen.findByText("Couldn't load languages");
    expect(await axe(container)).toHaveNoViolations();
  });

  it('idle', async () => {
    const { container } = await ready();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('with a validation message', async () => {
    const { user, container } = await ready();
    await user.click(translateButton());
    await screen.findByRole('alert');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('over the character limit', async () => {
    const { user, container } = await ready();
    await user.click(screen.getByLabelText('Your text'));
    await user.paste('x'.repeat(101));
    await user.click(translateButton());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('while translating', async () => {
    translateText.mockReturnValue(new Promise(() => {}));
    const { user, container } = await ready();
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    expect(await axe(container)).toHaveNoViolations();
  });

  it('with a translation, Copy and Listen (available)', async () => {
    mockSpeech({ voices: [{ lang: 'es-ES', name: 'Spanish voice' }] });
    translateText.mockResolvedValue({ translatedText: 'Hola', detectedSource: 'en', target: 'es' });
    const { user, container } = await ready();
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    await screen.findByText('Hola');
    expect(await axe(container)).toHaveNoViolations();
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it('with a translation when Listen is unavailable', async () => {
    translateText.mockResolvedValue({ translatedText: 'Hola', target: 'es' });
    const { user, container } = await ready();
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    await screen.findByText('Hola');
    expect(screen.getByRole('button', { name: 'Listen' })).toBeDisabled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('after a translation error', async () => {
    translateText.mockRejectedValue(
      new ApiError('Too many requests.', { kind: 'http', status: 429, requestId: 'r2' })
    );
    const { user, container } = await ready();
    await user.type(screen.getByLabelText('Your text'), 'Hello');
    await user.click(translateButton());
    await screen.findByText("Couldn't translate");
    expect(await axe(container)).toHaveNoViolations();
  });
});
