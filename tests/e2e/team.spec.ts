import { expect, test, type Page } from '@playwright/test';
import { contrastProblems, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';

/** Set up a small team the way a person would. */
async function setUpTeam(page: Page): Promise<void> {
  await freshApp(page);
  await page.getByRole('tab', { name: 'Team' }).click();
  await key(page, 'Set Up My Team').click();
  const edit = page.getByRole('dialog', { name: 'Edit Team' });
  await edit.getByLabel('Team Name').fill('Diamond Dogs');
  await edit.getByLabel('Short Name').fill('DOGS');
  await edit.getByRole('radio', { name: 'Red' }).first().click();
  await edit.getByRole('button', { name: 'Done' }).click();
  const players: [string, string, string][] = [
    ['Jess Kowalczyk', '6', 'R'],
    ['Moose Dorsey', '2', 'L'],
    ['Travis Pruitt Jr.', '1', 'R'],
    ['Dev Raman', '3', 'L'],
    ['Cody Wendt', '4', 'R'],
    ['Becca Lindqvist', '5', 'L'],
    ['Kim Tso', '7', 'R'],
    ['Tasha Greer', '10', 'L'],
    ['Shannon O’Malley', '9', 'R'],
  ];
  for (const [name, pos, bats] of players) {
    await key(page, '+ Add Player').click();
    const ed = page.getByRole('dialog', { name: 'New Player' });
    await ed.getByLabel('Name', { exact: true }).fill(name);
    await ed.getByLabel('Main Position').selectOption(pos);
    await ed.getByRole('button', { name: bats === 'L' ? 'Left' : 'Right', exact: true }).click();
    await ed.getByRole('button', { name: 'Done' }).click();
  }
}

async function toLineup(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Game' }).click();
  await key(page, 'New Game').click();
  await page.getByRole('dialog', { name: 'New Game' }).getByRole('button', { name: 'Next', exact: true }).click();
}

test('Team tab: set up a team, its colors, and players', async ({ page }) => {
  await setUpTeam(page);
  await expect(page.getByRole('heading', { name: 'Diamond Dogs' })).toBeVisible();
  await expect(page.locator('.tm-badge')).toHaveText('DOGS');
  await expect(page.getByText(/Red and Red · 9 players/)).toBeVisible();
  await page.getByRole('button', { name: /^Jess Kowalczyk/ }).click();
  await expect(page.getByRole('dialog', { name: 'Jess Kowalczyk' })).toContainText('SS');
  await page.getByRole('button', { name: 'Edit Player' }).click();
  await page.getByRole('button', { name: '4 stars' }).click();
  await page.getByRole('dialog', { name: 'Edit Player' }).getByRole('button', { name: 'Done' }).click();
});

test('Big League Colors sets both colors and drops its label when changed by hand', async ({ page }) => {
  await setUpTeam(page);
  await key(page, 'Edit Team').click();
  const edit = page.getByRole('dialog', { name: 'Edit Team' });
  await edit.getByRole('button', { name: 'SD Brown/Gold' }).click();
  await expect(edit.locator('.tm-preview-look')).toHaveText('SD Brown/Gold');
  await edit.getByRole('radio', { name: 'Navy' }).first().click();
  await expect(edit.locator('.tm-preview-look')).toHaveText('');
});

test('reserves get a Text button asking about the next game', async ({ page }) => {
  await setUpTeam(page);
  await key(page, '+ Add Reserve').click();
  const ed = page.getByRole('dialog', { name: 'New Player' });
  await ed.getByLabel('Name', { exact: true }).fill('Pat Sub');
  await ed.getByLabel('Phone').fill('970-555-0100');
  await ed.getByRole('button', { name: 'Done' }).click();
  const text = page.getByRole('link', { name: 'Text' });
  await expect(text).toHaveAttribute('href', /^sms:9705550100&body=Can%20you%20sub/);
});

test('lineup builder: groups, first open position, (taken), Suggest Order, and the order check', async ({ page }) => {
  await setUpTeam(page);
  await toLineup(page);
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  await expect(sheet.getByRole('region', { name: 'Pitchers' })).toBeVisible();
  await sheet.getByRole('button', { name: /^Jess Kowalczyk/ }).click();
  await sheet.getByRole('button', { name: /^Travis Pruitt Jr./ }).click();
  await expect(sheet.getByRole('list', { name: 'Batting Order' }).getByRole('listitem')).toHaveCount(2);
  await expect(sheet.getByLabel('Position for Travis Pruitt Jr.').locator('option[value="6"]')).toHaveText('SS (taken)');
  await expect(sheet.locator('.ng-checks')).toContainText('2 batting. Fort Collins needs at least 8 to start.');
  await sheet.getByRole('button', { name: 'Auto-Fill' }).click();
  await expect(sheet.locator('.ng-count')).toContainText('Batting 9');
  await sheet.getByRole('button', { name: 'Suggest Order' }).click();
  await expect(sheet.getByRole('list', { name: 'Batting Order' }).getByRole('listitem')).toHaveCount(9);
});

test('lineup builder: Move Up from a name, and drag ☰ with a finger', async ({ page }) => {
  await setUpTeam(page);
  await toLineup(page);
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  await sheet.getByRole('button', { name: 'Auto-Fill' }).click();
  const names = () => sheet.locator('.ng-order-name').allTextContents();
  const before = await names();
  await sheet.locator('.ng-order-name').nth(1).click();
  await page.getByRole('button', { name: 'Move Up' }).click();
  expect((await names()).slice(0, 2)).toEqual([`1. ${before[1]!.slice(3)}`, `2. ${before[0]!.slice(3)}`]);
  const handle = sheet.locator('.ng-handle').first();
  const box = (await handle.boundingBox())!;
  const rowH = (await sheet.locator('.ng-order-row').first().boundingBox())!.height + 6;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + rowH * 2, { steps: 8 });
  await page.mouse.up();
  const after = await names();
  expect(after[2]!.slice(3)).toBe(before[1]!.slice(3));
  await expect(page.getByRole('dialog', { name: 'Move Up' })).toHaveCount(0);
});

