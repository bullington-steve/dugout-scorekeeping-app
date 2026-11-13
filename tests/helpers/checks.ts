/*
 * Shared layout and accessibility checks used by every screen's tests.
 * Each check returns a list of problems (empty = pass) so failures say
 * exactly what broke. tests/e2e/checks.spec.ts proves each one bites.
 */
import type { Page } from '@playwright/test';

/** iPhone 16 Home Screen app, usable points (LESSONS 12). */
export const IPHONE_16 = { width: 393, height: 759 } as const;
/** 150% and 75% zoom on iPhone 16 (CLAUDE.md, Platform). */
export const ZOOM_WIDTHS = [260, 520] as const;
/** Spare points the Game screen must keep (LESSONS 18). */
export const FIT_HEADROOM = 12;

/** Wait for web fonts before measuring anything (LESSONS 19). */
export async function fontsReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/**
 * Text contrast: 4.5:1 for normal text, 3:1 for large (24px+) or bold
 * large (18.66px+ and 700+). Background images are treated as decoration
 * over the element's background color; real pictures get their own checks.
 */
/**
 * Contrast of everything a person can see. Defaults are the minimum (4.5:1 text, 3:1 large text).
 * Apple's bar for an App Store "Sufficient Contrast" claim and our house style go further:
 * `normal: 7` in the light appearance and with Increase Contrast. `seen: true` also checks text
 * hidden from VoiceOver but drawn on screen (the scoreboard's labels, the Book's codes) and
 * interface icons (3:1, as graphics).
 */
export async function contrastProblems(page: Page, opts: { normal?: number; large?: number; seen?: boolean } = {}): Promise<string[]> {
  await fontsReady(page);
  return page.evaluate((o) => {
    type RGBA = [number, number, number, number];
    const probe = document.createElement('canvas').getContext('2d')!;
    const parse = (css: string): RGBA => {
      // Let the canvas normalize any CSS color, then read one pixel.
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#000';
      probe.fillStyle = css;
      probe.fillRect(0, 0, 1, 1);
      const d = probe.getImageData(0, 0, 1, 1).data;
      return [d[0]!, d[1]!, d[2]!, d[3]! / 255];
    };
    const over = (top: RGBA, under: RGBA): RGBA => {
      const a = top[3] + under[3] * (1 - top[3]);
      if (a === 0) return [0, 0, 0, 0];
      const mix = (i: 0 | 1 | 2) => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a;
      return [mix(0), mix(1), mix(2), a];
    };
    const lum = (c: RGBA) => {
      const ch = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
    };
    const ratio = (a: RGBA, b: RGBA) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
      return (x + 0.05) / (y + 0.05);
    };
    const backgroundOf = (el: Element): RGBA => {
      const layers: RGBA[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) {
        const bg = parse(getComputedStyle(n).backgroundColor);
        if (bg[3] > 0) layers.push(bg);
        if (bg[3] >= 1) break;
      }
      // Canvas default under everything: the page's own background.
      let result: RGBA = parse(getComputedStyle(document.documentElement).backgroundColor);
      if (result[3] === 0) result = parse(getComputedStyle(document.body).backgroundColor);
      if (result[3] === 0) result = [255, 255, 255, 1];
      for (let i = layers.length - 1; i >= 0; i--) result = over(layers[i]!, result);
      return result;
    };

    /** Color stops of the nearest gradient behind an element, painted over its solid background. */
    const gradientStops = (el: Element, base: RGBA): RGBA[] => {
      for (let n: Element | null = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage.includes('gradient')) return (cs.backgroundImage.match(/rgba?\([^)]*\)/g) ?? []).map((c) => over(parse(c), base));
        // Anything painted above a gradient hides it.
        if (parse(cs.backgroundColor)[3] > 0) break;
      }
      return [];
    };

    const problems: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement;
      if (!el || seen.has(el) || !t.textContent?.trim()) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Dimmed controls are exempt (WCAG); pictures get their own checks.
      if (el.closest(o.seen ? '[data-contrast-skip], [aria-disabled="true"], [disabled], .sk-visually-hidden' : '[aria-hidden="true"], [data-contrast-skip], [aria-disabled="true"], [disabled], .sk-visually-hidden')) continue;
      if (el.closest('[hidden], [inert]') || Number(cs.opacity) === 0) continue;
      let bg = backgroundOf(el);
      // SVG text over a filled shape drawn earlier in the same picture (the Book's highlighter
      // diamond): that shape is what's behind it.
      if (el instanceof SVGTextElement) {
        const box = el.getBBox();
        const mid = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2);
        for (let n = el.previousElementSibling; n; n = n.previousElementSibling) {
          if (!(n instanceof SVGGeometryElement)) continue;
          const ncs = getComputedStyle(n);
          const fill = ncs.fill && ncs.fill !== 'none' ? parse(ncs.fill) : null;
          if (!fill || fill[3] < 1 || Number(ncs.opacity) < 1 || Number(ncs.fillOpacity) < 1 || ncs.visibility === 'hidden') continue;
          if (n.isPointInFill(mid)) {
            bg = fill;
            break;
          }
        }
      }
      // SVG text is drawn with fill, everything else with color.
      const paint = el instanceof SVGElement ? cs.fill : cs.color;
      if (!paint || paint === 'none' || paint.startsWith('url')) continue;
      const fg = over(parse(paint), bg);
      let size = parseFloat(cs.fontSize);
      // SVG text scales with its picture: use the drawn height.
      if (el instanceof SVGElement) size = Math.min(size, rect.height);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? (o.large ?? 3) : (o.normal ?? 4.5);
      // Over a gradient, the worst of its colors counts.
      const stops = gradientStops(el, bg);
      const got = stops.length ? Math.min(...stops.map((g) => ratio(over(parse(paint), g), g))) : ratio(fg, bg);
      if (got < need - 0.005) {
        const label = t.textContent.trim().slice(0, 40);
        problems.push(`"${label}" is ${got.toFixed(2)}:1, needs ${need}:1 (${(el.getAttribute('class') ?? el.tagName).slice(0, 40)})`);
      }
    }
    // Interface icons are graphics: 3:1 against what's behind them.
    if (o.seen) {
      for (const icon of document.querySelectorAll('svg.sk-icon')) {
        const r = icon.getBoundingClientRect();
        if (!r.width || !r.height || icon.closest('[hidden], [inert], [aria-disabled="true"], [disabled], .sk-visually-hidden, [data-contrast-skip]')) continue;
        const cs = getComputedStyle(icon);
        const bg = backgroundOf(icon);
        const got = ratio(over(parse(cs.color), bg), bg);
        if (got < 3 - 0.005) problems.push(`icon in "${(icon.parentElement?.getAttribute('aria-label') ?? icon.parentElement?.textContent ?? '').trim().slice(0, 30)}" is ${got.toFixed(2)}:1, needs 3:1`);
      }
    }
    return problems;
  }, opts);
}

