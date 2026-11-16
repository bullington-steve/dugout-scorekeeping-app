// Export the whole Book tab (sample game, iPhone 16 width at 3x, full length) as one PNG per element.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , base, out, scheme] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 393, height: 759 }, deviceScaleFactor: 3, colorScheme: scheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
const p = await ctx.newPage();
await p.goto(base);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('scorekept:seen:homescreen', '1'); });
await p.reload();
const play = p.getByRole('button', { name: 'PLAY BALL!' });
if (await play.isVisible().catch(() => false)) await play.click();
await p.getByRole('button', { name: 'Look Around with Sample Data First' }).click();
await p.getByRole('tab', { name: 'Book' }).click();
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(600);
// The whole tab in one tall frame, tab bar at the bottom.
const height = await p.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
await p.setViewportSize({ width: 393, height });
await p.waitForTimeout(500);
await p.addStyleTag({ content: `
  html.iso body * { visibility: hidden !important; }
  html.iso body::before { visibility: hidden !important; }
  html.iso.clear, html.iso.clear body { background: transparent !important; }
  html.iso [data-show], html.iso [data-show] * { visibility: visible !important; }
  html.iso [data-show] [data-hide], html.iso [data-show] [data-hide] * { visibility: hidden !important; }
` });
const manifest = await p.evaluate(() => {
  const q = (s, r = document) => r.querySelector(s);
  const all = (s, r = document) => [...r.querySelectorAll(s)];
  const L = [];
  const add = (group, name, el, hide = []) => { if (el && el.getBoundingClientRect().height > 0) L.push({ group, name, el, hide: hide.filter(Boolean) }); };
  const kids = (el) => (el ? [...el.children] : []);
  L.push({ group: 'Background', name: 'Paper', el: null, hide: [] });
  const scr = q('#tab-book');
  add('Header', 'Sample Banner', q('.sk-sample'));
  add('Header', 'Wordmark', q('.sk-header-title', scr));
  add('Header', 'Share', q('.bk-icon-key[aria-label="Share"]', scr));
  add('Header', 'Ink (Pencil)', q('.bk-ink-key', scr));
  add('Header', 'Game Picker', q('.bk-picker', scr));
  const board = q('.bk-board', scr);
  const face = q('.bk-face', board);
  add('Board', 'Board Face', face, kids(face));
  add('Board', 'Park Sign', q('.bk-sign', face));
  add('Board', 'Line Score', q('.bk-line-wrap', face));
  add('Board', 'At Bat', q('.bk-atbat', face));
  all('.bk-count', face).forEach((c, i) => add('Board', `Lamps ${i + 1} (${c.textContent.trim().split(/\s/)[0] || 'lamp'})`, c));
  const which = q('.bk-which', scr);
  const seg = q('.sk-segmented', which);
  add('Team Switch', 'Switch Frame', seg, kids(seg));
  all('.sk-seg', seg).forEach((s) => add('Team Switch', s.textContent.trim(), s));
  const page = q('.bk-page', scr);
  const grid = q('.bk-grid', page);
  add('Scorebook', 'Page and Lines', page, [...all('.bk-box', grid), ...all('thead th, .bk-num, .bk-batter, .bk-tot', grid).flatMap((c) => kids(c).length ? kids(c) : [])].concat(all('thead th', grid).map((th) => th.firstChild && th.firstChild.nodeType === 3 ? null : null)));
  add('Scorebook', 'Column Headings', q('thead', grid));
  add('Scorebook', 'Batting Spots', q('tbody', grid), [...all('tbody td', grid)]);
  add('Scorebook', 'Names', q('tbody', grid), [...all('tbody th', grid), ...all('tbody td:not(.bk-batter)', grid)]);
  add('Scorebook', 'Totals', q('tbody', grid), [...all('tbody th', grid), ...all('tbody td:not(.bk-tot)', grid)]);
  all('.bk-box', grid).forEach((bx) => {
    const row = bx.closest('tr');
    const who = row?.querySelector('.bk-batter')?.textContent?.trim() ?? '';
    const words = (bx.getAttribute('aria-label') || '').replace(/ Edit Play\.$/, '');
    add('Scorebook Boxes', `${who}: ${words}`.slice(0, 60), bx);
  });
  add('Play-by-Play', 'Play-by-Play', q('.bk-pbp', scr));
  add('Footer', 'Game Footer', q('.bk-footer', scr));
  const bar = q('.sk-tabbar');
  add('Tab Bar', 'Tab Bar', bar, bar ? [...bar.querySelectorAll('.sk-tab, .sk-tuck')] : []);
  all('.sk-tab').forEach((t) => add('Tab Bar', `${t.textContent.trim()} Tab`, t));
  window.__L = L;
  return L.map((l) => ({ group: l.group, name: l.name }));
});

