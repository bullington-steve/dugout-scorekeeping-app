/*
 * The Book's collapsing top and zoom (Steve, Nov 21): the inning row stays pinned at the top and
 * the names at the left while the page scrolls; a reading-glass menu picks Page, Normal, or
 * Close-up (a button, never a pinch, and never a double-tap); Close-up follows the at-bat; the
 * choice is remembered on this device.
 */
import { expect, test, type Page } from '@playwright/test';
import { freshApp, key, startGame } from '../helpers/app.ts';

async function sampleBook(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 759 });
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.locator('.bk-grid').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

const zoomMenu = (page: Page) => page.getByRole('combobox', { name: /^Book Zoom/ });

async function setZoom(page: Page, label: 'Page' | 'Normal' | 'Close-up'): Promise<void> {
  await zoomMenu(page).selectOption({ label });
  await page.waitForTimeout(150);
}

/** Every level's promises: names on one line, 44-point taps, no mark within 4 of a column line, text 12 or more. */
async function levelProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('.bk-grid-wrap .bk-name:not(.bk-name-before)')) {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`name wraps: ${el.textContent}`);
    }
    for (const btn of document.querySelectorAll<HTMLElement>('.bk-grid-wrap .bk-box')) {
      const r = btn.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) out.push(`tap ${Math.round(r.width)}×${Math.round(r.height)}`);
      const cell = btn.parentElement!.getBoundingClientRect();
      for (const m of btn.querySelectorAll<SVGGraphicsElement>('svg > *:not(.bk-half-end)')) {
        const b = m.getBoundingClientRect();
        if (!b.width && !b.height) continue;
        if (b.left < cell.left + 3.5 || b.right > cell.right - 3.5) out.push(`${m.getAttribute('class')} near a line`);
      }
      const svgEl = btn.querySelector('svg')!;
      const scale = svgEl.getBoundingClientRect().height / svgEl.viewBox.baseVal.height;
      for (const t of btn.querySelectorAll<SVGTextElement>('text')) {
        const pts = Number(t.getAttribute('font-size')) * scale;
        if (pts < 11.9) out.push(`${t.textContent} at ${pts.toFixed(1)} points`);
      }
    }
    return [...new Set(out)].slice(0, 8);
  });
}

