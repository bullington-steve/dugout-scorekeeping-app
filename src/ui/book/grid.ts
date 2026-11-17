/*
 * The scorebook grid (SPEC §6): a box per at-bat, # and Batter pinned while
 * the innings scroll sideways. Each box: a small diamond with the path the
 * batter ran in pencil, the play code in Steve's hand, a thin line toward
 * where the ball went, outs circled in red pen, runs in yellow highlighter
 * with a small solid pencil diamond (so a run never depends on color).
 */
import type { BookBox, BookPage } from '../../app/book.ts';
import { rowTotals } from '../../app/book.ts';
import { SPOTS } from '../../game/field.ts';
import { h, svg } from '../dom.ts';

export interface GridHandlers {
  /** Tap a box: Edit Play. */
  box: (b: BookBox) => void;
  /** Tap one of our names: the player card. */
  name: ((player: string) => void) | null;
}

// The diamond inside a 60-point box: home at the bottom.
const HOME = { x: 30, y: 49 };
const FIRST = { x: 47, y: 32 };
const SECOND = { x: 30, y: 15 };
const THIRD = { x: 13, y: 32 };
const PATH = [HOME, FIRST, SECOND, THIRD, HOME];

/** A Book box as a picture. mini: the Game tab's small copy, with a bigger code so it reads at 30 points. */
export function boxPicture(b: BookBox, mini = false): SVGSVGElement {
  const diamond = `M${HOME.x} ${HOME.y} L${FIRST.x} ${FIRST.y} L${SECOND.x} ${SECOND.y} L${THIRD.x} ${THIRD.y} Z`;
  const parts: SVGElement[] = [];
  if (b.scored) {
    parts.push(svg('path', { d: diamond, class: 'bk-run' }));
  }
  parts.push(svg('path', { d: diamond, class: 'bk-diamond' }));
  // The bases the batter ran, in pencil.
  const legs = b.tb ? 0 : Math.min(4, b.reached);
  if (b.tb) {
    // A tiebreak runner starts on second: pencil from second on.
    const to = b.scored ? 4 : 2;
    const pts = PATH.slice(2, to + 1);
    if (pts.length > 1) parts.push(svg('polyline', { points: pts.map((p) => `${p.x},${p.y}`).join(' '), class: 'bk-ran' }));
  } else if (legs > 0) {
    parts.push(svg('polyline', { points: PATH.slice(0, legs + 1).map((p) => `${p.x},${p.y}`).join(' '), class: 'bk-ran' }));
  }
  // The run mark: a small solid diamond in the corner, so a run never depends on the highlighter's color.
  if (b.scored) parts.push(svg('path', { d: 'M8 46 L12.5 50.5 L8 55 L3.5 50.5 Z', class: 'bk-ran-mark' }));
  // A thin line from home toward where the ball went: the tapped spot, or else
  // the fielder's usual spot, so a ball to the outfield always reaches the outfield.
  const to = b.loc ?? (b.fielder ? SPOTS[b.fielder] : null);
  // A ball over the fence (a home run not inside the park, or a home run out) always runs the full length.
  const gone = (b.result === 'HR' && !b.ip) || b.result === 'HRO';
  // The small copy skips the line so the code stays clear.
  if (to && !mini) {
    const d = Math.hypot(to.x, to.y) || 1;
    const len = gone ? 36 : 10 + 26 * Math.min(1, d / 280);
    const ex = HOME.x + (to.x / d) * len;
    const ey = HOME.y - (to.y / d) * len;
    parts.push(svg('line', { x1: HOME.x, y1: HOME.y, x2: ex, y2: ey, class: 'bk-ball' }), svg('circle', { cx: ex, cy: ey, r: 1.6, class: 'bk-ball-end' }));
  }
  // The play code at 16 points (Steve, Nov 17).
  const code = svg('text', { x: 30, y: mini ? 40 : 37.5, 'font-size': mini ? 24 : 16, class: `bk-code${b.scored ? ' bk-code-run' : ''}`, 'text-anchor': 'middle' });
  code.textContent = b.code;
  if (b.code.length > (mini ? 3 : 4)) code.setAttribute('textLength', mini ? '44' : '34');
  parts.push(code);
  if (b.ip) {
    const ip = svg('text', { x: 2, y: 11, 'font-size': 12, class: 'bk-note' });
    ip.textContent = 'IP';
    parts.push(ip);
  }
  // Fixed corners, like a printed scorecard (Master Spec §4): RBI as tally strokes in the top-right
  // corner, and the pitch sequence as small marks along the top (a filled dot a strike, an open
  // dot a ball, a dash a foul), so they never crowd the play in the middle.
  if (!mini && b.rbi > 0) {
    for (let k = 0; k < Math.min(4, b.rbi); k++) parts.push(svg('line', { x1: 56 - k * 3.2, y1: 3, x2: 56 - k * 3.2, y2: 10, class: 'bk-rbi-tally' }));
  }
  // About 10 points each (Steve, Nov 16), smaller only when a long at-bat needs the room.
  if (!mini && b.pitches?.length) {
    const marks = b.pitches.slice(0, 8);
    const start = b.ip ? 18 : 2;
    const end = b.rbi > 0 ? 44 : 58;
    const gap = 1.5;
    const d = Math.min(10, (end - start - gap * (marks.length - 1)) / marks.length);
    const r = d / 2;
    marks.forEach((p, k) => {
      const x = start + r + k * (d + gap);
      const cy = r;
      if (p === 'ball') parts.push(svg('circle', { cx: x, cy, r: r - 0.7, class: 'bk-pitch bk-pitch-ball' }));
      else if (p === 'foul') parts.push(svg('line', { x1: x - r + 0.8, y1: cy, x2: x + r - 0.8, y2: cy, class: 'bk-pitch bk-pitch-foul' }));
      else parts.push(svg('circle', { cx: x, cy, r: r - 0.4, class: 'bk-pitch bk-pitch-strike' }));
    });
  }
  // End of the half-inning (Steve's sketch, Nov 12, and his note, Nov 13): a slash centered on the
  // box's bottom-right corner, reaching into the box below and the box to the right, as a clean pencil
  // line about as heavy as the base paths, slim enough to stay clear of the next box's runner.
  if (b.halfEnd && !mini) parts.push(svg('line', { x1: 49, y1: 71, x2: 71, y2: 49, class: 'bk-half-end' }));
  const ox = 50;
  if (b.out !== null) {
    // The out number at 12 points in a 15-point circle (Steve, Nov 17).
    const n = svg('text', { x: ox, y: 54.6, 'font-size': 12, class: 'bk-out-num', 'text-anchor': 'middle' });
    n.textContent = String(b.out);
    parts.push(svg('circle', { cx: ox, cy: 50.5, r: 7.5, class: 'bk-out' }), n);
  }
  return svg('svg', { viewBox: '0 0 60 60', class: `bk-box-art${b.halfEnd && !mini ? ' bk-box-ends' : ''}`, 'aria-hidden': 'true', focusable: 'false' }, ...parts);
}

