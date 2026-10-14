import ErrorView from './ErrorView';
import LoadingView from './LoadingView';

/**
 * The output side. All states render inside one polite live region so screen readers hear
 * "Translating…", the translation itself, or the error as soon as it appears.
 */
export default function OutputPanel({ status, result, error, languageName, onRetry }) {
  const showResult = status === 'success' && result;
  const detectedName =
    showResult && result.detectedSource ? languageName(result.detectedSource) : null;

  return (
    <div className="panel panel--output">
      <h2 className="panel__title" id="output-heading">
        Translation
      </h2>
      <div className="panel__body" aria-live="polite" aria-atomic="true">
        {status === 'loading' && <LoadingView />}

        {status === 'error' && error && (
          <ErrorView
            title="Couldn't translate"
            message={error.message}
            hint="Your text is still in the box."
            requestId={error.requestId}
            onRetry={onRetry}
          />
        )}

        {showResult && (
          <>
            <p className="output-text" lang={result.target} dir="auto">
              {result.translatedText}
            </p>
            {detectedName && <p className="panel__note">Detected language: {detectedName}</p>}
          </>
        )}

        {(status === 'idle' || (status === 'success' && !result)) && (
          <p className="placeholder">Your translation appears here.</p>
        )}
      </div>
    </div>
  );
}
