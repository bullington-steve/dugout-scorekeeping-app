/*
 * The dugout simulator (Steve, Nov 15: "the top priority"). The hand scorer plays whole games using
 * only plays the buttons can make (tappable mode), and this test scores each game in the real app by
 * tapping the screen: the pad's keys, Ball, Strike, and Foul, the runner menus on the bases, the "tap
 * which runner was out" banner, Lineups for subs, courtesy runners, Dugout Mode's quick buttons, and
 * Undo (every 20th play is taken back and tapped in again). Then the app's saved game must
 * replay to the hand scorer's sheet: the final score, the line, and every batting stat. If any tap
 * isn't where it should be, the test names the seed, game, and play.
 *
 * Nov 15, before beta: games under the league's own rules (Fort Collins 2+ HR, every new game's
 * default) run on a faked clock, so the 55-minute limit, the HR limit, the run rule, and the 3-ball,
 * 2-strike count are all tapped through; hit locations are tapped on the field (or with Fielder
 * Buttons); and Edit Play fixes a play scored wrong mid-game, with everything after it re-scored.
 */
import { expect, test, type Page } from '@playwright/test';
import { replay } from '../../src/engine/replay.ts';
import type { GameEvent, GameRecord, Result } from '../../src/engine/types.ts';
import { playByPlay } from '../../src/app/book.ts';
import { spotName } from '../../src/game/field.ts';
import { battingCounts, type BattingCounts } from '../../src/stats/batting.ts';
import { emptyData, newTeam, type SavedGame } from '../../src/store/model.ts';
import { simulateSeason } from '../sim/hand-scorer.ts';

test.use({ serviceWorkers: 'block', reducedMotion: 'reduce', actionTimeout: 15_000 });

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
const HIT_TYPE = { ground: 'Grounder', line: 'Line Drive', fly: 'Fly Ball', pop: 'Pop Up' } as const;
/** Edit Play's key for each result. */
const EDIT: Partial<Record<Result, string>> = { '1B': 'Single', '2B': 'Double', F: 'Fly Out', L: 'Line Out', P: 'Pop Out', KL: 'Looking' };
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
    setup: { ...game.setup, startedAt: game.setup.startedAt ?? Date.now() - 1000 },
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
  // The clock: the app reads the coin toss time, so the time limit runs on the hand scorer's clock.
  await page.clock.setFixedTime(saved.setup.startedAt!);
  await page.goto('./');
  await page.evaluate((d) => {
    localStorage.clear();
    localStorage.setItem('scorekept:data', d);
    localStorage.setItem('scorekept:seen:homescreen', '1');
  }, JSON.stringify(data));
  await page.reload();
  await expect(page.getByRole('region', { name: 'Scoreboard' })).toBeVisible();
}

/** Where Did It Go?: tap the field (and the kind of hit), use Fielder Buttons, or Skip. */
async function where(page: Page, ev: Extract<GameEvent, { t: 'pa' }>): Promise<void> {
  const sheet = page.getByRole('dialog', { name: /Where Did It Go\?$/ });
  await expect(sheet).toBeVisible();
  if (ev.loc) {
    if (ev.loc.type) await button(sheet.getByRole('group', { name: 'Kind of Hit' }), HIT_TYPE[ev.loc.type]).click();
    const field = sheet.getByRole('img', { name: /^The field/ });
    // Feet to the screen, through the field picture's own transform (y runs up the middle).
    const at = await field.evaluate((el, p) => {
      const pt = new DOMPoint(p.x, -p.y).matrixTransform((el as SVGSVGElement).getScreenCTM()!);
      return { x: pt.x, y: pt.y };
    }, { x: ev.loc.x, y: ev.loc.y });
    await page.mouse.click(at.x, at.y);
    await button(sheet, 'Save').click();
  } else if (ev.fielder) {
    await button(sheet, 'Fielder Buttons').click();
    await button(sheet, spotName(ev.fielder)).click();
  } else await button(sheet, 'Skip').click();
  await expect(sheet).toHaveCount(0);
}

