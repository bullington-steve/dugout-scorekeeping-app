/*
 * The scorebook grid (SPEC §6): a box per at-bat, # and Batter pinned while
 * the innings scroll sideways. Each box: a small diamond with the path the
 * batter ran in pencil, the play code in Steve's hand, a thin line toward
 * where the ball went, outs circled in red pen, runs in yellow highlighter
 * with a small solid pencil diamond (so a run never depends on color).
 */
import type { BookBox, BookPage } from '../../app/book.ts';
import { bookName, rowTotals } from '../../app/book.ts';
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

function boxPicture(b: BookBox): SVGSVGElement {
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
  // A thin line from home toward where the ball went.
  if (b.loc) {
    const d = Math.hypot(b.loc.x, b.loc.y) || 1;
    const len = 10 + 26 * Math.min(1, d / 280);
    const ex = HOME.x + (b.loc.x / d) * len;
    const ey = HOME.y - (b.loc.y / d) * len;
    parts.push(svg('line', { x1: HOME.x, y1: HOME.y, x2: ex, y2: ey, class: 'bk-ball' }), svg('circle', { cx: ex, cy: ey, r: 1.6, class: 'bk-ball-end' }));
  }
  const code = svg('text', { x: 30, y: 36.5, 'font-size': 14, class: `bk-code${b.scored ? ' bk-code-run' : ''}`, 'text-anchor': 'middle' });
  code.textContent = b.code;
  if (b.code.length > 4) code.setAttribute('textLength', '30');
  parts.push(code);
  if (b.ip) {
    const ip = svg('text', { x: 4, y: 11, 'font-size': 9, class: 'bk-note' });
    ip.textContent = 'IP';
    parts.push(ip);
  }
  if (b.out !== null) {
    const n = svg('text', { x: 50, y: 54, 'font-size': 10, class: 'bk-out-num', 'text-anchor': 'middle' });
    n.textContent = String(b.out);
    parts.push(svg('circle', { cx: 50, cy: 50.5, r: 6.2, class: 'bk-out' }), n);
  }
  return svg('svg', { viewBox: '0 0 60 60', class: 'bk-box-art', 'aria-hidden': 'true', focusable: 'false' }, ...parts);
}

export function drawGrid(page: BookPage, name: (key: string) => string, number: (key: string) => string, on: GridHandlers): HTMLElement {
  const head = h(
    'tr',
    {},
    h('th', { scope: 'col', class: 'bk-num' }, '#'),
    h('th', { scope: 'col', class: 'bk-batter' }, 'Batter'),
    ...page.innings.map((n) =>
      h('th', { scope: 'col', class: `bk-inning${page.current?.inning === n ? ' bk-current' : ''}`, colspan: String(page.widths.get(n) ?? 1) }, String(n)),
    ),
  );
  head.append(
    ...(['AB', 'R', 'H', 'RBI'] as const).map((k, i) =>
      h('th', { scope: 'col', class: `bk-tot${i === 0 ? ' bk-tot-first' : ''}`, 'aria-label': { AB: 'At-bats', R: 'Runs', H: 'Hits', RBI: 'Runs batted in' }[k] }, k),
    ),
  );
  const rows = page.rows.map((row) => {
    const isCurrent = page.current?.slot === row.slot;
    const names = row.players.map((p, i) => {
      const label = bookName(name(p));
      const last = i === row.players.length - 1;
      if (on.name && page.team === 'us') {
        const b = h('button', { type: 'button', class: `bk-name bk-name-link${last ? '' : ' bk-name-before'}` }, label);
        b.addEventListener('click', () => on.name!(p));
        return b;
      }
      return h('span', { class: `bk-name${last ? '' : ' bk-name-before'}` }, label);
    });
    const cells: HTMLElement[] = [];
    for (const n of page.innings) {
      const width = page.widths.get(n) ?? 1;
      const boxes = row.boxes.get(n) ?? [];
      for (let k = 0; k < width; k++) {
        const b = boxes[k];
        const current = isCurrent && page.current?.inning === n && k === boxes.length;
        if (!b) {
          cells.push(h('td', { class: `bk-cell${current ? ' bk-due' : ''}` }));
          continue;
        }
        const editable = b.event >= 0;
        const btn = h(
          'button',
          { type: 'button', class: 'bk-box', 'aria-label': editable ? `${b.words} Edit Play.` : b.words, ...(editable ? {} : { 'aria-disabled': 'true' }) },
          boxPicture(b),
        );
        if (editable) btn.addEventListener('click', () => on.box(b));
        cells.push(h('td', { class: 'bk-cell' }, btn));
      }
    }
    const num = page.team === 'us' ? number(row.players[row.players.length - 1]!) : '';
    return h(
      'tr',
      { class: isCurrent ? 'bk-row-current' : '' },
      h('th', { scope: 'row', class: 'bk-num' }, String(row.slot + 1), num ? h('span', { class: 'sk-visually-hidden' }, `, number ${num}`) : ''),
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
