import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { contrastProblems, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key, restoreFile } from '../helpers/app.ts';

const welcome = (page: Page) => page.getByRole('dialog', { name: 'Welcome to ScoreKept' });
const setup = (page: Page) => page.getByRole('dialog', { name: 'Setup' });
const next = (page: Page) => setup(page).getByRole('button', { name: 'Next', exact: true }).click();
/** With Reduce Motion PLAY BALL! still waits for its tap (Steve, Nov 25). */
const playBall = (page: Page) => page.getByRole('button', { name: 'PLAY BALL!' }).click();

async function checks(page: Page): Promise<void> {
  expect(await contrastProblems(page)).toEqual([]);
  expect(await tapTargetProblems(page)).toEqual([]);
  expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
  expect(await sideScroll(page)).toBe(0);
}

test('first launch: PLAY BALL!, then the welcome screen', async ({ page }) => {
  await freshApp(page, { welcome: true });
  const play = page.getByRole('button', { name: 'PLAY BALL!' });
  await expect(play).toBeVisible();
  await play.click();
  // The bases round, the numbers flip, and the welcome slides in.
  await expect(page.locator('.wl-base-home.on')).toHaveCount(1, { timeout: 6000 });
  await expect(welcome(page)).toBeVisible({ timeout: 8000 });
  await expect(welcome(page).getByText('Your dugout scorebook.')).toBeVisible();
});

test.describe('with Reduce Motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('setup end to end, then the basics tour, then the team', async ({ page }) => {
    await freshApp(page, { welcome: true });
    // Reduce Motion: PLAY BALL! stands still; the tap goes straight to the welcome (Steve, Nov 25).
    await page.getByRole('button', { name: 'PLAY BALL!' }).click();
    await expect(welcome(page)).toBeVisible();
    await welcome(page).getByRole('button', { name: 'Set Up My Team' }).click();
    await expect(setup(page).getByRole('heading', { name: 'Name Your Team' })).toBeVisible();
    await setup(page).getByLabel('Team Name').fill('Thunder');
    await setup(page).getByLabel('Short Name').fill('thu');
    await expect(setup(page).locator('.tm-bug')).toContainText('THU');
    await next(page);
    await setup(page).getByRole('radio', { name: 'Maroon' }).first().click();
    await next(page);
    await setup(page).getByRole('button', { name: /^Scorekeeper Mode/ }).click();
    await next(page);
    await expect(setup(page).getByLabel('Rule Set')).toBeVisible();
    await next(page);
    await setup(page).getByRole('button', { name: 'Blue Pen' }).click();
    await next(page);
    // Return adds the next player.
    await setup(page).getByLabel('Name', { exact: true }).fill('Steve');
    await setup(page).getByLabel('Name', { exact: true }).press('Enter');
    await setup(page).getByLabel('Name', { exact: true }).nth(1).fill('Pat');
    await next(page);
    await expect(setup(page).getByRole('heading', { name: 'Ready to Play Ball' })).toBeVisible();
    await expect(setup(page).locator('.wl-summary')).toContainText('Thunder · 2 players');
    await expect(setup(page).locator('.wl-summary')).toContainText('Scorekeeper Mode');
    await expect(setup(page).locator('.wl-summary')).toContainText('blue pen');
    await setup(page).getByRole('button', { name: 'Go to My Team' }).click();

    // The basics tour runs, switching tabs itself, and skips what isn't on screen yet.
    const card = page.locator('.tr-card');
    // The count counts only the cards that show (Steve, Nov 25).
    await expect(card).toContainText(/The Basics · 1 of [1-9]$|The Basics · 1 of [1-9]\D/);
    const total = Number((await card.locator('.tr-count').textContent())!.match(/of (\d+)/)![1]);
    for (let i = 0; i < 12 && (await card.count()); i++) {
      if (i === total - 1) await expect(card.locator('.tr-count')).toHaveText(`The Basics · ${total} of ${total}`);
      const button = card.getByRole('button', { name: /^(Next|Done)$/ });
      await button.click();
    }
    await expect(card).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Thunder' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Steve/ })).toBeVisible();
    // Finished tours get a ✓.
    await page.getByRole('tab', { name: 'Game' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: /^Tutorials/ }).click();
    await expect(page.getByRole('button', { name: /^The Basics ✓/ })).toBeVisible();
    // A finished setup doesn't come back on the next launch.
    await page.reload();
    await expect(welcome(page)).toHaveCount(0);
  });

  test('Look Around with Sample Data First, and Skip Setup', async ({ page }) => {
    await freshApp(page, { welcome: true });
    await playBall(page);
    await welcome(page).getByRole('button', { name: 'Look Around with Sample Data First' }).click();
    await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
    await page.reload();
    await expect(welcome(page)).toHaveCount(0);

    await freshApp(page, { welcome: true });
    await playBall(page);
    await welcome(page).getByRole('button', { name: 'Set Up My Team' }).click();
    await setup(page).getByRole('button', { name: 'Skip Setup' }).click();
    await expect(page.getByRole('tab', { name: 'Team' })).toHaveAttribute('aria-selected', 'true');
    await page.reload();
    await expect(welcome(page)).toHaveCount(0);
  });

  test('Run the Welcome Setup Again from Settings', async ({ page }) => {
    await freshApp(page);
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: /^Run the Welcome Setup Again/ }).click();
    await expect(welcome(page)).toBeVisible();
    await welcome(page).getByRole('button', { name: 'Close' }).click();
    await expect(welcome(page)).toHaveCount(0);
  });
});

