import { useMemo } from 'react';
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

  const ready = languageList.status === 'ready';
  const loading = state.status === 'loading';

  function handleSubmit(event) {
    event.preventDefault();
    translator.submit();
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
                  onChange={translator.setText}
                  onClear={translator.clear}
                />
                <OutputPanel
                  status={state.status}
                  result={state.result}
                  error={state.error}
                  languageName={languageName}
                  onRetry={translator.submit}
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn btn--primary" disabled={!ready || loading}>
                  <PixelSprite layers={BUTTON_SPARKLE} scale={2} />
                  {loading ? 'Translating…' : 'Translate'}
                </button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
