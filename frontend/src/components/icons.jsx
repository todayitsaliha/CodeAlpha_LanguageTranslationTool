function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
};

export function CopyIcon() {
  return (
    <Icon>
      <rect x="9" y="9" width="11" height="11" {...stroke} />
      <path d="M5 15V5h10" {...stroke} />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon>
      <path d="M4 13l5 5L20 6" {...stroke} />
    </Icon>
  );
}

export function SpeakerIcon() {
  return (
    <Icon>
      <path d="M4 9h4l5-4v14l-5-4H4z" {...stroke} />
      <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" {...stroke} />
    </Icon>
  );
}

export function StopIcon() {
  return (
    <Icon>
      <rect x="6" y="6" width="12" height="12" fill="currentColor" />
    </Icon>
  );
}
