import { expect, test, type Page } from '@playwright/test';
import { replay } from '../../src/engine/replay.ts';
import { makeBackup } from '../../src/store/backup.ts';
import { emptyData, newTeam } from '../../src/store/model.ts';
import { rules as ruleSet, OURS } from '../helpers/game.ts';
import type { GameEvent } from '../../src/engine/types.ts';
import { FIT_HEADROOM, IPHONE_16, contrastProblems, fontsReady, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { boardWords, freshApp, key, restoreFile, startGame } from '../helpers/app.ts';

const live = (page: Page) => page.locator('.sk-live');

test('a whole game, Dugout Mode, by roles and names only, then Save to Season', async ({ page }) => {
  await freshApp(page);
  await startGame(page, { ruleSet: 'Basic Slowpitch', opponent: 'Horsetooth Hackers' });
  for (let inning = 1; inning <= 7; inning++) {
    for (let n = 0; n < 3; n++) await key(page, 'Strikeout Swinging').click();
    // Ahead after our last at-bat, the home team doesn't bat in the 7th.
    if (inning === 7) break;
    if (inning === 1) await key(page, '+1 Run').click();
    for (let n = 0; n < 3; n++) await key(page, '+1 Out').click();
  }
  await expect(page.getByRole('region', { name: 'Final' })).toContainText('Final. Horsetooth Hackers win 1–0.');
  await expect(live(page)).toContainText('Horsetooth Hackers win 1–0');
  await key(page, 'Save to Season').click();
  const saved = page.getByRole('dialog', { name: 'Saved to Season' });
  await expect(saved).toContainText('L 0–1 vs Horsetooth Hackers');
  await saved.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('heading', { name: 'No Game in Progress' })).toBeVisible();
  await expect(page.locator('.gm-idle-team')).toContainText('0–1');
  // It's really saved: reload and it's still there.
  await page.reload();
  await expect(page.locator('.gm-idle-team')).toContainText('0–1');
});

test('three outs switch sides, and VoiceOver hears each play', async ({ page }) => {
  await freshApp(page);
  await startGame(page, { mode: 'Scorekeeper Mode' });
  await key(page, 'Single').click();
  await expect(live(page)).toHaveText('Player 1 singles.');
  await key(page, 'Grounder').click();
  await key(page, 'Fly Out').click();
  await key(page, 'Pop Out').click();
  await expect(live(page)).toContainText('Side retired. Bottom of the first.');
  expect(await boardWords(page)).toContain('Bottom of the first, 0 outs');
  await expect(page.locator('.gm-batter')).toHaveText('Batter 1');
});

test('Undo takes back the last tap', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  await page.getByRole('button', { name: /^Home Run, / }).click();
  await page.getByRole('dialog', { name: 'Home Run' }).getByRole('button', { name: 'Over the Fence' }).click();
  expect(await boardWords(page)).toContain('My Team 1');
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await boardWords(page)).toContain('My Team 0');
  await expect(live(page)).toHaveText('Undone.');
});

test('dimmed buttons explain themselves and record nothing; situational outs step aside until they can happen', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  const fc = key(page, 'Fielder’s Choice: Runner Out, Batter Safe');
  await expect(fc).toHaveAttribute('aria-disabled', 'true');
  // Still tappable (VoiceOver reads why); the test runner needs force for aria-disabled.
  await fc.click({ force: true });
  await expect(page.locator('.gm-hint')).toHaveText('Needs a runner on base');
  await expect(page.locator('.gm-batter')).toHaveText('Player 1');
  // Streamlined (Steve's pick E): with nobody on, Sac Fly, Double Play, and Triple Play aren't on the pad.
  for (const name of ['Sac Fly', 'Double Play', 'Triple Play', 'Infield Fly Rule']) await expect(key(page, name)).toBeHidden();
  // A runner on first with nobody out: Double Play steps in, sharing the row with Foul Out.
  await key(page, 'Single').click();
  await expect(key(page, 'Double Play')).toBeVisible();
  await expect(key(page, 'Sac Fly')).toBeHidden();
  const [fbo, dp] = await Promise.all([key(page, 'Foul Out').boundingBox(), key(page, 'Double Play').boundingBox()]);
  expect(Math.abs(fbo!.width - dp!.width)).toBeLessThan(2);
  expect(fbo!.y).toBeCloseTo(dp!.y, 0);
  await expect(key(page, 'Infield Fly Rule')).toBeHidden();
  // Runners on first and second, nobody out: the infield fly, double play, and triple play are all possible.
  await key(page, 'Single').click();
  for (const name of ['Infield Fly Rule', 'Double Play', 'Triple Play']) await expect(key(page, name)).toBeVisible();
  await key(page, 'Infield Fly Rule').click();
  await expect(page.locator('.gm-hint')).not.toHaveText(/Needs/);
});

