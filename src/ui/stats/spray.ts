/*
 * Spray charts (SPEC §7–8): every ball in play on the field. Dots: single
 * green, double blue with one ring, triple purple with two rings, home run
 * gold past the fence with a dark center, out hollow, error a red ✕. Past
 * 60 balls the dots shrink. The whole chart is one tap target (the nearest
 * ball opens); the list under it reads every ball for VoiceOver.
 */
import type { App } from '../../app/app.ts';
import type { ScopedDot } from '../../app/scope.ts';
import { replaceEvent } from '../../engine/edit.ts';
import type { GameEvent, Loc } from '../../engine/types.ts';
import { describePlay } from '../../engine/words.ts';
import { battedType } from '../../stats/batting.ts';
import { h, svg } from '../dom.ts';
import { drawField, pickSpot } from '../game/fieldsheet.ts';
import { goTo } from '../nav.ts';
import { PICTURE } from '../picture.ts';
import { dayText } from '../when.ts';

const KIND_WORDS: Record<ScopedDot['kind'], string> = { '1B': 'single', '2B': 'double', '3B': 'triple', HR: 'home run', out: 'out', E: 'error' };

function dotMark(d: ScopedDot, r: number): SVGElement {
  const x = d.loc.x;
  const y = -d.loc.y;
  const edge = { stroke: PICTURE.dotEdge, 'stroke-width': r * 0.28 };
  switch (d.kind) {
    case '1B':
      return svg('circle', { cx: x, cy: y, r, fill: PICTURE.dot1B, ...edge });
    case '2B':
      return svg('g', {}, svg('circle', { cx: x, cy: y, r, fill: PICTURE.dot2B, ...edge }), svg('circle', { cx: x, cy: y, r: r * 0.5, fill: 'none', stroke: PICTURE.dotOut, 'stroke-width': r * 0.22 }));
    case '3B':
      return svg(
        'g',
        {},
        svg('circle', { cx: x, cy: y, r, fill: PICTURE.dot3B, ...edge }),
        svg('circle', { cx: x, cy: y, r: r * 0.62, fill: 'none', stroke: PICTURE.dotOut, 'stroke-width': r * 0.16 }),
        svg('circle', { cx: x, cy: y, r: r * 0.3, fill: 'none', stroke: PICTURE.dotOut, 'stroke-width': r * 0.16 }),
      );
    case 'HR':
      return svg('g', {}, svg('circle', { cx: x, cy: y, r, fill: PICTURE.dotHR, ...edge }), svg('circle', { cx: x, cy: y, r: r * 0.38, fill: PICTURE.dotEdge }));
    case 'E': {
      const a = r * 0.8;
      return svg('path', { d: `M${x - a} ${y - a} L${x + a} ${y + a} M${x + a} ${y - a} L${x - a} ${y + a}`, stroke: PICTURE.dotE, 'stroke-width': r * 0.5, 'stroke-linecap': 'round' });
    }
    default:
      return svg('circle', { cx: x, cy: y, r: r * 0.85, fill: 'none', stroke: PICTURE.dotOut, 'stroke-width': r * 0.4 });
  }
}

/** "Sat, Oct 17 · Top of the 1st: Jess Kowalczyk grounds out to shortstop." */
export function dotText(app: App, d: ScopedDot): string {
  const game = d.team.games.find((g) => g.id === d.gameId);
  const name = (k: string) => d.team.players.find((p) => p.id === k)?.name ?? k;
  const when = game ? `${dayText(game.date)} vs ${game.opponent} · ` : '';
  const half = `${d.play.half === 'top' ? 'Top' : 'Bottom'} of inning ${d.play.inning}`;
  void app;
  return `${when}${half}: ${describePlay(d.play, name)}`;
}

/** Open a ball: the full field with it placed (drag to move it), the play, and View Game. */
export async function openDot(app: App, d: ScopedDot): Promise<void> {
  const game = d.team.games.find((g) => g.id === d.gameId);
  if (!game || !d.play.result) return;
  const spot = await pickSpot(app, d.play.result, {
    game,
    inning: d.play.inning,
    weField: d.play.team === 'them',
    start: d.loc,
    title: 'Ball in Play',
    saveLabel: 'Move It Here',
    extra: h('p', { class: 'sp-strip' }, dotText(app, d)),
    action: {
      label: 'View Game',
      run: () => {
        app.view(game.id === d.team.currentGameId ? null : game.id);
        goTo('book');
      },
    },
  });
  if (!spot || spot === 'skip' || !spot.loc) return;
  const loc: Loc = spot.loc;
  app.editGame(game.id, (g) => {
    const ev = g.events[d.play.i];
    if (!ev || (ev.t !== 'pa' && ev.t !== 'pitch')) return;
    g.events = replaceEvent(g.events, d.play.i, { ...ev, loc, ...(spot.fielder ? { fielder: spot.fielder } : {}) } as GameEvent);
  });
}

