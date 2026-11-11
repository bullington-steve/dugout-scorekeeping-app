/*
 * The Stats tab (SPEC §7): a season menu (any season, All Seasons, or All
 * Teams, Lifetime), New Season, Schedule, and five sections: Overview,
 * Batting, Charts, Lineups, Innings. Every number is a pure function of the
 * saved games, so editing a play anywhere updates everything here.
 */
import type { App } from '../../app/app.ts';
import { allGames, scoped, scopedBatting, scopedDots, scopedFielding, scopedLineups, scopedPlayingTime, type Scoped, type ScopedDot } from '../../app/scope.ts';
import type { LineupPos, Pos } from '../../engine/types.ts';
import { POSITION_ABBR } from '../../engine/words.ts';
import { battingRates, contactRates, emptyCounts, STAT_HELP, type BattingCounts } from '../../stats/batting.ts';
import { fieldingPct, playingTimeMark, type FieldingCounts } from '../../stats/fielding.ts';
import { stateOf, resultFor } from '../../stats/games.ts';
import { leaders, recordText, teamRecord } from '../../stats/team.ts';
import type { SavedGame } from '../../store/model.ts';
import { openBackup } from '../backup.ts';
import { segmented, switchRow } from '../controls.ts';
import { h } from '../dom.ts';
import { goTo } from '../nav.ts';
import { confirm, openSheet } from '../sheet.ts';
import { openNewSeason, openScheduleEntry, scheduleRow } from '../team/schedule.ts';
import { dayText } from '../when.ts';
import { openPlayerCard } from './playercard.ts';
import { legend, pct, splits, sprayChart } from './spray.ts';
import { one, percent, rate3, statsTable, two, type Column } from './table.ts';

type Section = 'overview' | 'batting' | 'charts' | 'lineups' | 'innings';
type BattingView = 'standard' | 'advanced' | 'contact' | 'fielding';

interface Row {
  key: string;
  name: string;
  c: BattingCounts;
}

export class StatsScreen {
  readonly el = h('div', { class: 'st-screen' });
  private readonly app: App;
  private section: Section = 'overview';
  private view: BattingView = 'standard';
  private filter: 'all' | 'hits' | 'outs' = 'all';
  private minPA = 0;
  private sort = { key: 'OPS', desc: true };
  private scope: string | null = null;

  constructor(app: App) {
    this.app = app;
  }

