/*
 * Add to Home Screen (SPEC §12, LESSONS 1, 2, 13): on iPhone or iPad in a
 * Safari tab, the first visit shows how to put ScoreKept on the Home Screen,
 * where it opens like an app and Safari can't clear it. Not shown on computers
 * or in the Home Screen app itself.
 *
 * Steve, Nov 25: one simple drawing per step, in ScoreKept's own lines (never
 * screenshots, which go stale with every Safari redesign), the button to tap
 * ringed in gold, and one short line under it. The steps follow the iPhone's
 * release, from Apple's iPhone guide: iOS 27 (the Page Menu button at the left
 * of the address bar), iOS 26 (the More button, •••, beside it), and a plain
 * Share-button fallback for anything else. iPad: Share at the top right.
 */
import { h, svg } from '../dom.ts';
import { isIPad, safariMajor } from '../platform.ts';
import { coverApp } from './welcome.ts';

type Kind = 'ios27' | 'ios26' | 'share' | 'ipad';

/** Which set of steps this device needs. */
export function guideKind(ua = navigator.userAgent, ipad = isIPad()): Kind {
  if (ipad) return 'ipad';
  const v = safariMajor(ua);
  if (v !== null && v >= 27) return 'ios27';
  if (v === 26) return 'ios26';
  return 'share';
}

const S = (tag: keyof SVGElementTagNameMap, attrs: Record<string, string | number>, ...kids: Node[]) =>
  svg(tag, Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, String(v)])), ...kids);
const text = (x: number, y: number, words: string, cls: string, anchor = 'start') => {
  const t = S('text', { x, y, class: cls, 'text-anchor': anchor });
  t.textContent = words;
  return t;
};
const picture = (label: string, ...kids: Node[]) =>
  S('svg', { viewBox: '0 0 220 300', class: 'hs-draw', role: 'img', 'aria-label': label }, S('rect', { class: 'hs-d-screen', x: 10, y: 8, width: 200, height: 284, rx: 28 }), ...kids);
const ring = (cx: number, cy: number, r = 17) => S('circle', { class: 'hs-d-ring', cx, cy, r });
const ringBox = (x: number, y: number, w: number, hgt: number) => S('rect', { class: 'hs-d-ring', x, y, width: w, height: hgt, rx: 12 });
// The web page behind Safari's bar, drawn as a few ruled lines (no words to read).
const page = () => [S('rect', { class: 'hs-d-page', x: 22, y: 22, width: 176, height: 200, rx: 6 }), S('path', { class: 'hs-d-rule', d: 'M40 60 h140 M40 90 h110 M40 120 h140 M40 150 h90 M40 180 h120' })];

/** The Share symbol: a square with an arrow up out of it. */
const shareGlyph = (x: number, y: number) =>
  S('path', { class: 'hs-d-ink', d: `M${x} ${y + 4} v-14 M${x - 6} ${y - 4} l6 -6 6 6 M${x - 7} ${y} h-3 v10 h20 v-10 h-3` });