const MEASURE = { names: ['Wordmark', 'Board Face', 'Page and Lines', 'Names', 'Play-by-Play', 'Game Footer', 'Tab Bar'], firsts: ['Scorebook Boxes'] };
// Sizes for the Guides layers (Steve, Nov 16: "what a point is", and how big our big elements are).
const measures = await p.evaluate(({ names, firsts }) => {
  const seen = new Set();
  return window.__L.map((l) => {
    if (!l.el) return null;
    const wanted = names.includes(l.name) || (firsts.includes(l.group) && !seen.has(l.group));
    if (!wanted) return null;
    if (firsts.includes(l.group)) seen.add(l.group);
    const r = l.el.getBoundingClientRect();
    // The text size of the first thing in it with words.
    const walker = document.createTreeWalker(l.el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    const t = walker.nextNode();
    const size = t ? parseFloat(getComputedStyle(t.parentElement).fontSize) : null;
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, text: size };
  });
}, MEASURE);
measures.forEach((m, i) => { if (m) manifest[i].measure = m; });

const missing = await p.evaluate(() => {
  const L = window.__L;
  const shownBy = (el) => L.some((l) => l.el && (l.el === el || l.el.contains(el)) && !l.hide.some((x) => x === el || x.contains(el)));
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('.sk-visually-hidden, [hidden], [inert]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    // Clipped to nothing (VoiceOver-only, like the announcer): never on screen.
    if ((cs.clip && cs.clip !== 'auto') || (cs.clipPath && cs.clipPath.startsWith('inset(50%'))) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue;
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const pic = el instanceof SVGSVGElement || el.tagName === 'IMG' || el.tagName === 'CANVAS' || el.classList.contains('gm-lamp');
    if ((text || pic) && !shownBy(el)) out.push((el.getAttribute('class') || el.tagName) + ': ' + (el.textContent || '').trim().slice(0, 30));
  }
  return out;
});
if (missing.length) { console.error('NOT ON ANY LAYER:\n' + missing.join('\n')); process.exitCode = 2; }
else console.log('every visible element is on a layer');
for (let i = 0; i < manifest.length; i++) {
  await p.evaluate((i) => {
    document.querySelectorAll('[data-show],[data-hide]').forEach((e) => { e.removeAttribute('data-show'); e.removeAttribute('data-hide'); });
    const l = window.__L[i];
    const root = document.documentElement;
    root.classList.add('iso');
    root.classList.toggle('clear', !!l.el);
    if (l.el) { l.el.setAttribute('data-show', ''); l.hide.forEach((x) => x.setAttribute('data-hide', '')); }
  }, i);
  const file = `${String(i).padStart(3, '0')}.png`;
  await p.screenshot({ path: `${out}/${file}`, omitBackground: i > 0 });
  manifest[i].file = file;
}
await p.evaluate(() => { document.documentElement.classList.remove('iso', 'clear'); document.querySelectorAll('[data-show],[data-hide]').forEach((e) => { e.removeAttribute('data-show'); e.removeAttribute('data-hide'); }); });
await p.screenshot({ path: `${out}/reference.png` });
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(scheme, manifest.length, 'layers, height', height);
await b.close();
