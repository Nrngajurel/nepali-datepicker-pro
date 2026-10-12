import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

// WebKit (iPhone + desktop Safari) projects. Playwright's WebKit build needs
// Ubuntu 24.04 libraries, so `npm run test:e2e:webkit` runs this config inside
// the official Playwright Docker image instead of on the host.
export default defineConfig({
  ...base,
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
  ],
});
