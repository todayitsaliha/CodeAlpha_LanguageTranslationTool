import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to Vite on :3000 and Vite forwards /api to the Express
// backend, so no CORS setup is needed locally.
const proxy = {
  '/api': { target: process.env.API_PROXY_TARGET || 'http://localhost:4000', changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, strictPort: true, proxy },
  preview: { port: 3000, strictPort: true, proxy },
});