/** Edit Play from the Book: open the play-by-play line for this event, pick the result, Save. */
async function editPlay(page: Page, saved: GameRecord, eventIndex: number, to: Result): Promise<void> {
  await page.getByRole('tab', { name: 'Book' }).click();
  const editable = playByPlay(saved, (k) => k).filter((l) => l.editable);
  const k = editable.findIndex((l) => l.event === eventIndex);
  expect(k, `play ${eventIndex} is in the play-by-play`).toBeGreaterThanOrEqual(0);
  const showAll = button(page, 'Show All Plays');
  const scope = (await showAll.count()) ? (await showAll.click(), page.getByRole('dialog', { name: /Plays/ })) : page.locator('.bk-pbp');
  // Show All lists every editable line in order; the short list shows the most recent ones.
  const buttons = scope.locator('.bk-play-edit');
  const n = await buttons.count();
  await buttons.nth((await showAll.count()) ? k : k - (editable.length - n)).click();
  const sheet = page.getByRole('dialog', { name: 'Edit Play' });
  await button(sheet, EDIT[to]!).click();
  await button(sheet, 'Save').click();
  await expect(sheet).toHaveCount(0);
  await page.getByRole('tab', { name: 'Game' }).click();
}

const savedGame = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('scorekept:data')!).teams[0].games[0] as GameRecord);

