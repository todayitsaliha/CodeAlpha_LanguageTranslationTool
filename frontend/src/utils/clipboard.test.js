import { mockClipboard } from '../test/browserMocks';
import { copyText } from './clipboard';

describe('copyText', () => {
  let env;
  afterEach(() => env.restore());

  it('uses the Clipboard API in a secure context', async () => {
    env = mockClipboard();
    await expect(copyText('Hola')).resolves.toBe(true);
    expect(env.writeText).toHaveBeenCalledWith('Hola');
    expect(env.execCommand).not.toHaveBeenCalled();
  });

  it('falls back to selecting text when the page is not a secure context', async () => {
    let copiedValue;
    env = mockClipboard({
      secure: false,
      execCommand: jest.fn(() => {
        copiedValue = document.querySelector('textarea').value;
        return true;
      }),
    });

    await expect(copyText('Hola\nmundo')).resolves.toBe(true);
    expect(env.writeText).not.toHaveBeenCalled();
    expect(env.execCommand).toHaveBeenCalledWith('copy');
    expect(copiedValue).toBe('Hola\nmundo');
  });

  it('falls back when the Clipboard API is missing', async () => {
    env = mockClipboard({ withApi: false });
    await expect(copyText('Hola')).resolves.toBe(true);
    expect(env.execCommand).toHaveBeenCalledWith('copy');
  });

  it('falls back when the Clipboard API rejects (for example permission denied)', async () => {
    env = mockClipboard({ writeText: jest.fn().mockRejectedValue(new Error('denied')) });
    await expect(copyText('Hola')).resolves.toBe(true);
    expect(env.execCommand).toHaveBeenCalledWith('copy');
  });

  it('reports failure when nothing can copy', async () => {
    env = mockClipboard({ secure: false, execCommand: jest.fn(() => false) });
    await expect(copyText('Hola')).resolves.toBe(false);
  });

  it('reports failure when the fallback throws', async () => {
    env = mockClipboard({
      secure: false,
      execCommand: jest.fn(() => {
        throw new Error('not allowed');
      }),
    });
    await expect(copyText('Hola')).resolves.toBe(false);
  });

  it('leaves no helper element behind and returns focus to where it was', async () => {
    env = mockClipboard({ secure: false });
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    await copyText('Hola');

    expect(document.querySelector('textarea')).toBeNull();
    expect(document.activeElement).toBe(button);
    button.remove();
  });
});