test('runners: advance, and Scored on the Play gives the batter the RBI', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  await key(page, 'Single').click();
  await page.getByRole('button', { name: /^First base, Player 1/ }).click();
  await page.getByRole('button', { name: 'Advance to Second' }).click();
  await expect(page.getByRole('button', { name: /^Second base, Player 1/ })).toBeVisible();
  await key(page, 'Single').click();
  // Player 1 is on third now; the single just happened, so the RBI choice is offered.
  await page.getByRole('button', { name: /^Third base, Player 1/ }).click();
  await page.getByRole('button', { name: 'Scored on the Play (RBI to Player 2)' }).click();
  await expect(live(page)).toHaveText('Player 1 scores. RBI: Player 2.');
  expect(await boardWords(page)).toContain('My Team 1');
});

test('no RBI choice for the runner who just batted', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  await key(page, 'Single').click();
  await page.getByRole('button', { name: /^First base, Player 1/ }).click();
  await expect(page.getByRole('button', { name: /RBI to/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Score', exact: true })).toBeVisible();
});

test('iPad shows the last four plays', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await freshApp(page);
  await startGame(page);
  await key(page, 'Single').click();
  await key(page, 'Double').click();
  await expect(page.getByRole('region', { name: 'Last Plays' }).locator('li').first()).toHaveText('Player 2 doubles.');
});

test('fielder’s choice asks which runner is out', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  await key(page, 'Single').click();
  await key(page, 'Fielder’s Choice: Runner Out, Batter Safe').click();
  await page.getByRole('button', { name: 'Player 1 – Runner from First Out at Second' }).click();
  expect(await boardWords(page)).toContain('1 out');
  await expect(page.getByRole('button', { name: /^First base, Player 2/ })).toBeVisible();
});

test('home run limit: the button counts down, then warns and records an out', async ({ page }) => {
  await freshApp(page);
  await startGame(page, { ruleSet: 'Fort Collins: 1 HR Division' });
  await expect(key(page, 'Home Run, 1 left')).toBeVisible();
  await key(page, 'Home Run, 1 left').click();
  await page.getByRole('button', { name: 'Over the Fence' }).click();
  await key(page, 'Home Run, over the limit: out').click();
  await page.getByRole('dialog', { name: 'Over the Limit' }).getByRole('button', { name: 'Record Home Run Out' }).click();
  expect(await boardWords(page)).toMatch(/My Team 1.*1 out/);
});

test('hit location: tap the field, the nearest fielder gets it, then Save', async ({ page }) => {
  await freshApp(page);
  await startGame(page, { hitLocation: true });
  await key(page, 'Single').click();
  const sheet = page.getByRole('dialog', { name: 'Single: Where Did It Go?' });
  await sheet.getByRole('button', { name: 'Line Drive' }).click();
  const field = sheet.getByRole('img', { name: /The field/ });
  const box = (await field.boundingBox())!;
  // Deep left field: left of center, near the top.
  await page.mouse.click(box.x + box.width * 0.28, box.y + box.height * 0.3);
  await expect(sheet.locator('.fd-where')).toHaveText('Left field (LF)');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(live(page)).toHaveText('Player 1 singles to left field.');
});

