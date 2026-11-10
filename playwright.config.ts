import { existsSync } from 'node:fs';
import { defineConfig, webkit } from '@playwright/test';

const port = 4173;
const inCI = !!process.env.CI;

// GitHub runs both browsers on every push. A development machine may not
// have WebKit (the cloud sandbox can't download it); say so loudly rather
// than pretend it ran.
const hasWebKit = (() => {
  try {
    return existsSync(webkit.executablePath());
  } catch {
    return false;
  }
})();
if (!inCI && !hasWebKit) {
  console.warn('\n  WebKit is not installed here: running Chromium only. GitHub runs WebKit on push.\n');
}

// iPhone 16 Home Screen app: 393 x 759 usable points (LESSONS 12).
const iPhone16 = { width: 393, height: 759 };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: inCI,
  retries: inCI ? 1 : 0,
  reporter: inCI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${port}/`,
    viewport: iPhone16,
    hasTouch: true,
    trace: 'off',
  },
  webServer: {
    command: `npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !inCI,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    ...(inCI || hasWebKit ? [{ name: 'webkit', use: { browserName: 'webkit' as const } }] : []),
  ],
});