/** Tap one event in, the way a scorekeeper would. `before` is the game up to this event. */
async function tap(page: Page, ev: GameEvent, before: GameRecord): Promise<void> {
  const s = replay(before);
  const name = (k: string) => k;
  if (ev.t === 'pitch') return void (await button(page, PITCH[ev.pitch]).click());
  if (ev.t === 'pa') {
    await button(page, PAD[ev.result]).click();
    let result = ev.result;
    if (ev.result === 'HR') {
      const sheet = page.getByRole('dialog', { name: /^(Home Run|Over the Limit)$/ });
      await expect(sheet).toBeVisible();
      const over = (await sheet.getAttribute('aria-label'))?.includes('Limit') || (await button(sheet, 'Record Home Run Out').count()) > 0;
      if (over && !ev.ip) result = 'HRO';
      await button(sheet, ev.ip ? /^Inside the Park/ : over ? 'Record Home Run Out' : 'Over the Fence').click();
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
    if (before.setup.hitLocation && result !== 'K' && result !== 'KL' && result !== 'BB') await where(page, ev);
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
    await button(page.getByRole('dialog', { name: 'Lineups' }), 'Close').click();
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

const FIELDS: (keyof BattingCounts)[] = ['PA', 'AB', 'H', '1B', '2B', '3B', 'HR', 'BB', 'K', 'SF', 'R', 'RBI', 'ROE', 'HRO', 'FBO', 'ground', 'line', 'fly', 'pop', 'pull', 'center', 'oppo'];

type Run = { seed: number; count: boolean; mode: 'scorekeeper' | 'dugout'; rules: string; field?: boolean; edit?: boolean };
const RUNS: Run[] = [
  { seed: 101, count: true, mode: 'scorekeeper', rules: 'basic' },
  { seed: 102, count: false, mode: 'scorekeeper', rules: 'basic', edit: true },
  { seed: 103, count: true, mode: 'scorekeeper', rules: 'basic' },
  { seed: 104, count: false, mode: 'scorekeeper', rules: 'fc-2hr', edit: true },
  { seed: 105, count: true, mode: 'dugout', rules: 'basic' },
  // The league's own rules, on the hand scorer's clock, with hit locations.
  { seed: 106, count: true, mode: 'scorekeeper', rules: 'fc-2hr', field: true },
  { seed: 107, count: false, mode: 'scorekeeper', rules: 'fc-2hr', field: true },
  { seed: 108, count: true, mode: 'dugout', rules: 'fc-2hr', field: true },
];

for (const run of RUNS) {
  const { seed, count, mode } = run;
  const label = [run.rules === 'fc-2hr' ? 'Fort Collins 2+ HR' : 'Basic Slowpitch', mode === 'dugout' ? 'Dugout Mode' : 'Scorekeeper Mode', `Balls and Strikes ${count ? 'on' : 'off'}`, run.field ? 'Hit Location' : '', run.edit ? 'Edit Play' : ''].filter(Boolean).join(', ');
  test(`dugout simulator: seed ${seed}, ${label}: every game tapped in matches the hand scorer`, async ({ page }) => {
    test.setTimeout(300_000);
    const season = simulateSeason(seed, 2, { tappable: true, count, ruleSetId: run.rules, mode, hitLocation: !!run.field });
    const players = [...new Set(season.games.flatMap((g) => [...g.setup.lineups.us.map((x) => x.player), ...(g.present ?? []), ...g.events.flatMap((e) => (e.t === 'sub' || e.t === 'courtesy' ? [e.player] : []))]))];
    const tapped: GameRecord[] = [];
    for (const [gi, game] of season.games.entries()) {
      await load(page, game, players);
      const events = game.events.filter((e) => e.t !== 'end');
      const end = game.events.find((e) => e.t === 'end');
      // Edit Play: one of our fly, line, or pop outs is tapped in as a called strikeout by mistake,
      // the game goes on, and afterward the Book fixes it.
      const usBat = (i: number) => {
        const st = replay({ ...game, events: events.slice(0, i) });
        return (st.half === 'top') === (game.setup.us === 'away');
      };
      const mistake = run.edit ? events.findIndex((e, i) => i > 8 && e.t === 'pa' && (e.result === 'F' || e.result === 'L' || e.result === 'P') && usBat(i)) : -1;
      for (let i = 0; i < events.length; i++) {
        const ev = events[i]!;
        const before = { ...game, events: events.slice(0, i) };
        try {
          if (ev.at) await page.clock.setFixedTime(ev.at);
          const as = i === mistake ? ({ ...ev, result: 'KL' } as GameEvent) : ev;
          await tap(page, as, before);
          // Every 20th play: Undo takes it back, and the scorekeeper taps it in again.
          if (i % 20 === 19) {
            await page.getByRole('button', { name: /^Undo/ }).click();
            await tap(page, as, before);
          }
        } catch (err) {
          throw new Error(`seed ${seed}, game ${gi + 1}, play ${i + 1} (${JSON.stringify(ev)}): ${(err as Error).message}`);
        }
      }
      const now = end?.at ?? events[events.length - 1]?.at;
      if (now) await page.clock.setFixedTime(now);
      if (mistake >= 0) {
        const wrong = await savedGame(page);
        expect(replay(wrong, { now }).score, 'the mistake is in').toBeDefined();
        const was = events[mistake] as Extract<GameEvent, { t: 'pa' }>;
        await editPlay(page, wrong, mistake, was.result);
      }
      // Edit Play both ways: an early single becomes a double, everything after it re-scores, and
      // changing it back puts the game exactly where it was.
      if (run.edit && gi === 0) {
        const single = events.findIndex((e, i) => i > 2 && e.t === 'pa' && e.result === '1B' && usBat(i));
        if (single >= 0) {
          const a = await savedGame(page);
          await editPlay(page, a, single, '2B');
          const b = await savedGame(page);
          expect((b.events[single] as Extract<GameEvent, { t: 'pa' }>).result).toBe('2B');
          await editPlay(page, b, single, '1B');
          const c = await savedGame(page);
          expect(replay(c, { now }).score).toEqual(replay(a, { now }).score);
        }
      }
      const saved = await savedGame(page);
      tapped.push(saved);
      // The game the app saved replays to the hand scorer's score, on the hand scorer's clock.
      const sheet = season.sheet.games[gi]!;
      const s = replay(saved, { now });
      expect(s.score, `seed ${seed} game ${gi + 1}: score`).toEqual(sheet.score);
      expect(!!s.final, `seed ${seed} game ${gi + 1}: the game is over`).toBe(true);
    }
    // Every batting stat, across the games tapped in, matches the hand scorer's sheet.
    const app = battingCounts(tapped, { bats: (p) => season.bats.get(p) });
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
