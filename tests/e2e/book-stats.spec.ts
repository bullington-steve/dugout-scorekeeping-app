/*
 * Phase 5's done-check (BUILD_PLAN): every Stats table, read off the screen
 * the way a person sees it, matches the hand scorer's own sheet. Plus the
 * Book (boxes, Edit Play, Book Ink), View Game, Scout, and contrast, taps,
 * and words in both appearances.
 */
import { expect, test, type Page } from '@playwright/test';
import { simulateSeason, sheetRates, type Season, type SheetLine } from '../sim/hand-scorer.ts';
import { contrastProblems, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key } from '../helpers/app.ts';
import { emptyData } from '../../src/store/model.ts';

const name = (id: string) => `Player ${id.slice(1)}`;

/** A simulated season as saved data, the way the app stores it. */
function seasonData(season: Season) {
  const data = emptyData();
  const ids = new Set<string>();
  for (const g of season.games) {
    for (const s of g.setup.lineups.us) ids.add(s.player);
    for (const p of g.present ?? []) ids.add(p);
    for (const e of g.events) if ((e.t === 'sub' || e.t === 'addSlot' || e.t === 'courtesy') && 'player' in e && e.player.startsWith('u')) ids.add(e.player);
  }
  data.teams = [
    {
      id: 't1',
      name: 'Hand Scorers',
      abbr: 'HAND',
      colors: { primary: 'navy', secondary: 'red' },
      players: [...ids].map((id) => ({ id, name: name(id), number: id.slice(1), positions: [], bats: season.bats.get(id) ?? 'R' })),
      games: season.games.map((g, n) => ({
        ...g,
        seasonId: 's1',
        date: new Date(g.setup.startedAt ?? 0).toISOString().slice(0, 10),
        opponent: `Opponent ${n + 1}`,
        opponentAbbr: 'OPP',
        park: '',
        saved: true,
      })),
      seasons: [{ id: 's1', name: 'Summer 2026' }],
      currentSeasonId: 's1',
      currentGameId: null,
      schedule: [],
    },
  ];
  data.activeTeamId = 't1';
  return data;
}

async function load(page: Page, season: Season): Promise<void> {
  await freshApp(page);
  await page.evaluate((json) => localStorage.setItem('scorekept:data', json), JSON.stringify(seasonData(season)));
  await page.reload();
  await page.getByRole('tab', { name: 'Stats' }).click();
}

/** The table on screen as { player: { column: text } }, the way a person reads it. */
async function readTable(page: Page): Promise<Record<string, Record<string, string>>> {
  return page.locator('.st-table').first().evaluate((table) => {
    const first = (el: Element) => (el.querySelector('button')?.childNodes[0] ?? el.childNodes[0])?.textContent?.trim() ?? '';
    const heads = [...table.querySelectorAll('thead th')].map(first);
    const out: Record<string, Record<string, string>> = {};
    for (const tr of table.querySelectorAll('tbody tr')) {
      const cells = [...tr.children];
      const who = first(cells[0]!);
      out[who] = Object.fromEntries(cells.slice(1).map((c, i) => [heads[i + 1]!, first(c)]));
    }
    return out;
  });
}