test('hit location: Skip, Fielder Buttons, and Pick the Spot from a List', async ({ page }) => {
  await freshApp(page);
  await startGame(page, { hitLocation: true });
  await key(page, 'Grounder').click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(live(page)).toHaveText('Player 1 grounds out.');
  await key(page, 'Grounder').click();
  await page.getByRole('button', { name: 'Fielder Buttons' }).click();
  await page.getByRole('button', { name: 'Shortstop (SS)' }).click();
  await expect(live(page)).toHaveText('Player 2 grounds out to shortstop.');
  await key(page, 'Fly Out').click();
  await page.getByRole('button', { name: 'Pick the Spot from a List' }).click();
  await page.getByRole('button', { name: 'Right field (RF)' }).click();
  await expect(live(page)).toContainText('Player 3 flies out to right field.');
});

test('the count: balls and strikes light the lamps, and the third ball walks', async ({ page }) => {
  await freshApp(page);
  await startGame(page, { count: true });
  // BB stays for the intentional walk; Ball, Strike, Foul carry no small words (Steve, Nov 13).
  await expect(key(page, 'Walk')).toBeVisible();
  await key(page, 'Ball').click();
  await expect(page.locator('.gm-lampset-ball .gm-lamp.on')).toHaveCount(1);
  await key(page, 'Ball').click();
  // Ball four is next: the Ball key turns green.
  await expect(key(page, 'Ball')).toHaveClass(/sk-hit/);
  await key(page, 'Ball').click();
  await expect(live(page)).toHaveText('Player 1 walks.');
  await key(page, 'Strike').click();
  // The next strike is the out (2+ HR Division: two strikes): Strike and Foul turn red, and both still work.
  await expect(key(page, 'Strike')).toHaveClass(/sk-out/);
  await expect(key(page, 'Strike')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(key(page, 'Foul')).toHaveClass(/sk-out/);
  await key(page, 'Foul').click();
  await expect(live(page)).toHaveText('Player 2 fouls out.');
  await key(page, 'Strike').click();
  await key(page, 'Strike').click();
  await expect(live(page)).toContainText('Player 3 strikes out swinging');
});

test('Game Settings: End Game Now, then Play Another Inning', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  await key(page, 'Single').click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'End Game Now' }).click();
  await page.getByRole('dialog', { name: 'End Game Now?' }).getByRole('button', { name: 'End Game' }).click();
  await expect(page.getByRole('region', { name: 'Final' })).toContainText('Game ended. Tied 0–0.');
  await expect(key(page, 'Single')).toBeHidden();
});

test('Game Settings switches modes mid-game', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  for (let n = 0; n < 3; n++) await key(page, 'Strikeout Looking').click();
  await expect(key(page, '+1 Run')).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Scorekeeper Mode' }).click();
  await page.getByRole('dialog', { name: 'Game Settings' }).getByRole('button', { name: 'Done' }).click();
  await expect(key(page, 'Single')).toBeVisible();
  await expect(page.locator('.gm-batter')).toHaveText('Batter 1');
});

test('Due Up shows our next three while we’re in the field in Dugout Mode', async ({ page }) => {
  await freshApp(page);
  await startGame(page);
  for (let n = 0; n < 3; n++) await key(page, 'Strikeout Swinging').click();
  await expect(page.locator('.gm-deck')).toHaveText(/Due Up\s*4\. Player 4 · 5\. Player 5 · 6\. Player 6/);
});

// ---- layout: fit, taps, contrast, widths ----------------------------------------------------

/** How many of today's trips to the plate the batter's Today line lists ("0-for-2 · K, F8" is 2). */
async function todayCodes(page: Page): Promise<number> {
  // The full line (the board may show a shorter one when it doesn't fit).
  const t = (await page.locator('.gm-today-text').getAttribute('data-full')) ?? '';
  const codes = t.split(' · ')[1] ?? '';
  return codes ? codes.split(', ').length : 0;
}

