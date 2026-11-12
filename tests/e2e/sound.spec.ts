import { expect, test, type Page } from '@playwright/test';
import { contrastProblems, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';

async function sample(page: Page): Promise<void> {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
}

async function checks(page: Page): Promise<void> {
  expect(await contrastProblems(page)).toEqual([]);
  expect(await tapTargetProblems(page)).toEqual([]);
  expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
  expect(await sideScroll(page)).toBe(0);
}

test('the Organ pad: albums, tap to play, tap again to stop', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.getByRole('dialog', { name: 'Organ' });
  for (const album of ['Rally', 'Celebrate', 'Pregame', 'Between Innings', 'Walk-Ups']) await expect(organ.getByRole('region', { name: album })).toBeVisible();
  const row = organ.getByRole('button', { name: /^Take Me Out to the Ball Game/ });
  await expect(row).toContainText('0:31');
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'false');
  await expect(organ.getByRole('button', { name: /^The Base Ball Polka/ })).toBeVisible();
  await expect(organ.getByRole('button', { name: /^Tally One for Me/ })).toBeVisible();
});

test('the speaker turns game sounds off and on, and remembers', async ({ page }) => {
  await sample(page);
  const speaker = page.getByRole('button', { name: 'Sound', exact: true });
  await expect(speaker).toHaveAttribute('aria-pressed', 'true');
  await speaker.click();
  await expect(speaker).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sound', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('♪ Walk-Up plays our batter’s song and reads Stop while it plays', async ({ page }) => {
  await sample(page);
  // Tonight the Diamond Dogs are batting.
  const walkup = page.getByRole('button', { name: '♪ Walk-Up' });
  await expect(walkup).toBeVisible();
  await walkup.click();
  await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible();
  await page.getByRole('button', { name: '■ Stop' }).click();
  await expect(walkup).toBeVisible();
});

test('Sounds & Walk-Up Songs: the pack sets each moment, and a pick sticks', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^Sounds & Walk-Up Songs/ }).click();
  const s = page.getByRole('dialog', { name: 'Sounds & Walk-Up Songs' });
  await expect(s.getByRole('button', { name: /^Strikeout/ })).toContainText('Strikeout');
  await s.getByLabel('Sound Pack').selectOption('little');
  await expect(s.getByRole('button', { name: /^Strikeout/ })).toContainText('No Sound');
  await s.getByRole('button', { name: /^Win/ }).click();
  await page.getByRole('dialog', { name: 'Win' }).getByRole('button', { name: /^Hallelujah Chorus/ }).click();
  await expect(s.getByRole('button', { name: /^Win/ })).toContainText('Hallelujah Chorus');
});

test('Edit Player has a walk-up song', async ({ page }) => {
  await sample(page);
  await page.getByRole('tab', { name: 'Team' }).click();
  await page.getByRole('button', { name: /^Maya Ortiz/ }).click();
  await page.getByRole('button', { name: 'Edit Player' }).click();
  const ed = page.getByRole('dialog', { name: 'Edit Player' });
  await ed.getByLabel('Song', { exact: true }).selectOption('wu-heat');
  await expect(ed.getByText('Plays Bring the Heat.')).toBeVisible();
  await ed.getByRole('button', { name: 'Done' }).click();
  const close = page.getByRole('button', { name: 'Close' });
  if (await close.count()) await close.last().click();
  await page.getByRole('button', { name: /^Maya Ortiz/ }).click();
  await page.getByRole('button', { name: 'Edit Player' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit Player' }).getByLabel('Song', { exact: true })).toHaveValue('wu-heat');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme });

    test('the Organ pad, Sounds settings, and the Game header: contrast, taps, words', async ({ page }) => {
      await sample(page);
      await checks(page);
      await page.getByRole('button', { name: 'Organ', exact: true }).click();
      await page.getByRole('dialog', { name: 'Organ' }).getByRole('button', { name: /^Charge!/ }).click();
      await checks(page);
      await page.screenshot({ path: `test-results/organ-${colorScheme}.png` });
      await page.getByRole('dialog', { name: 'Organ' }).getByRole('button', { name: 'Done' }).click();
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'All Settings' }).click();
      await page.getByRole('button', { name: /^Sounds & Walk-Up Songs/ }).click();
      await checks(page);
    });
  });
}
