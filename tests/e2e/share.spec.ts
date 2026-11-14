import { expect, test, type Page, type Route } from '@playwright/test';
import { contrastProblems, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';
import { emptyData, newTeam } from '../../src/store/model.ts';

const HOOK = 'https://discord.com/api/webhooks/123456789/abcDEF-ghi';

// Once the offline copy (service worker) takes over a page, WebKit's test
// harness can't see its outgoing requests, so the fake Discord would miss them.
// These tests don't need the offline copy.
test.use({ serviceWorkers: 'block' });

async function sample(page: Page): Promise<void> {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
}

/** Discord, faked: every post is recorded and answered 204, so tests never post anywhere. */
async function fakeDiscord(page: Page): Promise<{ bodies: string[]; types: string[] }> {
  const seen = { bodies: [] as string[], types: [] as string[] };
  await page.route('https://discord.com/**', async (route: Route) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'content-type' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    seen.bodies.push(route.request().postData() ?? '');
    seen.types.push(route.request().headers()['content-type'] ?? '');
    await route.fulfill({ status: 204, headers: cors });
  });
  return seen;
}

test('Share Recap from the Book: Recap and Scorecard pictures, and the text', async ({ page }) => {
  await sample(page);
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Share Recap' });
  const img = share.getByRole('img');
  await expect(img).toHaveAttribute('alt', /^Recap picture: Top 4th|^Recap picture: Bottom 4th/);
  expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBe(1080);
  await share.getByRole('button', { name: 'Scorecard' }).click();
  await expect(img).toHaveAttribute('alt', /^Scorecard picture/);
  await share.getByText('The Text').click();
  await expect(share.locator('.sr-text')).toContainText('```');
  await expect(share.locator('.sr-text')).toContainText('Diamond Dogs');
  // No Discord link yet: no Post to Discord.
  await expect(share.getByRole('button', { name: 'Post to Discord' })).toBeHidden();
});

test('Discord: a wrong link is caught; Save & Test posts; Post to Discord sends the picture and text', async ({ page }) => {
  const seen = await fakeDiscord(page);
  await sample(page);
  await page.getByRole('tab', { name: 'Team' }).click();
  await page.getByRole('tab', { name: 'Game' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'All Settings' }).click();
  await page.getByRole('button', { name: /^Discord/ }).click();
  const d = page.getByRole('dialog', { name: 'Discord' });
  await expect(d.getByRole('heading', { name: 'Discord' })).toBeFocused();
  await d.getByLabel('Game Updates Channel').fill('https://example.com/not-a-hook');
  await d.getByRole('button', { name: 'Save & Test' }).click();
  await expect(d.getByRole('status')).toContainText('doesn’t look like a Discord webhook link');
  await d.getByLabel('Game Updates Channel').fill(HOOK);
  await d.getByRole('button', { name: 'Save & Test' }).click();
  await expect(d.getByRole('status')).toContainText('Game updates: connected ✓');
  expect(seen.bodies[0]).toContain('ScoreKept is connected');
  await d.getByRole('button', { name: 'Done' }).click();
  // The links aren't in the season's saved data (so never in a backup).
  expect(await page.evaluate(() => localStorage.getItem('scorekept:data')?.includes('webhooks'))).toBe(false);

  const close = page.getByRole('button', { name: 'Close' });
  while (await close.count()) await close.last().click();
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const share = page.getByRole('dialog', { name: 'Share Recap' });
  await share.getByRole('button', { name: 'Post to Discord' }).click();
  await expect(share.getByRole('status')).toContainText('Posted to your game channel.');
  expect(seen.types[1]).toContain('multipart/form-data');
  expect(seen.bodies[1]).toContain('Diamond Dogs');
});

test('Who’s In? Poll on the Up Next card: a real Discord poll, then ✓ Poll Posted', async ({ page }) => {
  const seen = await fakeDiscord(page);
  await page.goto('./');
  const tomorrow = new Date(Date.now() + 86_400_000);
  const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const team = newTeam('t1', 'Diamond Dogs');
  team.schedule = [{ id: 's1', seasonId: 'x', date: iso, time: '18:30', opponent: 'Horsetooth Hackers', park: 'Rolland Moore Park #2', side: null }];
  const doc = JSON.stringify({ ...emptyData(), onboarded: true, teams: [team], activeTeamId: 't1' });
  await page.evaluate(
    ([d, hook]) => {
      localStorage.clear();
      localStorage.setItem('scorekept:data', d!);
      localStorage.setItem('scorekept:seen:homescreen', '1');
      localStorage.setItem('scorekept:discord', JSON.stringify({ polls: hook }));
    },
    [doc, HOOK],
  );
  await page.reload();
  const card = page.getByRole('region', { name: 'Up Next' });
  await card.getByRole('button', { name: 'Who’s In? Poll' }).click();
  await expect(card.getByRole('button', { name: '✓ Poll Posted' })).toBeVisible();
  const poll = JSON.parse(seen.bodies[0]!) as { poll: { question: { text: string }; answers: { poll_media: { text: string } }[]; duration: number } };
  expect(poll.poll.question.text).toMatch(/^Who’s in\? .+ at 6:30 PM vs Horsetooth Hackers$/);
  expect(poll.poll.answers.map((a) => a.poll_media.text)).toEqual(['In', 'Out']);
  expect(poll.poll.duration).toBeGreaterThanOrEqual(1);
  await page.reload();
  await expect(card.getByRole('button', { name: '✓ Poll Posted' })).toBeVisible();
});

test('lights: our home run turns on the Book’s stadium lights in Scorekeeper Mode', async ({ page }) => {
  await sample(page);
  await page.getByRole('button', { name: /^Home Run(,|$)/ }).click();
  await page.getByRole('dialog', { name: 'Home Run' }).getByRole('button', { name: 'Over the Fence' }).click();
  const skip = page.getByRole('button', { name: 'Skip' });
  if (await skip.count()) await skip.click();
  await expect(page.locator('html')).toHaveAttribute('data-lights', 'homerun');
  await page.getByRole('tab', { name: 'Book' }).click();
  const glow = page.locator('.bk-glow').first();
  await expect.poll(async () => Number(await glow.evaluate((e) => getComputedStyle(e).opacity))).toBeGreaterThan(0.4);
  // The next play turns them off.
  await page.getByRole('tab', { name: 'Game' }).click();
  await page.getByRole('button', { name: 'Single', exact: true }).click();
  if (await skip.count()) await skip.click();
  await expect(page.locator('html')).not.toHaveAttribute('data-lights', 'homerun');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme });

    test('Share Recap and Discord: contrast, taps, words', async ({ page }) => {
      await sample(page);
      await page.getByRole('tab', { name: 'Book' }).click();
      await page.getByRole('button', { name: 'Share', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Share Recap' }).getByRole('img')).toHaveAttribute('alt', /Recap picture/);
      for (const check of [contrastProblems, tapTargetProblems]) expect(await check(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
      expect(await sideScroll(page)).toBe(0);
      await page.getByRole('dialog', { name: 'Share Recap' }).getByRole('img').screenshot({ path: `test-results/recap-${colorScheme}.png` });
      await page.getByRole('dialog', { name: 'Share Recap' }).getByRole('button', { name: 'Done' }).click();
      await page.getByRole('tab', { name: 'Game' }).click();
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'All Settings' }).click();
      await page.getByRole('button', { name: /^Discord/ }).click();
      for (const check of [contrastProblems, tapTargetProblems]) expect(await check(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
    });
  });
}
