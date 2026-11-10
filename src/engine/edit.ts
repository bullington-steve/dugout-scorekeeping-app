/*
 * Changing a game's history. Every change returns a new event list; replay
 * then re-scores everything after it, so stats always follow.
 */
import { replay } from './replay.ts';
import type { GameEvent, GameRecord, Half } from './types.ts';

/** Undo removes the last tap. */
export function undo(events: readonly GameEvent[]): GameEvent[] {
  return events.slice(0, -1);
}

/** Edit Play: replace one event and keep its original time. */
export function replaceEvent(events: readonly GameEvent[], i: number, next: GameEvent): GameEvent[] {
  const old = events[i];
  if (!old) return [...events];
  const copy = [...events];
  copy[i] = { ...next, at: next.at ?? old.at } as GameEvent;
  return copy;
}

/** Delete This Play. Pitches that led to it go too. */
export function deleteEvent(events: readonly GameEvent[], i: number): GameEvent[] {
  return events.filter((_, n) => n !== i);
}

export type SwitchResult = { ok: true; game: GameRecord } | { ok: false; why: 'mid-inning' };

/**
 * Switch home and away (Game Settings). Every recorded play moves to the
 * other half of its inning so stats stay with the right team. Only between
 * innings, or after a game that ended at the end of an inning: halfway
 * through an inning the other half hasn't happened yet.
 */
export function switchHomeAway(game: GameRecord): SwitchResult {
  const state = replay(game);
  const midInning =
    !state.final && (state.half === 'bottom' || state.halfBegun || state.plays.some((p) => p.inning === state.inning));
  const endedMidHalf = state.final && state.final.reason !== 'ended' && state.pending === null;
  if (midInning || endedMidHalf) return { ok: false, why: 'mid-inning' };

  const innings = new Map<number, Record<Half, GameEvent[]>>();
  game.events.forEach((ev, i) => {
    const h = state.eventHalves[i];
    if (!h) return;
    const slot = innings.get(h.inning) ?? { top: [], bottom: [] };
    slot[h.half].push(ev);
    innings.set(h.inning, slot);
  });

  const events: GameEvent[] = [];
  const lastInning = Math.max(0, ...innings.keys());
  for (let n = 1; n <= lastInning; n++) {
    const { top, bottom } = innings.get(n) ?? { top: [], bottom: [] };
    // A half that was never played (home team ahead after the top) is closed for the record.
    events.push(...(bottom.length ? bottom : [{ t: 'endHalf', auto: 'switch' } as GameEvent]));
    events.push(...top);
  }
  const us = game.setup.us === 'home' ? 'away' : 'home';
  return { ok: true, game: { ...game, setup: { ...game.setup, us }, events } };
}
