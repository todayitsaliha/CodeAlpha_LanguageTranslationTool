import PixelSprite from './PixelSprite';
import { ERROR_SCENE } from './sprites';

function RetryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

/** Says what failed, what the person can do next, and how to quote the error to support. */
export default function ErrorView({ title, message, hint, requestId, onRetry }) {
  return (
    <div className="state state--error">
      <PixelSprite layers={ERROR_SCENE} scale={4} className="state__sprite" />
      <p className="state__title">{title}</p>
      <p className="state__text">{message}</p>
      {hint && <p className="state__text">{hint}</p>}
      {requestId && <p className="state__meta">Reference: {requestId}</p>}
      <button type="button" className="btn btn--outline" onClick={onRetry}>
        <RetryIcon />
        Try again
      </button>
    </div>
  );
}
