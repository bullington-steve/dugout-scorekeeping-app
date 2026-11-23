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

// Each box is drawn in units: the box's shorter side is 60 units (72 points at Normal, 1.2 points a
// unit), and the long side gets the extra room (Steve, Nov 20: the boxes were width-limited, so the
// columns widened and the marks grew with them). The diamond sits in the middle; the pitch marks, RBI
// tallies, and the out circle keep to the corners, at least 4 points from the column lines. Written
// marks never go under 12 points, whatever the zoom (Page, Normal, Close-up; Steve, Nov 21).

/** The box art for one at-bat, `width` × `height` points (its column's width and its row's height). */
export function boxPicture(b: BookBox, width = 72, height = 72): SVGSVGElement {
  const u = Math.min(width, height) / 60;
  const vw = width / u;
  const vh = height / u;
  const oy = (vh - 60) / 2;
  const top = -oy;
  const bottom = 60 + oy;
  const edge = 4 / u + 0.4;
  const right = vw - edge;
  const cx = vw / 2;
  // Text in points never under 12: a size in units for a base size, raised when the box is small.
  const text = (base: number) => Math.max(base, 12 / u);
  // A 38-unit diamond (about 46 points at Normal), up from 34 in the old 60-point box.
  const HOME = { x: cx, y: 51 };
  const FIRST = { x: cx + 19, y: 32 };
  const SECOND = { x: cx, y: 13 };
  const THIRD = { x: cx - 19, y: 32 };
  const PATH = [HOME, FIRST, SECOND, THIRD, HOME];
  const diamond = `M${HOME.x} ${HOME.y} L${FIRST.x} ${FIRST.y} L${SECOND.x} ${SECOND.y} L${THIRD.x} ${THIRD.y} Z`;
  const parts: SVGElement[] = [];
  if (b.scored) parts.push(svg('path', { d: diamond, class: 'bk-run' }));
  parts.push(svg('path', { d: diamond, class: 'bk-diamond' }));
  // The bases the batter ran, in pencil.
  if (b.tb) {
    // A tiebreak runner starts on second: pencil from second on.
    const pts = PATH.slice(2, (b.scored ? 4 : 2) + 1);
    if (pts.length > 1) parts.push(svg('polyline', { points: pts.map((p) => `${p.x},${p.y}`).join(' '), class: 'bk-ran' }));
  } else {
    const legs = Math.min(4, b.reached);
    if (legs > 0) parts.push(svg('polyline', { points: PATH.slice(0, legs + 1).map((p) => `${p.x},${p.y}`).join(' '), class: 'bk-ran' }));
  }
  // The run mark: a small solid diamond in the bottom-left corner, so a run never depends on the highlighter's color.
  if (b.scored) {
    const x = edge + 4.5;
    const y = bottom - 9.5;
    parts.push(svg('path', { d: `M${x} ${y - 4.5} L${x + 4.5} ${y} L${x} ${y + 4.5} L${x - 4.5} ${y} Z`, class: 'bk-ran-mark' }));
  }
  // A thin line from home toward where the ball went: the tapped spot, or else
  // the fielder's usual spot, so a ball to the outfield always reaches the outfield.
  const to = b.loc ?? (b.fielder ? SPOTS[b.fielder] : null);
  // A ball over the fence (a home run not inside the park, or a home run out) always runs the full length.
  const gone = (b.result === 'HR' && !b.ip) || b.result === 'HRO';
  if (to) {
    const d = Math.hypot(to.x, to.y) || 1;
    let len = gone ? 40 : 11 + 29 * Math.min(1, d / 280);
    // Keep the line's end (and its dot) inside the box's 4-point margin.
    const dx = Math.abs(to.x / d);
    if (dx > 0) len = Math.min(len, (cx - edge - 2) / dx);
    const ex = HOME.x + (to.x / d) * len;
    const ey = HOME.y - (to.y / d) * len;
    parts.push(svg('line', { x1: HOME.x, y1: HOME.y, x2: ex, y2: ey, class: 'bk-ball' }), svg('circle', { cx: ex, cy: ey, r: 1.6, class: 'bk-ball-end' }));
  }
  // The play code at 16 units (about 19 points at Normal), squeezed only when it's long.
  const code = svg('text', { x: cx, y: 38, 'font-size': text(16), class: `bk-code${b.scored ? ' bk-code-run' : ''}`, 'text-anchor': 'middle' });
  code.textContent = b.code;
  if (b.code.length > 4) code.setAttribute('textLength', '34');
  parts.push(code);
  const noteSize = text(12);
  if (b.ip) {
    const ip = svg('text', { x: edge, y: top + noteSize - 1, 'font-size': noteSize, class: 'bk-note' });
    // ITP, not IP: a baseball scorer reads IP as an illegal pitch (Steve, Nov 23).
    ip.textContent = 'ITP';
    parts.push(ip);
  }
  // Fixed corners, like a printed scorecard (Master Spec §4): RBI as tally strokes in the top-right
  // corner, and the pitch sequence as small marks along the top (a filled dot a strike, an open
  // dot a ball, a dash a foul), so they never crowd the play in the middle.
  if (b.rbi > 0) {
    for (let k = 0; k < Math.min(4, b.rbi); k++) parts.push(svg('line', { x1: right - 0.7 - k * 3.2, y1: top + 3, x2: right - 0.7 - k * 3.2, y2: top + 10, class: 'bk-rbi-tally' }));
  }
  // About 10 units each, smaller only when a long at-bat needs the room.
  if (b.pitches?.length) {
    const marks = b.pitches.slice(0, 8);
    const start = b.ip ? edge + noteSize * 1.75 : edge;
    const end = b.rbi > 0 ? right - 14 : right;
    const gap = 1.5;
    const d = Math.min(10, (end - start - gap * (marks.length - 1)) / marks.length);
    const r = d / 2;
    marks.forEach((p, k) => {
      const x = start + r + k * (d + gap);
      const cy = top + r + 0.5;
      if (p === 'ball') parts.push(svg('circle', { cx: x, cy, r: r - 0.7, class: 'bk-pitch bk-pitch-ball' }));
      else if (p === 'foul') parts.push(svg('line', { x1: x - r + 0.8, y1: cy, x2: x + r - 0.8, y2: cy, class: 'bk-pitch bk-pitch-foul' }));
      else parts.push(svg('circle', { cx: x, cy, r: r - 0.4, class: 'bk-pitch bk-pitch-strike' }));
    });
  }
  // End of the half-inning (Steve's sketch, Nov 12, and his note, Nov 13): a slash centered on the
  // box's bottom-right corner, reaching into the box below and the box to the right, as a clean pencil
  // line about as heavy as the base paths, slim enough to stay clear of the next box's runner.
  if (b.halfEnd) parts.push(svg('line', { x1: vw - 9, y1: bottom + 9, x2: vw + 9, y2: bottom - 9, class: 'bk-half-end' }));
  if (b.out !== null) {
    // The out number in a red-pen circle in the bottom-right corner (12 units, about 14 points at Normal).
    const size = text(12);
    const r = Math.max(7.5, size * 0.62);
    const ox = right - r - 0.5;
    const oc = bottom - r - 3;
    const n = svg('text', { x: ox, y: oc + size * 0.34, 'font-size': size, class: 'bk-out-num', 'text-anchor': 'middle' });
    n.textContent = String(b.out);
    parts.push(svg('circle', { cx: ox, cy: oc, r, class: 'bk-out' }), n);
  }
  return svg(
    'svg',
    { viewBox: `0 ${top.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`, width: width.toFixed(2), height: height.toFixed(2), class: `bk-box-art${b.halfEnd ? ' bk-box-ends' : ''}`, 'aria-hidden': 'true', focusable: 'false' },
    ...parts,
  );
}

