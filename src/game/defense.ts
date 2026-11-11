/*
 * The Defense card (SPEC §9): who plays where, inning by inning. Pure
 * functions of the saved game and roster, no DOM.
 *
 * - An inning with no entry copies the one before it; inning 1 comes from
 *   the lineup (stats/games.ts defenseFor).
 * - Picking a position someone else holds swaps the two.
 * - Auto-Rotate fills the innings not yet played, fairly: nobody sits twice
 *   until every unpinned player has sat once, Sits First go first and Sits
 *   Last go last, back-to-back sits are avoided, and fielders are re-seated
 *   main position first, keeping people in place where possible. Pinned
 *   players stay put. Limited-mobility players go to right field.
 */
import type { DefenseInning, GameRecord, LineupPos, Pos } from '../engine/types.ts';
import { attendees, defenseFor, defensiveInnings, stateOf } from '../stats/games.ts';
import type { Player } from '../store/model.ts';

export type Spot = LineupPos | 'sit';

/** Positions in the order the card and the whiteboard list them. */
export const FIELD_ORDER: Pos[] = [1, 2, 3, 4, 5, 6, 12, 7, 10, 8, 11, 9];
const INFIELD: Pos[] = [3, 4, 5, 6];

/** Innings shown on the card: the game's innings, or more once extra innings start. */
export function cardInnings(game: GameRecord): number {
  const s = stateOf(game);
  return Math.max(game.setup.rules.innings, s.inning);
}

/** The plan: how many innings Auto-Rotate fills (default 7, capped at the game's innings). */
export function planInnings(game: GameRecord & { plan?: number }): number {
  const max = cardInnings(game);
  return Math.max(1, Math.min(game.plan ?? Math.min(7, max), max));
}

/**
 * The last inning already played on defense (0 before we take the field).
 * Auto-Rotate never changes these.
 */
export function playedThrough(game: GameRecord): number {
  const innings = defensiveInnings(game);
  return innings.length ? innings[innings.length - 1]! : 0;
}

/** Who's on the card: the batting order first, then everyone else here. */
export function cardPlayers(game: GameRecord): string[] {
  const order = game.setup.lineups.us.map((s) => s.player);
  const rest = attendees(game).filter((p) => !order.includes(p));
  const s = stateOf(game);
  // Subs who came in during the game are in the replayed order too.
  const live = s.lineups.us.map((x) => x.player).filter((p) => !order.includes(p) && !rest.includes(p));
  return [...order, ...live, ...rest];
}

/** Every inning's card, 1 to n, with copies filled in. Players missing from a copied inning sit. */
export function fullCard(game: GameRecord, n: number, players = cardPlayers(game)): DefenseInning[] {
  const out: DefenseInning[] = [];
  for (let i = 1; i <= n; i++) {
    const card = { ...defenseFor(game, i) };
    for (const p of players) if (card[p] === undefined) card[p] = 'sit';
    out.push(card);
  }
  return out;
}

/**
 * Put a player at a spot for one inning. If someone else has that field
 * position, they take the player's old spot. Later innings that copy
 * forward follow along. Returns the new defense list.
 */
export function setSpot(game: GameRecord, inning: number, player: string, spot: Spot, players = cardPlayers(game)): DefenseInning[] {
  const defense = [...(game.defense ?? [])];
  const card = fullCard(game, inning, players)[inning - 1]!;
  const old = card[player] ?? 'sit';
  if (typeof spot === 'number') {
    const holder = Object.keys(card).find((p) => p !== player && card[p] === spot);
    if (holder) card[holder] = old;
  }
  card[player] = spot;
  while (defense.length < inning - 1) defense.push(undefined as unknown as DefenseInning);
  defense[inning - 1] = card;
  return defense;
}

export interface InningCheck {
  /** Positions the inning is missing: pitcher, catcher, or an infielder. */
  missing: Pos[];
}

/** A red ! on innings missing P, C, or an infielder. */
export function checkInning(card: DefenseInning): InningCheck {
  const held = new Set(Object.values(card));
  return { missing: ([1, 2, ...INFIELD] as Pos[]).filter((p) => !held.has(p)) };
}

