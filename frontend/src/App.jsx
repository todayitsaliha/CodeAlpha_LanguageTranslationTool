import { useMemo, useRef } from 'react';
import { config } from './appConfig';
import ErrorView from './components/ErrorView';
import Header from './components/Header';
import LanguageBar from './components/LanguageBar';
import OutputPanel from './components/OutputPanel';
import PixelSprite from './components/PixelSprite';
import TextPanel from './components/TextPanel';
import { BUTTON_SPARKLE } from './components/sprites';
import { useLanguages } from './hooks/useLanguages';
import { useTranslator } from './hooks/useTranslator';

export default function App() {
  const languageList = useLanguages();
  const translator = useTranslator({ languages: languageList.languages });
  const { state } = translator;

  const namesByCode = useMemo(
    () => new Map(languageList.languages.map((language) => [language.code, language.name])),
    [languageList.languages]
  );
  const languageName = (code) => namesByCode.get(code) ?? code;

  const translateButton = useRef(null);
  const ready = languageList.status === 'ready';
  const loading = state.status === 'loading';

  function handleSubmit(event) {
    event.preventDefault();
    translator.submit();
  }

  // The error view disappears when retrying, so hand focus to a control that stays put.
  function handleRetry() {
    translator.submit();
    translateButton.current?.focus();
  }

  return (
    <div className="page">
      <main className="card">
        <Header />
        <form
          className="card__body"
          aria-label={`${config.appName} translator`}
          onSubmit={handleSubmit}
          noValidate
        >
          {languageList.status === 'error' ? (
            <div className="panel panel--output" role="alert">
              <ErrorView
                title="Couldn't load languages"
                message={languageList.error.message}
                requestId={languageList.error.requestId}
                onRetry={languageList.reload}
              />
            </div>
          ) : (
            <>
              <LanguageBar
                languages={languageList.languages}
                ready={ready}
                source={state.source}
                target={state.target}
                swapEnabled={translator.swapEnabled}
                onSourceChange={translator.setSource}
                onTargetChange={translator.setTarget}
                onSwap={translator.swap}
              />
              <div className="panels">
                <TextPanel
                  value={state.text}
                  maxLength={config.maxTextLength}
                  validationMessage={state.validationError}
                  focusSignal={state.validationVersion}
                  onChange={translator.setText}
                  onClear={translator.clear}
                />
                <OutputPanel
                  status={state.status}
                  result={state.result}
                  error={state.error}
                  languageName={languageName}
                  onRetry={handleRetry}
                />
              </div>
              <div className="actions">
                {/* aria-disabled (not disabled) while loading, so keyboard focus stays on the button */}
                <button
                  ref={translateButton}
                  type="submit"
                  className="btn btn--primary"
                  disabled={!ready}
                  aria-disabled={loading || undefined}
                >
                  <PixelSprite layers={BUTTON_SPARKLE} scale={2} />
                  {loading ? 'Translating…' : 'Translate'}
                </button>
              </div>
              <p className="notice">
                Machine translation can contain errors. Check anything important before you rely on
                it.
              </p>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