test.describe('in Safari on iPhone', () => {
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1', reducedMotion: 'reduce' });

  test('the Add to Home Screen guide comes first, once', async ({ page }) => {
    await freshApp(page, { welcome: true });
    const guide = page.getByRole('dialog', { name: 'Add ScoreKept to Your Home Screen' });
    await expect(guide).toBeVisible();
    // iOS 26 (Safari 26): the More button, •••, beside the address bar (Steve, Nov 25).
    await expect(guide).toContainText('Tap ••• beside the address bar.');
    await expect(guide.locator('.hs-draw')).toHaveCount(4);
    await checks(page);
    await guide.getByRole('button', { name: 'Close' }).click();
    await playBall(page);
    await expect(welcome(page)).toBeVisible();
    await welcome(page).getByRole('button', { name: 'Set Up My Team' }).click();
    await setup(page).getByRole('button', { name: 'Skip Setup' }).click();
    await page.reload();
    await expect(guide).toHaveCount(0);
    await page.getByRole('tab', { name: 'Game' }).click();
    // It's in Settings for later.
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('button', { name: /^Add to Home Screen/ })).toBeVisible();
  });
});

test('the weekly backup reminder: on Team, never on Game, and Not Now hides it', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Restore from Backup').click();
  const fixture = readFileSync(new URL('../fixtures/v1-backup-made-up.json', import.meta.url), 'utf8');
  await restoreFile(page, 'scorekept-backup-2026-10-08.json', fixture);
  await page.getByRole('dialog', { name: 'Backup & Restore' }).getByRole('button', { name: 'Close' }).click();
  const nudge = page.getByRole('complementary', { name: 'Backup Reminder' });
  await expect(nudge).toBeHidden();
  await page.getByRole('tab', { name: 'Team' }).click();
  await expect(nudge).toBeVisible();
  await nudge.getByRole('button', { name: 'Not Now' }).click();
  await expect(nudge).toBeHidden();
  await page.getByRole('tab', { name: 'Stats' }).click();
  await expect(nudge).toBeHidden();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme, reducedMotion: 'reduce' });

    test('welcome, every setup step, and the tour card: contrast, taps, words', async ({ page }) => {
      await freshApp(page, { welcome: true });
      // The still PLAY BALL! screen passes too, then the welcome.
      await checks(page);
      await playBall(page);
      await checks(page);
      await page.screenshot({ path: `test-results/welcome-${colorScheme}.png` });
      await welcome(page).getByRole('button', { name: 'Set Up My Team' }).click();
      for (let step = 0; step < 7; step++) {
        await checks(page);
        if (step === 0) await page.screenshot({ path: `test-results/setup-${colorScheme}.png` });
        if (step < 6) await next(page);
      }
      await setup(page).getByRole('button', { name: 'Go to My Team' }).click();
      await expect(page.locator('.tr-card')).toBeVisible();
      // The tour just switched tabs: let the tab's gold pill finish fading in.
      await page.waitForTimeout(400);
      await checks(page);
      await page.screenshot({ path: `test-results/tour-${colorScheme}.png` });
    });
  });
}

test('the intro: PLAY BALL! screen passes the checks', async ({ page }) => {
  await freshApp(page, { welcome: true });
  await expect(page.getByRole('button', { name: 'PLAY BALL!' })).toBeVisible();
  expect(await tapTargetProblems(page)).toEqual([]);
  expect(await contrastProblems(page)).toEqual([]);
  await page.screenshot({ path: 'test-results/intro.png' });
});

test.describe('the install steps follow the iPhone’s release (Steve, Nov 25)', () => {
  const ua = (v: string) => `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Mobile/15E148 Safari/604.1`;
  for (const [version, first, drawings] of [
    ['27.1', 'Tap ≡ at the left of the address bar.', 4],
    ['26.1', 'Tap ••• beside the address bar.', 4],
    ['18.6', 'Tap Share in Safari’s toolbar.', 3],
  ] as const) {
    test.describe(`Safari ${version}`, () => {
      test.use({ userAgent: ua(version), reducedMotion: 'reduce' });
      test(`step 1 is “${first}”, with a drawing per step`, async ({ page }) => {
        await freshApp(page, { welcome: true });
        const guide = page.getByRole('dialog', { name: 'Add ScoreKept to Your Home Screen' });
        await expect(guide.locator('.hs-step').first()).toContainText(first);
        await expect(guide.locator('.hs-draw')).toHaveCount(drawings);
        await expect(guide).toContainText('Add to Home Screen');
        if (version !== '18.6') await expect(guide).toContainText('Open as Web App');
        await checks(page);
      });
    });
  }
});
