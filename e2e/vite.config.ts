import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Dev server for the Playwright fixture page only (e2e/index.html). Rooted at
// the repo so the page loads the library and theme.css straight from src/ —
// no build step. Deliberately not the library's vite.config.ts.
export default defineConfig({
  root: resolve(import.meta.dirname, '..'),
});