/** Step 1: the button to tap, ringed, where it sits on this release. */
function firstDrawing(kind: Kind): SVGElement {
  if (kind === 'ios27')
    return picture(
      'The bottom of Safari: back, then the address bar with the Page Menu button at its left end, ringed',
      ...page(),
      S('circle', { class: 'hs-d-bar', cx: 38, cy: 256, r: 18 }),
      S('path', { class: 'hs-d-ink', d: 'M42 248 l-8 8 8 8' }),
      S('rect', { class: 'hs-d-bar', x: 62, y: 236, width: 104, height: 40, rx: 20 }),
      S('path', { class: 'hs-d-ink', d: 'M76 248 h16 M76 256 h12 M76 264 h16' }),
      text(100, 260, 'scorekept…', 'hs-d-tiny'),
      // Tabs: two overlapping squares in a circle, as on Steve's iPhone (Nov 25).
      S('circle', { class: 'hs-d-bar', cx: 186, cy: 256, r: 17 }),
      S('path', { class: 'hs-d-ink', d: 'M180 252 v-6 h10 v10 h-4 M178 252 h10 v10 h-10 z' }),
      ring(84, 256),
    );
  if (kind === 'ios26')
    return picture(
      'The bottom of Safari: the address bar with the More button, three dots, beside it, ringed',
      ...page(),
      S('rect', { class: 'hs-d-bar', x: 20, y: 236, width: 180, height: 40, rx: 20 }),
      S('path', { class: 'hs-d-ink', d: 'M44 248 l-8 8 8 8' }),
      S('rect', { class: 'hs-d-field', x: 58, y: 244, width: 96, height: 24, rx: 12 }),
      text(106, 260, 'scorekept…', 'hs-d-tiny', 'middle'),
      S('circle', { class: 'hs-d-dot', cx: 168, cy: 256, r: 2.4 }),
      S('circle', { class: 'hs-d-dot', cx: 176, cy: 256, r: 2.4 }),
      S('circle', { class: 'hs-d-dot', cx: 184, cy: 256, r: 2.4 }),
      ring(176, 256),
    );
  if (kind === 'ipad')
    return picture(
      'The top of Safari on iPad, with the Share button at the top right ringed',
      S('rect', { class: 'hs-d-bar', x: 20, y: 20, width: 180, height: 36, rx: 18 }),
      S('rect', { class: 'hs-d-field', x: 44, y: 28, width: 110, height: 20, rx: 10 }),
      text(99, 42, 'scorekept…', 'hs-d-tiny', 'middle'),
      shareGlyph(178, 42),
      ring(178, 38),
      S('rect', { class: 'hs-d-page', x: 22, y: 68, width: 176, height: 210, rx: 6 }),
      S('path', { class: 'hs-d-rule', d: 'M40 104 h140 M40 134 h110 M40 164 h140 M40 194 h90 M40 224 h120' }),
    );
  return picture(
    'The bottom of Safari with the Share button, a square with an arrow, ringed',
    ...page(),
    S('rect', { class: 'hs-d-bar', x: 20, y: 236, width: 180, height: 40, rx: 12 }),
    S('path', { class: 'hs-d-ink', d: 'M44 248 l-8 8 8 8 M64 248 l8 8 -8 8' }),
    shareGlyph(110, 260),
    ring(110, 256),
    S('path', { class: 'hs-d-ink', d: 'M148 250 v12 h14 v-12 z M174 248 h12 v12 h-12 z' }),
  );
}

/** Step 2 on iOS 26 and 27: Share in the menu that button opens. */
const menuDrawing = () =>
  picture(
    'A menu with Share at the top, ringed',
    S('rect', { class: 'hs-d-menu', x: 50, y: 96, width: 148, height: 132, rx: 14 }),
    text(64, 124, 'Share', 'hs-d-row'),
    shareGlyph(180, 126),
    S('line', { class: 'hs-d-rule', x1: 60, y1: 140, x2: 188, y2: 140 }),
    text(64, 162, 'Add Bookmark', 'hs-d-row hs-d-dim'),
    S('line', { class: 'hs-d-rule', x1: 60, y1: 176, x2: 188, y2: 176 }),
    text(64, 198, 'Find on Page', 'hs-d-row hs-d-dim'),
    ringBox(52, 100, 144, 34),
  );

/** The share list, scrolled down to Add to Home Screen. */
const shareListDrawing = () =>
  picture(
    'The share list scrolled down, with Add to Home Screen ringed',
    S('rect', { class: 'hs-d-menu', x: 22, y: 70, width: 176, height: 210, rx: 16 }),
    text(38, 104, 'Copy', 'hs-d-row hs-d-dim'),
    S('line', { class: 'hs-d-rule', x1: 34, y1: 118, x2: 186, y2: 118 }),
    text(38, 142, 'Add to Reading List', 'hs-d-row hs-d-dim'),
    S('line', { class: 'hs-d-rule', x1: 34, y1: 156, x2: 186, y2: 156 }),
    text(38, 180, 'Add to Home Screen', 'hs-d-row'),
    S('rect', { class: 'hs-d-glyph', x: 166, y: 168, width: 16, height: 16, rx: 4 }),
    S('path', { class: 'hs-d-ink', d: 'M174 172 v8 M170 176 h8' }),
    S('line', { class: 'hs-d-rule', x1: 34, y1: 194, x2: 186, y2: 194 }),
    text(38, 218, 'Edit Actions…', 'hs-d-row hs-d-dim'),
    ringBox(26, 160, 168, 34),
  );