/** "6 field · 1 sit" for one player over innings 1 to n. */
export function playerCounts(card: DefenseInning[], player: string): { field: number; sit: number } {
  let field = 0;
  let sit = 0;
  for (const inning of card) {
    const spot = inning[player];
    if (typeof spot === 'number') field += 1;
    else sit += 1;
  }
  return { field, sit };
}

/** Pins: the saved list, or whoever starts at P and C. */
export function pinsFor(game: GameRecord & { pins?: string[] }, players = cardPlayers(game)): string[] {
  if (game.pins) return game.pins.filter((p) => players.includes(p));
  const first = fullCard(game, 1, players)[0]!;
  return players.filter((p) => first[p] === 1 || first[p] === 2);
}

export interface RotateResult {
  defense: DefenseInning[];
  /** Plain words when something couldn't be met ("Only 8 here: 1B and SS are open."). */
  notes: string[];
}

const BENCH_RANK = { first: 0, normal: 1, last: 2 } as const;

/**
 * Fill innings after the ones already played, up to the plan. Innings
 * already played (and inning 1, which comes from the lineup) stay as they are.
 */
export function autoRotate(game: GameRecord & { pins?: string[]; plan?: number }, roster: Player[]): RotateResult {
  const players = cardPlayers(game);
  const plan = planInnings(game);
  const fixed = Math.max(1, playedThrough(game));
  const card = fullCard(game, Math.max(plan, fixed), players);
  const pins = new Set(pinsFor(game, players));
  const info = new Map(roster.map((p) => [p.id, p]));
  const notes: string[] = [];

  // The positions to fill: whatever the last fixed inning uses (3 or 4 outfielders, short field).
  const base = card[fixed - 1]!;
  let spots = FIELD_ORDER.filter((p) => Object.values(base).includes(p));
  if (spots.length < 9) spots = FIELD_ORDER.filter((p) => p <= 9);

  const sits = new Map(players.map((p) => [p, 0]));
  for (let i = 0; i < fixed; i++) for (const p of players) if (typeof card[i]![p] !== 'number') sits.set(p, sits.get(p)! + 1);

  const order = new Map(players.map((p, n) => [p, n]));
  for (let inning = fixed + 1; inning <= plan; inning++) {
    const prev = card[inning - 2]!;
    const next: DefenseInning = {};
    const pinned = players.filter((p) => pins.has(p) && typeof prev[p] === 'number' && spots.includes(prev[p] as Pos));
    for (const p of pinned) next[p] = prev[p]!;
    const open = spots.filter((s) => !pinned.some((p) => prev[p] === s));
    const free = players.filter((p) => !pinned.includes(p));
    const sitCount = Math.max(0, free.length - open.length);
    // Who sits: fewest sits so far, not the ones who just sat, Sits First before Sits Last.
    // Still tied: the bottom of the order sits before the top.
    const ranked = [...free].sort((a, b) => {
      const d = sits.get(a)! - sits.get(b)!;
      if (d) return d;
      const back = Number(prev[a] === 'sit' || prev[a] === 'EH') - Number(prev[b] === 'sit' || prev[b] === 'EH');
      if (back) return back;
      const bench = BENCH_RANK[info.get(a)?.bench ?? 'normal'] - BENCH_RANK[info.get(b)?.bench ?? 'normal'];
      if (bench) return bench;
      return order.get(b)! - order.get(a)!;
    });
    const sitters = new Set(ranked.slice(0, sitCount));
    const fielders = free.filter((p) => !sitters.has(p));
    for (const p of sitters) {
      next[p] = 'sit';
      sits.set(p, sits.get(p)! + 1);
    }
    const seats = seat(fielders, open, prev, info);
    for (const [p, s] of seats) next[p] = s;
    for (const p of fielders) if (next[p] === undefined) next[p] = 'sit';
    card[inning - 1] = next;
  }

  if (players.length < spots.length) {
    const short = spots.length - players.length;
    notes.push(`Only ${players.length} here, so ${short === 1 ? 'one position stays' : `${spotWord(short)} positions stay`} open each inning.`);
  }
  const missing = new Set<Pos>();
  for (let i = fixed; i < plan; i++) for (const m of checkInning(card[i]!).missing) missing.add(m);
  if (missing.size && players.length >= spots.length) notes.push('Some innings are still missing a pitcher, catcher, or infielder. Tap a box to fill it.');

  const defense = [...(game.defense ?? [])];
  for (let i = fixed; i < plan; i++) defense[i] = card[i]!;
  for (let i = 0; i < defense.length; i++) if (!defense[i]) defense[i] = undefined as unknown as DefenseInning;
  return { defense, notes };
}

