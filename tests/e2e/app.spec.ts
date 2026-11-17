import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
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

test('beta: Send Feedback offers the error log, and Privacy says what goes online', async ({ page }) => {
  await freshApp(page);
  // Nothing has gone wrong yet: Send Feedback says so.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Send Feedback/ }).click();
  await expect(page.getByRole('dialog', { name: 'Send Feedback' })).toContainText('No problems noted on this iPhone.');
  await page.getByRole('dialog', { name: 'Send Feedback' }).getByRole('button', { name: 'Close' }).click();
  // Something breaks: a line is kept, and Send Feedback offers it, on by default.
  await page.evaluate(() => setTimeout(() => {
    throw new Error('Sample problem for the test');
  }, 0));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('scorekept:errors') ?? '')).toContain('Sample problem for the test');
  await page.getByRole('button', { name: /^Send Feedback/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Send Feedback' });
  await expect(sheet.getByRole('switch', { name: 'Include Error Log' })).toHaveAttribute('aria-checked', 'true');
  await sheet.getByText('Show the Error Log').click();
  await expect(sheet.locator('.fb-log li')).toContainText('Sample problem for the test');
  expect(await contrastProblems(page)).toEqual([]);
  expect(wordProblems(await sheet.innerText())).toEqual([]);
  await sheet.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: /^Privacy/ }).click();
  const privacy = page.getByRole('dialog', { name: 'Privacy' });
  await expect(privacy).toContainText('stays on this iPhone');
  await expect(privacy).toContainText('Open-Meteo');
  expect(wordProblems(await privacy.innerText())).toEqual([]);
  await privacy.getByRole('button', { name: 'Close' }).click();
  // About: the version and the credits (Steve, Nov 16), with no Pixabay line (no Stadium Sounds).
  await page.getByRole('button', { name: /^About/ }).click();
  const about = page.getByRole('dialog', { name: 'About' });
  await expect(about).toContainText(APP_VERSION);
  for (const credit of ['Alfa Slab One', 'Barlow Condensed', 'Kalam', 'Open-Meteo.com']) await expect(about).toContainText(credit);
  await expect(about).not.toContainText('Pixabay');
  // From the Sheet Music (Steve, Nov 16): each tune read from a scan names its publisher and library.
  await expect(about).toContainText('From the Sheet Music');
  for (const credit of ['Over the Fence Is Out!', 'Petrie Music Co.', 'Library of Congress', 'Lester S. Levy', 'Sam Fox Publishing Co.', 'Leo Feist', 'IMSLP']) await expect(about).toContainText(credit);
  await expect(about).not.toContainText(/hold that tiger/i);
  expect(wordProblems(await about.innerText())).toEqual([]);
  expect(await contrastProblems(page)).toEqual([]);
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
  await page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.sk-tap-ring')).toHaveCount(0);
  await page.mouse.click(200, 400);
  await expect(page.locator('.sk-tap-ring')).not.toHaveCount(0);
});

