import { expect, test, type Page } from '@playwright/test';
import { IPHONE_16 } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';

// The unification pass (Steve, Nov 18): every scrolling screen's last row scrolls fully clear of
// the floating tab bar, lists are ruled rows with no old boxes, and rows highlight instead of pressing.

const TAPPABLE = 'button, a[href], select, summary, [role="radio"], [tabindex="0"]';

async function lastRowClear(page: Page, panel: string): Promise<{ bottom: number; barTop: number; label: string }> {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  return page.evaluate(
    ({ panel, sel }) => {
      const root = document.querySelector(panel)!;
      const shown = [...root.querySelectorAll<HTMLElement>(sel)].filter((e) => {
        const r = e.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0) || getComputedStyle(e).visibility === 'hidden') return false;
        // Skip what a closed disclosure hides, and what a box of its own scrolls out of sight (a long list inside its own scroller).
        const shut = e.closest('details:not([open])');
        if (shut && e.closest('summary')?.parentElement !== shut) return false;
        for (let p = e.parentElement; p && p !== root; p = p.parentElement) {
          if (getComputedStyle(p).overflowY !== 'visible') {
            const q = p.getBoundingClientRect();
            if (r.top >= q.bottom || r.bottom <= q.top) return false;
          }
        }
        return true;
      });
      const last = shown.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a));
      return {
        bottom: last.getBoundingClientRect().bottom,
        barTop: document.querySelector('.sk-tabbar')!.getBoundingClientRect().top,
        label: last.getAttribute('aria-label') || last.textContent!.trim().slice(0, 40),
      };
    },
    { panel, sel: TAPPABLE },
  );
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(IPHONE_16);
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
});

// One test per screen, plain and with an iPhone 16 Home Screen app's 34-point Home indicator area
// (the headless browsers have none, Steve's iPhone does), and 8 points to spare above the bar
// (Steve, Nov 24: the Stats Games list especially).
const SCREENS: [string, string | null][] = [
  ['Game', null],
  ['Book', null],
  ['Scout', null],
  ['Team', null],
  ['Stats', 'Overview'],
  ['Stats', 'Batting'],
  ['Stats', 'Charts'],
  ['Stats', 'Lineups'],
  ['Stats', 'Innings'],
];
for (const inset of [0, 34]) {
  for (const [tab, section] of SCREENS) {
    test(`${section ? `Stats, ${section}` : tab}: the last row scrolls fully clear of the tab bar${inset ? ', with the Home indicator area' : ''}`, async ({ page }) => {
      if (inset) await page.addStyleTag({ content: `:root { --safe-bottom: ${inset}px !important; } body { padding-bottom: ${inset}px !important; }` });
      await page.getByRole('tab', { name: tab }).click();
      if (section) await page.getByRole('group', { name: 'Stats Sections' }).getByRole('button', { name: section, exact: true }).click();
      const m = await lastRowClear(page, `#tab-${tab.toLowerCase()}`);
      expect(m.bottom, `“${m.label}” ends ${(m.bottom - m.barTop).toFixed(0)} under the tab bar`).toBeLessThanOrEqual(m.barTop - 8);
    });
  }
}

test('Settings: the last row scrolls fully into view', async ({ page }) => {
  // Settings is a sheet over the tab bar: its last row scrolls fully into view.
  await page.getByRole('tab', { name: 'Game' }).click();
  await page.getByRole('button', { name: 'Settings' }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Settings' });
  await expect(sheet).toBeVisible();
  const s = await sheet.evaluate((d) => {
    const scroller = [d, ...d.querySelectorAll<HTMLElement>('*')].find((e) => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY))!;
    scroller.scrollTop = scroller.scrollHeight;
    const rows = [...d.querySelectorAll<HTMLElement>('button, a[href], select')].filter((e) => {
      const shut = e.closest('details:not([open])');
      return e.getBoundingClientRect().height > 0 && !(shut && e.closest('summary')?.parentElement !== shut);
    });
    const last = rows.reduce((a, b) => (b.getBoundingClientRect().bottom > a.getBoundingClientRect().bottom ? b : a));
    return { bottom: last.getBoundingClientRect().bottom, view: Math.min(innerHeight, scroller.getBoundingClientRect().bottom) };
  });
  expect(s.bottom).toBeLessThanOrEqual(s.view);
});

test('Scout is one edge-to-edge sheet of ruled rows, each with the opponent’s patch', async ({ page }) => {
  await page.getByRole('tab', { name: 'Scout' }).click();
  const list = page.getByRole('region', { name: 'Opponents' });
  await expect(list).toBeVisible();
  const m = await list.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const rows = [...el.querySelectorAll<HTMLElement>('.sk-row, .sc-team')];
    return {
      left: r.left,
      right: innerWidth - r.right,
      rows: rows.length,
      patches: el.querySelectorAll('.sc-team svg, .sc-team .tm-patch, .sc-team [class*="patch"]').length,
      boxed: rows.filter((x) => parseFloat(getComputedStyle(x).borderTopWidth) > 0 || parseFloat(getComputedStyle(x).borderTopLeftRadius) > 0).length,
      font: getComputedStyle(el.querySelector('.sc-team, .sk-row')!).fontFamily,
    };
  });
  expect(m.left).toBe(0);
  expect(m.right).toBe(0);
  expect(m.rows).toBeGreaterThan(0);
  expect(m.patches).toBeGreaterThan(0);
  expect(m.boxed).toBe(0);
  expect(m.font).toMatch(/Barlow/);
});

test('no old-look boxes on the tabs: paper runs edge to edge and rows don’t press like keys', async ({ page }) => {
  const boxes = async () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.sk-panel:not([hidden]) :is(.sk-card, .sk-details, .st-table-wrap, .sk-stack > .sk-row, .sk-stack > .sk-row-group > .sk-row)')]
        .filter((e) => e.offsetParent && e.getBoundingClientRect().width > 0)
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          return r.left > 0.5 || innerWidth - r.right > 0.5 || parseFloat(cs.borderTopLeftRadius) > 0 || parseFloat(cs.borderLeftWidth) > 0;
        })
        .map((e) => e.className),
    );
  for (const tab of ['Book', 'Scout', 'Team']) {
    await page.getByRole('tab', { name: tab }).click();
    expect(await boxes(), tab).toEqual([]);
  }
  await page.getByRole('tab', { name: 'Stats' }).click();
  for (const section of ['Overview', 'Batting', 'Charts', 'Lineups', 'Innings']) {
    await page.getByRole('group', { name: 'Stats Sections' }).getByRole('button', { name: section, exact: true }).click();
    expect(await boxes(), `Stats, ${section}`).toEqual([]);
  }
  // A list row highlights; it never drops 2 points like a lipped key.
  await page.getByRole('tab', { name: 'Team' }).click();
  const row = page.locator('.tm-player').first();
  const box = (await row.boundingBox())!;
  const before = await row.evaluate((e) => getComputedStyle(e).backgroundColor);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const during = await row.evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, t: getComputedStyle(e).transform }));
  await page.mouse.up();
  expect(during.bg).not.toBe(before);
  expect(during.t === 'none' || during.t === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
});
