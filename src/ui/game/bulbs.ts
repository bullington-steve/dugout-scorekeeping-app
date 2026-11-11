/*
 * Scoreboard bulbs. The bulbs are drawn once from a template ("00", "00:00",
 * "^00"); changing what's shown only switches bulbs on and off (cheap:
 * fill and opacity). Each lit bulb gets ONE soft glow behind it (LESSONS
 * 27). A new number "warms up" over half a second; with Reduce Motion it's
 * simply on.
 *
 * Template characters: 0 = a 5x7 cell, : = a 1-wide colon cell, ^ = a 5x7
 * cell for the top/bottom arrow.
 */
import { svg } from '../dom.ts';

const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  // Top of the inning: an arrow pointing up, high in the cell.
  '▲': ['00100', '01110', '11111', '00000', '00000', '00000', '00000'],
  // Bottom of the inning: pointing down, low in the cell.
  '▼': ['00000', '00000', '00000', '00000', '11111', '01110', '00100'],
  ':': ['0', '0', '1', '0', '1', '0', '0'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

const GAP = 1.4;

interface Cell {
  width: number;
  bulbs: SVGElement[]; // dot, glow, dot, glow…
}

export class BulbText {
  readonly el: SVGSVGElement;
  private readonly cells: Cell[] = [];
  private shown = '';

  constructor(template: string, className = '') {
    let x = 0;
    const glows = svg('g', { class: 'gm-glows' });
    const dots = svg('g', { class: 'gm-dots' });
    for (const t of template) {
      const width = t === ':' ? 1 : 5;
      const bulbs: SVGElement[] = [];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < width; col++) {
          const cx = x + col + 0.5;
          const cy = row + 0.5;
          const glow = svg('circle', { cx, cy, r: 0.78, class: 'gm-glow' });
          const dot = svg('circle', { cx, cy, r: 0.36, class: 'gm-bulb' });
          glows.append(glow);
          dots.append(dot);
          bulbs.push(dot, glow);
        }
      }
      this.cells.push({ width, bulbs });
      x += width + GAP;
    }
    const w = x - GAP;
    this.el = svg('svg', { viewBox: `-0.6 -0.6 ${w + 1.2} 8.2`, class: `gm-bulbs ${className}`, 'aria-hidden': 'true', focusable: 'false' }, glows, dots);
  }

  /** Text right-aligned to the template ("7" in "00" shows " 7"). */
  set(text: string): void {
    const t = text.slice(-this.cells.length).padStart(this.cells.length, ' ');
    if (t === this.shown) return;
    this.shown = t;
    [...t].forEach((ch, c) => {
      const cell = this.cells[c]!;
      const rows = GLYPHS[ch] ?? GLYPHS[' ']!;
      for (let i = 0; i < cell.width * 7; i++) {
        const row = rows[Math.floor(i / cell.width)] ?? '';
        const on = row[i % cell.width] === '1';
        const dot = cell.bulbs[i * 2]!;
        const glow = cell.bulbs[i * 2 + 1]!;
        if (dot.classList.contains('on') !== on) {
          dot.classList.toggle('on', on);
          glow.classList.toggle('on', on);
        }
      }
    });
  }
}
