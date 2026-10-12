import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Second build pass: single self-contained UMD files for plain <script> usage,
// global `NepaliPicker` (core API + the jQuery plugins). Runs after the ES
// build (see package.json "build") and appends to /dist without wiping it.
// - default: everything (nepali-datepicker-pro.umd.cjs)
// - UMD_CORE=1: date / date-time + range only (nepali-datepicker-pro.core.umd.cjs)
const core = !!process.env.UMD_CORE;
const eager = resolve(import.meta.dirname, core ? 'src/render/lazy-eager-core.ts' : 'src/render/lazy-eager.ts');

export default defineConfig({
  plugins: [{
    // One file can't load chunks later: use the eager twin of the lazy loader.
    name: 'eager-panels',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer && !/eager-api|lazy-eager/.test(importer) && /\/lazy\.js$/.test(source)) return eager;
      return null;
    },
  }],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, core ? 'src/umd-core.ts' : 'src/umd.ts'),
      name: 'NepaliPicker',
      formats: ['umd'],
      fileName: () => (core ? 'nepali-datepicker-pro.core.umd.cjs' : 'nepali-datepicker-pro.umd.cjs'),
    },
  },
});
