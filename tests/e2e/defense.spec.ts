import { expect, test, type Page } from '@playwright/test';
import { contrastProblems, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';

/** The sample season: tonight's game is on, in the 4th. */
async function sampleGame(page: Page): Promise<void> {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
}

const card = (page: Page) => page.getByRole('dialog', { name: 'Defense' });

test('Defense card: swap, pin, Auto-Rotate, Reset, and the whiteboard', async ({ page }) => {
  await sampleGame(page);
  await key(page, 'Defense').click();
  const d = card(page);
  await expect(d.getByRole('table')).toBeVisible();
  // P and C start pinned.
  const pinned = d.getByRole('button', { pressed: true });
  expect(await pinned.count()).toBeGreaterThanOrEqual(2);

  // Pin someone else, then unpin.
  const unpinned = d.locator('.df-pin[aria-pressed="false"]').first();
  const who = (await unpinned.getAttribute('aria-label'))!.split(',')[0]!;
  await unpinned.click();
  await expect(d.getByRole('button', { name: `${who}, pinned, stays put` })).toBeVisible();
  await d.getByRole('button', { name: `${who}, pinned, stays put` }).click();
  await expect(d.getByRole('button', { name: `${who}, not pinned` })).toBeVisible();

  // Swap: put the 7th-inning shortstop's neighbor at shortstop.
  const cell7 = d.getByRole('button', { name: new RegExp(`^${who}, inning 7: `) });
  await cell7.click();
  const pick = page.getByRole('dialog', { name: `${who}, Seventh Inning` });
  await pick.getByRole('button', { name: /^SS · Shortstop/ }).click();
  await expect(d.getByRole('button', { name: `${who}, inning 7: shortstop` })).toBeVisible();
  // Nobody else plays short in the 7th.
  await expect(d.getByRole('button', { name: /, inning 7: shortstop$/ })).toHaveCount(1);

  // Auto-Rotate fills the innings not yet played.
  await d.getByRole('button', { name: 'Auto-Rotate' }).click();
  await expect(d.locator('.df-notes')).toContainText(/Innings \d–7 are filled in/);
  // Every planned inning has a pitcher, catcher, and full infield.
  await expect(d.locator('.df-warn')).toHaveCount(0);

  // The plan stepper.
  await d.getByRole('button', { name: 'Plan for fewer innings' }).click();
  await expect(d.getByRole('group', { name: 'Plan for 6 innings' })).toBeVisible();
  await expect(d.locator('.df-ifneeded')).toHaveCount(1);

  // Reset asks first.
  await d.getByRole('button', { name: 'Reset' }).click();
  await page.getByRole('dialog', { name: 'Reset the Defense Card?' }).getByRole('button', { name: 'Reset' }).click();
  await expect(d.locator('.df-notes')).toContainText('reset');

  // The whiteboard picture.
  await d.getByRole('button', { name: 'Whiteboard' }).click();
  const wb = page.getByRole('dialog', { name: 'Whiteboard' });
  await expect(wb.getByRole('img')).toBeVisible();
  const size = await wb.getByRole('img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size[0]).toBe(1080);
  await expect(wb.locator('.sk-visually-hidden li').first()).toContainText(/^P: innings 1 · 5, /);

  // Changes survive closing and reopening.
  await wb.getByRole('button', { name: 'Done' }).click();
  await d.getByRole('button', { name: 'Done' }).click();
  await page.reload();
  await key(page, 'Defense').click();
  await expect(card(page).getByRole('group', { name: 'Plan for 6 innings' })).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme });

    test('Defense card: contrast, taps, words, and no sideways page scroll', async ({ page }) => {
      await sampleGame(page);
      await key(page, 'Defense').click();
      await card(page).getByRole('button', { name: 'Auto-Rotate' }).click();
      expect(await contrastProblems(page)).toEqual([]);
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
      expect(await sideScroll(page)).toBe(0);
      await page.screenshot({ path: `test-results/defense-${colorScheme}.png` });
      await card(page).getByRole('button', { name: 'Whiteboard' }).click();
      await page.getByRole('dialog', { name: 'Whiteboard' }).getByRole('img').screenshot({ path: `test-results/whiteboard-${colorScheme}.png` });
    });
  });
}

