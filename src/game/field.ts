/*
 * The field for hit location: where each fielder stands, who's nearest a
 * spot, what to call a spot, and keeping taps on the field. Feet, with home
 * plate at (0, 0) and center field straight up the y axis. No DOM.
 * See docs/SPEC.md §2 "Hit location".
 */
import type { DefenseInning, Loc, Pos, Result } from '../engine/types.ts';
import { POSITION_ABBR, POSITION_NAMES } from '../engine/words.ts';

/** Fence distance (a typical rec softball field is 275–300 feet). */
export const FENCE = 275;
/** The warning track, where a tap past the fence is pulled back to. */
export const TRACK = 262;
export const BASE_PATH = 70;

const D = BASE_PATH / Math.SQRT2;
export const BASES = { first: { x: D, y: D }, second: { x: 0, y: 2 * D }, third: { x: -D, y: D } } as const;

/** Where each fielder usually stands. */
export const SPOTS: Record<Pos, { x: number; y: number }> = {
  1: { x: 0, y: 46 },
  2: { x: 0, y: -6 },
  3: { x: 54, y: 62 },
  4: { x: 28, y: 114 },
  5: { x: -54, y: 62 },
  6: { x: -30, y: 110 },
  7: { x: -128, y: 205 },
  8: { x: 0, y: 248 },
  9: { x: 128, y: 205 },
  10: { x: -64, y: 240 },
  11: { x: 64, y: 240 },
  12: { x: 0, y: 155 },
};

const INFIELD: Pos[] = [1, 2, 3, 4, 5, 6];

/**
 * Positions to show on the field. In the field, the Defense card for the
 * inning. At bat, assume the other team plays the same outfield as ours.
 */
export function visiblePositions(ourDefense: DefenseInning, weAreFielding: boolean): Pos[] {
  const ours = new Set(Object.values(ourDefense).filter((p): p is Pos => typeof p === 'number'));
  if (weAreFielding && ours.size) return [...ours].sort((a, b) => a - b);
  const fourOutfielders = ours.has(10) || ours.has(11);
  const outfield: Pos[] = fourOutfielders ? [7, 10, 11, 9] : [7, 8, 9];
  if (ours.has(12)) outfield.push(12);
  return [...INFIELD, ...outfield].sort((a, b) => a - b);
}

export function nearestFielder(loc: { x: number; y: number }, visible: readonly Pos[]): Pos {
  let best: Pos = visible[0] ?? 8;
  let bestD = Infinity;
  for (const p of visible) {
    const s = SPOTS[p];
    const d = Math.hypot(loc.x - s.x, loc.y - s.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** "Left-center field (LCF)". */
export function spotName(pos: Pos): string {
  const name = POSITION_NAMES[pos];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} (${POSITION_ABBR[pos]})`;
}

export function mayLandPastFence(result: Result): boolean {
  return result === 'HR' || result === 'HRO';
}

/**
 * Keep a tap on the field. Past the fence is pulled back to the warning
 * track along the same line, except for home runs.
 */
export function clampToField(loc: Loc, result: Result): Loc {
  let { x, y } = loc;
  y = Math.max(-30, y);
  const d = Math.hypot(x, y);
  const limit = mayLandPastFence(result) ? FENCE + 40 : TRACK;
  if (d > limit) {
    x = (x / d) * limit;
    y = (y / d) * limit;
  }
  x = Math.max(-300, Math.min(300, x));
  return { ...loc, x: Math.round(x), y: Math.round(y) };
}

/** Pick the Spot from a List: one row per visible position (for VoiceOver users). */
export function zoneList(visible: readonly Pos[]): { pos: Pos; label: string; loc: { x: number; y: number } }[] {
  return visible.map((pos) => ({ pos, label: spotName(pos), loc: { ...SPOTS[pos] } }));
}

/** Balls in play that take a spot on the field (walks and strikeouts don't). */
export function usesField(result: Result): boolean {
  return result !== 'K' && result !== 'KL' && result !== 'BB';
}