test('Who’s Here: someone out isn’t in the lineup, and Add Back brings them in', async ({ page }) => {
  await setUpTeam(page);
  await page.getByRole('tab', { name: 'Game' }).click();
  await key(page, 'New Game').click();
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  await expect(sheet.locator('.ng-count')).toHaveText('9 of 9 Here');
  await sheet.getByRole('button', { name: /^Dev Raman/ }).click();
  await expect(sheet.locator('.ng-count')).toHaveText('8 of 9 Here');
  await sheet.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(sheet.getByRole('button', { name: /^Dev Raman,/ })).toHaveCount(0);
  await sheet.getByRole('button', { name: /^Dev Raman Add Back/ }).click();
  await expect(sheet.getByRole('button', { name: /^Dev Raman,/ })).toBeVisible();
});

test('a position someone has can’t be picked twice; EH can', async ({ page }) => {
  await setUpTeam(page);
  await toLineup(page);
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  await sheet.getByRole('button', { name: 'Auto-Fill' }).click();
  const casey = sheet.getByLabel('Position for Travis Pruitt Jr.');
  await expect(casey.locator('option[value="2"]')).toBeDisabled();
  await expect(casey.locator('option[value="EH"]')).toBeEnabled();
  await casey.selectOption('EH');
  await sheet.getByLabel('Position for Moose Dorsey').selectOption('EH');
  await expect(sheet.getByLabel('Position for Jess Kowalczyk').locator('option[value="2"]')).toBeEnabled();
  await expect(sheet.locator('.ng-chip.ng-open')).toContainText(['P', 'C']);
});

test('schedule: add a game, it’s Up Next, and Start This Game fills in New Game', async ({ page }) => {
  await setUpTeam(page);
  await key(page, '+ Add a Game').click();
  const add = page.getByRole('dialog', { name: 'Add a Game' });
  await add.getByLabel('Date').fill('2099-06-02');
  await add.getByLabel('Opponent').fill('Horsetooth Hackers');
  await add.getByLabel('Park & Field').fill('Rolland Moore Park #3');
  await add.getByRole('button', { name: 'Home', exact: true }).click();
  await add.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /vs Horsetooth Hackers/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Game' }).click();
  const upNext = page.getByRole('region', { name: 'Up Next' });
  await expect(upNext).toContainText('vs Horsetooth Hackers');
  await upNext.getByRole('button', { name: 'Start This Game' }).click();
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  for (const _ of [0, 1]) await sheet.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(sheet.getByLabel('Opponent')).toHaveValue('Horsetooth Hackers');
  await sheet.getByRole('button', { name: 'Back', exact: true }).click();
  await sheet.getByRole('button', { name: 'Auto-Fill' }).click();
  for (const _ of [0, 1]) await sheet.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(sheet.locator('.ng-reminder')).toHaveText('The schedule has you at home.');
  await sheet.getByRole('button', { name: 'We’re Home (Bat Second)' }).click();
  await page.getByRole('tab', { name: 'Team' }).click();
  await expect(page.getByRole('button', { name: /vs Horsetooth Hackers/ })).toContainText('Live');
});