const rate3 = (v: number | null) => (v === null ? '–' : v < 1 ? v.toFixed(3).replace(/^0/, '') : v.toFixed(3));
const pctText = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`);
const div = (a: number, b: number) => (b ? a / b : null);

function expectedStandard(c: SheetLine): Record<string, string> {
  const r = sheetRates(c);
  return {
    G: String(c.G),
    PA: String(c.PA),
    AB: String(c.AB),
    R: String(c.R),
    H: String(c.H),
    '2B': String(c['2B']),
    '3B': String(c['3B']),
    HR: String(c.HR),
    RBI: String(c.RBI),
    BB: String(c.BB),
    K: String(c.K),
    AVG: rate3(r.AVG!),
    OBP: rate3(r.OBP!),
    SLG: rate3(r.SLG!),
    OPS: rate3(r.OPS!),
  };
}

function expectedAdvanced(c: SheetLine): Record<string, string> {
  const r = sheetRates(c);
  return {
    wOBA: rate3(r.wOBA!),
    ISO: rate3(r.ISO!),
    BABIP: rate3(r.BABIP!),
    'K%': pctText(r['K%']!),
    'BB%': pctText(r['BB%']!),
    'BB/K': r['BB/K'] === null ? '–' : r['BB/K']!.toFixed(2),
    RISP: rate3(r.RISP!),
    RC: r.RC === null ? '–' : r.RC!.toFixed(1),
    ROE: String(c.ROE),
    HRO: String(c.HRO),
    FBO: String(c.FBO),
  };
}

function expectedContact(c: SheetLine): Record<string, string> {
  const typed = c.ground + c.line + c.fly + c.pop;
  const aimed = c.pull + c.center + c.oppo;
  return {
    'GB%': pctText(div(c.ground, typed)),
    'LD%': pctText(div(c.line, typed)),
    'FB%': pctText(div(c.fly, typed)),
    'PU%': pctText(div(c.pop, typed)),
    'Pull%': pctText(div(c.pull, aimed)),
    'Ctr%': pctText(div(c.center, aimed)),
    'Oppo%': pctText(div(c.oppo, aimed)),
  };
}

const section = (page: Page, s: string) => page.getByRole('group', { name: 'Stats Sections' }).getByRole('button', { name: s, exact: true }).click();
const table = (page: Page, s: string) => page.getByRole('group', { name: 'Batting Tables' }).getByRole('button', { name: s, exact: true }).click();

for (const seed of [12, 28]) {
  test(`every Stats table matches the hand scorer: seed ${seed}`, async ({ page }) => {
    const season = simulateSeason(seed);
    await load(page, season);
    const sheet = season.sheet;
    const r = sheet.record;
    await expect(page.locator('.st-record-big')).toHaveText(r.t ? `${r.w}–${r.l}–${r.t}` : `${r.w}–${r.l}`);

    await section(page, 'Batting');
    const players = [...sheet.batting].filter(([, c]) => c.G > 0);
    for (const [view, expected] of [
      ['Standard', expectedStandard],
      ['Advanced', expectedAdvanced],
      ['Contact', expectedContact],
    ] as const) {
      await table(page, view);
      const shown = await readTable(page);
      expect(Object.keys(shown).filter((k) => k !== 'Team').sort(), view).toEqual(players.map(([id]) => name(id)).sort());
      for (const [id, c] of players) expect(shown[name(id)], `${view}: ${name(id)}`).toEqual(expected(c));
    }

    await table(page, 'Fielding');
    const field = await readTable(page);
    for (const [id, f] of sheet.fielding) {
      const innings = Object.values(f.innings).reduce((a, b) => a + b, 0);
      const row = field[name(id)];
      expect(row, `Fielding: ${name(id)}`).toBeTruthy();
      expect([row!.Inn, row!.Plays, row!.E, row!['FLD%']], `Fielding: ${name(id)}`).toEqual([String(innings), String(f.plays), String(f.errors), rate3(div(f.plays, f.plays + f.errors))]);
    }

    await section(page, 'Innings');
    const notes = await page.locator('.st-inn').evaluateAll((els) =>
      Object.fromEntries(els.map((el) => [el.querySelector('.st-player')!.textContent!.trim(), el.querySelector('.st-inn-note')!.textContent!.trim()])),
    );
    for (const [id, p] of sheet.playing) {
      if (!p.games) continue;
      expect(notes[name(id)], `Innings: ${name(id)}`).toBe(`${p.fieldInnings} innings · fair share ${p.fairShare.toFixed(1)} · ${p.games} ${p.games === 1 ? 'game' : 'games'}`);
    }
  });
}

test('Book: boxes from the sample, Edit Play re-scores, and Delete This Play takes two taps', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  const board = page.getByRole('region', { name: 'Book Scoreboard' }).or(page.locator('.bk-board'));
  await expect(board.first()).toBeVisible();
  // Our page: the first box of the game.
  const first = page.locator('.bk-box').first();
  const before = (await first.getAttribute('aria-label'))!;
  expect(before).toMatch(/^Inning 1, .*Edit Play\.$/);
  await first.click();
  const sheet = page.getByRole('dialog', { name: 'Edit Play' });
  await sheet.getByRole('button', { name: 'Home Run', exact: true }).click();
  await sheet.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.bk-box').first()).toHaveAttribute('aria-label', /^Inning 1, (inside-the-park )?home run.*scored/);
  // The play-by-play follows.
  await expect(page.locator('.bk-pbp')).toBeVisible();
  // Delete: the first tap only asks.
  await page.locator('.bk-box').first().click();
  const del = page.getByRole('dialog', { name: 'Edit Play' }).getByRole('button', { name: 'Delete This Play' });
  await del.click();
  await expect(page.getByRole('dialog', { name: 'Edit Play' }).getByRole('button', { name: 'Tap Again to Delete This Play' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Edit Play' }).getByRole('button', { name: 'Tap Again to Delete This Play' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.locator('.bk-box').first().getAttribute('aria-label')).not.toBe(before);
});

test('Book Ink, View Game from Stats, the other team’s page, and Scout', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.getByRole('button', { name: /^Book Ink/ }).click();
  await page.getByRole('dialog', { name: 'Book Ink' }).getByRole('button', { name: /^Blue Pen/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-ink', 'blue');
  // View an older game from Stats.
  await page.getByRole('tab', { name: 'Stats' }).click();
  const row = page.locator('.st-game').filter({ hasText: 'Pine Ridge Elk' });
  await row.getByRole('button', { name: 'View' }).click();
  await expect(page.getByRole('tab', { name: 'Book' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Game', { exact: true }).locator('option:checked')).toContainText('Pine Ridge Elk');
  await expect(page.locator('.bk-stamp, .bk-incomplete')).toBeVisible();
  await page.getByRole('group', { name: 'Book Page' }).getByRole('button', { name: 'ELK' }).click();
  await expect(page.locator('.bk-name').first()).not.toHaveText('Maya Ortiz');
  // Scout.
  await page.getByRole('tab', { name: 'Scout' }).click();
  await page.getByRole('button', { name: /Lakeside Lightning/ }).click();
  await expect(page.getByRole('dialog', { name: 'Lakeside Lightning' })).toContainText('2 games');
  await expect(page.getByRole('dialog', { name: 'Lakeside Lightning' }).locator('.sc-hint').first()).not.toBeEmpty();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} appearance`, () => {
    test.use({ colorScheme, viewport: { width: 393, height: 759 } });

    test('Book, Stats, Scout, and the player card: contrast, taps, words, no sideways scroll', async ({ page }) => {
      await freshApp(page);
      await key(page, 'Look Around with Sample Data').click();
      const check = async (where: string) => {
        expect(await contrastProblems(page), where).toEqual([]);
        expect(await tapTargetProblems(page), where).toEqual([]);
        expect(wordProblems(await page.locator('body').innerText()), where).toEqual([]);
        expect(await sideScroll(page), where).toBeLessThanOrEqual(0);
      };
      await page.getByRole('tab', { name: 'Book' }).click();
      await check('Book');
      await page.locator('.bk-box').first().click();
      await check('Edit Play');
      await page.getByRole('dialog', { name: 'Edit Play' }).getByRole('button', { name: 'Close' }).click();
      await page.getByRole('tab', { name: 'Stats' }).click();
      for (const s of ['Overview', 'Batting', 'Charts', 'Lineups', 'Innings']) {
        await section(page, s);
        if (s === 'Batting') {
          for (const t of ['Standard', 'Advanced', 'Contact', 'Fielding']) {
            await table(page, t);
            await check(`Stats ${t}`);
          }
        } else await check(`Stats ${s}`);
      }
      await page.getByRole('tab', { name: 'Scout' }).click();
      await check('Scout');
      await page.getByRole('button', { name: /Oak Hollow Sluggers/ }).click();
      await check('Scout team');
      await page.getByRole('button', { name: 'Done' }).click();
      await page.getByRole('tab', { name: 'Team' }).click();
      await page.getByRole('button', { name: /^Maya Ortiz/ }).click();
      await check('Player card');
    });
  });
}

for (const width of [260, 520]) {
  test(`Book, Stats, and Scout don’t scroll sideways at ${width} points wide`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await freshApp(page);
    await key(page, 'Look Around with Sample Data').click();
    await page.getByRole('tab', { name: 'Book' }).click();
    expect(await sideScroll(page), 'Book').toBeLessThanOrEqual(0);
    await page.getByRole('tab', { name: 'Stats' }).click();
    for (const s of ['Overview', 'Batting', 'Charts', 'Lineups', 'Innings']) {
      await section(page, s);
      expect(await sideScroll(page), s).toBeLessThanOrEqual(0);
    }
    await page.getByRole('tab', { name: 'Scout' }).click();
    expect(await sideScroll(page), 'Scout').toBeLessThanOrEqual(0);
  });
}
