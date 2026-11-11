/*
 * The Scout tab (SPEC §8): every opponent played, with games and record.
 * An opponent's card: a spray chart of everything they put in play, the
 * left / middle / right split, outfield share, and a plain hint; then each
 * hitter by their batting-order name, with a chart and a hint. Every hint
 * is fixed text picked from what was scored, never generated.
 */
import type { App } from '../../app/app.ts';
import { scoped, scopedDots, type ScopedDot } from '../../app/scope.ts';
import { battedType } from '../../stats/batting.ts';
import { recordText, teamRecord } from '../../stats/team.ts';
import type { SavedGame } from '../../store/model.ts';
import { h } from '../dom.ts';
import { openSheet } from '../sheet.ts';
import { legend, pct, splits, sprayChart, type Splits } from '../stats/spray.ts';

/** The fielding hint for where a team or hitter hits it. */
export function sideHint(sp: Splits): string {
  if (sp.balls < 3) return 'Not enough balls in play to read yet.';
  if (sp.right / sp.balls >= 0.45) return 'Hits to the right side. Shade toward first base and right field.';
  if (sp.left / sp.balls >= 0.45) return 'Pulls to the left side. Shade toward third base and left field.';
  if (sp.center / sp.balls >= 0.5) return 'Up the middle. Pitcher and short fielder, be ready.';
  return 'Sprays it around the field. Play everyone straight up.';
}

/** The hint for how a hitter hits it. */
export function typeHint(sp: Splits): string {
  const typed = sp.ground + sp.line + sp.fly + sp.pop;
  if (sp.balls < 3) return 'Not enough balls in play to read yet.';
  if (typed && sp.ground / typed >= 0.5) return 'Mostly on the ground: the infield will be busy.';
  if (typed && (sp.fly + sp.pop) / typed >= 0.5) return 'Lifts the ball. Outfielders, play deep.';
  if (typed && sp.line / typed >= 0.4) return 'Hits line drives. Infielders, stay ready.';
  return sideHint(sp);
}

export class ScoutScreen {
  readonly el = h('div', { class: 'sc-screen' });
  private readonly app: App;

  constructor(app: App) {
    this.app = app;
  }

  update(visible: boolean): void {
    if (!visible) return;
    const app = this.app;
    const team = app.team;
    const header = h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, 'Scout'));
    if (!team) {
      this.el.replaceChildren(header, h('section', { class: 'sk-card sk-soon' }, h('p', {}, 'Every team you play shows up here, with where they hit the ball.')));
      return;
    }
    const sc = scoped(app.data, team, 'career', true);
    const games = sc.parts[0]!.games;
    const byOpp = new Map<string, SavedGame[]>();
    for (const g of games) {
      const k = g.opponent.trim();
      byOpp.set(k, [...(byOpp.get(k) ?? []), g]);
    }
    const names = [...byOpp.keys()].sort((a, b) => a.localeCompare(b));
    const rows = names.map((name) => {
      const gs = byOpp.get(name)!;
      const rec = teamRecord(gs.filter((g) => g.saved));
      const b = h(
        'button',
        { type: 'button', class: 'sk-row sk-row-link sc-team' },
        h('span', { class: 'sc-team-main' }, h('span', { class: 'sk-row-label' }, name), h('span', { class: 'sc-team-sub' }, `${gs.length} ${gs.length === 1 ? 'game' : 'games'} · ${recordText(rec)} against them`)),
        h('span', { class: 'sk-chevron', 'aria-hidden': 'true' }, '›'),
      );
      b.addEventListener('click', () => this.openTeam(name, gs));
      return b;
    });
    this.el.replaceChildren(
      header,
      h('p', { class: 'sk-row-note' }, 'Where every opponent hits the ball. Scout fills in from games kept in Scorekeeper Mode with Hit Location on.'),
      rows.length ? h('div', { class: 'sk-stack' }, ...rows) : h('section', { class: 'sk-card sk-soon' }, h('p', {}, 'No opponents yet. Every team you play shows up here.')),
    );
  }

  private openTeam(name: string, games: SavedGame[]): void {
    const app = this.app;
    const team = app.team!;
    const sc = scoped(app.data, team, 'career', true);
    const ids = new Set(games.map((g) => g.id));
    const dots = scopedDots(sc, 'them', 'all').filter((d) => ids.has(d.gameId));
    const sp = splits(dots);
    const hitters = new Map<string, ScopedDot[]>();
    for (const d of dots) hitters.set(d.who, [...(hitters.get(d.who) ?? []), d]);
    const order: string[] = [];
    for (const g of [...games].sort((a, b) => b.date.localeCompare(a.date))) for (const s of g.setup.lineups.them) if (!order.includes(s.player)) order.push(s.player);
    for (const k of hitters.keys()) if (!order.includes(k)) order.push(k);
    const typed = sp.ground + sp.line + sp.fly + sp.pop;
    const head = h(
      'div',
      { class: 'st-chart-head' },
      h('p', { class: 'st-chart-line' }, `Left ${pct(sp.left, sp.balls)} · Middle ${pct(sp.center, sp.balls)} · Right ${pct(sp.right, sp.balls)}`),
      h('p', { class: 'st-chart-line' }, `Outfield ${pct(sp.outfield, sp.balls)} of balls in play${typed ? ` · Grounders ${pct(sp.ground, typed)}` : ''}`),
      h('p', { class: 'sc-hint' }, sideHint(sp)),
    );
    const per = order
      .filter((k) => hitters.has(k))
      .map((k) => {
        const mine = hitters.get(k)!;
        const s = splits(mine);
        const kinds = mine.filter((d) => battedType(d.play)).length;
        return h(
          'section',
          { class: 'sk-card sc-hitter' },
          h('h3', { class: 'st-chart-title' }, k),
          sprayChart(app, mine, {
            label: `${k} spray chart`,
            header: h('div', {}, h('p', { class: 'st-chart-line' }, `${mine.length} balls in play${kinds ? ` · Left ${pct(s.left, s.balls)}, Middle ${pct(s.center, s.balls)}, Right ${pct(s.right, s.balls)}` : ''}`), h('p', { class: 'sc-hint' }, typeHint(s))),
          }),
        );
      });
    openSheet({
      title: name,
      full: true,
      className: 'sc-sheet',
      body: h(
        'div',
        { class: 'sk-stack' },
        h('p', { class: 'sk-row-note' }, `${games.length} ${games.length === 1 ? 'game' : 'games'} · ${recordText(teamRecord(games.filter((g) => g.saved)))} against them.`),
        legend(),
        h('section', { class: 'sk-card' }, h('h2', { class: 'sk-label' }, 'The Whole Team'), sprayChart(app, dots, { label: `${name} spray chart`, header: head })),
        ...(per.length ? [h('h2', { class: 'sk-label' }, 'Hitter by Hitter'), ...per] : [h('p', { class: 'sk-row-note' }, 'No hitters with a spot on the field yet.')]),
      ),
      cancel: false,
      done: { label: 'Done', onClick: () => undefined },
    });
  }
}
