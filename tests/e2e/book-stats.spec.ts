/*
 * Phase 5's done-check (BUILD_PLAN): every Stats table, read off the screen
 * the way a person sees it, matches the hand scorer's own sheet. Plus the
 * Book (boxes, Edit Play, Book Ink), View Game, Scout, and contrast, taps,
 * and words in both appearances.
 */
import { expect, test, type Page } from '@playwright/test';
import { simulateSeason, sheetRates, type Season, type SheetLine } from '../sim/hand-scorer.ts';
import { contrastProblems, sideScroll, tapTargetProblems, wordProblems } from '../helpers/checks.ts';
import { freshApp, key, startGame } from '../helpers/app.ts';
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
      bookNames: 'first',
      opponents: [],
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
    const rec = (k: string) => page.locator(`.st-rec-cell[data-stat="${k}"] .st-rec-v`);
    await expect(rec('W')).toHaveText(String(r.w));
    await expect(rec('L')).toHaveText(String(r.l));
    if (r.t) await expect(rec('T')).toHaveText(String(r.t));
    else await expect(rec('T')).toHaveCount(0);

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

test('Book: a bat-around inning gets side-by-side boxes, and scrolled boxes slide under the names', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  await expect(page.locator('.bk-grid')).toBeVisible();
  // The sample's bat-around inning: one inning's heading spans two columns, never two boxes stacked in one cell.
  await expect(page.locator('.bk-grid thead .bk-inning[colspan="2"]')).not.toHaveCount(0);
  expect(await page.locator('.bk-cell').evaluateAll((cells) => cells.filter((c) => c.querySelectorAll('.bk-box').length > 1).length)).toBe(0);
  // Scroll the innings under the pinned names (Steve's screenshot, Nov 13): nothing paints over a name.
  const wrap = page.locator('.bk-grid-wrap');
  // The box pictures let taps through to their buttons; let them answer here so the check sees what's painted on top.
  await page.addStyleTag({ content: '.bk-box-art, .bk-box-art * { pointer-events: auto !important; }' });
  await wrap.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  for (const x of [40, 90, 140, 200, 260]) {
    await wrap.evaluate((el, left) => (el.scrollLeft = left), x);
    const covered = await page.locator('tbody .bk-batter').evaluateAll((tds) =>
      tds.filter((td) => {
        const r = td.getBoundingClientRect();
        for (const fx of [0.25, 0.5, 0.9]) {
          const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height / 2);
          // Only what's inside the scorebook counts (the floating tab bar sits over the bottom rows).
          if (hit && hit.closest('.bk-grid') && !td.contains(hit)) return true;
        }
        return false;
      }).length,
    );
    expect(covered, `scrolled ${x}`).toBe(0);
  }
});