async function gameInProgress(page: Page, count: boolean, clock: boolean): Promise<void> {
  await freshApp(page);
  await startGame(page, { count, ruleSet: clock ? 'Fort Collins: 2+ HR Division' : 'Basic Slowpitch' });
  await key(page, 'Single').click();
  await key(page, 'Double').click();
  await fontsReady(page);
}

for (const colorScheme of ['light', 'dark'] as const) {
  for (const count of [false, true]) {
    for (const clock of [false, true]) {
      test(`fits an iPhone 16 with ${FIT_HEADROOM} points to spare: ${colorScheme}, count ${count ? 'on' : 'off'}, clock ${clock ? 'on' : 'off'}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme });
        await page.setViewportSize(IPHONE_16);
        await gameInProgress(page, count, clock);
        // Bat around until our batter's Today line lists three earlier trips to the plate.
        const plays = ['Single', 'Strikeout Swinging', 'Single', 'Strikeout Swinging', 'Strikeout Swinging'];
        const endTheirs = key(page, 'End Their Half-Inning Now');
        for (let i = 0; i < 120 && (await todayCodes(page)) < 3; i++) {
          if (await endTheirs.isVisible()) await endTheirs.click();
          else await key(page, plays[i % plays.length]!).click();
        }
        expect(await todayCodes(page)).toBeGreaterThanOrEqual(3);
        const m = await page.evaluate(() => ({
          scroll: document.documentElement.scrollHeight - innerHeight,
          stripBottom: document.querySelector('.gm-strip')!.getBoundingClientRect().bottom,
          barTop: document.querySelector('.sk-tabbar')!.getBoundingClientRect().top,
          fits: document.documentElement.classList.contains('fits'),
        }));
        expect(m.scroll).toBeLessThanOrEqual(0);
        expect(m.barTop - m.stripBottom).toBeGreaterThanOrEqual(FIT_HEADROOM);
        expect(m.fits).toBe(true);
      });
    }
  }

  // The whole iPhone 16 screen with its Dynamic Island and Home indicator (393 × 852, safe areas 59 and 34):
  // the headless browsers have no safe areas, so stand in for them (LESSONS 82).
  test(`fits a real iPhone 16 screen with its safe areas: ${colorScheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 393, height: 852 });
    await gameInProgress(page, true, true);
    await page.addStyleTag({ content: ':root { --safe-top: 59px !important; --safe-bottom: 34px !important; }' });
    // A real iPhone has its safe areas from the first frame; tell the page its shape changed, as iOS does.
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    const plays = ['Single', 'Strikeout Swinging', 'Single', 'Strikeout Swinging', 'Strikeout Swinging'];
    const endTheirs = key(page, 'End Their Half-Inning Now');
    for (let i = 0; i < 120 && (await todayCodes(page)) < 3; i++) {
      if (await endTheirs.isVisible()) await endTheirs.click();
      else await key(page, plays[i % plays.length]!).click();
    }
    const m = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight - innerHeight,
      headerTop: document.querySelector('.sk-header')!.getBoundingClientRect().top,
      stripBottom: document.querySelector('.gm-strip')!.getBoundingClientRect().bottom,
      barTop: document.querySelector('.sk-tabbar')!.getBoundingClientRect().top,
      barBottom: document.querySelector('.sk-tabbar')!.getBoundingClientRect().bottom,
      fits: document.documentElement.classList.contains('fits'),
    }));
    expect(m.scroll).toBeLessThanOrEqual(0);
    expect(m.headerTop).toBeGreaterThanOrEqual(59);
    // The tab bar sits just above the Home indicator (the bottom 13 points), not a whole safe area up.
    expect(m.barBottom).toBeLessThanOrEqual(852 - 13);
    expect(m.barBottom).toBeGreaterThanOrEqual(852 - 34);
    expect(m.barTop - m.stripBottom).toBeGreaterThanOrEqual(FIT_HEADROOM);
    // The pad fills the screen (Nov 14): no dead band between Undo and the tab bar.
    expect(m.barTop - m.stripBottom).toBeLessThanOrEqual(24);
    expect(m.fits).toBe(true);
  });

  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme });

    test('Game screen: contrast, 44-point taps, and words', async ({ page }) => {
      await gameInProgress(page, true, true);
      expect(await contrastProblems(page)).toEqual([]);
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
    });

    test('sheets: runner choices, the field, Game Settings, and New Game pass too', async ({ page }) => {
      await gameInProgress(page, false, true);
      await page.getByRole('button', { name: /^Second base/ }).click();
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(await contrastProblems(page)).toEqual([]);
      await page.getByRole('button', { name: 'Close' }).click();
      await page.getByRole('button', { name: 'Settings' }).click();
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(await contrastProblems(page)).toEqual([]);
      expect(wordProblems(await page.locator('body').innerText())).toEqual([]);
      await page.getByRole('switch', { name: 'Hit Location' }).click();
      await page.getByRole('dialog', { name: 'Game Settings' }).getByRole('button', { name: 'Done' }).click();
      await key(page, 'Fly Out').click();
      expect(await tapTargetProblems(page)).toEqual([]);
      expect(await contrastProblems(page)).toEqual([]);
    });

    for (const width of [260, 320, 393, 430, 520]) {
      test(`Game screen: no sideways scroll at ${width} points`, async ({ page }) => {
        await page.setViewportSize({ width, height: 759 });
        await gameInProgress(page, true, true);
        expect(await sideScroll(page)).toBe(0);
        // Every button's label fits inside its button.
        const spill = await page.locator('.gm-key, .gm-strip-key, .sk-tab').evaluateAll((keys) =>
          keys.filter((k) => k.getBoundingClientRect().width > 0 && k.scrollWidth > k.clientWidth + 1).map((k) => k.textContent),
        );
        expect(spill).toEqual([]);
        // GitHub's fonts run wider than ours (LESSONS 18): nothing on the board within 4 points of its edge.
        const tight = await page.locator('.gm-board').evaluate((board) => {
          const edge = board.getBoundingClientRect().right - 4;
          return [...board.querySelectorAll('.gm-cap, .gm-name, .gm-who, .gm-deck, svg')]
            .filter((el) => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().right > edge)
            .map((el) => el.getAttribute('class'));
        });
        expect(tight).toEqual([]);
      });
    }
  });
}

