/*
 * The Organ (SPEC §13), as a click-wheel music player of our own (Steve,
 * Nov 2026): a backlit screen listing the albums, then their tunes, then Now
 * Playing; a wheel to slide around (each step clicks softly and ticks the
 * iPhone's haptics), the middle to choose, MENU to go back, ⏮ ⏭ to change
 * tunes, ▶ ❚❚ to stop. White plastic by day, black in Dark Mode; the screen
 * stays backlit in both. No one's logo or product name.
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
import { openSheet } from '../sheet.ts';
import { fadeAll, nowPlaying, onPlaying, playTune } from './player.ts';
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
/** Degrees of slide per step. */
const STEP = 28;

export function openOrgan(app: App): void {
  type Level = 'albums' | 'songs' | 'now';
  let level: Level = 'albums';
  let album = 0;
  let sel = 0;
  let started = 0;
  let timer = 0;

  const where = h('span', { class: 'cw-where' }, 'Organ');
  const state = h('span', { class: 'cw-state' });
  const view = h('div', { class: 'cw-view' });
  const screen = h('div', { class: 'cw-screen' }, h('div', { class: 'cw-bar' }, where, state, h('span', { class: 'cw-batt' })), view);
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

  // The menu: every album, then Settings, the way into all the sound settings (Steve, Nov 13:
  // the iPod is the hub for everything sound).
  const count = () => (level === 'albums' ? ALBUMS.length + 1 : level === 'songs' ? tunesIn(ALBUMS[album]!.group).length : 0);

  function render(): void {
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
      const bar = h('i', { class: 'cw-fill' });
      const el = h('span', {}, '0:00');
      view.replaceChildren(
        h(
          'div',
          { class: 'cw-now' },
          h('p', { class: 'cw-sub' }, `${list.indexOf(t) + 1} of ${list.length}`),
          h('p', { class: 'cw-title' }, t.name),
          h('p', { class: 'cw-artist' }, t.artist),
          h('p', { class: 'cw-sub' }, ALBUMS.find((a) => a.group === t.group)?.name ?? ''),
          h('div', { class: 'cw-prog' }, bar),
          h('p', { class: 'cw-times' }, el, h('span', {}, lengthText(tuneSeconds(t)))),
        ),
      );
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        const total = tuneSeconds(t);
        const gone = Math.min(total, (Date.now() - started) / 1000);
        bar.style.width = `${(gone / total) * 100}%`;
        setText(el, lengthText(gone));
      }, 250);
      return;
    }
    window.clearInterval(timer);
    const rows: [string, string][] =
      level === 'albums' ? [...ALBUMS.map((a): [string, string] => [a.name, '›']), ['Settings', '›']] : tunesIn(ALBUMS[album]!.group).map((t): [string, string] => [t.name, lengthText(tuneSeconds(t))]);
    setText(where, level === 'albums' ? 'Organ' : ALBUMS[album]!.name);
    const first = Math.max(0, Math.min(sel - ROWS + 2, rows.length - ROWS));
    view.replaceChildren(
      h(
        'ul',
        { class: 'cw-list' },
        ...rows.slice(first, first + ROWS).map(([name, right], k) => h('li', { class: first + k === sel ? 'cw-sel' : '' }, h('span', {}, name), h('span', {}, right))),
      ),
    );
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
  }

  function choose(): void {
    if (level === 'albums' && sel === ALBUMS.length) return openSounds(app);
    if (level === 'albums') {
      album = sel;
      sel = 0;
      level = 'songs';
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
      }
    } else if (level === 'songs') {
      level = 'albums';
      sel = album;
    }
    render();
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
  let turned = 0;
  const angle = (e: PointerEvent) => {
    const r = wheel.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };
  wheel.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('.cw-key, .cw-hub')) return;
    last = angle(e);
    turned = 0;
    wheel.setPointerCapture(e.pointerId);
  });
  wheel.addEventListener('pointermove', (e) => {
    if (last === null) return;
    const a = angle(e);
    let d = a - last;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    last = a;
    turned += d;
    while (turned >= STEP) {
      turned -= STEP;
      move(1);
    }
    while (turned <= -STEP) {
      turned += STEP;
      move(-1);
    }
  });
  const end = () => (last = null);
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
    if (level === 'now') render();
    else setText(state, id ? '▶' : '');
  };
  const off = onPlaying(sync);
  if (nowPlaying() && tuneById(nowPlaying()!)) {
    level = 'now';
    started = Date.now();
  }
  render();
  openSheet({
    title: 'Organ',
    full: true,
    className: 'cw-sheet',
    // Nearly full screen: the player fills the sheet, and Done is a small key in the corner (Steve, Nov 13).
    body: [player, list],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
    onClose: () => {
      off();
      window.clearInterval(timer);
    },
  });
}
