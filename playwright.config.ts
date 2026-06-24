import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end config. Specs live in `e2e/`.
 *
 * The app is served by Vite's preview server from the production build, so
 * the GitHub Pages base path (`/WebCrosswordGenerator/`, see vite.config.ts)
 * is exercised exactly as deployed. baseURL includes that prefix so specs can
 * navigate with relative paths + a `#puzzle=` fixture.
 *
 * Two projects:
 *   - mobile  — 375×667, touch, isMobile (the play-typing fix is mobile-first)
 *   - desktop — plain chromium (proves physical-keyboard play didn't regress)
 *
 * Note: headless Chromium does not show a real soft keyboard. These specs
 * prove the editable input exists, takes focus on tap, and routes characters
 * into the grid — the actual keyboard-raise is a real-device check.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/WebCrosswordGenerator/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        deviceScaleFactor: 2,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/WebCrosswordGenerator/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
