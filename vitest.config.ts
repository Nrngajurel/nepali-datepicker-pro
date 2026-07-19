import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Tests import straight from src/*.ts — no build step, no dist coupling.
// DOM-dependent files opt into jsdom with a `// @vitest-environment jsdom`
// docblock at the top of the file; everything else runs in plain node.
// The Vue plugin lets the docs tests import the VitePress theme's .vue
// components, and `@lib` mirrors the alias the docs site itself resolves.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@lib': resolve(import.meta.dirname, 'src') },
  },
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    environment: 'node',
  },
});
