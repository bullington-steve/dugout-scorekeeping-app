/*
 * The Organ pad (SPEC §13): album-style playlists, each with a small cover,
 * tune count, and total length; numbered rows with the name, where it's
 * from, and its length. Tap to play, tap again to stop. The playing row
 * shows bars and turns red (gold in Dark Mode). Rows update in place, never
 * rebuilt under a finger (LESSONS 16). Plays even when game sounds are off.
 */
import type { App } from '../../app/app.ts';
import { tuneSeconds } from '../../sound/engine.ts';
import { ALBUMS, TUNES } from '../../sound/tunes.ts';
import { h } from '../dom.ts';
import { openSheet } from '../sheet.ts';
import { fadeAll, nowPlaying, onPlaying, playTune } from './player.ts';

export function lengthText(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function totalText(seconds: number): string {
  if (seconds < 60) return 'under a minute';
  const m = Math.round(seconds / 60);
  return m === 1 ? '1 minute' : `${m} minutes`;
}

export function openOrgan(app: App): void {
  const rows = new Map<string, HTMLButtonElement>();
  const albums = ALBUMS.map((a) => {
    const tunes = TUNES.filter((t) => t.group === a.group);
    const total = tunes.reduce((n, t) => n + tuneSeconds(t), 0);
    const list = h(
      'ol',
      { class: 'og-list' },
      ...tunes.map((t, i) => {
        const b = h(
          'button',
          { type: 'button', class: 'og-row', 'aria-pressed': 'false' },
          h('span', { class: 'og-num', 'aria-hidden': 'true' }, String(i + 1)),
          h('span', { class: 'og-bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
          h('span', { class: 'og-text' }, h('span', { class: 'og-name' }, t.name), h('span', { class: 'og-credit' }, t.credit)),
          h('span', { class: 'og-len' }, lengthText(tuneSeconds(t))),
        );
        b.addEventListener('click', () => {
          if (nowPlaying() === t.id) fadeAll(200);
          else void playTune(app, t.id);
        });
        rows.set(t.id, b);
        return h('li', {}, b);
      }),
    );
    return h(
      'section',
      { class: 'og-album', 'aria-label': a.name },
      h(
        'div',
        { class: 'og-head' },
        h('span', { class: 'og-cover', 'aria-hidden': 'true' }, a.name),
        h('span', { class: 'og-head-text' }, h('h3', { class: 'og-title' }, a.name), h('span', { class: 'og-meta' }, `${tunes.length} ${tunes.length === 1 ? 'tune' : 'tunes'} · ${totalText(total)}`)),
      ),
      list,
    );
  });
  const mark = (id: string | null) => {
    for (const [tid, b] of rows) {
      const on = tid === id;
      if (b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
    }
  };
  mark(nowPlaying());
  const off = onPlaying(mark);
  openSheet({
    title: 'Organ',
    full: true,
    className: 'og-sheet',
    body: [h('p', { class: 'sk-row-note' }, 'Tap a tune to play it now. Tap it again to stop. These play even when game sounds are off.'), h('div', { class: 'og-albums' }, ...albums)],
    done: { label: 'Done', onClick: () => undefined },
    cancel: false,
    onClose: off,
  });
}