test('the board fits 14–21 in the 12th at 393, 320, and 260 points', async ({ page }) => {
  // Build a long, high-scoring game and bring it in through Restore.
  const events: GameEvent[] = [];
  const pa = (result: 'HR' | 'K'): GameEvent => ({ t: 'pa', result });
  for (let i = 0; i < 14; i++) events.push(pa('HR'));
  events.push(pa('K'), pa('K'), pa('K'));
  for (let i = 0; i < 21; i++) events.push(pa('HR'));
  events.push(pa('K'), pa('K'), pa('K'));
  // Ten more scoreless innings; with no run rule the game goes on.
  for (let i = 0; i < 10; i++) for (let k = 0; k < 6; k++) events.push(pa('K'));
  const data = emptyData();
  const team = newTeam('t', 'Diamond Dogs');
  team.abbr = 'DOGS';
  team.players = OURS.map((id) => ({ id, name: `Player ${id.slice(1)}`, number: '', positions: [] }));
  // Fifteen innings scheduled and no run rule, so the 12th is still regulation.
  const r = { ...ruleSet('basic'), runRule: [], innings: 15 };
  team.games.push({
    id: 'long',
    setup: { us: 'away', mode: 'scorekeeper', rules: r, count: false, hitLocation: false, startedAt: null, lineups: { us: OURS.map((player) => ({ player })), them: [] } },
    events,
    seasonId: null,
    date: '2026-10-17',
    opponent: 'Horsetooth Hackers',
    opponentAbbr: 'LAKE',
    park: '',
    saved: false,
  });
  team.currentGameId = 'long';
  data.teams.push(team);
  data.activeTeamId = 't';
  const s = replay(team.games[0]!);
  expect([s.score.away, s.score.home, s.inning]).toEqual([14, 21, 12]);

  await freshApp(page);
  await key(page, 'Restore from Backup').click();
  await restoreFile(page, 'scorekept-backup-2026-10-17.json', makeBackup(data, [], new Date()).text);
  await page.getByRole('dialog', { name: 'Backup & Restore' }).getByRole('button', { name: 'Done' }).click();
  for (const width of [393, 320, 260]) {
    await page.setViewportSize({ width, height: 759 });
    // Let layout settle after the resize (two frames), as it would on a real screen.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const overflow = await page.locator('.gm-board').evaluate((board) => {
      const b = board.getBoundingClientRect();
      const out = [...board.querySelectorAll('svg, .gm-name')].filter((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false; // hidden (no clock in this game)
        return r.left < b.left - 0.5 || r.right > b.right + 0.5;
      });
      return { inner: board.scrollWidth - board.clientWidth, out: out.length, which: out.map((el) => `${el.getAttribute('class')} ${Math.round(el.getBoundingClientRect().left)}-${Math.round(el.getBoundingClientRect().right)} of ${Math.round(b.left)}-${Math.round(b.right)}`) };
    });
    expect(overflow, `at ${width}`).toEqual({ inner: 0, out: 0, which: [] });
    expect(await sideScroll(page)).toBe(0);
  }
  expect(await boardWords(page)).toContain('Diamond Dogs 14, Horsetooth Hackers 21. Top of the 12th');
});