  update(visible: boolean): void {
    if (!visible) return;
    const app = this.app;
    const team = app.team;
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, 'Stats'));
    if (!team) {
      this.el.replaceChildren(header, h('section', { class: 'sk-card sk-soon' }, h('p', {}, 'No team yet. Set one up on the Team tab, or score a game, and the stats fill in.')));
      return;
    }
    const scopeId = this.scope && (this.scope === 'career' || this.scope === 'lifetime' || team.seasons.some((s) => s.id === this.scope)) ? this.scope : (team.currentSeasonId ?? 'career');
    const sc = scoped(app.data, team, scopeId, app.data.prefs.includeLive !== false);

    // Season menu, New Season, Schedule.
    const menu = h(
      'select',
      { id: 'st-scope', class: 'sk-input' },
      ...[...team.seasons].reverse().map((s) => h('option', { value: s.id, selected: s.id === scopeId }, s.name)),
      h('option', { value: 'career', selected: scopeId === 'career' }, 'All Seasons'),
      ...(app.data.teams.length > 1 ? [h('option', { value: 'lifetime', selected: scopeId === 'lifetime' }, 'All Teams, Lifetime')] : []),
    );
    menu.addEventListener('change', () => {
      this.scope = menu.value;
      if (menu.value !== 'career' && menu.value !== 'lifetime') app.setSeason(menu.value);
      else this.update(true);
    });
    const newSeason = h('button', { type: 'button', class: 'sk-key' }, 'New Season');
    newSeason.addEventListener('click', () => openNewSeason(app));
    const schedule = h('button', { type: 'button', class: 'sk-key' }, 'Schedule');
    schedule.addEventListener('click', () => this.openSchedule());
    const top = h('div', { class: 'st-top' }, h('div', { class: 'sk-field st-scope' }, h('label', { for: 'st-scope', class: 'sk-field-label' }, 'Season'), menu), h('div', { class: 'st-top-keys' }, newSeason, schedule));

    const sections = segmented<Section>(
      'Stats Sections',
      [
        { value: 'overview', label: 'Overview' },
        { value: 'batting', label: 'Batting' },
        { value: 'charts', label: 'Charts' },
        { value: 'lineups', label: 'Lineups' },
        { value: 'innings', label: 'Innings' },
      ],
      this.section,
      (v) => {
        this.section = v;
        this.update(true);
      },
    );
    sections.classList.add('st-sections');

    const body =
      this.section === 'overview'
        ? this.overview(sc)
        : this.section === 'batting'
          ? this.batting(sc)
          : this.section === 'charts'
            ? this.charts(sc)
            : this.section === 'lineups'
              ? this.lineups(sc)
              : this.innings(sc);
    const scroll = window.scrollY;
    this.el.replaceChildren(header, top, sections, body);
    window.scrollTo(0, scroll);
  }

  private card(key: string, sc: Scoped): void {
    const p = sc.player(key);
    if (p) openPlayerCard(this.app, p);
  }

  // ---- Overview ------------------------------------------------------------------------------

  private overview(sc: Scoped): HTMLElement {
    const app = this.app;
    const games = allGames(sc);
    const saved = games.filter((g) => g.saved);
    const rec = teamRecord(saved);
    const counts = scopedBatting(sc);
    const lead = (label: string, stat: keyof BattingCounts) => {
      const l = leaders(counts, stat);
      return h(
        'li',
        { class: 'st-leader' },
        h('span', { class: 'st-leader-stat' }, label),
        h(
          'span',
          { class: 'st-leader-who' },
          ...(l.players.length
            ? l.players.slice(0, 3).map((k, i, all) => {
                const b = h('button', { type: 'button', class: 'st-player' }, sc.name(k));
                b.addEventListener('click', () => this.card(k, sc));
                return h('span', { class: 'st-leader-name' }, b, i < all.length - 1 ? ',' : '');
              })
            : ['–']),
        ),
        h('span', { class: 'st-leader-value' }, l.value ? String(l.value) : ''),
      );
    };
    const live = sc.parts.some((p) => p.team.currentGameId);
    const backup = h('button', { type: 'button', class: 'sk-key' }, 'Export & Backup');
    backup.addEventListener('click', () => openBackup(app));
    return h(
      'div',
      { class: 'sk-stack' },
      h(
        'section',
        { class: 'sk-card st-record', 'aria-labelledby': 'st-record-title' },
        h('h2', { id: 'st-record-title', class: 'sk-label' }, 'Record'),
        h('p', { class: 'st-record-big' }, recordText(rec)),
        h('p', { class: 'sk-row-note' }, `${saved.length} ${saved.length === 1 ? 'game' : 'games'} saved${rec.t ? ', ties included' : ''}.`),
      ),
      h(
        'section',
        { class: 'sk-card', 'aria-labelledby': 'st-leaders-title' },
        h('h2', { id: 'st-leaders-title', class: 'sk-label' }, 'Team Leaders'),
        h('ul', { class: 'st-leaders' }, lead('Runs', 'R'), lead('Hits', 'H'), lead('Home Runs', 'HR'), lead('RBI', 'RBI'), lead('Walks', 'BB')),
      ),
      live ? switchRow('Include Today’s Game in Progress', app.data.prefs.includeLive !== false, (v) => app.commit((d) => (d.prefs.includeLive = v)), 'Counts the game being scored right now in every stat.') : '',
      h(
        'section',
        { class: 'tm-section', 'aria-labelledby': 'st-games-title' },
        h('h2', { id: 'st-games-title', class: 'sk-label' }, 'Games'),
        games.length ? h('ul', { class: 'st-games' }, ...sc.parts.flatMap(({ team, games: gs }) => gs.map((g) => this.gameRow(g, team.currentGameId === g.id)))) : h('p', { class: 'sk-row-note' }, 'No games in this season yet.'),
      ),
      backup,
    );
  }

  private gameRow(g: SavedGame, current: boolean): HTMLElement {
    const app = this.app;
    const s = stateOf(g);
    const us = s.score[g.setup.us];
    const them = s.score[g.setup.us === 'away' ? 'home' : 'away'];
    const res = resultFor(g);
    const view = h('button', { type: 'button', class: 'sk-key' }, 'View');
    view.addEventListener('click', () => {
      app.view(current ? null : g.id);
      goTo('book');
    });
    const actions: HTMLElement[] = [view];
    if (!g.saved && !current) {
      const resume = h('button', { type: 'button', class: 'sk-key' }, 'Resume');
      resume.addEventListener('click', () => {
        app.resumeGame(g.id);
        goTo('game');
      });
      actions.push(resume);
    }
    const del = h('button', { type: 'button', class: 'sk-quiet-danger' }, 'Delete');
    del.addEventListener('click', async () => {
      if (await confirm('Delete This Game?', `${dayText(g.date)} vs ${g.opponent}. Its plays and stats go away for good.`, 'Delete Game')) app.deleteGame(g.id);
    });
    actions.push(del);
    return h(
      'li',
      { class: 'st-game' },
      h(
        'div',
        { class: 'st-game-main' },
        h('p', { class: 'st-game-when' }, [dayText(g.date), g.park].filter(Boolean).join(' · ')),
        h('p', { class: 'st-game-who' }, `${res && (g.saved || s.final) ? `${res} ${us}–${them}` : `${us}–${them}, ${current ? 'Live' : 'In Progress'}`} ${g.setup.us === 'away' ? 'at' : 'vs'} ${g.opponent}`),
      ),
      h('div', { class: 'st-game-actions' }, ...actions),
    );
  }

  // ---- Batting -------------------------------------------------------------------------------

  private batting(sc: Scoped): HTMLElement {
    const counts = scopedBatting(sc);
    const rows: Row[] = [...counts].map(([key, c]) => ({ key, name: sc.name(key), c })).filter((r) => r.c.PA >= this.minPA);
    const total: Row = { key: 'team', name: 'Team', c: emptyCounts() };
    for (const [, c] of counts) for (const k of Object.keys(c) as (keyof BattingCounts)[]) total.c[k] += c[k];
    const views = segmented<BattingView>(
      'Batting Tables',
      [
        { value: 'standard', label: 'Standard' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'contact', label: 'Contact' },
        { value: 'fielding', label: 'Fielding' },
      ],
      this.view,
      (v) => {
        this.view = v;
        this.sort = { key: v === 'standard' ? 'OPS' : v === 'advanced' ? 'wOBA' : v === 'contact' ? 'ground' : 'innings', desc: true };
        this.update(true);
      },
    );
    views.classList.add('st-sections');
    const minId = 'st-min';
    const min = h('select', { id: minId, class: 'sk-input' }, ...[0, 5, 10, 20, 30].map((n) => h('option', { value: String(n), selected: n === this.minPA }, n ? `${n} or More` : 'Everyone')));
    min.addEventListener('change', () => {
      this.minPA = Number(min.value);
      this.update(true);
    });
    const onSort = (key: string, desc: boolean) => {
      this.sort = { key, desc };
      this.update(true);
    };
    const common = { rowName: (r: Row) => r.name, onName: (r: Row) => this.card(r.key, sc), sort: this.sort, onSort };
    let table: HTMLElement;
    let help: string[] = [];
    if (this.view === 'fielding') {
      const f = scopedFielding(sc);
      type FRow = { key: string; name: string; f: FieldingCounts };
      const frows: FRow[] = [...f].map(([key, fc]) => ({ key, name: sc.name(key), f: fc }));
      const inn = (fc: FieldingCounts) => Object.values(fc.innings).reduce((a, b) => a + (b ?? 0), 0);
      const cols: Column<FRow>[] = [
        { key: 'pos', label: 'Positions', value: () => null, text: (r) => posText(r.f), lead: false },
        { key: 'innings', label: 'Inn', name: 'Innings in the Field', value: (r) => inn(r.f), text: (r) => String(inn(r.f)) },
        { key: 'plays', label: 'Plays', value: (r) => r.f.plays, text: (r) => String(r.f.plays) },
        { key: 'errors', label: 'E', name: 'Errors', value: (r) => r.f.errors, text: (r) => String(r.f.errors), lead: false },
        { key: 'pct', label: 'FLD%', name: 'Fielding Percentage', value: (r) => fieldingPct(r.f), text: (r) => rate3(fieldingPct(r.f)) },
      ];
      table = statsTable(frows, cols, { caption: 'Fielding', rowName: (r) => r.name, onName: (r) => this.card(r.key, sc), sort: this.sort, onSort });
      help = ['Positions: innings at each spot, from the Defense card.', 'Plays: outs this player made a play on (Hit Location or Fielder Buttons).', 'FLD%: plays divided by plays plus errors.'];
    } else {
      const cols = this.view === 'standard' ? standardCols() : this.view === 'advanced' ? advancedCols() : contactCols();
      table = statsTable(rows, cols, { caption: `${this.view[0]!.toUpperCase()}${this.view.slice(1)} Batting`, total, ...common });
      help = cols.filter((c) => STAT_HELP[c.label]).map((c) => `${c.label}: ${STAT_HELP[c.label]}`);
      if (this.view === 'contact') help = ['Grounder, line drive, fly, and pop-up: shares of balls in play with a known kind.', 'Pull, center, and opposite: by who fielded it and which side the batter hits from. Center is the pitcher, catcher, center fielder, and short fielder.'];
    }
    return h(
      'div',
      { class: 'sk-stack' },
      views,
      this.view === 'fielding' ? '' : h('div', { class: 'sk-field st-min' }, h('label', { for: minId, class: 'sk-field-label' }, 'Plate Appearances'), min),
      table,
      h('details', { class: 'sk-details' }, h('summary', {}, 'What the Stats Mean'), ...help.map((t) => h('p', {}, t)), h('p', {}, 'Tap a column’s name to sort by it; tap again to flip it. Team leaders are underlined.')),
    );
  }

  // ---- Charts --------------------------------------------------------------------------------

  private charts(sc: Scoped): HTMLElement {
    const app = this.app;
    const filter = segmented<'all' | 'hits' | 'outs'>(
      'Show',
      [
        { value: 'all', label: 'All' },
        { value: 'hits', label: 'Hits' },
        { value: 'outs', label: 'Outs' },
      ],
      this.filter,
      (v) => {
        this.filter = v;
        this.update(true);
      },
    );
    const dots = scopedDots(sc, 'us', this.filter);
    const all = scopedDots(sc, 'us', 'all');
    const sp = splits(all);
    const counts = scopedBatting(sc);
    const team = emptyCounts();
    for (const [, c] of counts) for (const k of Object.keys(c) as (keyof BattingCounts)[]) team[k] += c[k];
    const header = h(
      'div',
      { class: 'st-chart-head' },
      h('p', { class: 'st-chart-line' }, h('strong', {}, 'BABIP '), rate3(battingRates(team).BABIP)),
      h('p', { class: 'st-chart-line' }, `Left ${pct(sp.left, sp.balls)} · Center ${pct(sp.center, sp.balls)} · Right ${pct(sp.right, sp.balls)}`),
      h('p', { class: 'st-chart-line' }, `Infield ${pct(sp.infield, sp.balls)} · Outfield ${pct(sp.outfield, sp.balls)}`),
      h('p', { class: 'st-chart-line' }, contactLine(sp)),
    );
    const byPlayer = new Map<string, ScopedDot[]>();
    for (const d of dots) byPlayer.set(d.who, [...(byPlayer.get(d.who) ?? []), d]);
    const players = [...byPlayer.keys()].sort((a, b) => sc.name(a).localeCompare(sc.name(b)));
    return h(
      'div',
      { class: 'sk-stack' },
      filter,
      legend(),
      h('section', { class: 'sk-card', 'aria-labelledby': 'st-team-chart' }, h('h2', { id: 'st-team-chart', class: 'sk-label' }, 'Team'), sprayChart(app, dots, { label: 'Team spray chart', header })),
      ...players.map((k) => {
        const c = counts.get(k);
        const mine = byPlayer.get(k)!;
        const cr = c ? contactRates(c) : null;
        const p = sc.player(k);
        const nameBtn = h('button', { type: 'button', class: 'st-player st-chart-name' }, sc.name(k));
        nameBtn.addEventListener('click', () => this.card(k, sc));
        const line = h(
          'p',
          { class: 'st-chart-line' },
          `${mine.length} balls in play · ${mine.filter((d) => ['1B', '2B', '3B', 'HR'].includes(d.kind)).length} hits${p?.bats ? ` · Bats ${p.bats}` : ''}${cr ? ` · Pull ${percent(cr.pull)}, Center ${percent(cr.center)}, Oppo ${percent(cr.oppo)}` : ''}`,
        );
        return h('section', { class: 'sk-card st-player-chart' }, h('h3', { class: 'st-chart-title' }, nameBtn), sprayChart(app, mine, { label: `${sc.name(k)} spray chart`, header: line }));
      }),
    );
  }

  // ---- Lineups -------------------------------------------------------------------------------

  private lineups(sc: Scoped): HTMLElement {
    const app = this.app;
    const grid = scopedLineups(sc);
    const games = sc.parts.flatMap(({ team, games: gs }) => gs.map((g) => ({ g, team }))).sort((a, b) => a.g.date.localeCompare(b.g.date));
    if (!games.length) return h('p', { class: 'sk-row-note' }, 'No games in this season yet.');
    const starts = (k: string) => [...(grid.get(k)?.values() ?? [])].filter((c) => c.spot !== null && !c.sub).length;
    const keys = [...grid.keys()].sort((a, b) => starts(b) - starts(a) || sc.name(a).localeCompare(sc.name(b)));
    const head = h(
      'tr',
      {},
      h('th', { scope: 'col', class: 'st-name' }, 'Player'),
      h('th', { scope: 'col' }, 'Starts'),
      ...games.map(({ g, team }) => {
        const b = h('button', { type: 'button', class: 'st-sort', 'aria-label': `${dayText(g.date)} vs ${g.opponent}. View Game.` }, shortDay(g.date));
        b.addEventListener('click', () => {
          app.view(team.currentGameId === g.id ? null : g.id);
          goTo('book');
        });
        return h('th', { scope: 'col' }, b);
      }),
    );
    const rows = keys.map((k) => {
      const nameBtn = h('button', { type: 'button', class: 'st-player' }, sc.name(k));
      nameBtn.addEventListener('click', () => this.card(k, sc));
      return h(
        'tr',
        {},
        h('th', { scope: 'row', class: 'st-name' }, nameBtn),
        h('td', {}, String(starts(k))),
        ...games.map(({ g }) => {
          const c = grid.get(k)?.get(g.id);
          if (!c) return h('td', { class: 'st-empty' }, h('span', { class: 'sk-visually-hidden' }, 'Not in this game'));
          const pos = c.positions.map(posName).join('→');
          return h('td', { class: 'st-lineup-cell' }, [c.spot ? String(c.spot) : '', pos].filter(Boolean).join(' · ') + (c.sub ? ' (sub)' : ''));
        }),
      );
    });
    return h(
      'div',
      { class: 'sk-stack' },
      h('p', { class: 'sk-row-note' }, 'Batting spot and positions for every game. Tap a date to open that game in the Book.'),
      h('div', { class: 'st-table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Lineups' }, h('table', { class: 'st-table st-lineups' }, h('caption', { class: 'sk-visually-hidden' }, 'Lineups'), h('thead', {}, head), h('tbody', {}, ...rows))),
    );
  }

  // ---- Innings -------------------------------------------------------------------------------

  private innings(sc: Scoped): HTMLElement {
    const pt = scopedPlayingTime(sc);
    const rows = [...pt].map(([k, p]) => ({ k, p, diff: p.fieldInnings - p.fairShare })).sort((a, b) => a.diff - b.diff);
    if (!rows.length) return h('p', { class: 'sk-row-note' }, 'No saved games with a Defense card in this season yet.');
    const scale = Math.max(1, ...rows.map((r) => Math.max(r.p.fieldInnings, r.p.fairShare)));
    return h(
      'div',
      { class: 'sk-stack' },
      h('p', { class: 'sk-row-note' }, 'Innings in the field against a fair share of the games each player came to. Most under first.'),
      h(
        'ul',
        { class: 'st-innings' },
        ...rows.map(({ k, p, diff }) => {
          const mark = playingTimeMark(p);
          const words = mark === 'over' ? `▲ ${one(diff)} over` : mark === 'under' ? `▼ ${one(-diff)} under` : '= even';
          const nameBtn = h('button', { type: 'button', class: 'st-player' }, sc.name(k));
          nameBtn.addEventListener('click', () => this.card(k, sc));
          return h(
            'li',
            { class: `st-inn st-inn-${mark}` },
            h('div', { class: 'st-inn-top' }, nameBtn, h('span', { class: 'st-inn-mark' }, words)),
            h(
              'div',
              { class: 'st-bar', role: 'img', 'aria-label': `${p.fieldInnings} innings in the field, fair share ${one(p.fairShare)}, over ${p.games} ${p.games === 1 ? 'game' : 'games'}.` },
              h('span', { class: 'st-bar-fill', style: `width: ${(p.fieldInnings / scale) * 100}%` }),
              h('span', { class: 'st-bar-fair', style: `left: ${(p.fairShare / scale) * 100}%` }),
            ),
            h('p', { class: 'st-inn-note' }, `${p.fieldInnings} innings · fair share ${one(p.fairShare)} · ${p.games} ${p.games === 1 ? 'game' : 'games'}`),
          );
        }),
      ),
    );
  }

  private openSchedule(): void {
    const app = this.app;
    const team = app.team;
    if (!team) return;
    const add = h('button', { type: 'button', class: 'sk-key' }, '+ Add a Game');
    add.addEventListener('click', () => {
      sheet.close();
      openScheduleEntry(app);
    });
    const season = team.schedule.filter((e) => e.seasonId === team.currentSeasonId);
    const sheet = openSheet({
      title: 'Schedule',
      body: [h('div', { class: 'sk-stack' }, ...(season.length ? season.map((e) => scheduleRow(app, e)) : [h('p', { class: 'sk-row-note' }, 'No games on the schedule yet.')]), add)],
      cancel: false,
      done: { label: 'Done', onClick: () => undefined },
    });
  }
}