test('Team Tools: the depth chart flags thin spots, and dues split and track payments', async ({ page }) => {
  await sampleGame(page);
  await page.getByRole('tab', { name: 'Team' }).click();
  await page.getByRole('button', { name: /^Depth Chart/ }).click();
  const dc = page.getByRole('dialog', { name: 'Depth Chart' });
  await expect(dc.getByRole('region', { name: /^Pitcher/ })).toBeVisible();
  await dc.getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: /^Dues/ }).click();
  const dues = page.getByRole('dialog', { name: /^Dues/ });
  // A sheet moves focus to its title on the next frame (for VoiceOver); type after that.
  await expect(dues.getByRole('heading', { name: /^Dues/ })).toBeFocused();
  await dues.getByLabel('League Fee').fill('591');
  await expect(dues.getByLabel('League Fee')).toHaveValue('591');
  // Eleven on the roster, one marked as not paying: $591 / 10 = $59.10.
  await dues.getByRole('button', { name: /^Jess Kowalczyk/ }).click();
  const maya = page.getByRole('dialog', { name: 'Jess Kowalczyk' });
  await maya.getByRole('switch', { name: 'Doesn’t Pay' }).click();
  await maya.getByRole('button', { name: 'Done' }).click();
  await expect(dues.getByText('$591.00 ÷ 10 = $59.10 each')).toBeVisible();
  await dues.getByRole('button', { name: /^Moose Dorsey/ }).click();
  await page.getByRole('dialog', { name: 'Moose Dorsey' }).getByRole('button', { name: 'Paid in Full ($59.10)' }).click();
  await expect(dues.getByRole('button', { name: /^Moose Dorsey/ })).toContainText('Paid ✓');
  await dues.getByRole('button', { name: /^Travis Pruitt Jr./ }).click();
  const casey = page.getByRole('dialog', { name: 'Travis Pruitt Jr.' });
  await expect(casey.getByRole('heading', { name: 'Travis Pruitt Jr.' })).toBeFocused();
  await casey.getByLabel('Amount Paid').fill('20');
  await casey.getByRole('button', { name: 'Done' }).click();
  await expect(dues.getByRole('button', { name: /^Travis Pruitt Jr./ })).toContainText('Paid $20.00, owes $39.10');
  await expect(dues.getByText('Collected $79.10')).toBeVisible();
  await dues.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: /^Dues/ })).toContainText('$511.90 to go');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`Team Tools in the ${colorScheme} appearance: contrast, taps, words`, async ({ browser }) => {
    const page = await browser.newPage({ colorScheme, viewport: { width: 393, height: 852 } });
    await sampleGame(page);
    await page.getByRole('tab', { name: 'Team' }).click();
    for (const name of [/^Depth Chart/, /^Dues/]) {
      await page.getByRole('button', { name }).click();
      if (String(name).includes('Dues')) await page.getByRole('dialog').getByLabel('League Fee').fill('591');
      expect(await contrastProblems(page)).toEqual([]);
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
      expect(await sideScroll(page)).toBe(0);
      await page.screenshot({ path: `test-results/tools-${String(name).includes('Dues') ? 'dues' : 'depth'}-${colorScheme}.png` });
      await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
    }
    await page.close();
  });
}

test('Defense card, depth chart, and dues fit 150% zoom (260 points wide)', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 260, height: 568 } });
  await sampleGame(page);
  await key(page, 'Defense').click();
  expect(await sideScroll(page)).toBe(0);
  expect(await tapTargetProblems(page)).toEqual([]);
  await card(page).getByRole('button', { name: 'Done' }).click();
  await page.getByRole('tab', { name: 'Team' }).click();
  for (const name of [/^Depth Chart/, /^Dues/]) {
    await page.getByRole('button', { name }).click();
    expect(await sideScroll(page)).toBe(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  }
  await page.close();
});