test('never color alone: out keys are outlined, reach keys filled, and the out pitch says Out', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  const style = (name: string) =>
    key(page, name).evaluate((b) => {
      const cs = getComputedStyle(b);
      const paper = getComputedStyle(document.body).backgroundColor;
      return { bg: cs.backgroundColor, border: parseFloat(cs.borderTopWidth), paper };
    });
  const single = await style('Single');
  const grounder = await style('Grounder');
  // Filled against outlined: the out key's face is the plain key color, its frame twice as thick.
  expect(grounder.bg).not.toEqual(single.bg);
  expect(grounder.border).toBeGreaterThanOrEqual(2);
  expect(single.border).toBeLessThan(2);
  // The team at bat has its bar, and only that team.
  await expect(page.locator('.gm-team.batting')).toHaveCount(1);
  // With two strikes in the sample's count rule, the out pitch carries a tag in words.
  const strike = page.locator('.gm-pitch').filter({ hasText: 'Strike' });
  for (let i = 0; i < 3 && !(await strike.locator('.gm-pitch-tag').textContent()); i++) await key(page, 'Strike').click();
  await expect(strike.locator('.gm-pitch-tag')).toHaveText('Out');
});

// Weather is off for now (Steve, Nov 14): a game never asks for the iPhone's location or calls out for it.
test('a game never asks for location or calls a weather service', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 40.5853, longitude: -105.0844 });
  await page.addInitScript(() => {
    const geo = navigator.geolocation;
    const asked = () => ((window as unknown as { __asked: number }).__asked = ((window as unknown as { __asked?: number }).__asked ?? 0) + 1);
    if (geo) {
      geo.getCurrentPosition = () => void asked();
      geo.watchPosition = () => (asked(), 0);
    }
  });
  let called = false;
  page.on('request', (r) => {
    if (r.url().includes('open-meteo')) called = true;
  });
  await freshApp(page);
  await startGame(page);
  await key(page, 'Single').click();
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { __asked?: number }).__asked ?? 0)).toBe(0);
  expect(called).toBe(false);
});

