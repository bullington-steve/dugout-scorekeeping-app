import { expect, test } from '@playwright/test';
import { contrastProblems, FIT_HEADROOM, IPHONE_16, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';

test('Look Around with Sample Data, then Clear Sample Data starts fresh', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  // Tonight's game is on, in the 4th.
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
  await expect(page.locator('.gm-board .sk-visually-hidden')).toContainText('fourth');
  // The banner shows everywhere but the Game tab on iPhone.
  const banner = page.getByRole('complementary', { name: 'Sample Season' });
  await expect(banner).toBeHidden();
  await page.getByRole('tab', { name: 'Team' }).click();
  await expect(banner).toBeVisible();
  await expect(page.getByRole('button', { name: /^Tara Nguyen/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /vs Harbor City Anchors/ })).toBeVisible();
  // It survives closing and reopening.
  await page.reload();
  await expect(page.getByRole('button', { name: /^Maya Ortiz/ })).toBeVisible();
  await banner.getByRole('button', { name: 'Clear Sample Data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Clear Sample Data' }).click();
  await expect(banner).toBeHidden();
  // A fresh start: the welcome screen, with setup or the sample again.
  const welcome = page.getByRole('dialog', { name: 'Welcome to ScoreKept' });
  await expect(welcome).toBeVisible();
  await expect(welcome.getByRole('button', { name: 'Look Around with Sample Data First' })).toBeVisible();
  await welcome.getByRole('button', { name: 'Set Up My Team' }).click();
  await page.getByRole('dialog', { name: 'Setup' }).getByRole('button', { name: 'Skip Setup' }).click();
  await page.getByRole('tab', { name: 'Game' }).click();
  await expect(page.getByText('No Game in Progress')).toBeVisible();
});

test('the sample button only shows on a device with nothing saved', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('tab', { name: 'Team' }).click();
  await key(page, 'Set Up My Team').click();
  const edit = page.getByRole('dialog', { name: 'Edit Team' });
  await edit.getByLabel('Team Name').fill('Diamond Dogs');
  await edit.getByRole('button', { name: 'Done' }).click();
  await key(page, '+ Add Player').click();
  const ed = page.getByRole('dialog', { name: 'New Player' });
  await ed.getByLabel('Name', { exact: true }).fill('Steve');
  await ed.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('tab', { name: 'Game' }).click();
  await expect(key(page, 'Look Around with Sample Data')).toBeHidden();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`sample game fits an iPhone 16 and passes the checks: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize(IPHONE_16);
    await freshApp(page);
    await key(page, 'Look Around with Sample Data').click();
    await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
    const m = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight - innerHeight,
      stripBottom: document.querySelector('.gm-strip')!.getBoundingClientRect().bottom,
      barTop: document.querySelector('.sk-tabbar')!.getBoundingClientRect().top,
    }));
    expect(m.scroll).toBeLessThanOrEqual(0);
    expect(m.barTop - m.stripBottom).toBeGreaterThanOrEqual(FIT_HEADROOM);
    for (const tab of ['Game', 'Team']) {
      await page.getByRole('tab', { name: tab }).click();
      expect(await contrastProblems(page)).toEqual([]);
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
    }
  });
}
