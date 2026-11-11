/*
 * Shared plumbing for stats: replay each game once, and read the Defense card.
 */
import { replay, type GameState } from '../engine/replay.ts';
import type { DefenseInning, GameRecord, LineupPos, Team } from '../engine/types.ts';

interface Cached {
  events: GameRecord['events'];
  length: number;
  last: unknown;
  setup: GameRecord['setup'];
  us: string;
  mode: string;
  state: GameState;
}
const cache = new WeakMap<GameRecord, Cached>();

/**
 * Replayed state of a game, cached per game object. A game in progress
 * changes (plays added, setup edited), so the cache checks it's still the
 * same before using it.
 */
export function stateOf(game: GameRecord): GameState {
  const c = cache.get(game);
  const last = game.events[game.events.length - 1];
  if (
    c &&
    c.events === game.events &&
    c.length === game.events.length &&
    c.last === last &&
    c.setup === game.setup &&
    c.us === game.setup.us &&
    c.mode === game.setup.mode
  )
    return c.state;
  const state = replay(game);
  cache.set(game, { events: game.events, length: game.events.length, last, setup: game.setup, us: game.setup.us, mode: game.setup.mode, state });
  return state;
}

/** The Defense card for an inning: innings copy forward until set; inning 1 defaults to the lineup. */
export function defenseFor(game: GameRecord, inning: number): DefenseInning {
  const card = game.defense ?? [];
  for (let i = Math.min(inning, card.length) - 1; i >= 0; i--) {
    const entry = card[i];
    if (entry) return entry;
  }
  const fromLineup: DefenseInning = {};
  for (const slot of game.setup.lineups.us) if (slot.pos !== undefined) fromLineup[slot.player] = slot.pos;
  return fromLineup;
}

/** Who plays a fielding position in an inning (EH and Sit don't field). */
export function playerAt(game: GameRecord, inning: number, pos: number): string | undefined {
  const card = defenseFor(game, inning);
  return Object.keys(card).find((p) => card[p] === pos);
}

export function isFieldPos(pos: LineupPos | 'sit' | undefined): pos is Exclude<LineupPos, 'EH'> {
  return typeof pos === 'number';
}

/** Innings the other team actually batted in (our defensive innings). */
export function defensiveInnings(game: GameRecord): number[] {
  const s = stateOf(game);
  const them: 'top' | 'bottom' = game.setup.us === 'away' ? 'bottom' : 'top';
  const innings = new Set<number>();
  game.events.forEach((ev, i) => {
    const h = s.eventHalves[i];
    if (!h || !h.applied || h.half !== them) return;
    if (ev.t === 'sub' || ev.t === 'addSlot' || ev.t === 'extend' || ev.t === 'end' || ev.t === 'mode') return;
    if (ev.t === 'endHalf' && ev.auto) return;
    innings.add(h.inning);
  });
  return [...innings].sort((a, b) => a - b);
}

/** Everyone who batted for us in a game: starters, subs, and late arrivals. */
export function ourBatters(game: GameRecord): string[] {
  const all = new Set(game.setup.lineups.us.map((s) => s.player));
  for (const ev of game.events) if ((ev.t === 'sub' || ev.t === 'addSlot') && ev.team === 'us') all.add(ev.player);
  return [...all];
}

/** Players who were at the game: marked Here, plus anyone in the lineup. */
export function attendees(game: GameRecord): string[] {
  const all = new Set(game.present ?? []);
  for (const p of ourBatters(game)) all.add(p);
  return [...all];
}

export function isFinal(game: GameRecord): boolean {
  return stateOf(game).final !== null;
}

/** Our result: W, L, T, or null while in progress. */
export function resultFor(game: GameRecord): 'W' | 'L' | 'T' | null {
  const f = stateOf(game).final;
  if (!f) return null;
  if (!f.winner) return 'T';
  return f.winner === game.setup.us ? 'W' : 'L';
}

export function teamOf(game: GameRecord, half: 'top' | 'bottom'): Team {
  const side = half === 'top' ? 'away' : 'home';
  return side === game.setup.us ? 'us' : 'them';
}
