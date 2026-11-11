/*
 * The player card (SPEC §9): header with photo or initials, number,
 * positions, side, and a red stripe; big numbers (AVG OBP OPS HR RBI); the
 * season table with a Career row; Last 3 Games; recent form over the last
 * 5 and 10; games by position; a spray chart; Edit Player. Opened from
 * names on the Book, Stats, Overview leaders, and Team.
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

export function openPlayerCard(app: App, player: Player): void {
  const team = app.team!;
  const played = (g: SavedGame) => g.saved && g.setup.lineups.us.some((s) => s.player === player.id) || g.events.some((e) => (e.t === 'sub' || e.t === 'addSlot') && e.team === 'us' && e.player === player.id);
  const mine = team.games.filter((g) => g.saved && played(g)).sort((a, b) => b.date.localeCompare(a.date));
  const bats = (id: string) => team.players.find((p) => p.id === id)?.bats;
  const season = mine.filter((g) => g.seasonId === team.currentSeasonId);
  const c = battingCounts(season, { bats }).get(player.id) ?? emptyCounts();
  const r = battingRates(c);
  const big = (label: string, value: string) => h('div', { class: 'tm-big' }, h('span', { class: 'tm-big-value' }, value), h('span', { class: 'tm-big-label' }, label));

  // Season table, with Career when there's more than one season.
  const bySeason = team.seasons
    .map((s) => ({ name: s.name, c: battingCounts(mine.filter((g) => g.seasonId === s.id), { bats }).get(player.id) }))
    .filter((x) => x.c && x.c.G > 0) as { name: string; c: BattingCounts }[];
  const rows = [...bySeason];
  if (bySeason.length > 1) rows.push({ name: 'Career', c: sum(bySeason.map((x) => x.c)) });
  const table = h(
    'div',
    { class: 'st-table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Seasons' },
    h(
      'table',
      { class: 'st-table pc-table' },
      h('caption', { class: 'sk-visually-hidden' }, 'Seasons'),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col', class: 'st-name' }, 'Season'), ...COLS.map((k) => h('th', { scope: 'col' }, k)), h('th', { scope: 'col' }, 'AVG'))),
      h(
        'tbody',
        {},
        ...rows.map((x) => h('tr', { class: x.name === 'Career' ? 'st-total' : '' }, h('th', { scope: 'row', class: 'st-name' }, x.name), ...COLS.map((k) => h('td', {}, String(x.c[k]))), h('td', {}, rate3(battingRates(x.c).AVG)))),
      ),
    ),
  );

  // Last 3 games, and form over the last 5 and 10.
  const last3 = mine.slice(0, 3).map((g) => {
    const gc = battingCounts([g]).get(player.id);
    return h('li', {}, h('span', { class: 'pc-when' }, `${dayText(g.date)} vs ${g.opponent}`), h('span', {}, gc ? gameLine(gc) : 'Didn’t bat'));
  });
  const form = (n: number) => {
    const fc = battingCounts(mine.slice(0, n)).get(player.id);
    if (!fc || mine.length < Math.min(n, 2)) return null;
    const fr = battingRates(fc);
    return h('li', {}, h('span', { class: 'pc-when' }, `Last ${Math.min(n, mine.length)} Games`), h('span', {}, `${rate3(fr.AVG)} AVG · ${rate3(fr.OPS)} OPS`));
  };

  // Games by position (innings from the Defense card).
  const f = fieldingCounts(mine).get(player.id);
  const positions = f ? (Object.entries(f.innings) as [string, number][]).sort((a, b) => b[1] - a[1]) : [];

  const sc = scoped(app.data, team, team.currentSeasonId ?? 'career', false);
  const dots = scopedDots(sc, 'us', 'all').filter((d) => d.who === player.id);
  const edit = h('button', { type: 'button', class: 'sk-key' }, 'Edit Player');
  const sheet = openSheet({
    title: player.name,
    className: 'pc-sheet',
    body: h(
      'div',
      { class: 'sk-stack pc-body' },
      h(
        'div',
        { class: 'tm-card-head pc-head' },
        avatar(player, 64),
        h('p', { class: 'tm-card-line' }, [player.number ? `#${player.number}` : '', positionsText(player), player.bats ? `Bats ${player.bats}` : ''].filter(Boolean).join(' · ') || 'No number or position yet'),
      ),
      h('div', { class: 'tm-bigs' }, big('AVG', rate3(r.AVG)), big('OBP', rate3(r.OBP)), big('OPS', rate3(r.OPS)), big('HR', String(c.HR)), big('RBI', String(c.RBI))),
      rows.length ? table : h('p', { class: 'sk-row-note' }, 'No saved games yet.'),
      last3.length ? h('section', { class: 'pc-section' }, h('h3', { class: 'sk-label' }, 'Last 3 Games'), h('ul', { class: 'pc-list' }, ...last3)) : '',
      mine.length > 1 ? h('section', { class: 'pc-section' }, h('h3', { class: 'sk-label' }, 'Recent Form'), h('ul', { class: 'pc-list' }, form(5) ?? '', mine.length > 5 ? (form(10) ?? '') : '')) : '',
      positions.length
        ? h('section', { class: 'pc-section' }, h('h3', { class: 'sk-label' }, 'By Position'), h('p', {}, positions.map(([p, n]) => `${POSITION_ABBR[Number(p) as Pos]} ${n} ${n === 1 ? 'inning' : 'innings'}`).join(' · ')))
        : '',
      h('section', { class: 'pc-section' }, h('h3', { class: 'sk-label' }, 'Spray Chart'), sprayChart(app, dots, { label: `${player.name} spray chart, this season` })),
      edit,
    ),
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
  });
  edit.addEventListener('click', () => {
    sheet.close();
    openPlayerEditor(app, player);
  });
}
