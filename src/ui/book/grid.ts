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
import { HAND, type HandMark } from './hand.ts';

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

/** Fit one of Steve's strokes into a box: `flip` mirrors it left to right, `turn` tilts it (degrees). */
function hand(m: HandMark, x: number, y: number, w: number, h: number, cls: string, flip = false, turn = 0): SVGElement {
  const sx = w / m.w;
  const sy = h / m.h;
  const t = `rotate(${turn.toFixed(2)} ${(x + w / 2).toFixed(2)} ${(y + h / 2).toFixed(2)}) translate(${(flip ? x + w : x).toFixed(2)} ${y.toFixed(2)}) scale(${(flip ? -sx : sx).toFixed(4)} ${sy.toFixed(4)})`;
  return svg('path', { d: m.d, transform: t, class: cls });
}

/**
 * A small random source seeded from the play itself (Steve, Nov 23), so a written mark's wobble is
 * the same on every redraw and in shared pictures.
 */
function seeded(key: string): () => number {
  let a = 2166136261;
  for (let i = 0; i < key.length; i++) a = Math.imul(a ^ key.charCodeAt(i), 16777619) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The box art for one at-bat, `width` × `height` points (its column's width and its row's height).
 * What a scorebook prints stays clean (the faint diamond, the pitch boxes); what the scorer writes is
 * in Steve's hand (Steve, Nov 23): the out loop, the runner's path, the highlighter, the run mark,
 * RBI strokes, the inning-end slash, and the leadoff x.
 */
export function boxPicture(b: BookBox, width = 72, height = 72, leadoff = false): SVGSVGElement {
  const u = Math.min(width, height) / 60;
  const vw = width / u;
  const vh = height / u;
  const oy = (vh - 60) / 2;
  const top = -oy;
  const bottom = 60 + oy;
  const edge = 4 / u + 0.4;
  const right = vw - edge;
  const cx = vw / 2;
  const rand = seeded(`${b.event}:${b.batter}:${b.inning}:${b.code}`);
  const wob = (n: number) => (rand() * 2 - 1) * n;
  // Text in points never under 12: a size in units for a base size, raised when the box is small.
  const text = (base: number) => Math.max(base, 12 / u);
  // One pen (Steve, Nov 23): everything written shares the weight of the handwritten play code, about
  // 8% of the code's size, so nothing written is heavier than the writing.
  const pen = (text(16) * 0.08).toFixed(2);
  // A 38-unit diamond (about 46 points at Normal), printed faintly in every box.
  const HOME = { x: cx, y: 51 };
  const FIRST = { x: cx + 19, y: 32 };
  const SECOND = { x: cx, y: 13 };
  const THIRD = { x: cx - 19, y: 32 };
  const PATH = [HOME, FIRST, SECOND, THIRD, HOME];
  const diamond = `M${HOME.x} ${HOME.y} L${FIRST.x} ${FIRST.y} L${SECOND.x} ${SECOND.y} L${THIRD.x} ${THIRD.y} Z`;
  const parts: SVGElement[] = [];
  // The run: a yellow highlighter swipe, a little uneven and a little past the lines.
  if (b.scored) {
    const pts = [HOME, FIRST, SECOND, THIRD].map((p) => {
      const dx = p.x - cx;
      const dy = p.y - 32;
      const out = 1.2 + rand() * 2.2;
      const len = Math.hypot(dx, dy) || 1;
      return `${(p.x + (dx / len) * out + wob(0.8)).toFixed(2)},${(p.y + (dy / len) * out + wob(0.8)).toFixed(2)}`;
    });
    parts.push(svg('polygon', { points: pts.join(' '), class: 'bk-run' }));
  }
  parts.push(svg('path', { d: diamond, class: 'bk-diamond' }));
  // The bases the batter ran, traced along each base path with the same pen that writes the play
  // (Steve, Nov 23: pen weight, not marker): one stroke per path, slightly bowed and a little short
  // or long at the ends, the way a hand traces a line.
  const leg = (a: { x: number; y: number }, c: { x: number; y: number }) => {
    const dx = c.x - a.x;
    const dy = c.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    // Registered on the printed base path (Steve, Nov 23): the hand's wobble stays within about a point.
    const bow = wob(0.6);
    const x1 = a.x + wob(0.25);
    const y1 = a.y + wob(0.25);
    const x2 = c.x + wob(0.25);
    const y2 = c.y + wob(0.25);
    const qx = (a.x + c.x) / 2 + nx * bow;
    const qy = (a.y + c.y) / 2 + ny * bow;
    parts.push(svg('path', { d: `M${x1.toFixed(2)} ${y1.toFixed(2)} Q${qx.toFixed(2)} ${qy.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`, class: 'bk-ran', 'stroke-width': pen }));
  };
  if (b.tb) {
    // A tiebreak runner starts on second: from second on.
    const pts = PATH.slice(2, (b.scored ? 4 : 2) + 1);
    for (let k = 0; k + 1 < pts.length; k++) leg(pts[k]!, pts[k + 1]!);
  } else {
    const legs = Math.min(4, b.reached);
    for (let k = 0; k < legs; k++) leg(PATH[k]!, PATH[k + 1]!);
  }
  // The run mark: a small solid diamond in the bottom-left corner, drawn by hand, so a run never
  // depends on the highlighter's color.
  if (b.scored) {
    const x = edge + 4.5;
    const y = bottom - 9.5;
    const p = (dx: number, dy: number) => `${(x + dx + wob(0.5)).toFixed(2)},${(y + dy + wob(0.5)).toFixed(2)}`;
    parts.push(svg('polygon', { points: [p(0, -4.5), p(4.5, 0), p(0, 4.5), p(-4.5, 0)].join(' '), class: 'bk-ran-mark' }));
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
    // ITP, not IP: a baseball scorer reads IP as an illegal pitch (Steve, Nov 23).
    const ip = svg('text', { x: edge, y: top + noteSize - 1, 'font-size': noteSize, class: 'bk-note' });
    ip.textContent = 'ITP';
    parts.push(ip);
  }
  // RBI as pen strokes in the top-right corner, each leaning a little its own way.
  if (b.rbi > 0) {
    for (let k = 0; k < Math.min(4, b.rbi); k++) {
      const x = right - 1.2 - k * 3.4;
      parts.push(svg('line', { x1: (x + wob(0.4)).toFixed(2), y1: (top + 2.6).toFixed(2), x2: (x - 0.8 + wob(0.5)).toFixed(2), y2: (top + 9.6).toFixed(2), class: 'bk-rbi-tally', 'stroke-width': pen }));
    }
  }
  // The pitches: small printed boxes along the top, each marked by hand (Steve, Nov 23): a dot for
  // a ball, a slash for a strike, a dash for a foul.
  if (b.pitches?.length) {
    const marks = b.pitches.slice(0, 8);
    const start = b.ip ? edge + noteSize * 1.75 : edge;
    const end = b.rbi > 0 ? right - 14 : right;
    const gap = 1.5;
    const d = Math.min(10, (end - start - gap * (marks.length - 1)) / marks.length);
    marks.forEach((p, k) => {
      const x = start + k * (d + gap);
      const y = top + 0.5;
      parts.push(svg('rect', { x: x.toFixed(2), y: y.toFixed(2), width: d.toFixed(2), height: d.toFixed(2), class: 'bk-pitch-box' }));
      if (p === 'ball') parts.push(hand(HAND.dot, x + d * 0.3, y + d * 0.3, d * 0.4, d * 0.42, 'bk-pitch bk-pitch-ball', false, wob(10)));
      else if (p === 'foul') parts.push(hand(HAND.dash, x + d * 0.14, y + d * 0.38, d * 0.72, d * 0.24, 'bk-pitch bk-pitch-foul', false, wob(5)));
      else parts.push(hand(HAND.slash, x + d * 0.2, y + d * 0.12, d * 0.6, d * 0.76, 'bk-pitch bk-pitch-strike', false, wob(5)));
    });
  }
  // The leadoff x (Steve, Nov 23): at the left of the box of the batter who led off this inning.
  if (leadoff) parts.push(hand(HAND.x, edge + 0.3, 32 - 3.8, 7, 7.6, 'bk-leadoff', false, wob(6)));
  // End of the half-inning (Steve's sketch, Nov 12, and his note, Nov 13): his slash across the
  // box's bottom-right corner, reaching into the box below and the box to the right.
  if (b.halfEnd) {
    const bow = wob(0.8);
    parts.push(svg('path', { d: `M${(vw - 9).toFixed(2)} ${(bottom + 9).toFixed(2)} Q${(vw + bow).toFixed(2)} ${(bottom + bow).toFixed(2)} ${(vw + 9).toFixed(2)} ${(bottom - 9).toFixed(2)}`, class: 'bk-half-end', 'stroke-width': pen }));
  }
  if (b.out !== null) {
    // The out number inside Steve's own O, looped around it in red pen, a little uneven.
    const size = text(12);
    const r = Math.max(7.5, size * 0.62);
    const lw = r * 2 * (1.02 + rand() * 0.06);
    const lh = r * 2 * (1.04 + rand() * 0.06);
    const turn = wob(6);
    // Set in by the loop's tilted size, so it never comes within 4 points of the column line.
    const half = (Math.max(lw, lh) / 2) * (1 + Math.abs(Math.sin((turn * Math.PI) / 180)) * 0.5);
    const ox = right - half - 0.3;
    const oc = bottom - lh / 2 - 2.5;
    const n = svg('text', { x: ox, y: oc + size * 0.34, 'font-size': size, class: 'bk-out-num', 'text-anchor': 'middle' });
    n.textContent = String(b.out);
    parts.push(svg('path', { d: penLoop(ox, oc, lw / 2, lh / 2, turn, rand), class: 'bk-out', 'stroke-width': pen }), n);
  }
  return svg(
    'svg',
    { viewBox: `0 ${top.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`, width: width.toFixed(2), height: height.toFixed(2), class: `bk-box-art${b.halfEnd ? ' bk-box-ends' : ''}`, 'aria-hidden': 'true', focusable: 'false' },
    ...parts,
  );
}

/**
 * The red-pen loop around an out number (Steve, Nov 23): drawn the way a hand circles a number, one
 * stroke a little uneven in its roundness that starts and ends near the top and doesn't quite meet
 * or overlaps a touch, at the pen's weight.
 */
function penLoop(cx: number, cy: number, rx: number, ry: number, turn: number, rand: () => number): string {
  const start = ((-110 + (rand() * 2 - 1) * 20) * Math.PI) / 180;
  const sweep = ((340 + rand() * 30) * Math.PI) / 180;
  const n = 12;
  const tilt = (turn * Math.PI) / 180;
  const pts: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const a = start + (sweep * k) / n;
    const r = 1 + (rand() * 2 - 1) * 0.04;
    const x = Math.cos(a) * rx * r;
    const y = Math.sin(a) * ry * r;
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }
  // A smooth stroke through the points: quadratic curves through each midpoint.
  let d = `M${pts[0]![0].toFixed(2)} ${pts[0]![1].toFixed(2)}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const [x, y] = pts[k]!;
    const [nx, ny] = pts[k + 1]!;
    d += ` Q${x.toFixed(2)} ${y.toFixed(2)} ${((x + nx) / 2).toFixed(2)} ${((y + ny) / 2).toFixed(2)}`;
  }
  const last = pts[pts.length - 1]!;
  return `${d} L${last[0].toFixed(2)} ${last[1].toFixed(2)}`;
}

/** The leadoff x on its own, for an inning whose leadoff batter hasn't batted yet. */
export function leadoffPicture(width = 72, height = 72): SVGSVGElement {
  const u = Math.min(width, height) / 60;
  const vw = width / u;
  const vh = height / u;
  const top = -(vh - 60) / 2;
  const edge = 4 / u + 0.4;
  return svg(
    'svg',
    { viewBox: `0 ${top.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`, width: width.toFixed(2), height: height.toFixed(2), class: 'bk-box-art bk-leadoff-only', 'aria-hidden': 'true', focusable: 'false' },
    hand(HAND.x, edge + 0.3, 32 - 3.8, 7, 7.6, 'bk-leadoff'),
  );
}

const drawn = new WeakMap<HTMLElement, { b: BookBox; leadoff: boolean }>();

/** Redraw every box at the width its column settled on (inside the column's line). */
export function resizeBoxes(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.bk-grid .bk-box').forEach((btn) => {
    const d = drawn.get(btn);
    const w = btn.clientWidth;
    const ht = btn.clientHeight;
    if (d && w && ht) btn.replaceChildren(boxPicture(d.b, w, ht, d.leadoff));
  });
  root.querySelectorAll<HTMLElement>('.bk-grid td.bk-cell > .bk-leadoff-only').forEach((art) => {
    const cell = art.parentElement!;
    const w = cell.clientWidth;
    const ht = cell.clientHeight;
    if (w && ht) art.replaceWith(leadoffPicture(w, ht));
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
        // The leadoff x goes in the first box of an inning, for the batter who leads it off.
        const leadoff = k === 0 && page.leadoff.get(n) === row.slot;
        if (!b) {
          cells.push(h('td', { class: `bk-cell${innStart}${current ? ' bk-due' : ''}` }, leadoff ? leadoffPicture() : null));
          continue;
        }
        const editable = b.event >= 0;
        const btn = h(
          'button',
          { type: 'button', class: 'bk-box', 'aria-label': editable ? `${b.words} Edit Play.` : b.words, ...(editable ? {} : { 'aria-disabled': 'true' }) },
          boxPicture(b, 72, 72, leadoff),
        );
        drawn.set(btn, { b, leadoff });
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
