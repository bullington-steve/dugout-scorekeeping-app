/*
 * Scoreboard numbers in 5x7 bulbs. The bulbs are drawn once; changing a
 * number only switches bulbs on and off (cheap: fill and opacity). Each lit
 * bulb gets ONE soft glow drawn behind it (LESSONS 27). A new number "warms
 * up" over half a second; with Reduce Motion it's simply on.
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
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

const GAP = 1.4;

export class BulbText {
  readonly el: SVGSVGElement;
  private readonly bulbs: SVGElement[][] = [];
  private shown = '';
  private readonly width: number;

  constructor(width: number, className = '') {
    this.width = width;
    const w = width * 5 + (width - 1) * GAP;
    this.el = svg('svg', {
      viewBox: `-0.6 -0.6 ${w + 0.2} 8.2`,
      class: `gm-bulbs ${className}`,
      'aria-hidden': 'true',
      focusable: 'false',
    });
    const glows = svg('g', { class: 'gm-glows' });
    const dots = svg('g', { class: 'gm-dots' });
    this.el.append(glows, dots);
    for (let c = 0; c < width; c++) {
      const cells: SVGElement[] = [];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          const cx = c * (5 + GAP) + col + 0.5;
          const cy = row + 0.5;
          const glow = svg('circle', { cx, cy, r: 0.78, class: 'gm-glow' });
          const dot = svg('circle', { cx, cy, r: 0.36, class: 'gm-bulb' });
          glows.append(glow);
          dots.append(dot);
          cells.push(dot, glow);
        }
      }
      this.bulbs.push(cells);
    }
  }

  /** Right-aligned text in the bulbs ("7" shows as " 7"). */
  set(text: string): void {
    const t = text.slice(-this.width).padStart(this.width, ' ');
    if (t === this.shown) return;
    this.shown = t;
    [...t].forEach((ch, c) => {
      const rows = GLYPHS[ch] ?? GLYPHS[' ']!;
      const cells = this.bulbs[c]!;
      for (let i = 0; i < 35; i++) {
        const on = rows[Math.floor(i / 5)]![i % 5] === '1';
        const dot = cells[i * 2]!;
        const glow = cells[i * 2 + 1]!;
        if (dot.classList.contains('on') !== on) {
          dot.classList.toggle('on', on);
          glow.classList.toggle('on', on);
        }
      }
    });
  }
}
