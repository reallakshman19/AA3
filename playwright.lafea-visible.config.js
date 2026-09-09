import { defineConfig, devices } from '@playwright/test';

const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chromium';
const videoMode = process.env.PLAYWRIGHT_ENABLE_VIDEO === '1' ? 'retain-on-failure' : 'off';
// When scripts/lib/project-local-playwright-browser.mjs falls back to an
// environment-provisioned Chromium (project-local PLAYWRIGHT_BROWSERS_PATH=0
// install unavailable), it points here via executablePath instead of channel
// so the two selection mechanisms never conflict.
const executablePathOverride = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: videoMode,
  },
  projects: [
    {
      name: 'chromium',
      use: executablePathOverride
        ? { ...devices['Desktop Chrome'], launchOptions: { executablePath: executablePathOverride } }
        : { ...devices['Desktop Chrome'], channel: browserChannel },
    },
  ],
  webServer: {
    command: 'npx vite --base /',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
