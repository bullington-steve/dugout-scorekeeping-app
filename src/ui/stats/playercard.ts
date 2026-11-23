/*
 * The player card (SPEC §9; Steve, Nov 23): a navy band with the jersey patch, the name, and
 * positions and side; headline rows for the season and career; the season table with OBP and OPS;
 * Last 3 Games; recent form when shorter than the season; innings by position; a spray chart; Edit
 * Player. Opened from names on the Book, Stats, Overview leaders, and Team.
 */
import type { App } from '../../app/app.ts';
import { scoped, scopedDots } from '../../app/scope.ts';
import { POSITION_ABBR } from '../../engine/words.ts';
import { battingCounts, battingRates, emptyCounts, type BattingCounts } from '../../stats/batting.ts';
import { fieldingCounts } from '../../stats/fielding.ts';
import type { Pos } from '../../engine/types.ts';
import type { Player, SavedGame } from '../../store/model.ts';
import { h } from '../dom.ts';
import { openSheet } from '../sheet.ts';
import { avatar, openPlayerEditor, positionsText } from '../team/player.ts';
import { dayText } from '../when.ts';
import { sprayChart } from './spray.ts';
import { rate3 } from './table.ts';

const COLS: (keyof BattingCounts)[] = ['G', 'AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'K'];

function sum(list: (BattingCounts | undefined)[]): BattingCounts {
  const t = emptyCounts();
  for (const c of list) if (c) for (const k of Object.keys(c) as (keyof BattingCounts)[]) t[k] += c[k];
  return t;
}

/** "2-for-3, HR, 2 RBI" for one game. */
function gameLine(c: BattingCounts): string {
  const parts = [`${c.H}-for-${c.AB}`];
  if (c.HR) parts.push(c.HR > 1 ? `${c.HR} HR` : 'HR');
  if (c['3B']) parts.push(c['3B'] > 1 ? `${c['3B']} 3B` : '3B');
  if (c['2B']) parts.push(c['2B'] > 1 ? `${c['2B']} 2B` : '2B');
  if (c.RBI) parts.push(`${c.RBI} RBI`);
  if (c.BB) parts.push(c.BB > 1 ? `${c.BB} BB` : 'BB');
  if (c.R) parts.push(c.R > 1 ? `${c.R} R` : 'R');
  return parts.join(', ');
}

/**
 * The player card (Steve, Nov 23: the MLB player page's order in our card-back style): a navy band
 * with the jersey patch and the name big, headline rows for the season and (with two or more
 * seasons) the career, then the card back's table, Last 3 Games, Recent Form, By Position, and the
 * spray chart.
 */
export function openPlayerCard(app: App, player: Player): void {
  const team = app.team!;
  const played = (g: SavedGame) => g.saved && g.setup.lineups.us.some((s) => s.player === player.id) || g.events.some((e) => (e.t === 'sub' || e.t === 'addSlot') && e.team === 'us' && e.player === player.id);
  const mine = team.games.filter((g) => g.saved && played(g)).sort((a, b) => b.date.localeCompare(a.date));
  const bats = (id: string) => team.players.find((p) => p.id === id)?.bats;
  const current = team.seasons.find((x) => x.id === team.currentSeasonId);
  const season = mine.filter((g) => g.seasonId === team.currentSeasonId);
  const c = battingCounts(season, { bats }).get(player.id) ?? emptyCounts();

  // Season table, with Career when there's more than one season.
  const bySeason = team.seasons
    .map((s) => ({ name: s.name, c: battingCounts(mine.filter((g) => g.seasonId === s.id), { bats }).get(player.id) }))
    .filter((x) => x.c && x.c.G > 0) as { name: string; c: BattingCounts }[];
  const career = bySeason.length > 1 ? sum(bySeason.map((x) => x.c)) : null;
  const rows = [...bySeason];
  if (career) rows.push({ name: 'Career', c: career });

  // Headline rows, MLB-style: one row of six numbers, no boxes. AB · AVG · HR · RBI · R · OPS.
  const headline = (label: string, k: BattingCounts) => {
    const r = battingRates(k);
    const cells: [string, string, string][] = [
      ['AB', String(k.AB), 'at-bats'],
      ['AVG', rate3(r.AVG), 'batting average'],
      ['HR', String(k.HR), 'home runs'],
      ['RBI', String(k.RBI), 'runs batted in'],
      ['R', String(k.R), 'runs'],
      ['OPS', rate3(r.OPS), 'on-base plus slugging'],
    ];
    return h(
      'section',
      { class: 'pc-section pc-headline-sec', 'aria-label': label },
      h('h3', { class: 'sk-label' }, label),
      h('dl', { class: 'pc-headline' }, ...cells.map(([abbr, value, words]) => h('div', { class: 'pc-hl' }, h('dt', { 'aria-label': words }, abbr), h('dd', {}, value)))),
    );
  };

  const RATE_COLS = ['AVG', 'OBP', 'OPS'] as const;
  const table = h(
    'div',
    { class: 'st-table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Seasons' },
    h(
      'table',
      { class: 'st-table pc-table' },
      h('caption', { class: 'sk-visually-hidden' }, 'Seasons'),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col', class: 'st-name' }, 'Season'), ...COLS.map((k) => h('th', { scope: 'col' }, k)), ...RATE_COLS.map((k) => h('th', { scope: 'col' }, k)))),
      h(
        'tbody',
        {},
        ...rows.map((x) => {
          const r = battingRates(x.c);
          return h('tr', { class: x.name === 'Career' ? 'st-total' : '' }, h('th', { scope: 'row', class: 'st-name' }, x.name), ...COLS.map((k) => h('td', {}, String(x.c[k]))), ...RATE_COLS.map((k) => h('td', {}, rate3(r[k]))));
        }),
      ),
    ),
  );

  // Last 3 games.
  const last3 = mine.slice(0, 3).map((g) => {
    const gc = battingCounts([g]).get(player.id);
    return h('li', {}, h('span', { class: 'pc-when' }, `${dayText(g.date)} vs ${g.opponent}`), h('span', {}, gc ? gameLine(gc) : 'Didn’t bat'));
  });
  // Recent Form: a window only when it's shorter than the season so far (Steve, Nov 23), so a
  // six-game season shows Last 5, not a "Last 6" that's just the season again.
  const form = (n: number) => {
    const fc = battingCounts(mine.slice(0, n)).get(player.id);
    if (!fc) return null;
    const fr = battingRates(fc);
    return h('li', {}, h('span', { class: 'pc-when' }, `Last ${n} Games`), h('span', {}, `${rate3(fr.AVG)} AVG · ${rate3(fr.OPS)} OPS`));
  };
  const windows = [5, 10].filter((n) => n < season.length).map(form).filter((x): x is NonNullable<typeof x> => !!x);

  // By Position: ruled rows, most innings first, with a small bar (innings from the Defense card).
  const f = fieldingCounts(mine).get(player.id);
  const positions = f ? (Object.entries(f.innings) as [string, number][]).sort((a, b) => b[1] - a[1]) : [];
  const most = positions[0]?.[1] ?? 1;
  const posRows = positions.map(([p, n]) =>
    h(
      'li',
      { class: 'pc-pos' },
      h('span', { class: 'pc-pos-name' }, POSITION_ABBR[Number(p) as Pos]),
      h('span', { class: 'pc-pos-bar', 'aria-hidden': 'true' }, h('i', { style: `width: ${Math.max(6, Math.round((n / most) * 100))}%` })),
      h('span', { class: 'pc-pos-inn' }, `${n} inn`, h('span', { class: 'sk-visually-hidden' }, n === 1 ? ' (inning)' : ' (innings)')),
    ),
  );

  const sc = scoped(app.data, team, team.currentSeasonId ?? 'career', false);
  const dots = scopedDots(sc, 'us', 'all').filter((d) => d.who === player.id);
  const edit = h('button', { type: 'button', class: 'sk-key' }, 'Edit Player');
  // The band: the jersey patch standing in for a photo (or the photo, when a coach added one).
  const lead = player.number ? h('span', { class: 'pc-patch', 'aria-hidden': 'true' }, player.number) : avatar(player, 64);
  const line = [player.photo && player.number ? `#${player.number}` : '', positionsText(player), player.bats ? `Bats ${player.bats}` : ''].filter(Boolean).join(' · ') || 'No number or position yet';
  const sheet = openSheet({
    title: player.name,
    className: 'pc-sheet',
    heading: { lead, line },
    body: h(
      'div',
      { class: 'sk-stack pc-body' },
      rows.length ? headline(current?.name ?? 'This Season', c) : h('p', { class: 'sk-row-note' }, 'No saved games yet.'),
      career ? headline('Career', career) : '',
      rows.length ? h('section', { class: 'pc-section' }, h('h3', { class: 'sk-label' }, 'Seasons'), table) : '',
      last3.length ? h('section', { class: 'pc-section' }, h('h3', { class: 'sk-label' }, 'Last 3 Games'), h('ul', { class: 'pc-list' }, ...last3)) : '',
      windows.length ? h('section', { class: 'pc-section' }, h('h3', { class: 'sk-label' }, 'Recent Form'), h('ul', { class: 'pc-list' }, ...windows)) : '',
      posRows.length ? h('section', { class: 'pc-section' }, h('h3', { class: 'sk-label' }, 'By Position'), h('ul', { class: 'pc-list pc-positions' }, ...posRows)) : '',
      h('section', { class: 'pc-section pc-spray' }, h('h3', { class: 'sk-label' }, 'Spray Chart'), sprayChart(app, dots, { label: `${player.name} spray chart, this season`, redraw: () => scopedDots(scoped(app.data, app.team!, app.team!.currentSeasonId ?? 'career', false), 'us', 'all').filter((d) => d.who === player.id) })),
      edit,
    ),
    cancel: false,
  });
  edit.addEventListener('click', () => {
    sheet.close();
    openPlayerEditor(app, player);
  });
}