export interface Splits {
  balls: number;
  left: number;
  center: number;
  right: number;
  infield: number;
  outfield: number;
  ground: number;
  line: number;
  fly: number;
  pop: number;
}

/** Where balls went, by the spot on the field (angle and depth). */
export function splits(dots: readonly ScopedDot[]): Splits {
  const s: Splits = { balls: dots.length, left: 0, center: 0, right: 0, infield: 0, outfield: 0, ground: 0, line: 0, fly: 0, pop: 0 };
  for (const d of dots) {
    const angle = (Math.atan2(d.loc.x, d.loc.y) * 180) / Math.PI;
    if (angle < -15) s.left += 1;
    else if (angle > 15) s.right += 1;
    else s.center += 1;
    if (Math.hypot(d.loc.x, d.loc.y) < 130) s.infield += 1;
    else s.outfield += 1;
    const t = battedType(d.play);
    if (t) s[t] += 1;
  }
  return s;
}

export const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '–');

export interface ChartOptions {
  label: string;
  /** Shown above the field. */
  header?: Node;
}

export function sprayChart(app: App, dots: readonly ScopedDot[], opts: ChartOptions): HTMLElement {
  const field = drawField([]);
  const r = dots.length > 60 ? 6 : 9;
  for (const d of dots) field.append(dotMark(d, r));
  const counts = { hits: dots.filter((d) => ['1B', '2B', '3B', 'HR'].includes(d.kind)).length, outs: dots.filter((d) => d.kind === 'out').length };
  field.setAttribute('aria-label', `${opts.label}: ${dots.length} balls in play, ${counts.hits} hits, ${counts.outs} outs. The list below reads each one.`);
  field.classList.add('sp-field');
  field.addEventListener('click', (e) => {
    if (!dots.length) return;
    const ctm = field.getScreenCTM();
    if (!ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    let best: ScopedDot | null = null;
    let bestD = 40;
    for (const d of dots) {
      const dist = Math.hypot(d.loc.x - p.x, -d.loc.y - p.y);
      if (dist < bestD) {
        best = d;
        bestD = dist;
      }
    }
    if (best) void openDot(app, best);
  });
  const list = h(
    'details',
    { class: 'sk-details sp-list' },
    h('summary', {}, `Every Ball in Play (${dots.length})`),
    h(
      'ul',
      { class: 'sp-items' },
      ...dots.map((d) => {
        const b = h('button', { type: 'button', class: 'sp-item' }, `${KIND_WORDS[d.kind][0]!.toUpperCase()}${KIND_WORDS[d.kind].slice(1)}. ${dotText(app, d)}`);
        b.addEventListener('click', () => void openDot(app, d));
        return h('li', {}, b);
      }),
    ),
  );
  return h('figure', { class: 'sp-chart' }, opts.header ?? '', dots.length ? field : h('p', { class: 'sk-row-note' }, 'No balls in play with a spot yet. Turn on Hit Location in New Game to fill this in.'), dots.length ? list : '');
}

export function legend(): HTMLElement {
  const item = (kind: ScopedDot['kind'], label: string) => {
    const art = svg('svg', { viewBox: '-12 -12 24 24', class: 'sp-legend-dot', 'aria-hidden': 'true', 'data-contrast-skip': 'true' }, svg('rect', { x: -12, y: -12, width: 24, height: 24, fill: PICTURE.grass }));
    art.append(dotMark({ kind, loc: { x: 0, y: 0 } } as ScopedDot, 8));
    return h('li', {}, art, label);
  };
  return h('ul', { class: 'sp-legend', 'aria-label': 'Key' }, item('1B', 'Single'), item('2B', 'Double'), item('3B', 'Triple'), item('HR', 'Home Run'), item('out', 'Out'), item('E', 'Error'));
}
