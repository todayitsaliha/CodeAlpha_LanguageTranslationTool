# blip360 frontend

React single-page app (Vite) for blip360. It talks to the Express API in `../backend`.

## Run

```bash
npm install
npm run dev        # http://localhost:3000, forwards /api to http://localhost:4000
```

Start the backend first (see the root README). To point at another API during development,
set `API_PROXY_TARGET=https://your-api npm run dev`.

## Scripts

| Script                            | Purpose                                             |
| --------------------------------- | --------------------------------------------------- |
| `npm run dev`                     | Dev server with hot reload                          |
| `npm run build`                   | Production build into `dist/`                       |
| `npm run preview`                 | Serve the production build on port 3000             |
| `npm test`                        | Jest + React Testing Library                        |
| `npm run test:coverage`           | Tests with coverage                                 |
| `npm run lint` / `npm run format` | ESLint (incl. accessibility rules) / Prettier check |

## Configuration (`.env.local`, see `.env.example`)

| Variable                       | Default             | Purpose                                                                                                   |
| ------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`            | empty (same origin) | API origin in production, e.g. `https://api.example.com`. Add that origin to `CORS_ORIGIN` on the backend |
| `VITE_MAX_TEXT_LENGTH`         | `5000`              | Character limit shown in the counter. Keep equal to the backend `MAX_TEXT_LENGTH`                         |
| `VITE_DEFAULT_TARGET_LANGUAGE` | `es`                | Preselected target, used when the provider supports it                                                    |

The app name and tagline live in `src/appConfig.js`.

## Structure

```
src/
  api/          fetch wrapper; every failure becomes an ApiError with a safe message
  state/        pure reducer for the translator screen (swap, clear, request lifecycle)
  hooks/        useLanguages, useTranslator (request cancellation, duplicate-submit guard)
  components/   Header, LanguageBar, TextPanel, OutputPanel, Loading/ErrorView, PixelSprite
  styles/       tokens.css (palette, type) and app.css
  utils/        character counting and validation (matches the backend rules)
```

Pixel-art sprites are character grids in `components/sprites.js`, drawn as SVG, so there are no
image assets and they stay sharp at any size. `public/favicon.svg` is generated from the same globe.

## Behaviour worth knowing

- Only one request runs at a time; clearing the form or leaving the page cancels it and a late
  response is never shown.
- A failed request keeps the text. Editing the text after an error dismisses the error.
- Swap is disabled while "Detect language" is selected until a translation has detected the language.
- Copy uses the Clipboard API on HTTPS and falls back to selecting text elsewhere; Listen uses the browser's SpeechSynthesis,
  is disabled (with the reason shown) when no voice exists for the language, and gives up with a message if audio never starts.
- Keyboard focus is never dropped: Translate uses `aria-disabled` while loading, Clear and failed validation focus the text box,
  Try again hands focus to Translate. `src/a11y.test.jsx` runs axe on every screen state.
- Tests mock the API module; `src/test/configStub.js` replaces `appConfig.js` because Jest cannot parse `import.meta.env`.
