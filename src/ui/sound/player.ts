/*
 * Plays the director's plans in order, one sound at a time, and fades
 * whatever is playing when the next play is scored or Undo is tapped
 * (SPEC §13). Also the shared "play this tune now" used by the Organ pad and
 * the ♪ Walk-Up button.
 */
import type { App } from '../../app/app.ts';
import { defaultWalkup, planFor, type PlanItem } from '../../sound/director.ts';
import { organ, type Playing } from '../../sound/engine.ts';
import { audioPrefs } from '../../sound/settings.ts';
import { hush, say } from '../../sound/speech.ts';
import { ALBUMS, TUNES, tuneById } from '../../sound/tunes.ts';
import type { GameState } from '../../engine/replay.ts';
import { SoundStore } from '../../store/sounds.ts';

let current: Playing | null = null;
let currentId: string | null = null;
let runToken = 0;
const listeners = new Set<(id: string | null) => void>();

/** Something wants to know what's playing (the Organ pad's rows). */
export function onPlaying(fn: (id: string | null) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setCurrent(p: Playing | null, id: string | null): void {
  current = p;
  currentId = id;
  for (const fn of listeners) fn(id);
  showNowPlaying(id);
}

/**
 * The iPhone's Now Playing (Lock Screen and Control Center): the tune, its artist, and its album,
 * with pause to stop it. iOS shows it only for some kinds of playback, so this is a bonus, never
 * the only control. Confirm on a real iPhone.
 */
function showNowPlaying(id: string | null): void {
  try {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const t = id ? tuneById(id) : undefined;
    if (!t) {
      ms.metadata = null;
      ms.playbackState = 'none';
      return;
    }
    ms.metadata = new MediaMetadata({
      title: t.name,
      artist: t.artist,
      album: ALBUMS.find((a) => a.group === t.group)?.name ?? 'ScoreKept Organ',
      artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    ms.playbackState = 'playing';
    for (const action of ['pause', 'stop'] as const) ms.setActionHandler(action, () => fadeAll(200));
  } catch {
    // Now Playing is a nicety; the Organ works without it.
  }
}

export function nowPlaying(): string | null {
  return currentId;
}

/** Fade out whatever is playing and drop anything queued. */
export function fadeAll(ms = 300): void {
  runToken += 1;
  hush();
  current?.stop(ms);
  setCurrent(null, null);
}

function applyVoice(app: App): void {
  const a = audioPrefs(app.data);
  organ.voice = a.voice;
  organ.setEcho(a.echo);
  organ.setLeslie(a.leslie);
}

/** Play one tune now (the Organ pad): plays even when game sounds are off. */
export async function playTune(app: App, id: string): Promise<void> {
  fadeAll(150);
  const t = tuneById(id);
  if (!t) return;
  applyVoice(app);
  const p = organ.play(t);
  if (!p) return;
  setCurrent(p, id);
  const token = runToken;
  await p.ended;
  if (token === runToken) setCurrent(null, null);
}

let store: SoundStore | null = null;
function files(): SoundStore | null {
  try {
    store ??= typeof indexedDB === 'undefined' ? null : new SoundStore();
  } catch {
    store = null;
  }
  return store;
}

/** A player's walk-up: their library tune, their own file, or a built-in one. */
export async function playWalkup(app: App, playerId: string, token = runToken): Promise<void> {
  const team = app.team;
  const p = team?.players.find((x) => x.id === playerId);
  if (!team || !p) return;
  applyVoice(app);
  const w = p.walkup;
  let playing: Playing | null = null;
  if (w?.fileId && !(w.tune && !w.useFile)) {
    const s = files();
    playing = await organ.playFile(w.fileId, async () => (s ? ((await s.get(w.fileId!))?.bytes ?? null) : null), {
      start: w.start ?? 0,
      length: w.length ?? 15,
      volume: w.volume ?? 1,
    });
  }
  if (!playing) {
    const t = tuneById(w?.tune ?? defaultWalkup(team.players, p.id));
    if (t) playing = organ.play(t, { volume: w?.volume ?? 1 });
  }
  if (!playing || token !== runToken) {
    playing?.stop(0);
    return;
  }
  setCurrent(playing, `walkup:${playerId}`);
  await playing.ended;
  if (token === runToken) setCurrent(null, null);
}

async function run(app: App, items: PlanItem[]): Promise<void> {
  fadeAll(300);
  const token = runToken;
  applyVoice(app);
  for (const item of items) {
    if (token !== runToken) return;
    if (item.kind === 'say') await say(item.text);
    else if (item.kind === 'crowd') organ.crowdOnly(item.crowd);
    else if (item.kind === 'walkup') await playWalkup(app, item.player, token);
    else {
      const t = tuneById(item.id);
      const p = t ? organ.play(t) : null;
      if (!p) continue;
      setCurrent(p, item.id);
      await p.ended;
    }
    if (token !== runToken) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  if (token === runToken) setCurrent(null, null);
}

let betweenIndex = 0;

/**
 * Watches the app: a new play gets its sounds; Undo (fewer plays) fades them.
 * Call on every app change.
 */
export function soundWatcher(app: App): () => void {
  let gameId: string | null = null;
  let length = 0;
  let prev: GameState | null = null;
  const birthdays = new Set<string>();
  // The first tap anywhere lets iOS play sound (LESSONS 7).
  document.addEventListener('pointerdown', () => organ.unlock(), { once: false, passive: true });
  return () => {
    const g = app.game;
    const s = app.state();
    if (!g || !s) {
      gameId = null;
      prev = null;
      return;
    }
    if (g.id !== gameId) {
      gameId = g.id;
      length = g.events.length;
      prev = s;
      birthdays.clear();
      return;
    }
    const before = prev;
    prev = s;
    const n = g.events.length;
    if (n < length) {
      length = n;
      fadeAll(250);
      return;
    }
    if (n === length + 1 && before) {
      length = n;
      const a = audioPrefs(app.data);
      if (!a.on) return;
      const between = TUNES.filter((t) => t.group === 'between');
      const today = new Date();
      const plan = planFor(app.data, g, g.events[n - 1]!, before, s, {
        birthdaysDone: birthdays,
        today: `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        betweenTune: between[betweenIndex % between.length]?.id ?? null,
      });
      if (plan.some((p) => p.kind === 'tune' && p.why === 'between')) betweenIndex += 1;
      if (plan.length) void run(app, plan);
      else fadeAll(300);
      return;
    }
    length = n;
  };
}
