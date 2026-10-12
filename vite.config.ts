import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
// Vite's own CSS minifier (a direct dependency of Vite 8).
import { transform as transformCss } from 'lightningcss';
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
      // `nepali-datepicker-pro/style.css`), minified. No targets: modern
      // syntax (color-mix, :has) is kept as written, only whitespace and
      // comments go. The commented source is src/theme.css.
      name: 'copy-theme-css',
      closeBundle() {
        mkdirSync(resolve(here, 'dist'), { recursive: true });
        const { code } = transformCss({ filename: 'style.css', code: readFileSync(resolve(here, 'src/theme.css')), minify: true });
        writeFileSync(resolve(here, 'dist/style.css'), code);
      },
    },
  ],
  build: {
    outDir: 'dist',
    // The ES / CJS output isn't minified, so it reads fine in a debugger as
    // is; maps would double the package for nothing. (The minified UMD keeps one.)
    sourcemap: false,
    lib: {
      entry: {
        index: resolve(here, 'src/index.ts'),
        jquery: resolve(here, 'src/jquery.ts'),
        vue: resolve(here, 'src/vue.ts'),
        react: resolve(here, 'src/react.tsx'),
        element: resolve(here, 'src/element.ts'),
        holidays: resolve(here, 'src/holidays.ts'),
      },
      // ES modules for bundlers, CommonJS for require() (Jest, older tooling).
      formats: ['es', 'cjs'],
      fileName: (format, name) => `${name}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      // Framework wrappers must never bundle their host framework.
      external: ['vue', 'react', 'react-dom', 'react/jsx-runtime', 'jquery'],
      output: {
        // Next.js App Router: the React wrappers are client components. A
        // directive in the source is dropped by bundling, so it's re-added here.
        banner: (chunk: { name: string; isEntry: boolean }) => (chunk.isEntry && chunk.name === 'react' ? "'use client';" : ''),
      },
    },
  },
}));