const posName = (p: LineupPos) => (p === 'EH' ? 'EH' : POSITION_ABBR[p]);

function posText(f: FieldingCounts): string {
  const list = (Object.entries(f.innings) as [string, number][]).sort((a, b) => b[1] - a[1]);
  return list.map(([p, n]) => `${POSITION_ABBR[Number(p) as Pos]} ${n}`).join(', ') || '–';
}

function shortDay(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
}

function contactLine(sp: ReturnType<typeof splits>): string {
  const typed = sp.ground + sp.line + sp.fly + sp.pop;
  return `Grounders ${pct(sp.ground, typed)} · Liners ${pct(sp.line, typed)} · Flies ${pct(sp.fly, typed)} · Pop-ups ${pct(sp.pop, typed)}`;
}

const count = (key: keyof BattingCounts, label: string, name?: string, lead = true): Column<Row> => ({
  key,
  label,
  ...(name ? { name } : {}),
  value: (r) => r.c[key],
  text: (r) => String(r.c[key]),
  lead,
});

const rate = (key: ReturnType<typeof rateKeys>[number], label: string, fmt: (v: number | null) => string, name?: string, lead = true): Column<Row> => ({
  key,
  label,
  ...(name ? { name } : {}),
  value: (r) => battingRates(r.c)[key],
  text: (r) => fmt(battingRates(r.c)[key]),
  lead,
});

