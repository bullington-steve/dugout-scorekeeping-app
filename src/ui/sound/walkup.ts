/*
 * A player's walk-up song (SPEC §13), on Edit Player: a built-in or library
 * tune, or their own song file (MP3, M4A, WAV) kept on this iPhone, with
 * Start At, Play For, and Volume. A library pick plays even when there's a
 * file; Use My File switches back.
 */
import type { App } from '../../app/app.ts';
import { defaultWalkup } from '../../sound/director.ts';
import { organ } from '../../sound/engine.ts';
import { TUNES, tuneById } from '../../sound/tunes.ts';
import { newId, type Player, type Walkup } from '../../store/model.ts';
import { SoundStore } from '../../store/sounds.ts';
import { group, selectField, switchRow, textField } from '../controls.ts';
import { h, setText } from '../dom.ts';
import { fadeAll, playTune } from './player.ts';

const VOLUMES = [
  { value: '0.25', label: '25%' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: '100%' },
];

export function walkupGroup(app: App, p: Player): HTMLElement {
  const w: Walkup = (p.walkup = { ...(p.walkup ?? {}) });
  const team = app.team;
  const builtIn = defaultWalkup(team?.players ?? [p], p.id);
  const status = h('p', { class: 'sk-row-note', 'aria-live': 'polite' });
  const describe = () => {
    if (w.fileId && (!w.tune || w.useFile)) setText(status, `Plays your file from ${w.start ?? 0} seconds, for ${w.length ?? 15} seconds.`);
    else setText(status, `Plays ${tuneById(w.tune ?? builtIn)?.name ?? 'a built-in walk-up'}${w.tune ? '' : ' (picked for you so teammates differ)'}.`);
  };

  const tunes = selectField(
    'Song',
    [
      { value: '', label: `Built-In: ${tuneById(builtIn)?.name ?? 'Walk-Up'}` },
      ...TUNES.filter((t) => t.group === 'walkup').map((t) => ({ value: t.id, label: `${t.name} (walk-up)` })),
      ...TUNES.filter((t) => t.group !== 'walkup' && t.group !== 'game').map((t) => ({ value: t.id, label: t.name })),
    ],
    w.tune ?? '',
    (v) => {
      w.tune = v || undefined;
      if (v) w.useFile = false;
      describe();
    },
  );

  const file = h('input', { type: 'file', accept: 'audio/*,.mp3,.m4a,.wav', class: 'sk-file', 'aria-label': 'Use a Song File' });
  const pick = h('label', { class: 'sk-key sk-file-button' }, h('span', { 'aria-hidden': 'true' }, w.fileId ? 'Replace Song File' : 'Use a Song File'), file);
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    try {
      const store = new SoundStore();
      const id = w.fileId ?? newId();
      await store.put({ id, name: f.name, type: f.type || 'audio/mpeg', bytes: new Uint8Array(await f.arrayBuffer()) });
      organ.forgetFile(id);
      w.fileId = id;
      w.useFile = true;
      w.length ??= 15;
      setText(pick.firstElementChild!, 'Replace Song File');
      setText(status, `${f.name} is saved on this iPhone and goes in your backups.`);
    } catch {
      setText(status, 'That file couldn’t be saved. Try an MP3 or M4A.');
    }
  });

  const preview = h('button', { type: 'button', class: 'sk-key' }, 'Play It');
  preview.addEventListener('click', async () => {
    fadeAll(100);
    if (w.fileId && (!w.tune || w.useFile)) {
      const store = new SoundStore();
      await organ.playFile(w.fileId, async () => (await store.get(w.fileId!))?.bytes ?? null, { start: w.start ?? 0, length: Math.min(w.length ?? 15, 8), volume: w.volume ?? 1 });
    } else void playTune(app, w.tune ?? builtIn);
  });

  describe();
  return group(
    'Walk-Up Song',
    tunes,
    pick,
    switchRow('Use My File', !!w.useFile, (v) => {
      w.useFile = v;
      describe();
    }, 'On: your song file plays instead of the song above.'),
    textField('Start At (Seconds)', String(w.start ?? 0), (v) => (w.start = Math.max(0, Number(v) || 0)), { inputmode: 'numeric' }),
    textField('Play For (Seconds)', String(w.length ?? 15), (v) => (w.length = Math.min(60, Math.max(3, Number(v) || 15))), { inputmode: 'numeric' }),
    selectField('Volume', VOLUMES, String(w.volume ?? 1), (v) => (w.volume = Number(v))),
    preview,
    status,
  );
}
