/*
 * The team's marks (Steve, Nov 17), from real ballpark gear, both colors as real parts of the design:
 * - the felt pennant, for big places (the Team header, Edit Team's preview, the recap picture): the
 *   primary felt, a secondary stripe down the staff edge, and the short name as jersey lettering
 *   (white or navy, whichever reads better, outlined in the secondary when it's big enough);
 * - the sleeve-stripe patch, for tight places (Settings' Your Team row): a square-cornered patch in
 *   the primary with two secondary stripes, the short name above them.
 * Flat colors, square corners, no gloss. A very light team color gets a thin navy edge by day, and
 * every mark a thin cream edge by night, so the mark never disappears into the page.
 */
import { svg } from './dom.ts';
import { badgeColors, contrastRatio, teamColor } from './palette.ts';

const FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";
/** The cream page by day: a team color under 1.5:1 against it gets the navy edge. */
const PAGE = '#f3efe4';

/** Steve's named very light team colors (Nov 17); any other color under 1.5:1 on the cream page joins them. */
const PALE = new Set(['white', 'silver', 'columbia blue', 'yellow']);

/** True for team colors that would fade into the cream page by day. */
export function paleColor(color: string): boolean {
  return PALE.has(color.toLowerCase()) || contrastRatio(teamColor(color), PAGE) < 1.5;
}

let measurer: CanvasRenderingContext2D | null = null;
function textWidth(text: string, size: number): number {
  // Until the athletic face has loaded, a canvas would measure a wider stand-in; use its own width
  // (about half the size a letter) so the lettering isn't shrunk for nothing.
  const loaded = document.fonts?.check?.(`700 ${size}px "Barlow Condensed"`) ?? false;
  measurer ??= document.createElement('canvas').getContext('2d');
  if (!measurer || !loaded) return text.length * size * 0.5;
  measurer.font = `700 ${size}px ${FONT}`;
  return measurer.measureText(text).width;
}

export interface PennantFit {
  size: number;
  x: number;
}

/**
 * The lettering for a pennant w × h: as big as the felt allows, centered between the staff stripe
 * and where the felt narrows; null when it would go under 12 points (use the patch instead).
 */
export function fitPennant(name: string, w: number, h: number, measure = textWidth): PennantFit | null {
  const stripe = Math.max(5, Math.round(h * 0.16));
  for (let size = Math.round(h * 0.42); size >= 12; size -= 0.5) {
    const left = stripe + 4;
    // The letters fill about 0.7 of the size top to bottom; the felt there must clear them by 2 a side.
    const right = w * (1 - (0.7 * size + 4) / h);
    if (measure(name, size) <= right - left) return { size, x: (left + right) / 2 };
  }
  return null;
}

function edgeClass(primary: string): string {
  return `tm-mark${paleColor(primary) ? ' tm-mark-pale' : ''}`;
}

/** The felt pennant, or the patch when the name won't fit at 12 points. */
export function pennant(abbr: string, primary: string, secondary: string, w: number, h: number): SVGSVGElement {
  const name = abbr || '?';
  const fit = fitPennant(name, w, h);
  if (!fit) return patch(name, primary, secondary, Math.round(h * 1.4), h);
  const { bg, ring, ink } = badgeColors(primary, secondary);
  const stripe = Math.max(5, Math.round(h * 0.16));
  const big = h >= 40;
  const text = svg('text', {
    x: fit.x,
    y: h / 2 + fit.size * 0.35,
    'text-anchor': 'middle',
    'font-family': FONT,
    'font-weight': 700,
    'font-size': fit.size,
    fill: ink,
    ...(big ? { stroke: ring, 'stroke-width': Math.max(1.5, fit.size * 0.09), 'paint-order': 'stroke', 'stroke-linejoin': 'round' } : {}),
  });
  text.textContent = name;
  const shape = `0,0 ${w},${h / 2} 0,${h}`;
  return svg(
    'svg',
    { class: `${edgeClass(primary)} tm-pennant`, width: w, height: h, viewBox: `-1 -1 ${w + 2} ${h + 2}`, 'aria-hidden': 'true', focusable: 'false', 'data-contrast-skip': '' },
    svg('polygon', { points: shape, fill: bg, class: 'tm-mark-felt' }),
    svg('rect', { x: 0, y: 0, width: stripe, height: h, fill: ring, class: 'tm-mark-stripe' }),
    text,
    svg('polygon', { points: shape, fill: 'none', class: 'tm-mark-edge', 'stroke-linejoin': 'round' }),
  );
}

/** The sleeve-stripe patch: primary, two secondary stripes, the short name above them. */
export function patch(abbr: string, primary: string, secondary: string, w: number, h: number): SVGSVGElement {
  const name = abbr || '?';
  const { bg, ring, ink } = badgeColors(primary, secondary);
  const band = Math.max(2, Math.round(h * 0.09));
  const y1 = h - band * 4;
  const y2 = h - band * 2;
  let size = Math.round((y1 - 2) * 0.78);
  while (size > 9 && textWidth(name, size) > w - 6) size -= 0.5;
  const text = svg('text', { x: w / 2, y: (y1 - 1) / 2 + size * 0.36, 'text-anchor': 'middle', 'font-family': FONT, 'font-weight': 700, 'font-size': size, fill: ink });
  text.textContent = name;
  return svg(
    'svg',
    { class: `${edgeClass(primary)} tm-patch`, width: w, height: h, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true', focusable: 'false', 'data-contrast-skip': '' },
    svg('rect', { x: 0, y: 0, width: w, height: h, fill: bg, class: 'tm-mark-felt' }),
    svg('rect', { x: 0, y: y1, width: w, height: band, fill: ring, class: 'tm-mark-stripe' }),
    svg('rect', { x: 0, y: y2, width: w, height: band, fill: ring, class: 'tm-mark-stripe' }),
    text,
    svg('rect', { x: 0.75, y: 0.75, width: w - 1.5, height: h - 1.5, fill: 'none', class: 'tm-mark-edge' }),
  );
}