function spotWord(n: number): string {
  return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);
}

/** Positions filled first when there aren't enough players. */
function importance(pos: Pos): number {
  if (pos === 1 || pos === 2) return 0;
  if (INFIELD.includes(pos)) return 1;
  return 2;
}

/**
 * Seat fielders in the open positions at the lowest total cost: staying put
 * costs nothing, then main position, 2nd, 3rd, then anywhere. Limited
 * mobility goes to right field. Short-handed, P, C, and the infield fill first.
 */
function seat(fielders: string[], open: Pos[], prev: DefenseInning, info: Map<string, Player>): Map<string, Pos> {
  const out = new Map<string, Pos>();
  if (!fielders.length || !open.length) return out;
  const spots = [...open].sort((a, b) => importance(a) - importance(b)).slice(0, fielders.length);
  const cost = (p: string, pos: Pos): number => {
    const pl = info.get(p);
    let c: number;
    if (prev[p] === pos) c = 0;
    else {
      const rank = (pl?.positions ?? []).indexOf(pos);
      c = rank >= 0 ? 1 + rank : 6;
    }
    if (pl?.limitedMobility) c += pos === 9 ? -1 : pos === 11 || pos === 7 ? 8 : 20;
    return c;
  };
  // Pad to a square (only when the lists differ); padded rows and columns cost nothing.
  const n = Math.max(fielders.length, spots.length);
  const m: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      const p = fielders[i];
      const s = spots[j];
      if (p === undefined || s === undefined) row.push(0);
      else row.push(cost(p, s));
    }
    m.push(row);
  }
  const match = hungarian(m);
  match.forEach((j, i) => {
    const p = fielders[i];
    const s = spots[j];
    if (p !== undefined && s !== undefined) out.set(p, s);
  });
  return out;
}

/** Minimum-cost assignment for a square matrix: row i gets column result[i]. */
export function hungarian(a: number[][]): number[] {
  const n = a.length;
  const INF = Number.POSITIVE_INFINITY;
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(n + 1).fill(0);
  const p = new Array<number>(n + 1).fill(0);
  const way = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(n + 1).fill(INF);
    const used = new Array<boolean>(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0]!;
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = a[i0 - 1]![j - 1]! - u[i0]! - v[j]!;
        if (cur < minv[j]!) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j]! < delta) {
          delta = minv[j]!;
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]!] = u[p[j]!]! + delta;
          v[j] = v[j]! - delta;
        } else minv[j] = minv[j]! - delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0]!;
      p[j0] = p[j1]!;
      j0 = j1;
    } while (j0);
  }
  const result = new Array<number>(n).fill(0);
  for (let j = 1; j <= n; j++) if (p[j]) result[p[j]! - 1] = j - 1;
  return result;
}

/** Clear the innings not yet played, so they copy forward again. */
export function resetCard(game: GameRecord): DefenseInning[] {
  const keep = Math.max(1, playedThrough(game));
  return (game.defense ?? []).slice(0, keep);
}

/**
 * Steve's dugout whiteboard: innings 1 and 5, 2 and 6, 3 and 7 share a
 * column; 4 stands alone. Extra innings (8, 9…) continue after 4.
 */
export function whiteboardColumns(n: number): number[][] {
  const cols: number[][] = [];
  for (let i = 1; i <= Math.min(n, 4); i++) cols.push(i <= 3 && i + 4 <= n ? [i, i + 4] : [i]);
  for (let i = 8; i <= n; i++) cols.push([i]);
  return cols;
}
