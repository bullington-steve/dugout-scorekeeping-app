/*
 * The dugout simulator (Steve, Nov 15: "the top priority"). The hand scorer plays whole games using
 * only plays the buttons can make (tappable mode), and this test scores each game in the real app by
 * tapping the screen: the pad's keys, Ball, Strike, and Foul, the runner menus on the bases, the "tap
 * which runner was out" banner, Lineups for subs, courtesy runners, Dugout Mode's quick buttons, and
 * Undo (every 20th play is taken back and tapped in again). Then the app's saved game must
 * replay to the hand scorer's sheet: the final score, the line, and every batting stat. If any tap
 * isn't where it should be, the test names the seed, game, and play.
 */
import { expect, test, type Page } from '@playwright/test';
import { replay } from '../../src/engine/replay.ts';
import type { GameEvent, GameRecord, Result } from '../../src/engine/types.ts';
import { battingCounts, type BattingCounts } from '../../src/stats/batting.ts';
import { emptyData, newTeam, type SavedGame } from '../../src/store/model.ts';
import { simulateSeason } from '../sim/hand-scorer.ts';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce' });

const PAD: Record<Result, string | RegExp> = {
  '1B': 'Single',
  '2B': 'Double',
  '3B': 'Triple',
  HR: /^Home Run($|,)/,
  BB: 'Walk',
  E: 'Error',
  FC: 'Fielder’s Choice: Runner Out, Batter Safe',
  K: 'Strikeout Swinging',
  KL: 'Strikeout Looking',
  GO: 'Grounder',
  F: 'Fly Out',
  L: 'Line Out',
  P: 'Pop Out',
  FBO: 'Foul Out',
  IF: 'Infield Fly Rule',
  SF: 'Sac Fly',
  DP: 'Double Play',
  TP: 'Triple Play',
  HRO: 'Home Run Out, Over the Limit',
};
const PITCH = { ball: 'Ball', swing: 'Strike', look: 'Strike', foul: 'Foul' } as const;
const BASE = ['First', 'Second', 'Third'] as const;

const button = (scope: Page | ReturnType<Page['locator']>, name: string | RegExp) => scope.getByRole('button', { name, exact: typeof name === 'string' });

/** Load the team and an empty, started game into the app, as if New Game had just been played. */
async function load(page: Page, game: GameRecord, players: string[]): Promise<void> {
  const data = emptyData();
  const team = newTeam('t', 'Diamond Dogs');
  team.abbr = 'DOGS';
  team.players = players.map((id) => ({ id, name: id, number: '', positions: [] }));
  const saved: SavedGame = {
    ...game,
    id: 'sim',
    setup: { ...game.setup, startedAt: Date.now() - 1000 },
    events: [],
    seasonId: null,
    date: '2026-10-17',
    opponent: 'Sim Sluggers',
    opponentAbbr: 'SIM',
    park: '',
    saved: false,
  };
  team.games.push(saved);
  team.currentGameId = 'sim';
  data.teams.push(team);
  data.activeTeamId = 't';
  data.onboarded = true;
  await page.goto('./');
  await page.evaluate((d) => {
    localStorage.clear();
    localStorage.setItem('scorekept:data', d);
    localStorage.setItem('scorekept:seen:homescreen', '1');
  }, JSON.stringify(data));
  await page.reload();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
}

