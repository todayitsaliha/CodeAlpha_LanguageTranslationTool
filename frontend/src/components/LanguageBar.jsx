const SWAP_HINT = 'Translate something first so the language can be detected, then swap.';

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
      <path
        d="M4 8h14m0 0-4-4m4 4-4 4M20 16H6m0 0 4-4m-4 4 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

/** Source and target dropdowns with the swap button between them. */
export default function LanguageBar({
  languages,
  ready,
  source,
  target,
  swapEnabled,
  onSourceChange,
  onTargetChange,
  onSwap,
}) {
  const options = languages.map((language) => (
    <option key={language.code} value={language.code}>
      {language.name}
    </option>
  ));
  const loadingOption = <option value="">Loading languages…</option>;

  return (
    <div className="lang-bar">
      <div className="field">
        <label htmlFor="source-language">From</label>
        <select
          id="source-language"
          className="select"
          value={ready ? source : ''}
          disabled={!ready}
          onChange={(event) => onSourceChange(event.target.value)}
        >
          {ready ? <option value="auto">Detect language</option> : loadingOption}
          {ready && options}
        </select>
      </div>

      <button
        type="button"
        className="swap"
        onClick={onSwap}
        disabled={!ready || !swapEnabled}
        aria-label="Swap languages"
        aria-describedby={ready && !swapEnabled ? 'swap-hint' : undefined}
        title={ready && !swapEnabled ? SWAP_HINT : 'Swap languages'}
      >
        <SwapIcon />
      </button>
      {ready && !swapEnabled && (
        <span id="swap-hint" className="sr-only">
          {SWAP_HINT}
        </span>
      )}

      <div className="field">
        <label htmlFor="target-language">To</label>
        <select
          id="target-language"
          className="select"
          value={ready ? target : ''}
          disabled={!ready}
          onChange={(event) => onTargetChange(event.target.value)}
        >
          {ready ? options : loadingOption}
        </select>
      </div>
    </div>
  );
}
