# Language Translation Tool

A simple web app for translating text between languages. Choose languages or let the app detect the source language, then copy or listen to the translation.

The app has a React frontend and an Express backend. The backend connects to a translation provider, so provider API keys stay on the server rather than in the browser.

## Features

- Translate text with Google Cloud Translation, Microsoft Translator, or Google Gemini.
- Detect the source language automatically or choose it yourself.
- Browse the languages supported by the selected provider.
- Copy a translation or listen to it using your browser's text-to-speech voices.
- Limit input length and handle failed requests with clear feedback.

## Requirements

- Node.js 18.18 or newer
- npm
- An API key for the translation provider you want to use

## Run locally

### 1. Configure and start the backend

Open a terminal in `backend` and install its dependencies:

```bash
npm install
```

Copy `backend/.env.example` to `backend/.env`. Set `TRANSLATION_PROVIDER` to `google`, `microsoft`, or `gemini`, then add the matching provider key:

| Provider | Environment variable |
| --- | --- |
| Google Cloud Translation | `GOOGLE_TRANSLATE_API_KEY` |
| Microsoft Translator | `MICROSOFT_TRANSLATOR_KEY` |
| Google Gemini | `GEMINI_API_KEY` |

For Microsoft Translator, set `MICROSOFT_TRANSLATOR_REGION` if your resource requires it. Gemini's model can be configured with `GEMINI_MODEL`.

Start the API:

```bash
npm run dev
```

By default, it runs at `http://localhost:4000`. Keep this terminal open.

### 2. Start the frontend

In a second terminal, open `frontend` and install its dependencies:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. During development, the frontend automatically forwards API requests to the backend on port 4000.

## Useful commands

Run these commands from the listed directory:

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend` or `frontend` | `npm run dev` | Start the development server |
| `backend` or `frontend` | `npm test` | Run the test suite |
| `backend` or `frontend` | `npm run lint` | Check code style |
| `frontend` | `npm run build` | Build the frontend for production |

## Configuration

- Backend settings, including provider selection, API keys, request limits, and allowed origins, are documented in `backend/.env.example`.
- Frontend settings are documented in `frontend/.env.example`. The frontend configuration is optional for local development.
- Do not commit `.env` or `.env.local` files. Keep provider API keys private.

## Project structure

```text
backend/   Express API and translation-provider integrations
frontend/  React application built with Vite
```

The backend exposes `GET /api/health`, `GET /api/languages`, and `POST /api/translate`.
