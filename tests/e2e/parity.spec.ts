/*
 * Phase 10 sweep (BUILD_PLAN): every screen, in every setting the house style
 * names, checked the same way. Settings: iPhone upright, 150% zoom (260
 * wide), 75% zoom (520 wide), sideways, and the largest text size; light
 * appearance and Dark Mode. Checks: no sideways page scroll, 44-point taps,
 * contrast, house words, and every control has a name VoiceOver can read.
 */
import { expect, test, type Page } from '@playwright/test';
import { contrastProblems, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });

/** Every control and picture has a name VoiceOver can read. */
async function unnamed(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && !el.closest('[hidden], [aria-hidden="true"], [inert]');
    };
    for (const el of document.querySelectorAll('button, a[href], input, select, [role="button"], [role="switch"], [role="tab"]')) {
      if (!visible(el)) continue;
      const id = el.getAttribute('id');
      const label = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent?.trim() || (id && document.querySelector(`label[for="${id}"]`)?.textContent?.trim()) || el.closest('label')?.textContent?.trim() || (el as HTMLInputElement).placeholder;
      if (!label) out.push(el.outerHTML.slice(0, 80));
    }
    for (const img of document.querySelectorAll('img')) if (visible(img) && img.getAttribute('alt') === null) out.push(img.outerHTML.slice(0, 80));
    return out;
  });
}

interface Setting {
  name: string;
  viewport: { width: number; height: number };
  /** Root text size, as a share of the iPhone's default (Larger Text at its largest is about 312%). */
  text?: number;
}

const SETTINGS: Setting[] = [
  { name: 'iPhone upright', viewport: { width: 393, height: 759 } },
  { name: '150% zoom', viewport: { width: 260, height: 568 } },
  { name: '75% zoom', viewport: { width: 520, height: 1012 } },
  { name: 'sideways', viewport: { width: 852, height: 393 } },
  { name: 'largest text', viewport: { width: 393, height: 759 }, text: 3.12 },
];

/** Open each screen in turn and run the checks; collect every problem with where it was. */
async function sweep(page: Page, s: Setting, scheme: string): Promise<string[]> {
  const problems: string[] = [];
  const check = async (where: string) => {
    const tag = `${s.name}, ${scheme}, ${where}`;
    const side = await sideScroll(page);
    if (side > 0) problems.push(`${tag}: page scrolls sideways by ${side}`);
    for (const p of await tapTargetProblems(page)) problems.push(`${tag}: ${p}`);
    // Contrast and words are the same at every size: check them once, upright.
    if (s.name === 'iPhone upright') {
      for (const p of await contrastProblems(page)) problems.push(`${tag}: ${p}`);
      for (const p of wordProblems(await page.locator('body').innerText())) problems.push(`${tag}: ${p}`);
    }
    for (const p of await unnamed(page)) problems.push(`${tag}: no name for ${p}`);
  };
  const closeAll = async () => {
    const close = page.getByRole('button', { name: 'Close', exact: true });
    for (let i = 0; i < 6 && (await close.count()); i++) await close.last().click();
  };
  const tab = (name: string) => page.getByRole('tab', { name, exact: true }).click();

  await freshApp(page);
  if (s.text) await page.addStyleTag({ content: `html { font-size: ${s.text * 106.25}% !important; }` });
  await key(page, 'Look Around with Sample Data').click();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
  await check('Game');
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  await check('Organ');
  await closeAll();
  await key(page, 'Defense').click();
  await check('Defense card');
  await closeAll();
  await key(page, 'Lineups').click();
  await check('Lineups');
  await closeAll();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await check('Game Settings');
  await closeAll();

  await tab('Book');
  await check('Book');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  await check('Share Recap');
  await closeAll();

  await tab('Stats');
  for (const section of ['Overview', 'Batting', 'Charts', 'Lineups', 'Innings']) {
    await page.getByRole('group', { name: 'Stats Sections' }).getByRole('button', { name: section, exact: true }).click();
    await check(`Stats, ${section}`);
  }
  await tab('Scout');
  await check('Scout');
  await tab('Team');
  await check('Team');
  for (const name of [/^Depth Chart/, /^Dues/]) {
    await page.getByRole('button', { name }).click();
    await check(String(name).replace(/[\^/]/g, ''));
    await closeAll();
  }
  await page.getByRole('button', { name: /^Maya Ortiz/ }).click();
  await check('Player card');
  await page.getByRole('button', { name: 'Edit Player' }).click();
  await check('Edit Player');
  await closeAll();
  return problems;
}

for (const scheme of ['light', 'dark'] as const) {
  for (const s of SETTINGS) {
    test(`every screen: ${s.name}, ${scheme}`, async ({ browser }) => {
      test.setTimeout(90_000);
      const page = await browser.newPage({ viewport: s.viewport, colorScheme: scheme, reducedMotion: 'reduce', serviceWorkers: 'block', hasTouch: true });
      const problems = await sweep(page, s, scheme);
      await page.close();
      expect(problems).toEqual([]);
    });
  }
}

test('welcome and setup at the largest text and sideways', async ({ browser }) => {
  for (const s of [SETTINGS[4]!, SETTINGS[3]!]) {
    const page = await browser.newPage({ viewport: s.viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await freshApp(page, { welcome: true });
    if (s.text) await page.addStyleTag({ content: `html { font-size: ${s.text * 106.25}% !important; }` });
    const problems: string[] = [];
    const where = async (w: string) => {
      const side = await sideScroll(page);
      if (side > 0) problems.push(`${s.name}, ${w}: page scrolls sideways by ${side}`);
      for (const p of await tapTargetProblems(page)) problems.push(`${s.name}, ${w}: ${p}`);
    };
    await where('welcome');
    await page.getByRole('button', { name: 'Set Up My Team' }).click();
    const setup = page.getByRole('dialog', { name: 'Setup' });
    for (let i = 0; i < 6; i++) {
      await where(`setup step ${i + 1}`);
      await setup.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await where('setup step 7');
    await page.close();
    expect(problems).toEqual([]);
  }
});