for (const width of [375, 430]) {
  test(`at ${width} the inning row and the names stay pinned while the page scrolls (Steve, Nov 21)`, async ({ page }) => {
    await sampleBook(page, width);
    const float = page.locator('.bk-float');
    await expect(float).toBeHidden();
    // Scroll down into the grid: the header, board, and switcher go; the inning row stays on top.
    await page.evaluate(() => window.scrollTo(0, document.querySelector<HTMLElement>('.bk-grid-wrap')!.getBoundingClientRect().top + scrollY + 200));
    await expect(float).toBeVisible();
    const pinned = async () =>
      page.evaluate(() => {
        const fl = document.querySelector<HTMLElement>('.bk-float')!;
        const heads = [...fl.querySelectorAll<HTMLElement>('th.bk-inning')].map((th) => th.getBoundingClientRect());
        const real = [...document.querySelectorAll<HTMLElement>('.bk-grid-wrap thead th.bk-inning')].map((th) => th.getBoundingClientRect());
        const batter = document.querySelector<HTMLElement>('.bk-grid-wrap tbody td.bk-batter')!.getBoundingClientRect();
        const boardGone = document.querySelector<HTMLElement>('.bk-which')!.getBoundingClientRect().bottom < 0;
        return { top: fl.getBoundingClientRect().top, lefts: heads.map((r) => Math.round(r.left)), real: real.map((r) => Math.round(r.left)), batterLeft: batter.left, boardGone };
      });
    let at = await pinned();
    expect(at.top).toBe(0);
    expect(at.boardGone).toBe(true);
    expect(at.lefts).toEqual(at.real);
    // Sideways too: the pinned row moves with the innings, the names stay put.
    await page.locator('.bk-grid-wrap').evaluate((w) => (w.scrollLeft = 120));
    await page.waitForTimeout(100);
    at = await pinned();
    expect(at.lefts).toEqual(at.real);
    expect(at.batterLeft).toBeLessThanOrEqual(40);
    // Back at the top, everything returns and the copy hides.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(float).toBeHidden();
    await expect(page.locator('.bk-which')).toBeInViewport();
  });

  test(`at ${width} Page shows every inning played, and each level keeps names, taps, margins, and 12-point text (Steve, Nov 21)`, async ({ page }) => {
    await sampleBook(page, width);
    for (const level of ['Page', 'Normal', 'Close-up'] as const) {
      await setZoom(page, level);
      await page.evaluate(() => document.fonts.ready);
      expect(await levelProblems(page), level).toEqual([]);
      if (level === 'Page') {
        const fit = await page.evaluate(() => {
          const wrap = document.querySelector<HTMLElement>('.bk-grid-wrap')!;
          const played = Number(document.querySelector<HTMLElement>('.bk-grid-wrap .bk-grid')!.dataset.played);
          const cells = [...document.querySelectorAll<HTMLElement>('.bk-grid-wrap tbody tr:first-child td.bk-cell')].slice(0, played);
          return { right: Math.max(...cells.map((c) => c.getBoundingClientRect().right)), edge: wrap.getBoundingClientRect().right, scroll: wrap.scrollLeft, played };
        });
        expect(fit.played).toBeGreaterThanOrEqual(4);
        expect(fit.scroll).toBe(0);
        expect(fit.right).toBeLessThanOrEqual(fit.edge + 1);
      }
      if (level === 'Close-up') {
        const w = await page.locator('.bk-grid-wrap tbody tr:first-child td.bk-cell').first().evaluate((c) => c.getBoundingClientRect().width);
        expect(w).toBeGreaterThanOrEqual(108);
      }
    }
  });

  test(`at ${width} Close-up keeps the current at-bat in view after each play (Steve, Nov 21)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 759 });
    await freshApp(page);
    await startGame(page, { ruleSet: 'Basic Slowpitch' });
    await page.getByRole('tab', { name: 'Book' }).click();
    await page.locator('.bk-grid').waitFor();
    await setZoom(page, 'Close-up');
    // Two outs at most and under the run limit, so the at-bat stays on our page.
    const plays = ['Single', 'Strikeout Swinging', 'Double', 'Strikeout Swinging', 'Single', 'Single'];
    for (const play of plays) {
      await page.getByRole('tab', { name: 'Game' }).click();
      await key(page, play).click();
      await page.getByRole('tab', { name: 'Book' }).click();
      await page.waitForTimeout(150);
      const at = await page.evaluate(() => {
        const due = document.querySelector<HTMLElement>('.bk-grid-wrap .bk-due')!.getBoundingClientRect();
        const wrap = document.querySelector<HTMLElement>('.bk-grid-wrap')!.getBoundingClientRect();
        const names = document.querySelector<HTMLElement>('.bk-grid-wrap thead .bk-batter')!.getBoundingClientRect();
        const bar = document.querySelector<HTMLElement>('.sk-tabbar')!.getBoundingClientRect().top;
        const fl = document.querySelector<HTMLElement>('.bk-float')!;
        const top = fl.hidden ? 0 : fl.getBoundingClientRect().bottom;
        return { due: { l: due.left, r: due.right, t: due.top, b: due.bottom }, left: names.right, right: wrap.right, top, bar };
      });
      expect(at.due.l, play).toBeGreaterThanOrEqual(at.left - 1);
      expect(at.due.r, play).toBeLessThanOrEqual(at.right + 1);
      expect(at.due.t, play).toBeGreaterThanOrEqual(at.top - 1);
      expect(at.due.b, play).toBeLessThanOrEqual(at.bar + 1);
    }
  });
}

test('the zoom is remembered on this device, changes only from the menu, and a tap opens Edit Play right away (Steve, Nov 21)', async ({ page }) => {
  await sampleBook(page, 393);
  await expect(zoomMenu(page)).toHaveAccessibleName('Book Zoom: Normal');
  await setZoom(page, 'Close-up');
  await expect(zoomMenu(page)).toHaveAccessibleName('Book Zoom: Close-up');
  await page.reload();
  await page.getByRole('tab', { name: 'Book' }).click();
  await expect(zoomMenu(page)).toHaveAccessibleName('Book Zoom: Close-up');
  // A double-tap on the grid no longer zooms.
  await page.locator('.bk-grid-wrap .bk-box').first().dblclick();
  await expect(zoomMenu(page)).toHaveAccessibleName('Book Zoom: Close-up');
  for (const c = page.getByRole('button', { name: 'Close', exact: true }); await c.count(); ) await c.last().click();
  await setZoom(page, 'Normal');
  // One tap opens Edit Play with no wait for a second tap.
  await page.locator('.bk-grid-wrap .bk-box').first().click();
  await expect(page.getByRole('dialog', { name: 'Edit Play' })).toBeVisible({ timeout: 150 });
});