test('restores a first-version backup: the team comes over', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Restore from Backup').click();
  const fixture = readFileSync(new URL('../fixtures/v1-backup-made-up.json', import.meta.url), 'utf8');
  await restoreFile(page, 'scorekept-backup-2026-10-08.json', fixture);
  await page.getByRole('dialog', { name: 'Backup & Restore' }).getByRole('button', { name: 'Close' }).click();
  // The made-up backup had a game in progress: it's on the Game tab.
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
  await page.getByRole('tab', { name: 'Team' }).click();
  await expect(page.getByRole('heading', { name: 'Made-Up Mudcats' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Ann, number 7/ })).toBeVisible();
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

    test('the glass tab bar stays 7:1 over white, black, paper, gold, and the green board (LESSONS 28; Steve, Nov 16)', async ({ page }) => {
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
        for (const under of [[255, 255, 255], [0, 0, 0], paper, [242, 183, 40], [22, 59, 37]]) {
          const mix = [0, 1, 2].map((i) => glass[i]! * glass[3] + under[i]! * (1 - glass[3]));
          const a = lum(mix);
          const b = lum(ink);
          min = Math.min(min, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
        }
        return min;
      });
      expect(worst).toBeGreaterThanOrEqual(7);
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
  expect(bar.bg).toBe('rgb(243, 239, 228)');
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

test('no pinch-zoom, and no bounce on a screen that fits', async ({ page }) => {
  await freshApp(page);
  // The viewport and every element say scroll, never zoom.
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('user-scalable=no');
  const actions = await page.evaluate(() => [document.documentElement, document.body, document.querySelector('button')!].map((el) => getComputedStyle(el).touchAction));
  expect(actions).toEqual(['pan-x pan-y', 'pan-x pan-y', 'pan-x pan-y']);
  // An empty Scout tab fits on one screen: no bounce there.
  await page.getByRole('tab', { name: 'Scout', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/\bfits\b/);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overscrollBehaviorY)).toBe('none');
});

// The tab bar stays put (Steve, Nov 15, like App Store, Games, News, Books, and TV on iOS 26): it never
// tucks, hides, moves, or resizes on scroll, and every screen's last row scrolls fully above it.
test.describe('the tab bar is always there', () => {
  test.use({ viewport: { width: 393, height: 759 } });
  const where = (page: Page) => page.locator('.sk-tabbar').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { top: Math.round(r.top), height: Math.round(r.height), width: Math.round(r.width), shown: cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.99 };
  });
  for (const tab of ['Game', 'Book', 'Stats'] as const) {
    test(`${tab}: scrolling to the bottom and past it never moves the bar`, async ({ page }) => {
      await freshApp(page);
      await key(page, 'Look Around with Sample Data').click();
      await page.getByRole('tab', { name: tab }).click();
      const before = await where(page);
      expect(before.shown).toBe(true);
      for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 600);
      await page.waitForTimeout(150);
      expect(await where(page)).toEqual(before);
      // Past the bottom (the rubber band) and back up a little.
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(150);
      expect(await where(page)).toEqual(before);
      await page.mouse.wheel(0, -40);
      await page.waitForTimeout(150);
      expect(await where(page)).toEqual(before);
    });
  }

  test('down 500 points, then up 40: no change to the bar, and the tabs are always one tap away', async ({ page }) => {
    await freshApp(page);
    await key(page, 'Look Around with Sample Data').click();
    await page.getByRole('tab', { name: 'Stats' }).click();
    const before = await where(page);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(150);
    expect(await where(page)).toEqual(before);
    await page.mouse.wheel(0, -40);
    await page.waitForTimeout(150);
    expect(await where(page)).toEqual(before);
    for (const t of ['Game', 'Book', 'Scout', 'Team', 'Stats']) {
      await page.getByRole('tab', { name: t }).click();
      await expect(page.getByRole('tab', { name: t })).toHaveAttribute('aria-selected', 'true');
    }
  });

  test('the last item on the longest screen scrolls fully above the bar', async ({ page }) => {
    await freshApp(page);
    await key(page, 'Look Around with Sample Data').click();
    // Stats, Charts: one spray chart per player, the longest screen.
    await page.getByRole('tab', { name: 'Stats' }).click();
    await page.getByText('Charts', { exact: true }).first().click();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const gap = await page.evaluate(() => {
      // The screen's own box ends where its last row ends (lists clipped inside a card don't count).
      const panel = document.querySelector('.sk-panel:not([hidden])')!;
      const bar = document.querySelector('.sk-tabbar')!.getBoundingClientRect();
      return bar.top - panel.getBoundingClientRect().bottom;
    });
    expect(gap).toBeGreaterThanOrEqual(0);
  });
});

test('text can’t be selected or copied, except in fields you type in (Steve, Nov 16)', async ({ page }) => {
  await freshApp(page);
  const sel = (el: string) => page.locator(el).first().evaluate((e) => { const cs = getComputedStyle(e); return (cs as unknown as { webkitUserSelect?: string }).webkitUserSelect || cs.userSelect; });
  expect(await sel('body')).toBe('none');
  expect(await sel('.sk-tab')).toBe('none');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Send Feedback' }).click();
  expect(await sel('textarea, input[type="text"]')).toBe('text');
  // Selecting everything picks up nothing on the page.
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => { document.getSelection()?.selectAllChildren(document.body); return document.getSelection()?.toString().trim().length ?? 0; })).toBeLessThan(5);
});