test('New Season suggests the next one and refuses a duplicate', async ({ page }) => {
  await setUpTeam(page);
  await key(page, '+ Add a Game').click();
  await page.getByRole('dialog', { name: 'Add a Game' }).getByRole('button', { name: 'Save' }).click();
  await key(page, 'New Season').click();
  const sheet = page.getByRole('dialog', { name: 'New Season' });
  await sheet.getByRole('button', { name: 'Start Season' }).click();
  await expect(sheet).toHaveCount(0);
  await key(page, 'New Season').click();
  const again = page.getByRole('dialog', { name: 'New Season' });
  const current = await page.locator('.tm-section').last().locator('.sk-row-label').first().textContent();
  const [term, year] = current!.split(' ');
  await again.getByRole('button', { name: term!, exact: true }).click();
  await again.getByLabel('Year').selectOption(year!);
  await again.getByRole('button', { name: 'Start Season' }).click();
  await expect(again.getByRole('status')).toHaveText('That season already exists.');
});

test('mid-game: a sub from the bench takes the spot', async ({ page }) => {
  await setUpTeam(page);
  await toLineup(page);
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  await sheet.getByRole('button', { name: /^Jess Kowalczyk/ }).click();
  await sheet.getByRole('button', { name: /^Moose Dorsey/ }).click();
  for (const _ of [0, 1]) await sheet.getByRole('button', { name: 'Next', exact: true }).click();
  await sheet.getByRole('button', { name: 'We’re Visitors (Bat First)' }).click();
  await page.getByRole('button', { name: 'Lineups' }).click();
  await page.getByRole('button', { name: 'Substitute for Moose Dorsey' }).click();
  await page.getByRole('button', { name: 'Dev Raman', exact: true }).click();
  await page.getByRole('dialog', { name: 'Lineups' }).getByRole('button', { name: 'Done' }).click();
  await key(page, 'Single').click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.locator('.gm-batter')).toHaveText('Dev Raman');
});

test('Game Settings: change a rule mid-game, it shows Custom, and Save as Rule Set keeps it', async ({ page }) => {
  await setUpTeam(page);
  await toLineup(page);
  const sheet = page.getByRole('dialog', { name: 'New Game' });
  await sheet.getByRole('button', { name: 'Auto-Fill' }).click();
  for (const _ of [0, 1]) await sheet.getByRole('button', { name: 'Next', exact: true }).click();
  await sheet.getByRole('button', { name: 'We’re Visitors (Bat First)' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const gs = page.getByRole('dialog', { name: 'Game Settings' });
  await gs.getByText('League Rules for This Game').click();
  await gs.getByLabel('Innings', { exact: true }).selectOption('6');
  await expect(gs.getByLabel('Rule Set', { exact: true })).toHaveValue('custom');
  await gs.getByLabel('New Rule Set Name').fill('Six Innings');
  await gs.getByRole('button', { name: 'Save as Rule Set' }).click();
  await expect(gs.getByLabel('Rule Set', { exact: true }).locator('option:checked')).toHaveText('Six Innings');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme });

    test('Team tab, Edit Team, and the player editor: contrast, taps, words', async ({ page }) => {
      await setUpTeam(page);
      for (const open of [
        async () => undefined,
        async () => key(page, 'Edit Team').click(),
        async () => page.getByRole('button', { name: /^Jess Kowalczyk/ }).click().then(() => page.getByRole('button', { name: 'Edit Player' }).click()),
      ]) {
        await open();
        expect(await contrastProblems(page)).toEqual([]);
        expect(await tapTargetProblems(page)).toEqual([]);
        expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
        const close = page.getByRole('button', { name: 'Close' });
        if (await close.count()) await close.last().click();
      }
    });

    test('every New Game step: contrast, taps, words', async ({ page }) => {
      await setUpTeam(page);
      await page.getByRole('tab', { name: 'Game' }).click();
      await key(page, 'New Game').click();
      const sheet = page.getByRole('dialog', { name: 'New Game' });
      for (let step = 0; step < 4; step++) {
        if (step === 1) await sheet.getByRole('button', { name: 'Auto-Fill' }).click();
        if (step === 2) await sheet.getByText('League Rules', { exact: true }).click();
        expect(await contrastProblems(page)).toEqual([]);
        expect(await tapTargetProblems(page)).toEqual([]);
        expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
        if (step < 3) await sheet.getByRole('button', { name: 'Next', exact: true }).click();
      }
    });
  });
}
