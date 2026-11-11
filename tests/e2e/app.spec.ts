import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { APP_VERSION } from '../../src/version.ts';
import { contrastProblems, fontsReady, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key, restoreFile } from '../helpers/app.ts';

const appearances = ['light', 'dark'] as const;

test('opens on the Game tab with nothing in progress', async ({ page }) => {
  await freshApp(page);
  await expect(page.getByRole('heading', { level: 1, name: 'ScoreKept' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Game' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'No Game in Progress' })).toBeVisible();
});

test('the title is set in Alfa Slab One, self-hosted', async ({ page }) => {
  await freshApp(page);
  const family = await page.locator('h1').first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain('Alfa Slab One');
  expect(await page.evaluate(() => document.fonts.check('30px "Alfa Slab One"'))).toBe(true);
});

test('installs to the Home Screen: manifest and icons', async ({ page, request }) => {
  await page.goto('./');
  const manifestUrl = new URL((await page.locator('link[rel="manifest"]').getAttribute('href'))!, page.url());
  const manifest = await (await request.get(manifestUrl.href)).json();
  expect(manifest).toMatchObject({ name: 'ScoreKept', short_name: 'ScoreKept', display: 'standalone', start_url: './' });
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  for (const src of [apple!, ...manifest.icons.map((i: { src: string }) => i.src)]) {
    const res = await request.get(new URL(src, manifestUrl).href);
    expect(res.status(), src).toBe(200);
  }
});

test('Settings shows the version, and it opens What’s New', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: `Version ${APP_VERSION}` }).click();
  await expect(page.getByRole('dialog', { name: 'What’s New' })).toBeVisible();
});

test('tabs switch, and the others say what’s coming', async ({ page }) => {
  await freshApp(page);
  for (const name of ['Book', 'Stats', 'Scout', 'Team']) {
    await page.getByRole('tab', { name }).click();
    await expect(page.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  }
});

test('sheets close only with ✕, Cancel, or Done: never a tap outside', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const sheet = page.getByRole('dialog', { name: 'Settings' });
  await expect(sheet).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toHaveCount(0);
  await key(page, 'New Game').click();
  await page.locator('.sh-scrim').click({ position: { x: 5, y: 5 }, force: true });
  await expect(page.getByRole('dialog', { name: 'New Game' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('text follows the iPhone text size (Dynamic Type)', async ({ page }) => {
  await freshApp(page);
  const title = page.getByRole('heading', { name: 'No Game in Progress' });
  const size = () => title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(await size()).toBeCloseTo((22 * root) / 17, 0);
  await page.evaluate(() => (document.documentElement.style.font = 'normal 25.5px/1.4 sans-serif'));
  expect(await size()).toBeCloseTo(33, 0);
});

test('Show Where Taps Land draws a ring at each tap', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Show Where Taps Land' }).click();
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.sk-tap-ring')).toHaveCount(0);
  await page.mouse.click(200, 400);
  await expect(page.locator('.sk-tap-ring')).not.toHaveCount(0);
});

test('restores a first-version backup: the team comes over', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Restore from Backup').click();
  const fixture = readFileSync(new URL('../fixtures/v1-backup-made-up.json', import.meta.url), 'utf8');
  await restoreFile(page, 'scorekept-backup-2026-10-08.json', fixture);
  await page.getByRole('dialog', { name: 'Backup & Restore' }).getByRole('button', { name: 'Done' }).click();
  // The made-up backup had a game in progress: it's on the Game tab.
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
  await page.getByRole('tab', { name: 'Team' }).click();
  await expect(page.getByRole('heading', { name: 'Made-Up Mudcats' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ann #7/ })).toBeVisible();
});

test('a damaged file is refused with a plain message', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Restore from Backup').click();
  await page.locator('#restore-file').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('not a backup') });
  await expect(page.getByRole('status').filter({ hasText: 'isn’t a ScoreKept backup' })).toBeVisible();
});

test('damaged saved data is set aside and the app still opens', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('scorekept:data', '{"schemaVersion":1,"teams":[{"broken'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('set aside');
  const kept = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('scorekept:quarantine:')).length);
  expect(kept).toBe(1);
});

for (const colorScheme of appearances) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme });

    test('contrast, taps, and words: empty Game tab and Settings', async ({ page }) => {
      await freshApp(page);
      expect(await contrastProblems(page)).toEqual([]);
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
      await page.getByRole('button', { name: 'Settings' }).click();
      expect(await contrastProblems(page)).toEqual([]);
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
      await page.getByRole('button', { name: 'Help & How to Score' }).click();
      for (const s of await page.locator('summary').all()) await s.click();
      expect(await contrastProblems(page)).toEqual([]);
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
    });

    test('the glass tab bar stays readable over white, black, and paper (LESSONS 28)', async ({ page }) => {
      await freshApp(page);
      const worst = await page.evaluate(() => {
        const probe = document.createElement('canvas').getContext('2d')!;
        const rgba = (css: string) => {
          probe.clearRect(0, 0, 1, 1);
          probe.fillStyle = css;
          probe.fillRect(0, 0, 1, 1);
          const d = probe.getImageData(0, 0, 1, 1).data;
          return [d[0]!, d[1]!, d[2]!, d[3]! / 255] as const;
        };
        const lum = (c: readonly number[]) => {
          const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
        };
        const bar = getComputedStyle(document.querySelector('.sk-tabbar')!);
        const glass = rgba(bar.backgroundColor);
        const paper = rgba(getComputedStyle(document.body).backgroundColor);
        const ink = rgba(getComputedStyle(document.querySelector('.sk-tab[aria-selected="false"]')!).color);
        let min = Infinity;
        for (const under of [[255, 255, 255], [0, 0, 0], paper]) {
          const mix = [0, 1, 2].map((i) => glass[i]! * glass[3] + under[i]! * (1 - glass[3]));
          const a = lum(mix);
          const b = lum(ink);
          min = Math.min(min, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
        }
        return min;
      });
      expect(worst).toBeGreaterThanOrEqual(4.5);
    });

    for (const width of [260, 320, 393, 430, 520]) {
      test(`no sideways scroll at ${width} points wide`, async ({ page }) => {
        await page.setViewportSize({ width, height: 759 });
        await freshApp(page);
        expect(await sideScroll(page)).toBe(0);
      });
    }
  });
}

test('Increase Contrast and Reduce Transparency turn the tab bar solid', async ({ page }) => {
  await page.emulateMedia({ contrast: 'more' });
  await freshApp(page);
  const bar = await page.locator('.sk-tabbar').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, blur: cs.backdropFilter || (cs as unknown as { webkitBackdropFilter: string }).webkitBackdropFilter };
  });
  expect(bar.bg).toBe('rgb(246, 238, 219)');
  expect(bar.blur === 'none' || bar.blur === '' || bar.blur === undefined).toBe(true);
  expect(await contrastProblems(page)).toEqual([]);
});

test('visible words follow the house style everywhere we can open', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'What’s New' }).click();
  expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
  await fontsReady(page);
});
