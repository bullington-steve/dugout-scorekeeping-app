/*
 * The Organ (SPEC §13), a music player of our own with a wheel (Steve, Nov 2026):
 * a screen listing the albums, then their tunes, then Now Playing; a wheel to
 * slide around (each step clicks softly and ticks the iPhone's haptics; a fast
 * spin moves faster), the middle to choose, MENU to go back, the arrows to
 * change tunes, play/pause to stop. In ScoreKept's own colors since Nov 16: a
 * board-green body with the painted cream frame, an amber board-style screen
 * with a gold selected row, a navy wheel and a gold center. No one's logo or
 * product name.
 *
 * The wheel is for eyes and thumbs. VoiceOver gets the same albums as a plain
 * list of buttons (hidden from sight), and the wheel itself is hidden from
 * VoiceOver. Plays even when game sounds are off. Rows update in place
 * (LESSONS 16).
 */
import type { App } from '../../app/app.ts';
import { organ, tuneSeconds } from '../../sound/engine.ts';
import { ALBUMS, TUNES, tuneById, type Tune } from '../../sound/tunes.ts';
import { h, setText, svg } from '../dom.ts';
import { tick } from '../haptics.ts';
import { icon } from '../icons.ts';
import { audioPrefs } from '../../sound/settings.ts';
import { openSheet } from '../sheet.ts';
import { syncStatusBar } from '../statusbar.ts';
import { fadeAll, nowPlaying, onPlaying, playStretch, playTune } from './player.ts';
import { openSounds } from './sounds.ts';