export function drawGrid(page: BookPage, name: (key: string) => string, number: (key: string) => string, pos: (key: string) => string, on: GridHandlers): HTMLElement {
  const head = h(
    'tr',
    {},
    // Batting spots never carry # (that's for jersey numbers): the column is the order, "1.", "2.".
    h('th', { scope: 'col', class: 'bk-num', 'aria-label': 'Batting order' }, ''),
    h('th', { scope: 'col', class: 'bk-batter' }, 'Batter'),
    ...page.innings.map((n) =>
      h('th', { scope: 'col', class: `bk-inning bk-inn-start${page.current?.inning === n ? ' bk-current' : ''}`, colspan: String(page.widths.get(n) ?? 1) }, String(n)),
    ),
  );
  head.append(
    ...(['AB', 'R', 'H', 'RBI'] as const).map((k, i) =>
      h('th', { scope: 'col', class: `bk-tot${i === 0 ? ' bk-tot-first' : ''}`, 'aria-label': { AB: 'At-bats', R: 'Runs', H: 'Hits', RBI: 'Runs batted in' }[k] }, k),
    ),
  );
  const rows = page.rows.map((row) => {
    const isCurrent = page.current?.slot === row.slot;
    // Each player who batted in this spot, starter first, then subs, the way a scorer writes it:
    // the name, and under it what they'd jot down: jersey number, positions with the inning of any
    // move ("SS → P (5)"), and for a sub the inning they came in. Anything missing collapses.
    const names = row.players.flatMap((p, i) => {
      const label = name(p);
      const last = i === row.players.length - 1;
      const cls = `bk-name${on.name && page.team === 'us' ? ' bk-name-link' : ''}${last ? '' : ' bk-name-before'}`;
      let el: HTMLElement;
      if (on.name && page.team === 'us') {
        el = h('button', { type: 'button', class: cls }, label);
        el.addEventListener('click', () => on.name!(p));
      } else el = h('span', { class: cls }, label);
      const firstIn = i > 0 ? Math.min(...[...row.boxes.values()].flat().filter((b) => b.batter === p).map((b) => b.inning)) : Infinity;
      const sub =
        page.team === 'us'
          ? [number(p) ? `#${number(p)}` : '', pos(p), Number.isFinite(firstIn) ? `in ${ordinalShort(firstIn)}` : ''].filter(Boolean).join(' · ')
          : '';
      return sub ? [el, h('span', { class: 'bk-jersey', 'aria-hidden': 'true' }, sub)] : [el];
    });
    const cells: HTMLElement[] = [];
    for (const n of page.innings) {
      const width = page.widths.get(n) ?? 1;
      const boxes = row.boxes.get(n) ?? [];
      for (let k = 0; k < width; k++) {
        const b = boxes[k];
        const current = isCurrent && page.current?.inning === n && k === boxes.length;
        const innStart = k === 0 ? ' bk-inn-start' : '';
        if (!b) {
          cells.push(h('td', { class: `bk-cell${innStart}${current ? ' bk-due' : ''}` }));
          continue;
        }
        const editable = b.event >= 0;
        const btn = h(
          'button',
          { type: 'button', class: 'bk-box', 'aria-label': editable ? `${b.words} Edit Play.` : b.words, ...(editable ? {} : { 'aria-disabled': 'true' }) },
          boxPicture(b),
        );
        if (editable) btn.addEventListener('click', () => on.box(b));
        cells.push(h('td', { class: `bk-cell${innStart}` }, btn));
      }
    }
    const num = page.team === 'us' ? number(row.players[row.players.length - 1]!) : '';
    return h(
      'tr',
      { class: isCurrent ? 'bk-row-current' : '' },
      h('th', { scope: 'row', class: 'bk-num' }, `${row.slot + 1}.`, num ? h('span', { class: 'sk-visually-hidden' }, `, number ${num}`) : ''),
      h('td', { class: `bk-batter${isCurrent ? ' bk-current' : ''}` }, ...names),
      ...cells,
      ...(() => {
        const t = rowTotals(row);
        return [t.ab, t.r, t.h, t.rbi].map((v, i) => h('td', { class: `bk-tot${i === 0 ? ' bk-tot-first' : ''}` }, String(v)));
      })(),
    );
  });
  return h(
    'div',
    { class: 'bk-grid-wrap', tabindex: '0', role: 'region', 'aria-label': 'Scorebook' },
    h('table', { class: 'bk-grid' }, h('thead', {}, head), h('tbody', {}, ...rows)),
  );
}

/** "5th", "1st": an inning the way a scorer writes it. */
function ordinalShort(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
