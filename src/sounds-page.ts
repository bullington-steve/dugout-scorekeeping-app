/*
 * The listen-only sound library (SPEC §13): every tune and game sound, played
 * live by the same organ as the app. Not linked from the app (a link out of a
 * Home Screen app has no way back); open /sounds.html in Safari.
 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './ui/sound/sound.css';
import { organ, tuneSeconds, VOICES, type Voice } from './sound/engine.ts';
import { ALBUMS, TUNES, type Tune } from './sound/tunes.ts';
import { h } from './ui/dom.ts';
import { lengthText } from './ui/sound/organ.ts';

const root = document.getElementById('sounds')!;
root.className = 'sk-app';
let playing: { stop: (ms?: number) => void } | null = null;
let playingId: string | null = null;
const rows = new Map<string, HTMLButtonElement>();

function row(t: Tune, i: number): HTMLElement {
  const b = h(
    'button',
    { type: 'button', class: 'og-row', 'aria-pressed': 'false' },
    h('span', { class: 'og-num', 'aria-hidden': 'true' }, String(i + 1)),
    h('span', { class: 'og-bars', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('span', { class: 'og-text' }, h('span', { class: 'og-name' }, t.name), h('span', { class: 'og-credit' }, `${t.credit}. ${t.source}`)),
    h('span', { class: 'og-len' }, lengthText(tuneSeconds(t))),
  );
  b.addEventListener('click', async () => {
    playing?.stop(150);
    for (const r of rows.values()) r.setAttribute('aria-pressed', 'false');
    if (playingId === t.id) {
      playingId = null;
      return;
    }
    const p = organ.play(t);
    playing = p;
    playingId = t.id;
    b.setAttribute('aria-pressed', 'true');
    await p?.ended;
    if (playingId === t.id) {
      b.setAttribute('aria-pressed', 'false');
      playingId = null;
    }
  });
  rows.set(t.id, b);
  return h('li', {}, b);
}

const voice = h('select', { class: 'sk-input', id: 'voice' }, ...(Object.keys(VOICES) as Voice[]).map((v) => h('option', { value: v }, VOICES[v].name)));
voice.addEventListener('change', () => (organ.voice = voice.value as Voice));
const groups = [...ALBUMS, { group: 'game' as const, name: 'Game Sounds' }];
root.append(
  h('header', { class: 'sk-header' }, h('h1', { class: 'sk-wordmark sk-header-title' }, 'ScoreKept Sounds')),
  h('p', {}, 'Every sound in the app, played live by the same ballpark organ. Tap to play, tap again to stop.'),
  h('div', { class: 'sk-field' }, h('label', { for: 'voice', class: 'sk-field-label' }, 'Organ Voice'), voice),
  h(
    'div',
    { class: 'og-albums' },
    ...groups.map((a) =>
      h('section', { class: 'og-album', 'aria-label': a.name }, h('h2', { class: 'og-title' }, a.name), h('ol', { class: 'og-list' }, ...TUNES.filter((t) => t.group === a.group).map(row))),
    ),
  ),
);