export function lengthText(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Tunes in an album, in the Organ's order. */
function tunesIn(group: string): Tune[] {
  return TUNES.filter((t) => t.group === group);
}

const ROWS = 8;
/** The main menu's rows: every album and Settings (Now Playing makes nine, and scrolls). */
const MENU_ROWS = ALBUMS.length + 1;
/** A compact menu row (Steve, Nov 16): rows are picked with the wheel, never tapped. */
const ROW_H = 31;
/** Degrees of slide per step. */
const STEP = 28;

export function openOrgan(app: App): void {
  type Level = 'albums' | 'songs' | 'now';
  let level: Level = 'albums';
  let album = 0;
  let sel = 0;
  let started = 0;
  let timer = 0;
  // As many whole rows as the screen holds (Steve, Nov 16: nothing cut off at the bottom).
  let rowsShown = ROWS;

  const where = h('span', { class: 'cw-where' }, 'Organ');
  const state = h('span', { class: 'cw-state' });
  // The live game in the header, the way the board shows it (Steve, Nov 16): "▲4 · RAT 3 DOGS 10",
  // the arrow drawn, not typed; a speaker-off mark when game sounds are off.
  const live = h('span', { class: 'cw-live' });
  const view = h('div', { class: 'cw-view' });
  const screen = h('div', { class: 'cw-screen' }, h('div', { class: 'cw-bar' }, where, state, live), view);
  const key = (cls: string, label: string | SVGSVGElement) => h('button', { type: 'button', class: `cw-key ${cls}`, tabindex: '-1' }, label);
  // Drawn marks, not emoji (CLAUDE.md, Words): back, forward, and play / pause.
  const mark = (...d: string[]) => svg('svg', { viewBox: '0 0 24 12', class: 'cw-mark', 'aria-hidden': 'true' }, ...d.map((p) => svg('path', { d: p })));
  const menu = key('cw-menu', 'MENU');
  const prev = key('cw-prev', mark('M2 1v10', 'M12 1 4 6l8 5Z', 'M21 1l-8 5 8 5Z'));
  const next = key('cw-next', mark('M22 1v10', 'M12 1l8 5-8 5Z', 'M3 1l8 5-8 5Z'));
  const play = key('cw-play', mark('M2 1l8 5-8 5Z', 'M15 1v10', 'M20 1v10'));
  const hub = h('button', { type: 'button', class: 'cw-hub', tabindex: '-1' });
  const wheel = h('div', { class: 'cw-wheel' }, menu, prev, next, play, hub);
  const player = h('div', { class: 'cw-player', 'aria-hidden': 'true' }, screen, wheel);

  function drawLive(): void {
    const parts: Node[] = [];
    const g = app.game;
    const s = g ? app.state() : null;
    const team = app.team;
    if (g && s && team && !s.final) {
      const abbr = (side: 'away' | 'home') => (side === g.setup.us ? team.abbr : g.opponentAbbr) || (side === 'away' ? 'AWAY' : 'HOME');
      parts.push(
        h('i', { class: `cw-arrow cw-arrow-${s.half}` }),
        h('span', {}, `${s.inning} · ${abbr('away')} ${s.score.away} ${abbr('home')} ${s.score.home}`),
      );
    }
    if (!audioPrefs(app.data).on) parts.push(icon('speakerOff', 14));
    live.replaceChildren(...parts);
    live.setAttribute('aria-hidden', 'true');
  }

  // The menu: Now Playing while a tune plays, every album, then Settings, the way into all the
  // sound settings (Steve, Nov 13: the player is the hub for everything sound).
  const nowRow = () => (nowPlaying() && tuneById(nowPlaying()!) ? 1 : 0);
  const count = () => (level === 'albums' ? nowRow() + ALBUMS.length + 1 : level === 'songs' ? tunesIn(ALBUMS[album]!.group).length : 0);

  /** Slide a new screen in from the right (opening) or the left (backing out); none with Reduce Motion. */
  function slide(dir: 'in' | 'back'): void {
    view.classList.remove('cw-slide-in', 'cw-slide-back');
    void view.offsetWidth;
    view.classList.add(dir === 'in' ? 'cw-slide-in' : 'cw-slide-back');
  }

  function render(): void {
    drawLive();
    const playing = nowPlaying();
    const t = playing ? tuneById(playing) : undefined;
    setText(state, t ? '▶' : '');
    if (level === 'now') {
      setText(where, 'Now Playing');
      if (!t) {
        view.replaceChildren(h('div', { class: 'cw-now' }, h('p', { class: 'cw-sub' }, 'Nothing playing'), h('p', { class: 'cw-sub' }, 'MENU to choose a tune')));
        return;
      }
      const list = tunesIn(t.group);
      const after = list[(list.indexOf(t) + 1) % list.length];
      const bar = h('i', { class: 'cw-fill' });
      const gone = h('span', {}, '0:00');
      const left = h('span', {}, `-${lengthText(tuneSeconds(t))}`);
      view.replaceChildren(
        h(
          'div',
          { class: 'cw-now' },
          h('p', { class: 'cw-sub' }, `${list.indexOf(t) + 1} of ${list.length} · ${ALBUMS.find((a) => a.group === t.group)?.name ?? ''}`),
          h('div', { class: 'cw-now-main' }, h('p', { class: 'cw-title' }, t.name), h('p', { class: 'cw-artist' }, t.artist)),
          h('div', { class: 'cw-now-time' }, h('div', { class: 'cw-prog' }, bar), h('p', { class: 'cw-times' }, gone, left)),
          after && after !== t ? h('p', { class: 'cw-next-up' }, h('span', { class: 'cw-sub' }, 'Up Next'), h('span', {}, after.name)) : null,
        ),
      );
      window.clearInterval(timer);
      const tickTime = () => {
        const total = tuneSeconds(t);
        const so = Math.min(total, (Date.now() - started) / 1000);
        bar.style.width = `${(so / total) * 100}%`;
        setText(gone, lengthText(so));
        setText(left, `-${lengthText(Math.max(0, total - so))}`);
      };
      tickTime();
      timer = window.setInterval(tickTime, 250);
      return;
    }
    window.clearInterval(timer);
    const rows: [string, string][] =
      level === 'albums'
        ? [...(nowRow() ? [['Now Playing', '›'] as [string, string]] : []), ...ALBUMS.map((a): [string, string] => [a.name, '›']), ['Settings', '›']]
        : tunesIn(ALBUMS[album]!.group).map((t): [string, string] => [t.name, lengthText(tuneSeconds(t))]);
    setText(where, level === 'albums' ? 'Organ' : ALBUMS[album]!.name);
    const first = Math.max(0, Math.min(sel - rowsShown + 2, rows.length - rowsShown));
    view.replaceChildren(
      h(
        'ul',
        { class: 'cw-list' },
        ...rows.slice(first, first + rowsShown).map(([name, right], k) => h('li', { class: first + k === sel ? 'cw-sel' : '' }, h('span', {}, name), h('span', {}, right))),
      ),
    );
  }

  /**
   * Size the screen to its rows (Steve, Nov 16): compact rows (they're picked with the wheel, never
   * tapped), the whole eight-row main menu on the first screen, and the screen exactly that tall.
   * The wheel keeps its full size; on a short screen the menu shows fewer rows instead.
   */
  function fitRows(): void {
    const cs = getComputedStyle(player);
    const inner = player.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const bar = screen.querySelector<HTMLElement>('.cw-bar')!.offsetHeight;
    const edges = screen.offsetHeight - screen.clientHeight;
    const room = inner - parseFloat(cs.rowGap || '0') - bar - edges - wheel.offsetHeight;
    if (!(room > 0)) return;
    const fits = Math.max(3, Math.min(MENU_ROWS, Math.floor(room / ROW_H)));
    view.style.setProperty('--cw-row', `${ROW_H}px`);
    view.style.setProperty('--cw-view-h', `${ROW_H * fits}px`);
    if (fits !== rowsShown) {
      rowsShown = fits;
      render();
    }
  }

  function move(d: number): void {
    const n = count();
    if (!n) return;
    const to = Math.max(0, Math.min(n - 1, sel + d));
    if (to === sel) return;
    sel = to;
    organ.click();
    tick();
    render();
  }

  function startTune(t: Tune): void {
    started = Date.now();
    level = 'now';
    void playTune(app, t.id);
    render();
    slide('in');
  }

  function choose(): void {
    const off = level === 'albums' ? nowRow() : 0;
    if (level === 'albums' && off && sel === 0) {
      level = 'now';
      render();
      slide('in');
      return;
    }
    if (level === 'albums' && sel - off === ALBUMS.length) return openSounds(app);
    if (level === 'albums') {
      album = sel - off;
      sel = 0;
      level = 'songs';
      render();
      slide('in');
      return;
    } else if (level === 'songs') {
      const t = tunesIn(ALBUMS[album]!.group)[sel];
      if (t) return startTune(t);
    }
    render();
  }

  function step(d: 1 | -1): void {
    const t = tuneById(nowPlaying() ?? '');
    if (level === 'now' && t) {
      const list = tunesIn(t.group);
      startTune(list[(list.indexOf(t) + d + list.length) % list.length]!);
    } else move(d);
  }

  menu.addEventListener('click', () => {
    if (level === 'now') {
      const t = tuneById(nowPlaying() ?? '');
      level = 'songs';
      if (t) {
        album = Math.max(0, ALBUMS.findIndex((a) => a.group === t.group));
        sel = Math.max(0, tunesIn(t.group).indexOf(t));
      } else {
        level = 'albums';
        sel = 0;
      }
    } else if (level === 'songs') {
      level = 'albums';
      sel = album + nowRow();
    } else return;
    render();
    slide('back');
  });
  hub.addEventListener('click', choose);
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  play.addEventListener('click', () => {
    const t = tuneById(nowPlaying() ?? '');
    if (t) fadeAll(200);
    else if (level === 'now' || level === 'songs') {
      const again = level === 'songs' ? tunesIn(ALBUMS[album]!.group)[sel] : undefined;
      if (again) startTune(again);
    }
  });

  // Slide around the wheel: every STEP degrees moves the highlight one row.
  let last: number | null = null;
  let lastAt = 0;
  let turned = 0;
  // How far the finger has gone around, and whether it has become a spin. A spin may start on
  // MENU or an arrow (Steve, Nov 17: on a small wheel those covered most of the ring, and spins
  // that began on them were ignored); a tap that doesn't move stays a tap on that key.
  let moved = 0;
  let spinning = false;
  const angle = (e: PointerEvent) => {
    const r = wheel.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  const SPIN_START = 8;
  wheel.addEventListener('pointerdown', (e) => {
    // The gold center is only ever a press.
    if ((e.target as Element).closest('.cw-hub')) return;
    last = angle(e);
    lastAt = e.timeStamp;
    turned = 0;
    moved = 0;
    spinning = false;
    // Off the keys, it's a spin from the start; on a key, once the finger travels a few degrees.
    if (!(e.target as Element).closest('.cw-key')) {
      spinning = true;
      wheel.setPointerCapture(e.pointerId);
    }
  });
  wheel.addEventListener('pointermove', (e) => {
    if (last === null) return;
    const a = angle(e);
    let d = a - last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    // A fast spin moves two or three rows a step (Steve, Nov 16), so a long list goes by quickly.
    if (!spinning) {
      moved += Math.abs(d);
      last = a;
      lastAt = e.timeStamp;
      if (moved < SPIN_START) return;
      // Now a spin: the wheel keeps the finger, and the key underneath won't fire its tap.
      spinning = true;
      wheel.classList.add('cw-spinning');
      wheel.setPointerCapture(e.pointerId);
      last = a;
      lastAt = e.timeStamp;
      return;
    }
    const speed = Math.abs(d) / Math.max(1, e.timeStamp - lastAt);
    const rowsPer = speed > 0.9 ? 3 : speed > 0.45 ? 2 : 1;
    last = a;
    lastAt = e.timeStamp;
    turned += d;
    while (turned >= STEP) {
      turned -= STEP;
      move(rowsPer);
    }
    while (turned <= -STEP) {
      turned += STEP;
      move(-rowsPer);
    }
  });
  const end = () => {
    last = null;
    wheel.classList.remove('cw-spinning');
  };
  wheel.addEventListener('pointerup', end);
  wheel.addEventListener('pointercancel', end);

  // VoiceOver: the same albums and tunes as plain buttons.
  const vo = new Map<string, HTMLButtonElement>();
  const voSettings = h('button', { type: 'button' }, 'Sound Settings');
  voSettings.addEventListener('click', () => openSounds(app));
  const list = h(
    'div',
    { class: 'sk-visually-hidden' },
    voSettings,
    ...ALBUMS.map((a) =>
      h(
        'section',
        { 'aria-label': a.name },
        h('h3', {}, a.name),
        ...tunesIn(a.group).map((t) => {
          const b = h('button', { type: 'button', 'aria-pressed': 'false' }, `${t.name}, ${t.artist}, ${lengthText(tuneSeconds(t))}`);
          b.addEventListener('click', () => (nowPlaying() === t.id ? fadeAll(200) : startTune(t)));
          vo.set(t.id, b);
          return b;
        }),
      ),
    ),
  );
  const sync = (id: string | null) => {
    for (const [tid, b] of vo) if (b.getAttribute('aria-pressed') !== String(tid === id)) b.setAttribute('aria-pressed', String(tid === id));
    // The menu gains or loses its Now Playing row, so the menu redraws too.
    render();
  };
  const off = onPlaying(sync);
  if (nowPlaying() && tuneById(nowPlaying()!)) {
    level = 'now';
    started = Date.now();
  }
  render();
  // The Stretch button (Steve, Nov 16): Take Me Out on demand, for a game that ends on time before
  // the stretch inning. Once it plays, the stretch won't play by itself again this game.
  const stretch = h('button', { type: 'button', class: 'sk-key cw-stretch', 'aria-label': 'Stretch: Take Me Out to the Ball Game' }, 'Stretch');
  stretch.addEventListener('click', () => {
    playStretch(app);
    const t = tuneById('take-me-out');
    if (t) {
      started = Date.now();
      level = 'now';
      render();
    }
  });
  openSheet({
    title: 'Organ',
    full: true,
    className: 'cw-sheet',
    // Nearly full screen: the player fills the sheet, and Done is a small key in the corner (Steve, Nov 13).
    // The green body is the whole screen; its painted frame holds the player and, under the wheel,
    // the Stretch button (Steve, Nov 16). The player is hidden from VoiceOver; Stretch isn't.
    body: [h('div', { class: 'cw-frame' }, player, stretch), list],
    cancel: false,
    onClose: () => {
      statusBar(false);
      off();
      window.clearInterval(timer);
      window.removeEventListener('resize', fitRows);
    },
  });
  statusBar(true);
  requestAnimationFrame(fitRows);
  window.addEventListener('resize', fitRows);
}

/**
 * The iPhone's own clock and battery sit on the Organ's green, as its top strip (Steve, Nov 16):
 * while the Organ is open the status bar's color (theme-color) is board green, so iOS draws light
 * text; it goes back to cream (or navy at night) when the Organ closes. If a Home Screen app's
 * status bar doesn't follow a live change, iOS keeps its usual strip above the green.
 */
function statusBar(organ: boolean): void {
  document.documentElement.classList.toggle('organ-open', organ);
  syncStatusBar();
}

