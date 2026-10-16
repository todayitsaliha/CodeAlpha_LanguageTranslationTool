import { useCopy } from '../hooks/useCopy';
import { useSpeech } from '../hooks/useSpeech';
import { CheckIcon, CopyIcon, SpeakerIcon, StopIcon } from './icons';

/** Copy and Listen controls for a finished translation, with one status line for feedback. */
export default function OutputActions({ text, lang, languageName }) {
  const copy = useCopy();
  const speech = useSpeech({ text, lang });

  const speaking = speech.status === 'speaking';
  const listenDisabled = speech.availability !== 'available';

  let message = '';
  if (copy.status === 'copied') message = 'Copied to clipboard.';
  else if (copy.status === 'failed')
    message = "Couldn't copy automatically. Select the translation and copy it manually.";
  else if (speech.status === 'error') message = "Couldn't play audio on this device.";
  else if (speech.availability === 'unsupported') message = "This browser can't read text aloud.";
  else if (speech.availability === 'no-voice')
    message = `No ${languageName} voice is installed on this device.`;

  return (
    <div className="output-actions">
      <button type="button" className="btn btn--small btn--outline" onClick={() => copy.copy(text)}>
        {copy.status === 'copied' ? <CheckIcon /> : <CopyIcon />}
        {copy.status === 'copied' ? 'Copied' : 'Copy'}
      </button>

      <button
        type="button"
        className="btn btn--small btn--solid"
        onClick={speaking ? speech.stop : speech.speak}
        disabled={listenDisabled}
        aria-describedby={listenDisabled ? 'output-action-status' : undefined}
      >
        {speaking ? <StopIcon /> : <SpeakerIcon />}
        {speaking ? 'Stop' : 'Listen'}
      </button>

      <p id="output-action-status" className="action-status" role="status">
        {message}
      </p>
    </div>
  );
}
