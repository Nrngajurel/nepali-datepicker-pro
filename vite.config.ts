import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const here = import.meta.dirname;

// Library build only: tree-shakeable ES modules for the core and each framework
// entry, plus type declarations, into /dist. (The UMD <script> build is a second
// pass — vite.umd.config.ts.) The docs site is VitePress — `npm run dev`.
export default defineConfig(() => ({
  plugins: [
    dts({ include: ['src'] }),
    {
      // Ship the stylesheet as dist/style.css (imported by consumers via
      // `nepali-datepicker/style.css`).
      name: 'copy-theme-css',
      closeBundle() {
        mkdirSync(resolve(here, 'dist'), { recursive: true });
        copyFileSync(resolve(here, 'src/theme.css'), resolve(here, 'dist/style.css'));
      },
    },
  ],
  build: {
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: {
        index: resolve(here, 'src/index.ts'),
        jquery: resolve(here, 'src/jquery.ts'),
        vue: resolve(here, 'src/vue.ts'),
        react: resolve(here, 'src/react.tsx'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      // Framework wrappers must never bundle their host framework.
      external: ['vue', 'react', 'react-dom', 'react/jsx-runtime', 'jquery'],
    },
  },
}));
