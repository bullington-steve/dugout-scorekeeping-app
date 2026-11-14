// Export the real Game screen (sample game, iPhone 16 at 3x) as one transparent PNG per element.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , base, out, scheme] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 393, height: 759 }, deviceScaleFactor: 3, colorScheme: scheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
await p.goto(base);
await p.evaluate(() => { localStorage.clear(); localStorage.setItem('scorekept:seen:homescreen', '1'); });
await p.reload();
for (let i = 0; i < 10; i++) {
  const look = p.getByRole('button', { name: /Look Around with Sample Data/ }).first();
  if (await look.isVisible().catch(() => false)) { await look.click(); break; }
  const play = p.getByRole('button', { name: /PLAY BALL|Skip/i }).first();
  if (await play.isVisible().catch(() => false)) await play.click();
  await p.waitForTimeout(600);
}
await p.locator('.gm-board').waitFor();
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
await p.addStyleTag({ content: `
  html.iso body * { visibility: hidden !important; }
  html.iso.clear, html.iso.clear body { background: transparent !important; }
  html.iso [data-show], html.iso [data-show] * { visibility: visible !important; }
  html.iso [data-show] [data-hide], html.iso [data-show] [data-hide] * { visibility: hidden !important; }
` });
const manifest = await p.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const all = (s) => [...document.querySelectorAll(s)];
  const L = [];
  const add = (group, name, el, hide = []) => { if (el) L.push({ group, name, el, hide: hide.filter(Boolean) }); };
  const kids = (el) => (el ? [...el.children] : []);
  L.push({ group: 'Background', name: 'Paper', el: null, hide: [] });
  add('Header', 'Wordmark', q('.sk-header-title'));
  add('Header', 'Organ', q('.gm-organ'));
  add('Header', 'Sound', q('.gm-sound'));
  add('Header', 'Settings', q('.gm-gear'));
  const board = q('.gm-board');
  add('Scorebug', 'Board', board, kids(board));
  add('Scorebug', 'Batter Row', q('.gm-card'), kids(q('.gm-card')));
  add('Scorebug', 'Batter Name', q('.gm-who'), [q('.gm-today-text')]);
  add('Scorebug', 'Today Line', q('.gm-today-text'));
  add('Scorebug', 'On Deck', q('.gm-deck'));
  add('Scorebug', 'Walk-Up', q('.gm-walkup'));
  add('Scorebug', 'Score Row', q('.gm-score'), kids(q('.gm-score')));
  for (const [side, el] of [['Away', q('.gm-team.gm-away')], ['Home', q('.gm-team.gm-home')]]) {
    const name = el.querySelector('.gm-name')?.textContent?.trim() || side;
    add('Scorebug', `${name} Panel`, el, kids(el));
    add('Scorebug', `${name} Name`, el.querySelector('.gm-name'));
    add('Scorebug', `${name} Score`, el.querySelector('.gm-runs-housing') ?? el.querySelector('.gm-housing'));
    add('Scorebug', `${name} HR Lamps`, el.querySelector('.gm-hr'));
    add('Scorebug', `${name} At-Bat Lamp`, el.querySelector('.gm-atbat-lamp'));
    add('Scorebug', `${name} At Bat`, el.querySelector('.gm-atbat'));
  }
  add('Scorebug', 'Middle Panel', q('.gm-mid'), [q('.gm-mid-clock'), q('.gm-count')]);
  add('Scorebug', 'Clock', q('.gm-time'));
  add('Scorebug', 'Inning', q('.gm-inning'));
  add('Scorebug', 'Balls (B)', q('.gm-lampset-ball'));
  add('Scorebug', 'Strikes (S)', q('.gm-lampset-strike'));
  add('Scorebug', 'Outs (O)', q('.gm-lampset-out'));
  add('Scorebug', 'Last Play', q('.gm-lastplay'));
  add('Bases', 'Base Paths', q('.gm-paths'));
  add('Bases', 'Home Plate', q('.gm-plate'));
  [['Runner on First', '.gm-tag-1'], ['Runner on Second', '.gm-tag-2'], ['Runner on Third', '.gm-tag-3']].forEach(([n, s]) => add('Bases', n, q(s)));
  [['Third Base', '.gm-base-3'], ['Second Base', '.gm-base-2'], ['First Base', '.gm-base-1']].forEach(([n, s]) => {
    const base = q(s);
    add('Bases', n + ' Shadow', base?.querySelector('.gm-bag-shadow'));
    add('Bases', n, base, [base?.querySelector('.gm-bag-shadow')]);
  });
  const label = (b) => (b.getAttribute('aria-label') || b.textContent).trim();
  all('.gm-count-row .gm-pitch').forEach((b) => add('Pitch Row', label(b), b));
  all('.gm-reaches > button').forEach((b) => { if (!b.hidden) add('Batter Reaches', label(b), b); });
  all('.gm-outs-pad > button').forEach((b) => add('Batter Out', label(b), b));
  all('.gm-strip-key').forEach((b) => add('Undo, Lineups, Defense', b.textContent.trim(), b));
  const bar = q('.sk-tabbar');
  add('Tab Bar', 'Tab Bar', bar, bar ? [...bar.querySelectorAll('.sk-tab')] : []);
  all('.sk-tab').forEach((t) => add('Tab Bar', `${t.textContent.trim()} Tab`, t));
  window.__L = L;
  return L.map((l) => ({ group: l.group, name: l.name }));
});

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
  const file = `${String(i).padStart(2, '0')}.png`;
  // The paper is the window's own background, so its layer is captured opaque.
  await p.screenshot({ path: `${out}/${file}`, omitBackground: i > 0 });
  manifest[i].file = file;
}
await p.evaluate(() => { document.documentElement.classList.remove('iso', 'clear'); document.querySelectorAll('[data-show],[data-hide]').forEach((e) => { e.removeAttribute('data-show'); e.removeAttribute('data-hide'); }); });
await p.screenshot({ path: `${out}/reference.png` });
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(scheme, manifest.length, 'layers');
await b.close();
