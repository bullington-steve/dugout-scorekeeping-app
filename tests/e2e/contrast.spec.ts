/*
 * Contrast on every screen, to the bar an App Store "Sufficient Contrast" claim needs and the
 * house style asks for (Steve, Nov 12): 7:1 text (4.5:1 large) in the light appearance and with
 * Increase Contrast in both appearances; 4.5:1 (3:1 large) in Dark Mode. Counts what's drawn on
 * screen even when VoiceOver skips it (the scoreboard, the Book's boxes), SVG text, gradients,
 * and interface icons at 3:1. Dimmed controls are exempt, as is the team badge (the team's mark).
 */
import { expect, test, type Page } from '@playwright/test';
import { contrastProblems } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';

type Lvl = { normal: number; large: number; seen: true };
async function sweep(page: Page, lvl: Lvl): Promise<string[]> {
  const out: string[] = [];
  const check = async (w: string) => { for (const p of await contrastProblems(page, lvl)) out.push(`${w}: ${p}`); };
  const closeAll = async () => { const c = page.getByRole('button', { name: 'Close', exact: true }); for (let i = 0; i < 6 && (await c.count()); i++) await c.last().click(); };
  const tab = (n: string) => page.getByRole('tab', { name: n, exact: true }).click();
  await freshApp(page, { welcome: true });
  await check('Welcome');
  await page.getByRole('button', { name: 'Set Up My Team' }).click();
  const setup = page.getByRole('dialog', { name: 'Setup' });
  for (let i = 0; i < 7; i++) { await check(`Setup ${i + 1}`); if (i < 6) await setup.getByRole('button', { name: 'Next', exact: true }).click(); }
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
  await check('Game');
  await page.getByRole('button', { name: 'Organ', exact: true }).click(); await check('Organ'); await closeAll();
  await key(page, 'Defense').click(); await check('Defense'); await closeAll();
  await key(page, 'Lineups').click(); await check('Lineups'); await closeAll();
  await page.getByRole('button', { name: 'Settings', exact: true }).click(); await check('Game Settings'); await closeAll();
  await tab('Book'); await check('Book');
  await page.getByRole('button', { name: 'Share', exact: true }).click(); await check('Share'); await closeAll();
  await tab('Stats');
  for (const s of ['Overview', 'Batting', 'Charts', 'Lineups', 'Innings']) { await page.getByRole('group', { name: 'Stats Sections' }).getByRole('button', { name: s, exact: true }).click(); await check(`Stats ${s}`); }
  await tab('Scout'); await check('Scout');
  await tab('Team'); await check('Team');
  for (const n of [/^Depth Chart/, /^Dues/]) { await page.getByRole('button', { name: n }).click(); await check(String(n)); await closeAll(); }
  await page.getByRole('button', { name: /^Maya Ortiz/ }).click(); await check('Player card');
  await page.getByRole('button', { name: 'Edit Player' }).click(); await check('Edit Player'); await closeAll();
  return out;
}
const RUNS = [
  { name: 'light', scheme: 'light', contrast: 'no-preference', lvl: { normal: 7, large: 4.5, seen: true } },
  { name: 'dark', scheme: 'dark', contrast: 'no-preference', lvl: { normal: 7, large: 4.5, seen: true } },
  { name: 'light-more', scheme: 'light', contrast: 'more', lvl: { normal: 7, large: 4.5, seen: true } },
  { name: 'dark-more', scheme: 'dark', contrast: 'more', lvl: { normal: 7, large: 4.5, seen: true } },
] as const;
for (const r of RUNS) test(`contrast on every screen: ${r.name}`, async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await browser.newPage({ viewport: { width: 393, height: 759 }, colorScheme: r.scheme, contrast: r.contrast, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const out = await sweep(page, r.lvl as Lvl);
  await page.close();
  expect([...new Set(out)]).toEqual([]);
});