/** The Add sheet: the app's own icon and name, Open as Web App switched on, Add ringed. */
const addDrawing = (webApp: boolean) =>
  picture(
    webApp ? 'The Add to Home Screen sheet with Open as Web App switched on, and Add at the top right ringed' : 'The Add to Home Screen sheet with Add at the top right ringed',
    text(30, 44, 'Cancel', 'hs-d-row hs-d-dim'),
    text(174, 44, 'Add', 'hs-d-row', 'middle'),
    ring(174, 40, 20),
    S('rect', { class: 'hs-d-icon', x: 30, y: 66, width: 44, height: 44, rx: 10 }),
    S('path', { class: 'hs-d-icon-mark', d: 'M52 76 l12 12 -12 12 -12 -12 z' }),
    text(86, 94, 'ScoreKept', 'hs-d-row'),
    ...(webApp
      ? [
          S('rect', { class: 'hs-d-menu', x: 22, y: 128, width: 176, height: 44, rx: 12 }),
          text(34, 155, 'Open as Web App', 'hs-d-row'),
          S('rect', { class: 'hs-d-switch', x: 154, y: 139, width: 34, height: 22, rx: 11 }),
          S('circle', { class: 'hs-d-knob', cx: 177, cy: 150, r: 9 }),
        ]
      : []),
  );

interface GuideStep {
  art: SVGElement | null;
  words: (string | Node)[];
  note?: string;
}

/** The steps, by release (Apple's iPhone guide for iOS 27 and iOS 26; the plain Share button otherwise). */
export function guideSteps(kind: Kind): GuideStep[] {
  const b = (t: string) => h('b', {}, t);
  const add: GuideStep = { art: shareListDrawing(), words: ['Scroll down and tap ', b('Add to Home Screen'), '.'], note: 'Not in the list? Tap Edit Actions at the bottom, then add it.' };
  const webApp = kind !== 'share';
  const confirm: GuideStep = { art: addDrawing(webApp), words: webApp ? ['Leave ', b('Open as Web App'), ' on, and tap ', b('Add'), '.'] : ['Tap ', b('Add'), '.'] };
  const open: GuideStep = { art: null, words: ['Open ScoreKept from your Home Screen.'] };
  if (kind === 'ios27')
    return [{ art: firstDrawing(kind), words: ['Tap ', b('≡'), ' at the left of the address bar.'] }, { art: menuDrawing(), words: ['Tap ', b('Share'), '.'] }, add, confirm, open];
  if (kind === 'ios26')
    return [{ art: firstDrawing(kind), words: ['Tap ', b('•••'), ' beside the address bar.'] }, { art: menuDrawing(), words: ['Tap ', b('Share'), '.'] }, add, confirm, open];
  if (kind === 'ipad') return [{ art: firstDrawing(kind), words: ['Tap ', b('Share'), ' at the top right.'] }, add, confirm, open];
  return [{ art: firstDrawing(kind), words: ['Tap ', b('Share'), ' in Safari’s toolbar.'] }, add, confirm, open];
}

export function openHomeScreenGuide(then: () => void = () => undefined): void {
  const kind = guideKind();
  const steps = guideSteps(kind);
  const close = h('button', { type: 'button', class: 'sh-close hs-close', 'aria-label': 'Close' }, '✕');
  const el = h(
    'div',
    { class: 'wl-layer hs-guide', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'hs-title' },
    h(
      'div',
      { class: 'hs-inner' },
      h('div', { class: 'hs-head' }, h('h1', { id: 'hs-title', class: 'sk-screen-title hs-title' }, 'Add ScoreKept to Your Home Screen'), close),
      h('p', { class: 'hs-why' }, 'It opens like an app and keeps your season safe. Backups are available in the app. Deleting the Home Screen icon deletes all its data.'),
      h(
        'ol',
        { class: 'hs-steps' },
        ...steps.map((s, i) =>
          h(
            'li',
            { class: `hs-step${s.art ? '' : ' hs-step-plain'}` },
            s.art ?? '',
            h('div', { class: 'hs-step-words' }, h('span', { class: 'hs-step-num', 'aria-hidden': 'true' }, `${i + 1}.`), h('p', {}, ...s.words), s.note ? h('p', { class: 'hs-small' }, s.note) : ''),
          ),
        ),
      ),
      kind === 'ios27' || kind === 'ios26' ? h('p', { class: 'hs-small' }, 'Tabs set to Bottom or Top in Safari’s settings? Tap Share in the toolbar instead of the first step.') : '',
    ),
  );
  document.body.append(el);
  document.documentElement.classList.add('sheet-open');
  coverApp(true);
  close.addEventListener('click', () => {
    el.remove();
    if (!document.querySelector('.wl-layer')) coverApp(false);
    if (!document.querySelector('.wl-layer, .sh-layer')) document.documentElement.classList.remove('sheet-open');
    then();
  });
  close.focus();
}
