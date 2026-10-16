// Test doubles for browser APIs jsdom does not provide.

function restoreProperty(target, name, descriptor) {
  if (descriptor) Object.defineProperty(target, name, descriptor);
  else delete target[name];
}

/**
 * Replaces the clipboard environment. Call it AFTER userEvent.setup(), which installs its own
 * clipboard stub. Returns spies plus restore().
 */
export function mockClipboard({
  secure = true,
  withApi = true,
  writeText = jest.fn().mockResolvedValue(undefined),
  execCommand = jest.fn(() => true),
} = {}) {
  const saved = {
    secure: Object.getOwnPropertyDescriptor(window, 'isSecureContext'),
    clipboard: Object.getOwnPropertyDescriptor(navigator, 'clipboard'),
    exec: Object.getOwnPropertyDescriptor(document, 'execCommand'),
  };
  Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
  Object.defineProperty(navigator, 'clipboard', {
    value: withApi ? { writeText } : undefined,
    configurable: true,
  });
  Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

  return {
    writeText,
    execCommand,
    restore() {
      restoreProperty(window, 'isSecureContext', saved.secure);
      restoreProperty(navigator, 'clipboard', saved.clipboard);
      restoreProperty(document, 'execCommand', saved.exec);
    },
  };
}

/** Installs a fake SpeechSynthesis. `setVoices` simulates the browser loading voices later. */
export function mockSpeech({ voices = [] } = {}) {
  const spoken = [];
  const listeners = {};
  const synth = {
    voices,
    getVoices: jest.fn(() => synth.voices),
    speak: jest.fn((utterance) => spoken.push(utterance)),
    cancel: jest.fn(),
    addEventListener: jest.fn((type, listener) => {
      listeners[type] = listener;
    }),
    removeEventListener: jest.fn(),
  };
  window.speechSynthesis = synth;
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };

  return {
    synth,
    spoken,
    setVoices(list) {
      synth.voices = list;
      if (listeners.voiceschanged) listeners.voiceschanged();
    },
    restore() {
      delete window.speechSynthesis;
      delete window.SpeechSynthesisUtterance;
    },
  };
}
