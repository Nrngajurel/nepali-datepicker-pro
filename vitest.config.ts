import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Tests import straight from src/*.ts — no build step, no dist coupling.
// DOM-dependent files opt into jsdom with a `// @vitest-environment jsdom`
// docblock at the top of the file; everything else runs in plain node.
// The Vue plugin lets the docs-app tests import playground/*.vue components.
export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
