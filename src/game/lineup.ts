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
  /** On-base and slugging, for the order styles (Steve, Nov 24); missing before a first trip. */
  obp?: number | null;
  slg?: number | null;
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
  /** This season's rates, when the player has batted (Steve, Nov 24: the order styles use them). */
  ops?: number | null;
  obp?: number | null;
  slg?: number | null;
  /** Stars, 1–5, standing in for numbers a player doesn't have yet. */
  rating?: number;
}

/** Suggest Order's styles (Steve, Nov 24): Spread is the default. */
export type OrderStyle = 'spread' | 'traditional' | 'bestFirst';
export const ORDER_STYLES: { value: OrderStyle; label: string }[] = [
  { value: 'spread', label: 'Spread' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'bestFirst', label: 'Best First' },
];

// A rating stands in for a rate on the same rough scale (★5 ≈ a 1.000 OPS), below anyone with numbers
// of the same size; a player with neither sorts last, keeping the order they came in.
const starOps = (x: OrderInput) => (x.rating ? x.rating * 0.2 : -1);
const batScore = (x: OrderInput) => x.ops ?? starOps(x);
const onBaseScore = (x: OrderInput) => x.obp ?? (x.rating ? x.rating * 0.09 : -1);
const powerScore = (x: OrderInput) => x.slg ?? (x.ops != null ? x.ops * 0.6 : x.rating ? x.rating * 0.12 : -1);

/** Best first by a score; ties keep their given order (a stable sort). */
function ranked(list: readonly OrderInput[], score: (x: OrderInput) => number): OrderInput[] {
  return list.map((x, i) => ({ x, i })).sort((a, b) => score(b.x) - score(a.x) || a.i - b.i).map((e) => e.x);
}

/** Different sides next to each other; switch hitters and unknowns fit anywhere. */
const fits = (x: OrderInput, nb: OrderInput | null | undefined) => !nb || !nb.side || !x.side || nb.side === 'S' || x.side === 'S' || x.side !== nb.side;

/**
 * Take the best player in the pool by `score` for spot `i`; among players tied on the score,
 * handedness breaks the tie (a different side from the batters on each side, the wrap included).
 */
function takeBest(pool: OrderInput[], slots: (OrderInput | null)[], i: number, score: (x: OrderInput) => number): OrderInput {
  const n = slots.length;
  const top = Math.max(...pool.map(score));
  const tied = pool.filter((x) => Math.abs(score(x) - top) < 1e-9);
  const prev = slots[(i - 1 + n) % n];
  const next = slots[(i + 1) % n];
  const pick = tied.find((x) => fits(x, prev) && fits(x, next)) ?? tied.find((x) => fits(x, prev)) ?? tied[0]!;
  pool.splice(pool.indexOf(pick), 1);
  return pick;
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
 * Suggest Order (Steve, Nov 24), in one of three styles:
 * - Spread (the default): a strong bat every third spot (1st, 4th, 7th…, the wrap from the last
 *   batter to the first checked), the best strong bat leading off and the next ones after; the spot
 *   right before each strong bat goes to the best on-base hitter left, so the big hitters come up
 *   with runners on; the rest by OPS. Handedness only breaks ties.
 * - Traditional: the two best on-base hitters 1st and 2nd, the two best power hitters 3rd and 4th,
 *   then by OPS.
 * - Best First: straight down by OPS (stars when there are no numbers yet).
 */
export function suggestOrder(input: readonly OrderInput[], style: OrderStyle = 'spread'): string[] {
  const n = input.length;
  const slots: (OrderInput | null)[] = Array.from({ length: n }, () => null);
  if (style === 'bestFirst') {
    const pool = [...input];
    for (let i = 0; i < n; i++) slots[i] = takeBest(pool, slots, i, batScore);
    return slots.map((x) => x!.id);
  }
  if (style === 'traditional') {
    const pool = [...input];
    for (let i = 0; i < n; i++) slots[i] = takeBest(pool, slots, i, i < 2 ? onBaseScore : i < 4 ? powerScore : batScore);
    return slots.map((x) => x!.id);
  }
  // Spread: strong bats at 0, 3, 6…, best first.
  const strong = ranked(input.filter((x) => x.strong), batScore);
  const heads: number[] = [];
  let si = 0;
  for (let i = 0; i < n && si < strong.length; i += 3) {
    slots[i] = strong[si++]!;
    heads.push(i);
  }
  const pool = [...strong.slice(si), ...input.filter((x) => !x.strong)];
  // Table-setters: the spot before each strong bat, the best strong bat's first (the last spot, before the leadoff).
  for (const h of heads) {
    const before = (h - 1 + n) % n;
    if (!slots[before] && pool.length) slots[before] = takeBest(pool, slots, before, onBaseScore);
  }
  for (let i = 0; i < n; i++) if (!slots[i]) slots[i] = takeBest(pool, slots, i, batScore);
  return slots.map((x) => x!.id);
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