function rateKeys() {
  return ['AVG', 'OBP', 'SLG', 'OPS', 'ISO', 'BABIP', 'K%', 'BB%', 'BB/K', 'wOBA', 'RC', 'RISP'] as const;
}

function standardCols(): Column<Row>[] {
  return [
    count('G', 'G', 'Games', false),
    count('PA', 'PA', 'Plate Appearances', false),
    count('AB', 'AB', 'At-Bats', false),
    count('R', 'R', 'Runs'),
    count('H', 'H', 'Hits'),
    count('2B', '2B', 'Doubles'),
    count('3B', '3B', 'Triples'),
    count('HR', 'HR', 'Home Runs'),
    count('RBI', 'RBI', 'Runs Batted In'),
    count('BB', 'BB', 'Walks'),
    count('K', 'K', 'Strikeouts', false),
    rate('AVG', 'AVG', rate3, 'Batting Average'),
    rate('OBP', 'OBP', rate3, 'On-Base Percentage'),
    rate('SLG', 'SLG', rate3, 'Slugging'),
    rate('OPS', 'OPS', rate3, 'On-Base Plus Slugging'),
  ];
}

function advancedCols(): Column<Row>[] {
  return [
    rate('wOBA', 'wOBA', rate3, 'Weighted On-Base Average'),
    rate('ISO', 'ISO', rate3, 'Isolated Power'),
    rate('BABIP', 'BABIP', rate3, 'Batting Average on Balls in Play'),
    rate('K%', 'K%', percent, 'Strikeout Rate', false),
    rate('BB%', 'BB%', percent, 'Walk Rate'),
    rate('BB/K', 'BB/K', two, 'Walks per Strikeout'),
    rate('RISP', 'RISP', rate3, 'Average With Runners in Scoring Position'),
    rate('RC', 'RC', one, 'Runs Created'),
    count('ROE', 'ROE', 'Reached on Error', false),
    count('HRO', 'HRO', 'Home Run Outs', false),
    count('FBO', 'FBO', 'Foul Outs', false),
  ];
}

function contactCols(): Column<Row>[] {
  const c = (key: keyof ReturnType<typeof contactRates>, label: string, name: string): Column<Row> => ({ key, label, name, value: (r) => contactRates(r.c)[key], text: (r) => percent(contactRates(r.c)[key]), lead: false });
  return [c('ground', 'GB%', 'Grounders'), c('line', 'LD%', 'Line Drives'), c('fly', 'FB%', 'Fly Balls'), c('pop', 'PU%', 'Pop-Ups'), c('pull', 'Pull%', 'Pulled'), c('center', 'Ctr%', 'Up the Middle'), c('oppo', 'Oppo%', 'Opposite Field')];
}