/** Tap one event in, the way a scorekeeper would. `before` is the game up to this event. */
async function tap(page: Page, ev: GameEvent, before: GameRecord): Promise<void> {
  const s = replay(before);
  const name = (k: string) => k;
  if (ev.t === 'pitch') return void (await button(page, PITCH[ev.pitch]).click());
  if (ev.t === 'pa') {
    await button(page, PAD[ev.result]).click();
    if (ev.result === 'HR') {
      const sheet = page.getByRole('dialog', { name: /Home Run|Over the Limit/ });
      await button(sheet, ev.ip ? 'Inside the Park' : 'Over the Fence').click();
    }
    if (ev.result === 'BB' && before.setup.rules.mixed) {
      await button(page.getByRole('dialog', { name: 'Walk' }), ev.bbTo === 2 ? 'To Second' : 'To First').click();
    }
    if (ev.result === 'FC' || ev.result === 'DP') {
      const on = ([1, 2, 3] as const).filter((b) => s.bases[b - 1]);
      if (on.length > 1) {
        const banner = page.locator('.gm-pickbar');
        await expect(banner).toBeVisible();
        const out = ev.result === 'DP' ? (ev.fcOut ?? on[0]!) : ev.fcOut;
        if (out === null || out === undefined) await button(banner, 'Nobody Out').click();
        else await page.locator(`.gm-base-${out}`).click();
      }
    }
    return;
  }
  if (ev.t === 'runner' || ev.t === 'courtesy') {
    const from = ev.t === 'runner' ? ev.from : ev.base;
    await page.locator(`.gm-base-${from}`).click();
    const runner = s.bases[from - 1]!;
    const menu = page.getByRole('group', { name: `${name(runner.player)} on ${BASE[from - 1]}` });
    await expect(menu).toBeVisible();
    if (ev.t === 'courtesy') {
      await button(menu, 'Courtesy Runner').click();
      await button(page.getByRole('dialog', { name: 'Courtesy Runner' }), name(ev.player)).click();
      return;
    }
    const want: string[] =
      ev.to === 0
        ? ['Out on the Bases']
        : ev.to === 4
          ? ev.rbi
            ? [`Scored on the Play, RBI to ${name(ev.rbi)}`]
            : ['Scored, No RBI', 'Score']
          : [`Advance to ${BASE[ev.to - 1]}`];
    for (const w of want) {
      const b = button(menu, w);
      if (await b.count()) return void (await b.click());
    }
    // Not in the quick menu (between pitches): the full list under More.
    await button(menu, 'More Choices').click();
    const sheet = page.getByRole('dialog').last();
    const full: string[] =
      ev.to === 0 ? ['Out'] : ev.to === 4 ? (ev.rbi ? [`Scored on the Play (RBI to ${name(ev.rbi)})`] : ['Scored, No RBI', 'Score']) : [`Advance to ${BASE[ev.to - 1]}`];
    for (const w of full) {
      const b = button(sheet, w);
      if (await b.count()) return void (await b.click());
    }
    throw new Error(`no choice for ${JSON.stringify(ev)}`);
  }
  if (ev.t === 'sub') {
    await button(page, 'Lineups').click();
    const sheet = page.getByRole('dialog', { name: 'Lineups' });
    const out = s.lineups.us[ev.slot]!.player;
    await sheet.getByRole('button', { name: `Substitute for ${name(out)}`, exact: true }).click();
    await button(page.getByRole('dialog', { name: `Sub for ${name(out)}` }), name(ev.player)).click();
    await button(page.getByRole('dialog', { name: 'Lineups' }), 'Done').click();
    return;
  }
  // Dugout Mode, the other team's half: the quick buttons.
  if (ev.t === 'quick') {
    const q = { run: '+1 Run', out: '+1 Out', hit: '+ Hit', error: '+ Our Error', hr: '+ Their HR' } as const;
    return void (await button(page, q[ev.kind]).click());
  }
  if (ev.t === 'endHalf') return void (await button(page, 'End Their Half-Inning Now').click());
  throw new Error(`the simulator made a ${ev.t} event, which this test can't tap yet`);
}

const FIELDS: (keyof BattingCounts)[] = ['PA', 'AB', 'H', '1B', '2B', '3B', 'HR', 'BB', 'K', 'SF', 'R', 'RBI', 'ROE', 'HRO', 'FBO'];

for (const [seed, count, mode] of [
  [101, true, 'scorekeeper'],
  [102, false, 'scorekeeper'],
  [103, true, 'scorekeeper'],
  [104, false, 'scorekeeper'],
  [105, true, 'dugout'],
] as const) {
  test(`dugout simulator: seed ${seed}, ${mode === 'dugout' ? 'Dugout Mode' : 'Scorekeeper Mode'}, Balls and Strikes ${count ? 'on' : 'off'}: every game tapped in matches the hand scorer`, async ({ page }) => {
    test.setTimeout(240_000);
    const season = simulateSeason(seed, 2, { tappable: true, count, ruleSetId: 'basic', mode, hitLocation: false });
    const players = [...new Set(season.games.flatMap((g) => [...g.setup.lineups.us.map((x) => x.player), ...(g.present ?? []), ...g.events.flatMap((e) => (e.t === 'sub' || e.t === 'courtesy' ? [e.player] : []))]))];
    const tapped: GameRecord[] = [];
    for (const [gi, game] of season.games.entries()) {
      await load(page, game, players);
      const events = game.events.filter((e) => e.t !== 'end');
      for (let i = 0; i < events.length; i++) {
        const before = { ...game, events: events.slice(0, i) };
        try {
          await tap(page, events[i]!, before);
          // Every 20th play: Undo takes it back, and the scorekeeper taps it in again.
          if (i % 20 === 19) {
            await page.getByRole('button', { name: /^Undo/ }).click();
            await tap(page, events[i]!, before);
          }
        } catch (err) {
          throw new Error(`seed ${seed}, game ${gi + 1}, play ${i + 1} (${JSON.stringify(events[i])}): ${(err as Error).message}`);
        }
      }
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('scorekept:data')!).teams[0].games[0] as GameRecord);
      tapped.push(saved);
      // The game the app saved replays to the hand scorer's score.
      const sheet = season.sheet.games[gi]!;
      const s = replay(saved);
      expect(s.score, `seed ${seed} game ${gi + 1}: score`).toEqual(sheet.score);
    }
    // Every batting stat, across the games tapped in, matches the hand scorer's sheet.
    const app = battingCounts(tapped);
    const bad: string[] = [];
    for (const [p, mine] of season.sheet.batting) {
      const theirs = app.get(p);
      for (const k of FIELDS) {
        const a = (mine as unknown as Record<string, number>)[k] ?? 0;
        const b = theirs?.[k] ?? 0;
        if (a !== b) bad.push(`${p} ${k}: hand ${a}, app ${b}`);
      }
    }
    expect(bad).toEqual([]);
  });
}
