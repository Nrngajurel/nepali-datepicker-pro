import { defineConfig, devices } from '@playwright/test';

// Browser end-to-end tests: real browsers (Chromium desktop + Android-sized
// phone, Firefox desktop) driving the vanilla pickers on
// e2e/index.html, served from source by e2e/vite.config.ts. Run with
// `npm run test:e2e` (unit tests stay on vitest — `npm test`).
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5179' },
  webServer: {
    command: 'npx vite --config e2e/vite.config.ts --port 5179 --strictPort',
    url: 'http://localhost:5179/e2e/index.html',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
