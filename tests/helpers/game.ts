/* Builders for engine tests. */
import { cloneRules, ruleSetById, type Rules } from '../../src/engine/rules.ts';
import type { GameEvent, GameRecord, GameSetup, Result } from '../../src/engine/types.ts';

export const OURS = Array.from({ length: 10 }, (_, n) => `p${n + 1}`);
export const THEIRS = Array.from({ length: 10 }, (_, n) => `T${n + 1}`);

export function rules(id = 'basic', changes: Partial<Rules> = {}): Rules {
  return { ...cloneRules(ruleSetById(id, [])!.rules), ...changes };
}

export function game(setup: Partial<GameSetup> = {}, events: GameEvent[] = []): GameRecord {
  return {
    id: 'g1',
    setup: {
      us: 'away',
      mode: 'scorekeeper',
      rules: rules(),
      count: false,
      hitLocation: false,
      startedAt: null,
      lineups: {
        us: OURS.map((player) => ({ player })),
        them: THEIRS.map((player) => ({ player })),
      },
      ...setup,
    },
    events,
  };
}

export const pa = (result: Result, extra: Partial<Extract<GameEvent, { t: 'pa' }>> = {}): GameEvent => ({
  t: 'pa',
  result,
  ...extra,
});

/** Three quick outs for whoever is batting (scorekeeper mode). */
export const threeOuts = (): GameEvent[] => [pa('GO'), pa('F'), pa('K')];

/** A scoreless inning: both halves go down in order. */
export const quietInning = (): GameEvent[] => [...threeOuts(), ...threeOuts()];

/** Add times: one event a minute from `start`. */
export function timed(events: GameEvent[], start: number, stepMs = 60_000): GameEvent[] {
  return events.map((e, n) => ({ ...e, at: start + n * stepMs }));
}