/** Every tappable control is at least 44 x 44 points. */
export async function tapTargetProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector = [
      'a[href]',
      'button',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      'summary',
      '[role="button"]',
      '[role="tab"]',
      '[role="switch"]',
      '[role="link"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const problems: string[] = [];
    for (const el of document.querySelectorAll(selector)) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      // VoiceOver-only controls (the Organ's list) aren't on screen to tap.
      if (el.closest('.sk-visually-hidden')) continue;
      // Out of reach (the tucked tab bar's five tabs): nothing to tap.
      if (el.closest('[inert]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.width < 43.5 || r.height < 43.5) {
        const name =
          el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName.toLowerCase();
        problems.push(`"${name}" is ${Math.round(r.width)} x ${Math.round(r.height)}`);
      }
    }
    return problems;
  });
}

/** Nothing scrolls sideways at the current width. Returns the overflow in points. */
export async function sideScroll(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
}

/**
 * Points to spare below a screen's content in the current viewport.
 * Negative means it doesn't fit. Fit checks need FIT_HEADROOM or more.
 */
export async function headroom(page: Page, selector: string): Promise<number> {
  await fontsReady(page);
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`No element matches ${sel}`);
    const bottom = el.getBoundingClientRect().bottom + window.scrollY;
    const needed = Math.max(bottom, el.scrollHeight);
    return Math.floor(window.innerHeight - needed);
  }, selector);
}

/** Visible-text word rules from the house style (CLAUDE.md, Words). */
export function wordProblems(text: string): string[] {
  const problems: string[] = [];
  if (text.includes('—')) problems.push('em dash');
  if (/\d{4}-\d{2}-\d{2}/.test(text)) problems.push('ISO date on screen');
  if (/['"]/.test(text)) problems.push('straight quote or apostrophe (use curly ones)');
  if (/\p{Extended_Pictographic}/u.test(text.replace(/[✓✕★♪✎☰⚙️]/g, '')))
    problems.push('emoji');
  if (/\b(please|e\.g\.|etc\.|via)\b/i.test(text)) problems.push('banned word (please, e.g., etc., via)');
  if (/\b(enable[ds]?|disable[ds]?|toggle[ds]?|long press|tap on)\b/i.test(text))
    problems.push('non-Apple wording (turn on/off, touch and hold, tap)');
  return problems;
}
