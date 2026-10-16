import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OutputActions from './OutputActions';
import { mockClipboard, mockSpeech } from '../test/browserMocks';

const SPANISH_VOICE = { lang: 'es-ES', name: 'Spanish voice' };

let clipboard;
let speech;

function renderActions(props = {}) {
  return render(
    <OutputActions text="Hola, ¿cómo estás?" lang="es" languageName="Spanish" {...props} />
  );
}

afterEach(() => {
  clipboard?.restore();
  speech?.restore();
  clipboard = undefined;
  speech = undefined;
  jest.useRealTimers();
});

describe('Copy', () => {
  it('copies the translation and confirms it', async () => {
    const user = userEvent.setup();
    clipboard = mockClipboard();
    renderActions();

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(clipboard.writeText).toHaveBeenCalledWith('Hola, ¿cómo estás?');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Copied to clipboard.');
  });

  it('goes back to "Copy" after a moment', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    clipboard = mockClipboard();
    renderActions();

    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('status')).not.toHaveTextContent('Copied to clipboard.');
  });

  it('tells the person what to do when copying is impossible', async () => {
    const user = userEvent.setup();
    clipboard = mockClipboard({ secure: false, execCommand: jest.fn(() => false) });
    renderActions();

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(screen.getByRole('status')).toHaveTextContent(/copy it manually/i);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});

describe('Listen', () => {
  it('reads the translation aloud and offers Stop while speaking', async () => {
    const user = userEvent.setup();
    speech = mockSpeech({ voices: [SPANISH_VOICE] });
    renderActions();

    await user.click(screen.getByRole('button', { name: 'Listen' }));

    expect(speech.spoken).toHaveLength(1);
    expect(speech.spoken[0]).toMatchObject({ text: 'Hola, ¿cómo estás?', lang: 'es-ES' });
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByRole('button', { name: 'Listen' })).toBeEnabled();
  });

  it('returns to Listen when the audio finishes', async () => {
    const user = userEvent.setup();
    speech = mockSpeech({ voices: [SPANISH_VOICE] });
    renderActions();
    await user.click(screen.getByRole('button', { name: 'Listen' }));

    act(() => speech.spoken[speech.spoken.length - 1].onend());
    expect(screen.getByRole('button', { name: 'Listen' })).toBeInTheDocument();
  });

  it('is disabled, with the reason shown and announced, when no voice matches the language', () => {
    speech = mockSpeech({ voices: [{ lang: 'en-US', name: 'English voice' }] });
    renderActions();

    const listen = screen.getByRole('button', { name: 'Listen' });
    expect(listen).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No Spanish voice is installed on this device.'
    );
    expect(listen).toHaveAccessibleDescription('No Spanish voice is installed on this device.');
  });

  it('is disabled when the browser cannot speak at all, but Copy still works', async () => {
    const user = userEvent.setup();
    clipboard = mockClipboard();
    renderActions();

    expect(screen.getByRole('button', { name: 'Listen' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent("This browser can't read text aloud.");
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(clipboard.writeText).toHaveBeenCalled();
  });

  it('reports playback errors', async () => {
    const user = userEvent.setup();
    speech = mockSpeech({ voices: [SPANISH_VOICE] });
    renderActions();
    await user.click(screen.getByRole('button', { name: 'Listen' }));

    act(() => speech.spoken[0].onerror({ error: 'synthesis-failed' }));

    expect(screen.getByRole('status')).toHaveTextContent("Couldn't play audio on this device.");
    expect(screen.getByRole('button', { name: 'Listen' })).toBeEnabled();
  });
});
