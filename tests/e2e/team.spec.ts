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
  await edit.getByRole('button', { name: 'Close' }).click();
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
  await expect(page.locator('.tm-head .tm-pennant text')).toHaveText('DOGS');
  await expect(page.locator('.tm-head-line')).toHaveText('9 players');
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
  // One menu, like the first build (Nov 14): picking a look sets both colors.
  const menu = edit.getByLabel('Big League Colors');
  await menu.selectOption('SD Brown/Gold');
  await expect(edit.getByRole('radio', { name: 'Brown' }).first()).toHaveAttribute('aria-checked', 'true');
  await edit.getByRole('button', { name: /^Secondary: / }).click();
  await expect(edit.getByRole('radio', { name: 'Gold' })).toHaveAttribute('aria-checked', 'true');
  // A color picked by hand drops the look.
  await edit.getByRole('radio', { name: 'Navy' }).click();
  await expect(menu).toHaveValue('');
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
  await page.getByRole('dialog', { name: 'Lineups' }).getByRole('button', { name: 'Close' }).click();
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

test('Edit Team: the ✕ is the one way out, names share a row, and all 18 colors show at once', async ({ page }) => {
  await setUpTeam(page);
  await key(page, 'Edit Team').click();
  const edit = page.getByRole('dialog', { name: 'Edit Team' });
  await expect(edit.locator('.sh-foot')).toHaveCount(0);
  await expect(edit.getByRole('button', { name: 'Done' })).toHaveCount(0);
  const name = (await edit.getByLabel('Team Name').boundingBox())!;
  const short = (await edit.getByLabel('Short Name').boundingBox())!;
  expect(Math.abs(name.y - short.y)).toBeLessThan(2);
  expect(name.width).toBeGreaterThan(short.width * 1.6);
  const swatches = edit.getByRole('radiogroup', { name: 'Primary Color' }).getByRole('radio');
  await expect(swatches).toHaveCount(18);
  for (const s of await swatches.all()) await expect(s).toBeInViewport();
  const rows = new Set(await swatches.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top))));
  expect(rows.size).toBe(3);
  await edit.getByRole('button', { name: 'Close' }).click();
  await expect(edit).toHaveCount(0);
});

