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

test('the Organ click wheel: slide to scroll, the middle to choose, MENU to go back; VoiceOver has the list', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.getByRole('dialog', { name: 'Organ' });
  const screen = organ.locator('.cw-screen');
  await expect(screen).toContainText('Rally');
  await expect(organ.locator('.cw-sel')).toHaveText(/^Rally/);
  // Slide a half turn around the wheel, clockwise: the highlight moves down.
  const box = (await organ.locator('.cw-wheel').boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = box.width * 0.42;
  // Start between the keys (they sit at 0, 90, 180, and 270 degrees).
  await page.mouse.move(cx + r * Math.cos(Math.PI / 4), cy + r * Math.sin(Math.PI / 4));
  await page.mouse.down();
  for (let deg = 45; deg <= 145; deg += 5) await page.mouse.move(cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180));
  await page.mouse.up();
  await expect(organ.locator('.cw-sel')).toHaveText(/^Between Innings/);
  await organ.locator('.cw-hub').click();
  await expect(organ.locator('.cw-where')).toHaveText('Between Innings');
  await expect(organ.locator('.cw-sel')).toHaveText(/^Take Me Out to the Ball Game/);
  await organ.locator('.cw-hub').click();
  await expect(organ.locator('.cw-where')).toHaveText('Now Playing');
  await expect(screen).toContainText('Albert Von Tilzer and Jack Norworth, 1908');
  await expect(screen).toContainText('Between Innings');
  await organ.locator('.cw-next').click();
  await expect(screen).toContainText('The Base Ball Polka');
  await organ.locator('.cw-menu').click();
  await expect(organ.locator('.cw-sel')).toHaveText(/^The Base Ball Polka/);
  await organ.locator('.cw-play').click();
  // VoiceOver: the wheel is hidden from it, and every tune is a plain button.
  await expect(organ.locator('.cw-player')).toHaveAttribute('aria-hidden', 'true');
  const tune = organ.getByRole('button', { name: /^Tally One for Me, / });
  await expect(tune).toHaveAttribute('aria-pressed', 'false');
  // VoiceOver activates it without a tap; a hidden button isn't clickable by pointer.
  await tune.evaluate((b: HTMLButtonElement) => b.click());
  await expect(tune).toHaveAttribute('aria-pressed', 'true');
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
      await page.getByRole('dialog', { name: 'Organ' }).locator('.cw-hub').click();
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

test('the Organ is the sound hub: Settings at the bottom of its menu opens the sound settings', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.getByRole('dialog', { name: 'Organ' });
  await expect(organ.locator('.cw-list li').last()).toHaveText(/^Settings/);
  // Step down to Settings with the forward key, then press the middle.
  for (let i = 0; i < 7; i++) await organ.locator('.cw-next').click();
  await expect(organ.locator('.cw-sel')).toHaveText(/^Settings/);
  await organ.locator('.cw-hub').click();
  await expect(page.getByRole('dialog', { name: 'Sounds & Walk-Up Songs' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Big Speaker Mode' })).toBeVisible();
});
