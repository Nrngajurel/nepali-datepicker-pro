import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

const here = import.meta.dirname;

// `npm run dev`  → serves index.html + the Vue docs playground with HMR.
// `npm run build` → library build: tree-shakeable ES modules for the core and
//                   each framework entry, plus type declarations, into /dist.
//                   (The UMD <script> build is a second pass — vite.umd.config.ts.)
export default defineConfig(({ command }) => ({
  plugins: [
    // The Vue plugin is only for the docs app (dev server) — the library build
    // has no .vue files, and pulling it in makes vite-plugin-dts require
    // @vue/language-core. Gate it to `serve` so `vite build` stays lean.
    ...(command === 'serve' ? [vue()] : []),
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
