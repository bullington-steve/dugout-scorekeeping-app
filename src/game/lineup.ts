/*
 * The lineup builder's rules (SPEC §4, §9), with no DOM: groups, open
 * positions, Auto-Fill, Same as Last Game, Suggest Order and its order
 * check, and the count line.
 */
import type { LineupPos, Pos, Slot } from '../engine/types.ts';
import type { Player } from '../store/model.ts';

export type GroupName = 'Pitchers' | 'Catchers' | 'Infield' | 'Outfield' | 'Bats Only';
export const GROUPS: GroupName[] = ['Pitchers', 'Catchers', 'Infield', 'Outfield', 'Bats Only'];

export const FIELD_POSITIONS: Pos[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const INFIELD: Pos[] = [1, 2, 3, 4, 5, 6];
const OUTFIELD: Pos[] = [7, 8, 9, 10, 11];

export interface Hitting {
  ops: number | null;
  avg: number | null;
}

export function groupOf(p: Player): GroupName {
  const main = p.positions[0];
  if (main === 1) return 'Pitchers';
  if (main === 2) return 'Catchers';
  if (typeof main === 'number' && main <= 6) return 'Infield';
  if (typeof main === 'number') return 'Outfield';
  return 'Bats Only';
}

/** Players grouped like a video-game roster, best hitters first in each group. */
export function grouped(players: readonly Player[], hitting: (id: string) => Hitting): Map<GroupName, Player[]> {
  const out = new Map<GroupName, Player[]>(GROUPS.map((g) => [g, []]));
  for (const p of players) out.get(groupOf(p))!.push(p);
  const strength = (p: Player) => hitting(p.id).ops ?? (p.rating ?? 0) / 5;
  for (const list of out.values()) list.sort((a, b) => strength(b) - strength(a) || a.name.localeCompare(b.name));
  return out;
}

/** Positions already taken by other slots (EH can repeat). */
export function takenPositions(slots: readonly Slot[], except?: number): Set<LineupPos> {
  const taken = new Set<LineupPos>();
  slots.forEach((s, i) => {
    if (i !== except && s.pos !== undefined && s.pos !== 'EH') taken.add(s.pos);
  });
  return taken;
}

/** A player's first open position, from their own list; EH when none is open. */
export function firstOpenPosition(p: Player | undefined, taken: ReadonlySet<LineupPos>): LineupPos {
  return p?.positions.find((x) => x !== 'EH' && !taken.has(x)) ?? 'EH';
}

/** Add a player to the bottom of the order at their first open position. */
export function addToOrder(slots: readonly Slot[], p: Player): Slot[] {
  return [...slots, { player: p.id, pos: firstOpenPosition(p, takenPositions(slots)) }];
}

/** Two players at one position (EH excepted): the game can't start. */
export function duplicatePositions(slots: readonly Slot[]): LineupPos[] {
  const seen = new Map<LineupPos, number>();
  for (const s of slots) if (s.pos !== undefined && s.pos !== 'EH') seen.set(s.pos, (seen.get(s.pos) ?? 0) + 1);
  return [...seen].filter(([, n]) => n > 1).map(([pos]) => pos);
}

/** Infield spots nobody's covering (outlined in red). */
export function openInfield(slots: readonly Slot[]): Pos[] {
  const taken = takenPositions(slots);
  return INFIELD.filter((p) => !taken.has(p));
}

/** "Batting 11 · In the field 10 (4 outfielders) · 1 EH". */
export function countLine(slots: readonly Slot[]): string {
  const fielders = slots.filter((s) => typeof s.pos === 'number');
  const outfield = fielders.filter((s) => OUTFIELD.includes(s.pos as Pos)).length;
  const eh = slots.filter((s) => s.pos === 'EH' || s.pos === undefined).length;
  const parts = [`Batting ${slots.length}`, `In the field ${fielders.length}${outfield ? ` (${outfield} outfielder${outfield === 1 ? '' : 's'})` : ''}`];
  if (eh) parts.push(`${eh} EH`);
  return parts.join(' · ');
}

/** Same as Last Game: last game's order and positions, skipping anyone not here. */
export function sameAsLastGame(last: readonly Slot[], here: ReadonlySet<string>): Slot[] {
  const out: Slot[] = [];
  for (const s of last) {
    if (!here.has(s.player)) continue;
    const taken = takenPositions(out);
    out.push({ player: s.player, pos: s.pos !== undefined && s.pos !== 'EH' && !taken.has(s.pos) ? s.pos : 'EH' });
  }
  return out;
}

/** Auto-Fill: last game's order for whoever's here, then everyone else here, each at an open position. */
export function autoFill(last: readonly Slot[], here: readonly Player[]): Slot[] {
  const hereIds = new Set(here.map((p) => p.id));
  const byId = new Map(here.map((p) => [p.id, p]));
  let out: Slot[] = [];
  for (const s of last) if (hereIds.has(s.player) && !out.some((x) => x.player === s.player)) out = addToOrder(out, byId.get(s.player)!);
  for (const p of here) if (!out.some((x) => x.player === p.id)) out = addToOrder(out, p);
  return out;
}

export type Side = 'R' | 'L' | 'S' | undefined;

export interface OrderInput {
  id: string;
  /** Strong bat: ★4–5, or among the best OPS when unrated. */
  strong: boolean;
  side: Side;
}

/** Which players count as strong bats: rating 4–5, or the top third by OPS when unrated. */
export function strongBats(players: readonly Player[], hitting: (id: string) => Hitting): Set<string> {
  const strong = new Set<string>();
  const unrated = players.filter((p) => !p.rating);
  for (const p of players) if ((p.rating ?? 0) >= 4) strong.add(p.id);
  const ranked = unrated.filter((p) => hitting(p.id).ops !== null).sort((a, b) => hitting(b.id).ops! - hitting(a.id).ops!);
  for (const p of ranked.slice(0, Math.ceil(ranked.length / 3))) strong.add(p.id);
  return strong;
}

/** Strong bats needed so one comes up every third batter, wrap included. */
export function strongNeeded(n: number): number {
  return Math.ceil(n / 3);
}

/**
 * Suggest Order: a strong bat every third slot (1st, 4th, 7th…), the rest
 * alternating left and right where possible, checking the wrap from the
 * last batter to the first.
 */
export function suggestOrder(input: readonly OrderInput[]): string[] {
  const n = input.length;
  const strong = input.filter((x) => x.strong);
  const rest = input.filter((x) => !x.strong);
  const slots: (OrderInput | null)[] = Array.from({ length: n }, () => null);
  // Strong bats at 0, 3, 6…; extras fill in after.
  let si = 0;
  for (let i = 0; i < n && si < strong.length; i += 3) slots[i] = strong[si++]!;
  const pool = [...strong.slice(si), ...rest];
  for (let i = 0; i < n; i++) {
    if (slots[i]) continue;
    const prev = slots[(i - 1 + n) % n];
    const next = slots[(i + 1) % n];
    // Prefer a different side from the batters on both sides (the wrap included); switch hitters fit anywhere.
    const fits = (x: OrderInput, nb: OrderInput | null | undefined) => !nb || !nb.side || !x.side || nb.side === 'S' || x.side === 'S' || x.side !== nb.side;
    let pick = pool.findIndex((x) => fits(x, prev) && fits(x, next));
    if (pick < 0) pick = pool.findIndex((x) => fits(x, prev));
    slots[i] = pool.splice(pick >= 0 ? pick : 0, 1)[0]!;
  }
  return slots.map((s) => s!.id);
}

/** The live order check under the lineup: which batting-order rules can't be met. */
export function orderCheck(order: readonly OrderInput[]): string[] {
  const n = order.length;
  if (n === 0) return [];
  const problems: string[] = [];
  const strongCount = order.filter((x) => x.strong).length;
  const need = strongNeeded(n);
  if (strongCount < need) problems.push(`${strongCount} strong ${strongCount === 1 ? 'bat' : 'bats'} for ${n} spots; it takes ${need}.`);
  // Gaps between strong bats, around the wrap.
  const at = order.map((x, i) => (x.strong ? i : -1)).filter((i) => i >= 0);
  if (at.length >= need && at.length > 0) {
    for (let k = 0; k < at.length; k++) {
      const gap = (at[(k + 1) % at.length]! - at[k]! + n) % n || n;
      if (gap > 3) {
        problems.push(`${gap - 1} batters in a row without a strong bat, after ${ordinalSpot(at[k]! + 1)}.`);
        break;
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const a = order[i]!;
    const b = order[(i + 1) % n]!;
    if (a !== b && a.side && a.side !== 'S' && a.side === b.side) {
      const word = a.side === 'L' ? 'Left' : 'Right';
      problems.push(
        i === n - 1
          ? `${word}-handed batters back to back from the last spot to the first.`
          : `${word}-handed batters back to back at ${ordinalSpot(i + 1)} and ${ordinalSpot(i + 2)}.`,
      );
      break;
    }
  }
  return problems;
}

export function ordinalSpot(n: number): string {
  const s = n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
  return `${n}${s}`;
}
