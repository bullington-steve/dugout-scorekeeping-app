import { expect, test } from '@playwright/test';
import { freshApp, key } from '../helpers/app.ts';

test('the app opens with no signal once it has been opened once', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright’s WebKit runs without service workers; checked in Chromium and on the iPhone');
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  // Wait until the offline copy is saved.
  await page.waitForFunction(async () => (await navigator.serviceWorker.ready).active?.state === 'activated');
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    for (const k of keys) if ((await (await caches.open(k)).keys()).length > 8) return true;
    return false;
  });
  await context.setOffline(true);
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
  await page.getByRole('tab', { name: 'Book' }).click();
  await expect(page.locator('.bk-grid-wrap').first()).toBeVisible();
  // The handwriting came from the offline copy too.
  expect(await page.evaluate(() => document.fonts.check('20px "Steve Hand"') || [...document.fonts].some((f) => f.status === 'loaded' && /hand/i.test(f.family)))).toBe(true);
  await context.setOffline(false);
});
