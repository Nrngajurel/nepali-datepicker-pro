import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Second build pass: a single self-contained UMD file for plain <script> usage.
// Exposes `window.NepaliPicker`. Runs after the ES build (see package.json
// "build") and appends to /dist without wiping it.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'NepaliPicker',
      formats: ['umd'],
      fileName: () => 'nepali-datepicker.umd.cjs',
    },
  },
});
