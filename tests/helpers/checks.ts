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
export async function contrastProblems(page: Page): Promise<string[]> {
  await fontsReady(page);
  return page.evaluate(() => {
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
      if (el.closest('[aria-hidden="true"], [data-contrast-skip], [aria-disabled="true"], [disabled]')) continue;
      const bg = backgroundOf(el);
      const fg = over(parse(cs.color), bg);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      const got = ratio(fg, bg);
      if (got < need) {
        const label = t.textContent.trim().slice(0, 40);
        problems.push(`"${label}" is ${got.toFixed(2)}:1, needs ${need}:1`);
      }
    }
    return problems;
  });
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