test('Key Clicks: off by default, and a switch in Sounds', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('button', { name: 'Organ', exact: true }).click();
  const organ = page.getByRole('dialog', { name: 'Organ' });
  for (let i = 0; i < 7; i++) await organ.locator('.cw-next').click();
  await organ.locator('.cw-hub').click();
  const sw = page.getByRole('dialog', { name: 'Sounds & Walk-Up Songs' }).getByRole('switch', { name: 'Key Clicks' });
  await expect(sw).not.toBeChecked();
  await sw.click();
  await expect(sw).toBeChecked();
});

test('every scoring key keeps its place and size: bases empty, runners on, two outs; empty slots are chalk outlines', async ({ page }) => {
  await freshApp(page);
  await startGame(page, { count: true });
  const layout = () =>
    page.locator('.gm-count-row .gm-key, .gm-reaches .gm-key, .gm-outs-pad .gm-key').evaluateAll((keys) =>
      keys.map((k) => {
        const r = k.getBoundingClientRect();
        return `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)},${Math.round(r.height)}`;
      }),
    );
  const empty = await layout();
  await key(page, 'Single').click();
  const oneOn = await layout();
  await key(page, 'Single').click();
  const twoOn = await layout();
  // Runners on first and second, nobody out: Infield Fly, Double Play, and Triple Play are live.
  for (const name of ['Infield Fly Rule', 'Double Play', 'Triple Play']) await expect(key(page, name)).toBeVisible();
  await key(page, 'Strikeout Swinging').click();
  await key(page, 'Strikeout Swinging').click();
  const twoOut = await layout();
  for (const other of [oneOn, twoOn, twoOut]) expect(other).toEqual(empty);
  // With two outs the situational outs leave empty chalk slots: not tappable, and VoiceOver skips them.
  const gone = page.locator('.gm-outs-pad .gm-gone');
  await expect(gone).not.toHaveCount(0);
  expect(await gone.first().getAttribute('aria-hidden')).toBe('true');
  // Undo names what it will undo.
  await expect(page.locator('.gm-strip-key').first()).toHaveText(/Undo K/);
  // The last play, in words, in the batter strip.
  await expect(page.locator('.gm-lastplay')).toContainText('strikes out swinging');
});

// Auto-fit on every device (Steve, Nov 14: "the app knows what device it's on"): Home Screen sizes with
// their safe areas. Nothing scrolls, nothing spills sideways, both teams' names and runs show, and no key's
// label is cut off.
const DEVICES: [string, number, number, number, number][] = [
  ['iPhone SE', 375, 667, 20, 0],
  ['iPhone 16 Pro Max', 440, 956, 62, 34],
  ['iPhone 16 sideways', 852, 393, 0, 21],
  ['iPhone SE sideways', 667, 375, 0, 0],
  ['iPad mini', 744, 1133, 24, 20],
  ['iPad sideways', 1180, 820, 24, 20],
];
for (const [name, width, height, top, bottom] of DEVICES) {
  test(`fits ${name} (${width} × ${height}) with no scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await gameInProgress(page, true, true);
    await page.addStyleTag({ content: `:root { --safe-top: ${top}px !important; --safe-bottom: ${bottom}px !important; }` });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect(page.locator('.gm-pad')).toBeVisible();
    const m = await page.evaluate(() => {
      const shown = (el: Element) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden';
      return {
        scroll: document.documentElement.scrollHeight - innerHeight,
        side: document.documentElement.scrollWidth - innerWidth,
        teams: [...document.querySelectorAll('.gm-board .gm-team')].filter((t) => shown(t) && t.getBoundingClientRect().height > 20).length,
        spill: [...document.querySelectorAll('.gm-key:not(.gm-gone), .gm-strip-key')].filter((k) => shown(k) && k.scrollWidth > k.clientWidth + 1).map((k) => k.textContent),
      };
    });
    expect(m.scroll).toBeLessThanOrEqual(0);
    expect(m.side).toBeLessThanOrEqual(0);
    expect(m.teams).toBe(2);
    expect(m.spill).toEqual([]);
  });
}
