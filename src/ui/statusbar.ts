/*
 * The status bar's color (Steve, Nov 16–17): iOS draws the clock and battery (the `default` style),
 * and its background follows `theme-color`, so it matches the color at the top of each screen:
 * the page's paper (cream, or navy at night), what an open sheet lays over it, or the Organ's green.
 * iOS picks light or dark text for that color itself. Called whenever the top of the screen can
 * change: a tab, a sheet opening or closing, the Organ, or the iPhone switching appearance.
 */
const ORGAN_STATUS = '#163b25';

type RGBA = [number, number, number, number];

function parse(css: string): RGBA | null {
  const n = css.match(/[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) return null;
  return [n[0]!, n[1]!, n[2]!, n.length > 3 ? n[3]! : 1];
}

function over(top: RGBA, under: RGBA): RGBA {
  const a = top[3];
  return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
}

const hex = (c: RGBA) => `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** The color at the very top of the screen right now. */
export function topColor(): string {
  if (document.documentElement.classList.contains('organ-open')) return ORGAN_STATUS;
  let c: RGBA = parse(getComputedStyle(document.body).backgroundColor) ?? [243, 239, 228, 1];
  if (c[3] < 1) c = over(c, [255, 255, 255, 1]);
  for (const layer of document.querySelectorAll<HTMLElement>('.sh-layer')) {
    const sheet = layer.querySelector<HTMLElement>('.sh-sheet');
    if (sheet?.classList.contains('sh-full')) {
      // A full-screen sheet starts at the top: its own background (or its header's).
      const own = parse(getComputedStyle(sheet).backgroundColor);
      const head = parse(getComputedStyle(sheet.querySelector('.sh-head') ?? sheet).backgroundColor);
      const pick = own && own[3] > 0 ? own : head;
      if (pick) c = over(pick, c);
      continue;
    }
    // A sheet from the bottom: the dimmed page shows at the top.
    const scrim = parse(getComputedStyle(layer.querySelector('.sh-scrim') ?? layer).backgroundColor);
    if (scrim) c = over(scrim, c);
  }
  return hex(c);
}

export function syncStatusBar(): void {
  const color = topColor();
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) if (m.content !== color) m.content = color;
}

/** Follow the iPhone's appearance and contrast settings too. */
export function watchStatusBar(): void {
  for (const q of ['(prefers-color-scheme: dark)', '(prefers-contrast: more)', '(prefers-reduced-transparency: reduce)']) {
    try {
      window.matchMedia(q).addEventListener('change', () => syncStatusBar());
    } catch {
      // Older Safari: the next tab or sheet catches up.
    }
  }
  syncStatusBar();
}