const drawn = new WeakMap<HTMLElement, BookBox>();

/** Redraw every box at the width its column settled on (inside the column's line). */
export function resizeBoxes(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.bk-grid .bk-box').forEach((btn) => {
    const b = drawn.get(btn);
    const w = btn.clientWidth;
    const ht = btn.clientHeight;
    if (b && w && ht) btn.replaceChildren(boxPicture(b, w, ht));
  });
}

export function drawGrid(page: BookPage, name: (key: string) => string, number: (key: string) => string, pos: (key: string) => string, on: GridHandlers): HTMLElement {
  const head = h(
    'tr',
    {},
    // Batting spots never carry # (that's for jersey numbers): the column is the order, "1.", "2.".
    h('th', { scope: 'col', class: 'bk-num', 'aria-label': 'Batting order' }, ''),
    h('th', { scope: 'col', class: 'bk-batter' }, 'Batter'),
    // The number sits in its own span so a batted-around inning's number can stay at the left edge
    // of its wide column, in view beside the names while you swipe through the rally (Nov 22).
    ...page.innings.map((n) => {
      const wide = (page.widths.get(n) ?? 1) > 1;
      return h(
        'th',
        { scope: 'col', class: `bk-inning bk-inn-start${wide ? ' bk-inn-wide' : ''}${page.current?.inning === n ? ' bk-current' : ''}`, colspan: String(page.widths.get(n) ?? 1) },
        h('span', { class: 'bk-inn-num' }, String(n)),
      );
    }),
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
    // move ("SS→P (5)"), and for a sub the inning they came in. Anything missing collapses.
    const names = row.players.flatMap((p, i) => {
      const label = name(p);
      const last = i === row.players.length - 1;
      const cls = `bk-name${on.name && page.team === 'us' ? ' bk-name-link' : ''}${last ? '' : ' bk-name-before'}`;
      let el: HTMLElement;
      if (on.name && page.team === 'us') {
        el = h('button', { type: 'button', class: cls }, label);
        el.addEventListener('click', () => on.name!(p));
      } else el = h('span', { class: cls }, label);
      handLean(el, label);
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
        drawn.set(btn, b);
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

/**
 * A small, fixed lean for a hand-written name (Steve, Nov 22): about ±1° of tilt and ±1 point of
 * baseline, worked out from the name itself so it's the same every time.
 */
function handLean(el: HTMLElement, label: string): void {
  let n = 2166136261;
  for (let i = 0; i < label.length; i++) n = Math.imul(n ^ label.charCodeAt(i), 16777619) >>> 0;
  const tilt = ((n % 201) / 100 - 1).toFixed(2);
  const lift = ((((n >>> 8) % 201) / 100) - 1).toFixed(2);
  el.style.setProperty('--tilt', `${tilt}deg`);
  el.style.setProperty('--lift', `${lift}px`);
}

/** "5th", "1st": an inning the way a scorer writes it. */
function ordinalShort(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
