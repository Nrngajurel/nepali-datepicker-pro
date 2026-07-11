import { defineConfig } from 'vitest/config';

// Tests import straight from src/*.ts — no build step, no dist coupling.
// DOM-dependent files opt into jsdom with a `// @vitest-environment jsdom`
// docblock at the top of the file; everything else runs in plain node.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