test('the felt pennant carries both team colors on the Team header and in Edit Team; the patch on Settings’ Your Team (Steve, Nov 17)', async ({ page }) => {
  await setUpTeam(page);
  await key(page, 'Edit Team').click();
  const edit = page.getByRole('dialog', { name: 'Edit Team' });
  await edit.getByRole('button', { name: /^Primary: / }).click();
  await edit.getByRole('radio', { name: 'Kelly Green' }).click();
  await edit.getByRole('button', { name: /^Secondary: / }).click();
  await edit.getByRole('radio', { name: 'Gold' }).click();
  const parts = (scope: string) =>
    page.locator(scope).first().evaluate((svg) => ({
      felt: svg.querySelector('.tm-mark-felt')!.getAttribute('fill'),
      stripe: svg.querySelector('.tm-mark-stripe')!.getAttribute('fill'),
      letters: svg.querySelector('text')!.textContent,
    }));
  // Kelly Green felt, a Gold staff stripe; the old rounded badge is gone.
  const want = { felt: '#1f9d48', stripe: '#e3b23c', letters: 'DOGS' };
  expect(await parts('.tm-bug .tm-pennant')).toEqual(want);
  await edit.getByRole('button', { name: 'Close' }).click();
  expect(await parts('.tm-head .tm-pennant')).toEqual(want);
  await expect(page.locator('.tm-badge')).toHaveCount(0);
  // The header line is just the roster size: the pennant shows the colors.
  await expect(page.locator('.tm-head .tm-dot')).toHaveCount(0);
  await expect(page.locator('.tm-head-line')).toHaveText(/^\d+ players?$/);
  // The patch: Settings, Your Team.
  await page.getByRole('tab', { name: 'Game' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' }).getByRole('button', { name: /^Your Team/ }).locator('.tm-patch')).toHaveCount(1);
});

test('Team is a roster card: + adds a team, the name switches teams, the number shows once (Steve, Nov 16)', async ({ page }) => {
  await setUpTeam(page);
  const panel = page.locator('#tab-team');
  // The number once, in its block; positions and bats under the name.
  const subs = await panel.locator('.tm-sheet .tm-player-sub').allTextContents();
  expect(subs.length).toBeGreaterThan(0);
  for (const t of subs) expect(t).not.toContain('#');
  // The colors line in the athletic face.
  expect(await panel.locator('.tm-head-line').evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/Barlow Condensed/);
  // No Switch or Add Team buttons in the head; + in the header adds a team.
  await expect(panel.getByRole('button', { name: 'Switch Team' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Add Team' }).click();
  const add = page.getByRole('dialog', { name: 'Add Team' });
  const field = add.getByLabel('Team Name');
  await field.fill('Second Shift');
  // WebKit sometimes moves focus to the sheet's title just after it opens; make sure the name took.
  await expect(async () => {
    if ((await field.inputValue()) !== 'Second Shift') await field.fill('Second Shift');
    expect(await field.inputValue()).toBe('Second Shift');
  }).toPass();
  await add.getByRole('button', { name: 'Add Team' }).click();
  await expect(panel.locator('.tm-name').first()).toContainText('Second Shift');
  // With two teams, the name is the iPhone's own menu.
  const switcher = panel.getByRole('combobox', { name: /^Switch Team/ });
  await switcher.selectOption({ label: 'Diamond Dogs' });
  await expect(panel.locator('.tm-name').first()).toContainText('Diamond Dogs');
});

test('every pennant’s outline reaches 3:1 on its page in both appearances, for every team color (Steve, Nov 17)', async ({ page }) => {
  const names = ['Navy', 'Royal Blue', 'Columbia Blue', 'Teal', 'Red', 'Cardinal', 'Maroon', 'Pink', 'Orange', 'Gold', 'Yellow', 'Kelly Green', 'Forest Green', 'Purple', 'Black', 'Silver', 'White', 'Brown'];
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await setUpTeam(page);
    const problems: string[] = [];
    for (const name of names) {
      await key(page, 'Edit Team').click();
      const edit = page.getByRole('dialog', { name: 'Edit Team' });
      await edit.getByRole('button', { name: /^Primary: / }).click();
      await edit.getByRole('radio', { name, exact: true }).click();
      await edit.getByRole('button', { name: 'Close' }).click();
      const seen = await page.evaluate(() => {
        const rgb = (s: string) => {
          if (s.startsWith('#')) {
            const n = parseInt(s.slice(1), 16);
            return [n >> 16, (n >> 8) & 255, n & 255, 1];
          }
          const m = (s.match(/[\d.]+/g) ?? []).map(Number);
          return [m[0] ?? 0, m[1] ?? 0, m[2] ?? 0, m.length > 3 ? m[3]! : 1];
        };
        const lum = (c: number[]) => {
          const v = c.slice(0, 3).map((x) => {
            const y = x / 255;
            return y <= 0.03928 ? y / 12.92 : ((y + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
        };
        const ratio = (a: number[], b: number[]) => {
          const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
          return (x! + 0.05) / (y! + 0.05);
        };
        const pageBg = rgb(getComputedStyle(document.body).backgroundColor);
        const svg = document.querySelector('.tm-head .tm-mark')!;
        const felt = rgb(svg.querySelector('.tm-mark-felt')!.getAttribute('fill')!);
        const edge = rgb(getComputedStyle(svg.querySelector('.tm-mark-edge')!).stroke);
        return { felt: ratio(felt, pageBg), edge: edge[3]! > 0 ? ratio(edge, pageBg) : 0 };
      });
      if (seen.edge < 3) problems.push(`${scheme} ${name}: outline ${seen.edge.toFixed(2)}:1`);
    }
    expect(problems).toEqual([]);
  }
});

test('the player card: the season table fits at 375 with Season pinned, rows in the athletic face (Steve, Nov 17)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 759 });
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Team' }).click();
  await page.locator('.tm-sheet .tm-player').first().click();
  const card = page.getByRole('dialog').last();
  const got = await card.evaluate((d) => {
    const wrap = d.querySelector<HTMLElement>('.st-table-wrap')!;
    const font = (sel: string) => getComputedStyle(d.querySelector(sel)!).fontFamily;
    return { fits: wrap.scrollWidth <= wrap.clientWidth + 1, pinned: getComputedStyle(d.querySelector('.pc-table .st-name')!).position, list: font('.pc-list li'), table: font('.pc-table td') };
  });
  expect(got.fits).toBe(true);
  expect(got.pinned).toBe('sticky');
  expect(got.list).toMatch(/Barlow Condensed/);
  expect(got.table).toMatch(/Barlow Condensed/);
  await card.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('tab', { name: 'Scout' }).click();
  expect(await page.locator('.sc-team-sub').first().evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/Barlow Condensed/);
});

test('opponents are saved teams with colors: set them in Game Settings, and Scout flies them (Steve, Nov 17)', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const gs = page.getByRole('dialog', { name: 'Game Settings' });
  await gs.getByRole('button', { name: /^Opponent Colors/ }).click();
  const sheet = page.getByRole('dialog', { name: /Colors$/ });
  await sheet.getByRole('button', { name: /^Primary: / }).click();
  await sheet.getByRole('radio', { name: 'Kelly Green', exact: true }).click();
  await sheet.getByRole('button', { name: /^Secondary: / }).click();
  await sheet.getByRole('radio', { name: 'Gold', exact: true }).click();
  await expect(sheet.locator('.tm-pennant .tm-mark-felt')).toHaveAttribute('fill', '#1f9d48');
  for (const c = page.getByRole('button', { name: 'Close', exact: true }); await c.count(); ) await c.last().click();
  await page.getByRole('tab', { name: 'Scout' }).click();
  const row = page.getByRole('button', { name: /Poudre River Rats/ });
  await expect(row.locator('.tm-patch .tm-mark-felt')).toHaveAttribute('fill', '#1f9d48');
  await expect(row.locator('.tm-patch .tm-mark-stripe').first()).toHaveAttribute('fill', '#e3b23c');
  await row.click();
  await expect(page.getByRole('dialog', { name: 'Poudre River Rats' }).locator('.sc-head .tm-pennant')).toHaveCount(1);
});