test('Book Ink, View Game from Stats, the other team’s page, and Scout', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  // Book Ink is the pencil's menu in the header now (Book handoff, Nov 16).
  await page.getByRole('combobox', { name: /^Book Ink/ }).selectOption('blue');
  await expect(page.locator('html')).toHaveAttribute('data-ink', 'blue');
  // View an older game from Stats.
  await page.getByRole('tab', { name: 'Stats' }).click();
  const row = page.locator('.st-game').filter({ hasText: 'Two Left Mitts' });
  await row.getByRole('button', { name: 'View' }).click();
  await expect(page.getByRole('tab', { name: 'Book' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Game', { exact: true }).locator('option:checked')).toContainText('Two Left Mitts');
  await expect(page.locator('.bk-stamp, .bk-incomplete')).toBeVisible();
  await page.getByRole('group', { name: 'Book Page' }).getByRole('button', { name: /· MIT$/ }).click();
  await expect(page.locator('.bk-name').first()).not.toHaveText('Jess Kowalczyk');
  // Scout.
  await page.getByRole('tab', { name: 'Scout' }).click();
  await page.getByRole('button', { name: /Horsetooth Hackers/ }).click();
  await expect(page.getByRole('dialog', { name: 'Horsetooth Hackers' })).toContainText('2 games');
  await expect(page.getByRole('dialog', { name: 'Horsetooth Hackers' }).locator('.sc-hint').first()).not.toBeEmpty();
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
      await page.getByRole('button', { name: /Poudre River Rats/ }).click();
      await check('Scout team');
      await page.getByRole('button', { name: 'Close' }).click();
      await page.getByRole('tab', { name: 'Team' }).click();
      await page.getByRole('button', { name: /^Jess Kowalczyk/ }).click();
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

test('Game Replay steps through the sample game: score, words, runners, and the half-inning picker', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.getByRole('button', { name: 'Watch Replay' }).click();
  const d = page.getByRole('dialog', { name: 'Game Replay' });
  await expect(d.locator('.rp-words')).toContainText('Tap Play');
  await d.getByRole('button', { name: 'Next' }).click();
  // The first play's words, read aloud through the live region.
  await expect(d.locator('.rp-words')).not.toContainText('Tap Play');
  await expect(d.locator('.rp-words')).toHaveAttribute('aria-live', 'polite');
  // Jump to the third inning's bottom half: runners appear on the field as plays go on.
  await d.getByRole('combobox', { name: 'Jump to a Half-Inning' }).selectOption({ label: 'Bottom of the third' });
  for (let i = 0; i < 6; i++) await d.getByRole('button', { name: 'Next' }).click();
  await expect(d.locator('.rp-runner:not(.rp-gone)')).not.toHaveCount(0);
  // Play and Pause, then Done closes it.
  await d.getByRole('button', { name: 'Play' }).click();
  await expect(d.getByRole('button', { name: 'Pause' })).toBeVisible();
  await d.getByRole('button', { name: 'Pause' }).click();
  expect(await tapTargetProblems(page)).toEqual([]);
  expect(await contrastProblems(page)).toEqual([]);
  expect(wordProblems(await d.innerText())).toEqual([]);
  await d.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Book: whatever a scorekeeper writes by hand is in Steve’s handwriting (Steve, Nov 16)', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  await expect(page.locator('.bk-jersey').first()).toBeVisible();
  const fonts = await page.evaluate(() => {
    const out: Record<string, string[]> = {};
    for (const [label, sel] of [
      ['names', '.bk-name'],
      ['jersey numbers, positions, and sub notes', '.bk-jersey'],
      ['totals', 'tbody .bk-tot'],
      ['times', '.bk-times .bk-hand'],
      ['Rare Plays filled in', '.bk-rare-when'],
      ['Rare Plays checks', '.bk-rare-done .bk-check'],
    ] as const) out[label] = [...new Set([...document.querySelectorAll(sel)].map((e) => getComputedStyle(e).fontFamily.split(',')[0]!.replace(/["']/g, '').trim()))];
    return out;
  });
  for (const [label, families] of Object.entries(fonts)) expect(families, label).toEqual(['Steve Hand']);
  await expect(page.locator('.bk-jersey').first()).toHaveText(/#\d+/);
  // Rare Plays: filled in with the date and place only once they happen; the rest are blank lines.
  await expect(page.locator('.bk-rare-done .bk-rare-when').first()).toHaveText(/^\w{3}, \w{3} \d+ · .+/);
  const notYet = page.locator('.bk-rare li:not(.bk-rare-done)');
  await expect(notYet.first().locator('.bk-rare-blank')).toHaveCount(1);
  await expect(notYet.first().locator('.bk-rare-when')).toHaveCount(0);
});

// ---- Book handoff (Steve, Nov 16) ----------------------------------------------------------------

async function sampleBook(page: Page, width = 393): Promise<void> {
  await page.setViewportSize({ width, height: 759 });
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.locator('.bk-grid').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

test('a live game in the 4th or later opens the Book on the current inning, just right of the pinned Batter column', async ({ page }) => {
  await sampleBook(page);
  const at = await page.evaluate(() => {
    const wrap = document.querySelector('.bk-grid-wrap')!.getBoundingClientRect();
    const now = document.querySelector('.bk-grid thead th.bk-current')!;
    const batter = document.querySelector('.bk-grid thead .bk-batter')!.getBoundingClientRect();
    const r = now.getBoundingClientRect();
    return { inning: Number(now.textContent), left: r.left, right: r.right, pinned: batter.right, edge: wrap.right };
  });
  expect(at.inning).toBeGreaterThanOrEqual(4);
  expect(at.left).toBeGreaterThanOrEqual(at.pinned - 1);
  expect(at.right).toBeLessThanOrEqual(at.edge + 1);
});

test('scrolling the Book sideways keeps the Batter column fixed', async ({ page }) => {
  await sampleBook(page);
  const where = () => page.evaluate(() => Math.round(document.querySelector('.bk-grid tbody .bk-batter')!.getBoundingClientRect().left));
  const before = await where();
  await page.locator('.bk-grid-wrap').evaluate((w) => (w.scrollLeft = 0));
  const atStart = await where();
  await page.locator('.bk-grid-wrap').evaluate((w) => (w.scrollLeft = 400));
  expect(await where()).toBe(atStart);
  expect(before).toBe(atStart);
});

for (const width of [375, 430]) {
  test(`every name fits on one line in 72-point rows at ${width} points`, async ({ page }) => {
    await sampleBook(page, width);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('.bk-grid tbody tr')].map((tr) => {
        const names = [...tr.querySelectorAll<HTMLElement>('.bk-name:not(.bk-name-before)')];
        const n = names[0]!;
        const size = parseFloat(getComputedStyle(n).fontSize);
        return {
          name: n.textContent,
          fits: n.scrollWidth <= n.clientWidth + 1,
          oneLine: (() => {
            const range = document.createRange();
            range.selectNodeContents(n);
            return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size === 1;
          })(),
          size,
          subs: tr.querySelectorAll('.bk-name-before').length,
          height: Math.round(tr.getBoundingClientRect().height),
        };
      }),
    );
    for (const r of rows) {
      expect(r.fits, `${r.name} fits`).toBe(true);
      expect(r.oneLine, `${r.name} on one line`).toBe(true);
      expect(r.size).toBeGreaterThanOrEqual(12);
      if (!r.subs) expect(r.height, `${r.name}'s row`).toBeLessThanOrEqual(74);
    }
  });
}

test('the Book and Game boards’ count lights are the same size', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  const game = await page.locator('.gm-lampset-out .gm-lamp').first().evaluate((e) => Math.round(e.getBoundingClientRect().width));
  await page.getByRole('tab', { name: 'Book' }).click();
  const book = await page.locator('.bk-lamp-out').first().evaluate((e) => Math.round(e.getBoundingClientRect().width));
  expect(book).toBe(game);
  expect(game).toBeGreaterThanOrEqual(15);
});

for (const width of [375, 430]) {
  test(`the Book board’s AT BAT row never wraps by accident at ${width} points: one row, or H and E on their own row`, async ({ page }) => {
    await sampleBook(page, width);
    const row = await page.evaluate(() => {
      const bottom = document.querySelector('.bk-bottom')!;
      const kids = [...bottom.children].filter((k) => !(k as HTMLElement).hidden) as HTMLElement[];
      const he = bottom.querySelector<HTMLElement>('.bk-he')!;
      const rest = kids.filter((k) => k !== he);
      const mid = (k: HTMLElement) => { const r = k.getBoundingClientRect(); return (r.top + r.bottom) / 2; };
      const m0 = mid(rest[0]!);
      return { restTops: rest.every((k) => Math.abs(mid(k) - m0) < 6) ? 1 : 2, heBelow: he.getBoundingClientRect().top > rest[0]!.getBoundingClientRect().bottom - 2, twoRows: bottom.classList.contains('bk-two-rows') };
    });
    // AT BAT, BALL, STRIKE, and OUT always share one row.
    expect(row.restTops).toBe(1);
    // H and E sit beside them, or on a deliberate row of their own, never a stray wrap.
    expect(row.heBelow).toBe(row.twoRows);
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`every board has the painted-sign frame in full cream, inset from the green edge, no rivets (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await freshApp(page);
    await key(page, 'Look Around with Sample Data').click();
    const look = (sel: string) =>
      page.locator(sel).first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return { color: cs.outlineColor, width: cs.outlineWidth, offset: cs.outlineOffset, border: cs.borderTopWidth, after: getComputedStyle(el, '::after').backgroundImage };
      });
    const game = await look('.gm-board');
    await page.getByRole('tab', { name: 'Book' }).click();
    const book = await look('.bk-face');
    for (const b of [game, book]) {
      expect(b.color).toBe('rgb(243, 239, 228)');
      expect(b.width).toBe('3px');
      expect(b.offset).toBe('-7px');
      expect(b.border).toBe('0px');
      expect(b.after === 'none' || b.after === '').toBe(true);
    }
  });
}

test('on iPhone the Book’s scoreboard runs edge to edge, like the Game board (Steve, Nov 16)', async ({ page }) => {
  await sampleBook(page, 393);
  const book = await page.locator('.bk-board').evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; });
  expect(book).toEqual([0, 393]);
  await page.getByRole('tab', { name: 'Game' }).click();
  const game = await page.locator('.gm-board').evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; });
  expect(game).toEqual(book);
});

test('moving a ball from the player card redraws its spray chart right away (Steve, Nov 16)', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Stats' }).click();
  await page.getByRole('tab', { name: 'Charts' }).or(page.getByRole('button', { name: 'Charts' })).first().click();
  const name = page.locator('.st-chart-name').first();
  const who = (await name.textContent())!.trim();
  await name.click();
  const card = page.getByRole('dialog', { name: who });
  const spots = () => card.locator('.sp-field circle').evaluateAll((cs) => cs.map((c) => `${c.getAttribute('cx')},${c.getAttribute('cy')}`).join(' '));
  const before = await spots();
  await card.locator('.sp-list summary').click();
  await card.locator('.sp-item').first().click();
  const sheet = page.getByRole('dialog', { name: 'Ball in Play' });
  const field = sheet.locator('svg').first();
  const box = (await field.boundingBox())!;
  // Deep left field, far from anywhere a sample ball sits.
  await page.mouse.click(box.x + box.width * 0.22, box.y + box.height * 0.25);
  await sheet.getByRole('button', { name: 'Move It Here' }).click();
  await expect(sheet).toBeHidden();
  await expect.poll(spots).not.toBe(before);
});

// ---- Screens pass 1 (Steve, Nov 16) --------------------------------------------------------------

test('at 375 points in the 4th, the whole 4th shows beside a Batter column a quarter wide, on a page edge to edge (Steve, Nov 20)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 759 });
  await freshApp(page);
  await startGame(page, { ruleSet: 'Basic Slowpitch', count: true });
  for (let inning = 1; inning <= 3; inning++) {
    for (let n = 0; n < 3; n++) {
      await key(page, 'Ball').click();
      await key(page, 'Strikeout Swinging').click();
    }
    for (let n = 0; n < 3; n++) await key(page, '+1 Out').click();
  }
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.locator('.bk-grid').waitFor();
  await page.evaluate(() => document.fonts.ready);
  const at = await page.evaluate(() => {
    const wrap = document.querySelector('.bk-grid-wrap')!.getBoundingClientRect();
    const pageBox = document.querySelector('.bk-page')!.getBoundingClientRect();
    const batter = document.querySelector('.bk-grid thead .bk-batter')!.getBoundingClientRect();
    const heads = [...document.querySelectorAll<HTMLElement>('.bk-grid thead th.bk-inning')].map((th) => {
      const r = th.getBoundingClientRect();
      return { n: Number(th.textContent), left: r.left, right: r.right };
    });
    const ruled = getComputedStyle(document.querySelector('.bk-page')!).backgroundImage;
    const dot = document.querySelector('.bk-pitch')!.getBoundingClientRect();
    return { wrap: { left: wrap.left, right: wrap.right }, page: { left: pageBox.left, right: pageBox.right }, pinned: batter.right, batter: batter.width, heads, ruled, dot: Math.max(dot.width, dot.height), current: document.querySelector('.bk-grid thead th.bk-current')?.textContent };
  });
  expect(at.current).toBe('4');
  // Edge to edge, no card, no ruling behind the grid.
  expect(at.page.left).toBeLessThanOrEqual(0.5);
  expect(at.page.right).toBeGreaterThanOrEqual(374.5);
  expect(at.ruled).toBe('none');
  // The Batter column takes at most a quarter of the width; the innings get the rest.
  expect(at.batter).toBeLessThanOrEqual(375 / 4 + 1);
  for (const n of [2, 3, 4]) {
    const head = at.heads.find((x) => x.n === n)!;
    expect(head.left, `inning ${n}`).toBeGreaterThanOrEqual(at.pinned - 1);
    expect(head.right, `inning ${n}`).toBeLessThanOrEqual(at.wrap.right + 1);
  }
  // Pitch marks about 10 points.
  expect(at.dot).toBeGreaterThanOrEqual(8);
});

test('Stats is the back of a baseball card: the band holds the season menu, the record once, leaders on one line (Steve, Nov 16)', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Stats' }).click();
  const panel = page.locator('#tab-stats');
  // Header: Schedule (a calendar) and a ••• menu holding New Season.
  await expect(panel.getByRole('button', { name: 'Schedule' })).toBeVisible();
  const more = panel.getByRole('combobox', { name: 'More' });
  await expect(more.locator('option')).toHaveText(['More', 'New Season']);
  // The navy band: the team, and the season as the iPhone's own menu; no row above the tabs.
  const band = panel.locator('.st-band').first();
  await expect(band).toContainText(/Diamond Dogs/i);
  await expect(band.getByRole('combobox', { name: 'Season' })).toHaveCount(1);
  await expect(panel.getByText(/\d+ games · /i)).toHaveCount(0);
  const edges = await band.evaluate((el) => { const r = el.getBoundingClientRect(); return [r.left, r.right, window.innerWidth]; });
  expect(edges[0]).toBeLessThanOrEqual(0.5);
  expect(edges[1]).toBeGreaterThanOrEqual(edges[2]! - 0.5);
  // The record once: G W L RS RA.
  await expect(panel.locator('.st-rec-k')).toHaveText(['G', 'W', 'L', 'RS', 'RA']);
  await expect(panel.locator('.st-record-big')).toHaveCount(0);
  // Team Leaders: athletic face, ties on one line by last name, never wrapping.
  const leaders = panel.locator('.st-leaders');
  await expect(leaders.locator('tbody tr').nth(1)).toContainText('Greer, Wendt, Kowalczyk');
  const rows = await leaders.locator('.st-fit').evaluateAll((els) =>
    els.map((el) => {
      const tops = new Set([...el.children].map((c) => Math.round(c.getBoundingClientRect().top / 4)));
      return { lines: tops.size, fits: el.scrollWidth <= el.parentElement!.clientWidth + 1, font: getComputedStyle(el).fontFamily };
    }),
  );
  for (const r of rows) {
    expect(r.lines).toBeLessThanOrEqual(1);
    expect(r.fits).toBe(true);
    expect(r.font).toMatch(/Barlow Condensed/);
  }
  await expect(panel.locator('.st-foot').first()).toHaveText('Tap a name for the player’s card.');
  // Games are ruled rows on the card, with View and Delete.
  const game = panel.locator('.st-cardback .st-game').first();
  await expect(game.getByRole('button', { name: 'View' })).toBeVisible();
  await expect(game.getByRole('button', { name: 'Delete' })).toBeVisible();
});

// ---- Steve's answers (Nov 17) ---------------------------------------------------------------------

test('Book marks: out number 12, IP 12, play code 16; every line at least 3:1 in both appearances', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await sampleBook(page);
    const got = await page.evaluate(() => {
      const size = (sel: string) => [...document.querySelectorAll(`.bk-grid ${sel}`)].map((e) => Number(e.getAttribute('font-size')));
      const rgb = (s: string) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lum = (c: number[]) => {
        const v = c.map((x) => {
          const y = x / 255;
          return y <= 0.03928 ? y / 12.92 : ((y + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
      };
      const ratio = (a: string, b: string) => {
        const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m);
        return (x! + 0.05) / (y! + 0.05);
      };
      const page = getComputedStyle(document.querySelector('.bk-grid tbody .bk-batter')!).backgroundColor;
      const cell = document.querySelector('.bk-grid tbody td.bk-cell:not(.bk-inn-start)')!;
      const heavy = document.querySelector('.bk-grid tbody td.bk-inn-start')!;
      return {
        outs: size('.bk-out-num'),
        codes: size('.bk-code'),
        ips: size('.bk-note'),
        rule: ratio(getComputedStyle(cell).borderBottomColor, page),
        heavy: ratio(getComputedStyle(heavy).borderLeftColor, page),
        diamond: ratio(getComputedStyle(document.querySelector('.bk-grid .bk-diamond')!).stroke, page),
      };
    });
    expect(got.outs.length).toBeGreaterThan(0);
    for (const n of got.outs) expect(n).toBe(12);
    for (const n of got.codes) expect(n).toBe(16);
    for (const n of got.ips) expect(n).toBe(12);
    expect(got.rule, `${scheme} grid lines`).toBeGreaterThanOrEqual(3);
    expect(got.heavy, `${scheme} inning lines`).toBeGreaterThanOrEqual(3);
    expect(got.diamond, `${scheme} diamonds`).toBeGreaterThanOrEqual(3);
  }
});

test('the Book writes first names, and Edit Team’s Book Names switches the whole Book to last names (Steve, Nov 17)', async ({ page }) => {
  await sampleBook(page, 375);
  const names = () => page.locator('.bk-grid tbody .bk-name:not(.bk-name-before)').allTextContents();
  const first = await names();
  expect(first).toContain('Travis');
  for (const n of first) expect(n).not.toMatch(/\bJr\.?$/);
  // Book Names lives in Settings, Book (moved from Edit Team, Steve, Nov 17).
  await page.getByRole('tab', { name: 'Game' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'All Settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await settings.getByRole('group', { name: 'Book Names' }).getByRole('button', { name: 'Last' }).click();
  for (const c = page.getByRole('button', { name: 'Close', exact: true }); await c.count(); ) await c.last().click();
  await page.getByRole('tab', { name: 'Book' }).click();
  const last = await names();
  expect(last).toContain('Pruitt');
  expect(last).not.toContain('Travis');
});

test('after batting around in the 3rd, the Book opens with the whole 4th in view at 375, its now-box gold (Steve, Nov 17)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 759 });
  await freshApp(page);
  await startGame(page, { ruleSet: 'Basic Slowpitch' });
  const theirHalf = async () => {
    for (let n = 0; n < 3; n++) await key(page, '+1 Out').click();
  };
  for (let inning = 1; inning <= 2; inning++) {
    for (let n = 0; n < 3; n++) await key(page, 'Strikeout Swinging').click();
    await theirHalf();
  }
  // The 3rd: ten singles, so the top of the order bats twice (two columns), then three outs.
  for (let n = 0; n < 10; n++) await key(page, 'Single').click();
  // A look at the Book mid-inning, so it remembers a spot in the 3rd.
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.locator('.bk-grid').waitFor();
  await page.getByRole('tab', { name: 'Game' }).click();
  for (let n = 0; n < 3; n++) await key(page, 'Strikeout Swinging').click();
  await theirHalf();
  await page.getByRole('tab', { name: 'Book' }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  const at = await page.evaluate(() => {
    const wrap = document.querySelector('.bk-grid-wrap')!.getBoundingClientRect();
    const pinned = document.querySelector('.bk-grid thead .bk-batter')!.getBoundingClientRect();
    const now = document.querySelector('.bk-grid thead th.bk-current')!;
    const r = now.getBoundingClientRect();
    const third = [...document.querySelectorAll('.bk-grid thead th.bk-inning')].find((th) => th.textContent === '3')!;
    const due = document.querySelector('.bk-grid .bk-due');
    return { inning: now.textContent, left: r.left, right: r.right, pinned: pinned.right, edge: wrap.right, thirdSpan: third.getAttribute('colspan'), due: due ? getComputedStyle(due).boxShadow : '' };
  });
  expect(at.thirdSpan).toBe('2');
  expect(at.inning).toBe('4');
  expect(at.left).toBeGreaterThanOrEqual(at.pinned - 1);
  expect(at.right).toBeLessThanOrEqual(at.edge + 1);
  // Gold #f2b728, never the red of outs.
  expect(at.due).toContain('rgb(242, 183, 40)');
});

test('the Batter column fits the longest Book name (capped at a quarter), and the picker needs no Game label (Steve, Nov 17)', async ({ page }) => {
  await sampleBook(page, 375);
  const got = await page.evaluate(() => {
    const cell = document.querySelector<HTMLElement>('.bk-grid tbody td.bk-batter')!;
    const range = document.createRange();
    let longest = 0;
    for (const el of document.querySelectorAll('.bk-grid tbody .bk-name')) {
      range.selectNodeContents(el);
      longest = Math.max(longest, range.getBoundingClientRect().width);
    }
    const pinned = document.querySelector('.bk-grid thead .bk-batter')!.getBoundingClientRect().right;
    return { width: cell.getBoundingClientRect().width, longest, pinned, label: getComputedStyle(document.querySelector('label[for="bk-game"]')!).position };
  });
  expect(got.width).toBeGreaterThanOrEqual(got.longest);
  expect(got.width).toBeLessThanOrEqual(got.longest + 24);
  expect(got.width).toBeLessThanOrEqual(375 / 4 + 1);
  // Visually hidden, still there for VoiceOver.
  expect(got.label).toBe('absolute');
  await expect(page.getByRole('combobox', { name: 'Game', exact: true })).toHaveCount(1);
});

test('Scout is a coach’s clipboard: one sheet, the read in handwriting, every hit mark one size, no colored dots (Steve, Nov 17)', async ({ page }) => {
  await freshApp(page);
  await key(page, 'Look Around with Sample Data').click();
  await page.getByRole('tab', { name: 'Scout' }).click();
  await page.getByRole('button', { name: /Horsetooth Hackers/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Horsetooth Hackers' });
  const got = await sheet.evaluate((d) => {
    const board = d.querySelector('.sc-clipboard')!.getBoundingClientRect();
    const font = (sel: string) => getComputedStyle(d.querySelector(sel)!).fontFamily;
    // Per chart, the outer size of every hit mark.
    const charts = [...d.querySelectorAll('.sp-field')].map((svg) => [...new Set([...svg.querySelectorAll('.sp-mark-hit .sp-mark-edge')].map((c) => c.getAttribute('r')))]);
    const legend = [...new Set([...d.querySelectorAll('.sp-legend .sp-mark-hit .sp-mark-edge')].map((c) => c.getAttribute('r')))];
    const legendBases = [...d.querySelectorAll('.sp-legend .sp-mark-hit')].map((g) => g.getAttribute('data-bases'));
    const fills = [...d.querySelectorAll('.sp-field circle, .sp-field path')].map((e) => (e.getAttribute('fill') ?? '').toLowerCase());
    return {
      edge: [board.left, board.right, d.getBoundingClientRect().left, d.getBoundingClientRect().right],
      read: font('.sc-hint'),
      summary: font('.sc-summary'),
      name: font('.sc-hitter-name'),
      charts,
      legend,
      legendBases,
      fills,
      cards: d.querySelectorAll('.sc-clipboard .sk-card').length,
    };
  });
  expect(got.edge[0]).toBeLessThanOrEqual(got.edge[2]! + 0.5);
  expect(got.edge[1]).toBeGreaterThanOrEqual(got.edge[3]! - 0.5);
  expect(got.cards).toBe(0);
  expect(got.read).toMatch(/Steve Hand/);
  expect(got.summary).toMatch(/Barlow Condensed/);
  expect(got.name).toMatch(/Barlow Condensed/);
  for (const sizes of got.charts) expect(sizes.length).toBeLessThanOrEqual(1);
  expect(got.legend).toHaveLength(1);
  expect(got.legendBases).toEqual(['1', '2', '3', '4']);
  // No blue, purple, green, or gold dots: the old palette is gone.
  for (const f of ['#3b7bff', '#a35bff', '#3fbf5a', '#ffc93c']) expect(got.fills).not.toContain(f);
  // Small samples count instead of percent.
  await expect(sheet.locator('.sc-hitter .st-chart-line').first()).not.toContainText('%');
});

test('the batter at the plate gets a gold ribbon on their row, no fill, and the row comes into view (Steve, Nov 17)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await freshApp(page);
  await startGame(page, { ruleSet: 'Basic Slowpitch' });
  const ribbon = () =>
    page.evaluate(() => {
      const row = document.querySelector('.bk-grid tr.bk-row-current')!;
      const other = [...document.querySelectorAll('.bk-grid tbody tr')].find((r) => r !== row)!;
      return {
        spot: row.querySelector('.bk-num')!.textContent!.trim(),
        shadow: getComputedStyle(row.querySelector('.bk-num')!).boxShadow,
        fill: getComputedStyle(row.querySelector('td.bk-batter')!).backgroundColor,
        otherFill: getComputedStyle(other.querySelector('td.bk-batter')!).backgroundColor,
        rows: document.querySelectorAll('.bk-grid tr.bk-row-current').length,
      };
    });
  await key(page, 'Strikeout Swinging').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  let r = await ribbon();
  expect(r.rows).toBe(1);
  expect(r.spot).toMatch(/^2\./);
  expect(r.shadow).toContain('rgb(242, 183, 40)');
  expect(r.fill).toBe(r.otherFill);
  await page.getByRole('tab', { name: 'Game' }).click();
  for (let n = 0; n < 6; n++) await key(page, 'Single').click();
  await page.getByRole('tab', { name: 'Book' }).click();
  r = await ribbon();
  expect(r.spot).toMatch(/^8\./);
  // The batter's row is on screen, clear of the tab bar.
  const at = await page.evaluate(() => {
    const row = document.querySelector('.bk-grid tr.bk-row-current')!.getBoundingClientRect();
    const bar = document.querySelector('.sk-tabbar')!.getBoundingClientRect();
    return { top: row.top, bottom: row.bottom, bar: bar.top };
  });
  expect(at.top).toBeGreaterThanOrEqual(0);
  expect(at.bottom).toBeLessThanOrEqual(at.bar);
});

test('at 375 the boxes are wide: every inning column at least 70, batting around a full inning each, no mark within 4 of a column line, the inning underlined in gold (Steve, Nov 20)', async ({ page }) => {
  await sampleBook(page, 375);
  const got = await page.evaluate(() => {
    const cells = [...document.querySelectorAll<HTMLElement>('.bk-grid tbody tr:first-child td.bk-cell')].map((c) => c.getBoundingClientRect().width);
    const close: string[] = [];
    for (const btn of document.querySelectorAll<HTMLElement>('.bk-grid .bk-box')) {
      const cell = btn.parentElement!.getBoundingClientRect();
      for (const m of btn.querySelectorAll<SVGGraphicsElement>('svg > *:not(.bk-half-end)')) {
        const r = m.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        if (r.left < cell.left + 4 - 0.5 || r.right > cell.right - 4 + 0.5) close.push(`${btn.getAttribute('aria-label')} ${m.getAttribute('class')} ${Math.round(r.left - cell.left)}/${Math.round(cell.right - r.right)}`);
      }
    }
    const diamond = document.querySelector('.bk-diamond')!.getBoundingClientRect();
    const third = [...document.querySelectorAll('.bk-grid thead th.bk-inning')].find((th) => th.textContent === '3')!;
    const now = document.querySelector('.bk-grid thead th.bk-current')!;
    return { cells, close: close.slice(0, 5), diamond: diamond.width, span: third.getAttribute('colspan'), third: third.getBoundingClientRect().width, underline: getComputedStyle(now.querySelector('.bk-inn-num')!).textDecorationColor };
  });
  for (const w of got.cells) expect(w).toBeGreaterThanOrEqual(70);
  expect(got.close).toEqual([]);
  expect(got.diamond).toBeGreaterThanOrEqual(44);
  // The sample's 3rd bats around: two columns, each a full inning wide.
  expect(got.span).toBe('2');
  expect(got.third).toBeGreaterThanOrEqual(2 * 70);
  expect(got.underline).toBe('rgb(242, 183, 40)');
});

test('a batted-around inning keeps its number at the left of its wide column, in view while swiping, and moves are written tight (Nov 22)', async ({ page }) => {
  await sampleBook(page, 393);
  const wrap = page.locator('.bk-grid-wrap');
  const read = () =>
    page.evaluate(() => {
      const th = [...document.querySelectorAll<HTMLElement>('.bk-grid-wrap thead th.bk-inning')].find((t) => t.textContent === '3')!;
      const num = th.querySelector<HTMLElement>('.bk-inn-num')!.getBoundingClientRect();
      const names = document.querySelector<HTMLElement>('.bk-grid-wrap thead .bk-batter')!.getBoundingClientRect();
      const cell = th.getBoundingClientRect();
      return { numLeft: num.left, numRight: num.right, cellLeft: cell.left, cellRight: cell.right, names: names.right, edge: innerWidth };
    });
  // Scroll so the 3rd's first column starts at the names: its number sits at the column's left.
  await wrap.evaluate((w) => {
    const th = [...w.querySelectorAll<HTMLElement>('thead th.bk-inning')].find((t) => t.textContent === '3')!;
    const first = w.querySelector<HTMLElement>('thead th.bk-inning')!;
    w.scrollLeft = th.offsetLeft - first.offsetLeft;
  });
  let at = await read();
  expect(at.numLeft - at.cellLeft).toBeLessThan(24);
  // Half a column further, the number is still in view right beside the names.
  await wrap.evaluate((w) => (w.scrollLeft += 60));
  at = await read();
  expect(at.numLeft).toBeGreaterThanOrEqual(at.names - 1);
  expect(at.numRight).toBeLessThanOrEqual(at.edge);
  // Position moves have no spaces around the arrow.
  const subs = await page.locator('.bk-grid-wrap .bk-jersey').allTextContents();
  expect(subs.join(' ')).not.toContain(' → ');
  expect(subs.some((t) => t.includes('→'))).toBe(true);
});
