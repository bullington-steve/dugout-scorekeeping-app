import { expect, test } from '@playwright/test';
import { APP_VERSION } from '../../src/version.ts';
import {
  ZOOM_WIDTHS,
  contrastProblems,
  fontsReady,
  sideScroll,
  tapTargetProblems,
  wordProblems,
} from '../helpers/checks.ts';

const appearances = ['light', 'dark'] as const;

test('shows the ScoreKept title and the current version', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'ScoreKept' })).toBeVisible();
  await expect(page.getByTestId('version')).toHaveText(`Version ${APP_VERSION}`);
});

test('the title is set in Alfa Slab One, self-hosted', async ({ page }) => {
  await page.goto('./');
  await fontsReady(page);
  const family = await page.locator('h1').evaluate((h) => getComputedStyle(h).fontFamily);
  expect(family).toContain('Alfa Slab One');
  expect(await page.evaluate(() => document.fonts.check('34px "Alfa Slab One"'))).toBe(true);
  const fontRequests = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes('.woff2')),
  );
  expect(fontRequests.length).toBeGreaterThan(0);
  for (const url of fontRequests) expect(new URL(url).origin).toBe(new URL(page.url()).origin);
});

test('installs to the Home Screen: manifest and icons', async ({ page, request }) => {
  await page.goto('./');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(manifestHref!, page.url());
  const manifest = await (await request.get(manifestUrl.href)).json();
  expect(manifest.name).toBe('ScoreKept');
  expect(manifest.short_name).toBe('ScoreKept');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('./');
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));

  const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  for (const src of [appleIcon!, ...manifest.icons.map((i: { src: string }) => i.src)]) {
    const res = await request.get(new URL(src, manifestUrl).href);
    expect(res.status(), src).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'ScoreKept');
});

test('text follows the iPhone text size (Dynamic Type)', async ({ page }) => {
  await page.goto('./');
  await fontsReady(page);
  const size = () => page.locator('.hello-lede').evaluate((p) => parseFloat(getComputedStyle(p).fontSize));
  // 22 points at the default size, scaled by the root (Dynamic Type) size.
  const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(await size()).toBeCloseTo((22 * root) / 17, 0);
  // Simulate a larger Text Size: the root font grows by half.
  await page.evaluate(() => {
    document.documentElement.style.font = 'normal 25.5px/1.4 sans-serif';
  });
  expect(await size()).toBeCloseTo(33, 0);
});

test('visible words follow the house style', async ({ page }) => {
  await page.goto('./');
  const text = await page.locator('body').innerText();
  expect(wordProblems(text)).toEqual([]);
});

for (const colorScheme of appearances) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme });

    test('text contrast passes', async ({ page }) => {
      await page.goto('./');
      expect(await contrastProblems(page)).toEqual([]);
    });

    test('every tappable control is at least 44 points', async ({ page }) => {
      await page.goto('./');
      expect(await tapTargetProblems(page)).toEqual([]);
    });

    test('follows the device appearance', async ({ page }) => {
      await page.goto('./');
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg).toBe(colorScheme === 'light' ? 'rgb(246, 238, 219)' : 'rgb(11, 23, 48)');
    });

    for (const width of [...ZOOM_WIDTHS, 320, 393, 430]) {
      test(`no sideways scroll at ${width} points wide`, async ({ page }) => {
        await page.setViewportSize({ width, height: 759 });
        await page.goto('./');
        await fontsReady(page);
        expect(await sideScroll(page)).toBe(0);
      });
    }
  });
}

test('Increase Contrast keeps contrast', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more', colorScheme: 'dark' });
  await page.goto('./');
  expect(await contrastProblems(page)).toEqual([]);
});
