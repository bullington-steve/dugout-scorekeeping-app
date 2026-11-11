/*
 * The Book (SPEC §6) as data: one page per team, a row per batting-order
 * spot, a box per plate appearance, the play-by-play, the scorekeeper's
 * footer, and Rare Plays. Pure functions of saved games; the screens draw it.
 */
import type { GameState, Play } from '../engine/replay.ts';
import type { Dest, GameRecord, Loc, Pos, Result, Side, Team } from '../engine/types.ts';
import { bookCode, describePlay, POSITION_NAMES } from '../engine/words.ts';
import { stateOf } from '../stats/games.ts';
import type { SavedGame } from '../store/model.ts';

export interface BookBox {
  /** Index into state.plays (-1 for a tiebreak runner's box). */
  play: number;
  /** Index into game.events, for Edit Play (-1: nothing to edit). */
  event: number;
  inning: number;
  batter: string;
  code: string;
  result: Result | 'TB';
  fielder?: Pos;
  loc?: Loc;
  /** Furthest base: 0 = out at the plate or never reached, 1–3, 4 = scored. */
  reached: Dest;
  scored: boolean;
  /** Which out of the inning (1–3), circled in red; null when not put out. */
  out: number | null;
  /** Inside-the-park home run. */
  ip: boolean;
  /** Tiebreak runner who started on second. */
  tb: boolean;
  rbi: number;
  /** What VoiceOver reads: "Inning 2, single to left field, scored." */
  words: string;
}

export interface BookRow {
  slot: number;
  /** Everyone who batted in this spot, in order (subs after starters). */
  players: string[];
  /** Boxes by inning (an inning can hold two when the order comes around). */
  boxes: Map<number, BookBox[]>;
}

export interface BookPage {
  team: Team;
  rows: BookRow[];
  /** Inning columns, 1 to the last inning scheduled or played. */
  innings: number[];
  /** How many boxes wide each inning column is. */
  widths: Map<number, number>;
  /** The batter due up and the inning being played, underlined. Null when this team isn't batting or the game is over. */
  current: { inning: number; slot: number } | null;
  /** Dugout Mode halves for this team: kept as totals, not boxes. */
  untracked: boolean;
}

const SIDE = (half: 'top' | 'bottom'): Side => (half === 'top' ? 'away' : 'home');

function teamOfHalf(game: GameRecord, half: 'top' | 'bottom'): Team {
  return SIDE(half) === game.setup.us ? 'us' : 'them';
}

const RESULT_WORDS: Record<Result, string> = {
  '1B': 'single',
  '2B': 'double',
  '3B': 'triple',
  HR: 'home run',
  BB: 'walk',
  E: 'reached on an error',
  FC: 'fielder’s choice',
  K: 'struck out swinging',
  KL: 'struck out looking',
  GO: 'grounder',
  F: 'fly out',
  L: 'line out',
  P: 'pop out',
  SF: 'sacrifice fly',
  FBO: 'foul out',
  DP: 'double play',
  TP: 'triple play',
  HRO: 'home run out, over the limit',
};

function boxWords(b: Omit<BookBox, 'words'>): string {
  const parts = [`Inning ${b.inning}`];
  if (b.result === 'TB') parts.push('tiebreak runner on second');
  else {
    let w = RESULT_WORDS[b.result];
    if (b.result === 'HR' && b.ip) w = 'inside-the-park home run';
    if (b.fielder) w += ` to ${POSITION_NAMES[b.fielder]}`;
    parts.push(w);
  }
  if (b.scored) parts.push('scored');
  else if (b.out !== null && b.result !== 'TB' && !['K', 'KL', 'GO', 'F', 'L', 'P', 'SF', 'FBO', 'DP', 'TP', 'HRO'].includes(b.result)) parts.push(`out ${ordinalOut(b.out)} on the bases`);
  else if (b.out !== null) parts.push(`${ordinalOut(b.out)} out`);
  else if (b.reached > 0 && b.reached < 4) parts.push(`left on ${['', 'first', 'second', 'third'][b.reached]}`);
  if (b.rbi) parts.push(`${b.rbi} RBI`);
  return `${parts.join(', ')}.`;
}

const ordinalOut = (n: number) => ['first', 'second', 'third'][n - 1] ?? `${n}th`;

/** Out numbers by Book box: plays index → which out of its inning. */
function outNumbers(s: GameState): { byPlay: Map<number, number>; tb: Map<string, number> } {
  const byPlay = new Map<number, number>();
  const tb = new Map<string, number>();
  let key = '';
  let n = 0;
  for (const p of s.plays) {
    const k = `${p.inning}${p.half}`;
    if (k !== key) {
      key = k;
      n = 0;
    }
    if (p.t === 'quick' && p.quick === 'out') n += 1;
    p.outsOn.forEach((player, j) => {
      n += 1;
      const box = p.outBoxes[j] ?? -1;
      if (box >= 0) byPlay.set(box, n);
      else tb.set(`${k}:${player}`, n);
    });
  }
  return { byPlay, tb };
}

export function bookPage(game: GameRecord, team: Team): BookPage {
  const s = stateOf(game);
  const outs = outNumbers(s);
  const runsByBox = new Map<number, number>();
  const rbis = new Map<number, number>();
  const tbBoxes: BookBox[] = [];
  s.plays.forEach((p, i) => {
    for (const r of p.runs) if (r.box >= 0) runsByBox.set(r.box, 1);
    if (p.t === 'pa') rbis.set(i, p.runs.filter((r) => r.rbi === p.batter).length);
    // A tiebreak runner who scored or was put out gets a box of their own.
    if (teamOfHalf(game, p.half) !== team) return;
    const k = `${p.inning}${p.half}`;
    for (const r of p.runs) {
      if (r.box >= 0) continue;
      tbBoxes.push(tbBox(p.inning, r.player, true, null));
    }
    p.outsOn.forEach((player, j) => {
      if ((p.outBoxes[j] ?? -1) >= 0) return;
      tbBoxes.push(tbBox(p.inning, player, false, outs.tb.get(`${k}:${player}`) ?? null));
    });
  });

  const lineup = s.lineups[team];
  const rows: BookRow[] = lineup.map((slot, i) => ({ slot: i, players: [], boxes: new Map() }));
  const addBox = (slotIndex: number, b: BookBox) => {
    const row = rows[slotIndex];
    if (!row) return;
    if (!row.players.includes(b.batter)) row.players.push(b.batter);
    const list = row.boxes.get(b.inning) ?? [];
    list.push(b);
    row.boxes.set(b.inning, list);
  };
  s.plays.forEach((p, i) => {
    if (p.t !== 'pa' || !p.result || !p.batter || p.slot === undefined) return;
    if (teamOfHalf(game, p.half) !== team) return;
    const scored = runsByBox.has(i);
    const base = {
      play: i,
      event: p.i,
      inning: p.inning,
      batter: p.batter,
      code: bookCode(p),
      result: p.result,
      ...(p.fielder ? { fielder: p.fielder } : {}),
      ...(p.loc ? { loc: p.loc } : {}),
      reached: (scored ? 4 : (p.reached ?? 0)) as Dest,
      scored,
      out: outs.byPlay.get(i) ?? null,
      ip: !!p.ip,
      tb: false,
      rbi: rbis.get(i) ?? 0,
    };
    addBox(p.slot, { ...base, words: boxWords(base) });
  });
  for (const b of tbBoxes) {
    const slot = lineup.findIndex((x) => x.player === b.batter);
    addBox(slot >= 0 ? slot : 0, b);
  }
  // Everyone in the order shows, even before they bat.
  rows.forEach((row, i) => {
    const now = lineup[i]!.player;
    if (!row.players.includes(now)) row.players.push(now);
  });

  const lastInning = Math.max(game.setup.rules.innings, s.inning, ...s.plays.map((p) => p.inning));
  const innings = Array.from({ length: lastInning }, (_, i) => i + 1);
  const widths = new Map<number, number>();
  for (const n of innings) widths.set(n, Math.max(1, ...rows.map((r) => r.boxes.get(n)?.length ?? 0)));
  const batting = teamOfHalf(game, s.half) === team;
  const current = !s.final && batting && !s.halfOver ? { inning: s.inning, slot: s.nextSlot[team] } : null;
  const untracked = team === 'them' && s.plays.some((p) => p.t === 'quick');
  return { team, rows, innings, widths, current, untracked };
}

function tbBox(inning: number, player: string, scored: boolean, out: number | null): BookBox {
  const base = { play: -1, event: -1, inning, batter: player, code: 'TB', result: 'TB' as const, reached: (scored ? 4 : 2) as Dest, scored, out, ip: false, tb: true, rbi: 0 };
  return { ...base, words: boxWords(base) };
}

/** Long names shortened for the Book: "Jordan Kowalski" → "J. Kowalski" past 14 letters. */
export function bookName(name: string): string {
  if (name.length <= 14) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]![0]}. ${parts.slice(1).join(' ')}`;
}

// ---- play-by-play --------------------------------------------------------------------------

export interface PlayLine {
  play: number;
  /** Event to edit, or -1 (a play Edit Play can't change). */
  event: number;
  inning: number;
  half: 'top' | 'bottom';
  text: string;
  editable: boolean;
}

export function playByPlay(game: GameRecord, name: (key: string) => string): PlayLine[] {
  const s = stateOf(game);
  return s.plays
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.t !== 'mode' && p.t !== 'extend')
    .map(({ p, i }) => ({
      play: i,
      event: p.i,
      inning: p.inning,
      half: p.half,
      text: describePlay(p, name),
      editable: p.t === 'pa' && !!p.result,
    }))
    .filter((l) => l.text);
}

/** The last inning or so: every play since the start of the previous half-inning. */
export function recentLines(lines: readonly PlayLine[]): PlayLine[] {
  if (!lines.length) return [];
  const key = (l: Pick<PlayLine, 'inning' | 'half'>) => l.inning * 2 + (l.half === 'bottom' ? 1 : 0);
  const since = key(lines[lines.length - 1]!) - 1;
  return lines.filter((l) => key(l) >= since);
}

// ---- footer: Complete Book ------------------------------------------------------------------

export type Completeness = { complete: true } | { complete: false; why: string };

/**
 * Complete Book: both teams scored play by play (Scorekeeper Mode the whole
 * game), and every ball in play has a location.
 */
export function completeBook(game: GameRecord, name: (key: string) => string): Completeness {
  const s = stateOf(game);
  if (!s.final) return { complete: false, why: 'The game isn’t over yet.' };
  const quick = s.plays.find((p) => p.t === 'quick');
  if (quick) return { complete: false, why: `The other team’s half of the ${ordinalInning(quick.inning)} was kept as totals in Dugout Mode.` };
  for (const p of s.plays) {
    if (p.t !== 'pa' || !p.result || !p.batter) continue;
    if (['K', 'KL', 'BB', 'HRO'].includes(p.result)) continue;
    if (p.result === 'HR' && !p.ip) continue;
    if (!p.loc) return { complete: false, why: `No hit location for ${name(p.batter)} in the ${ordinalInning(p.inning)}.` };
  }
  return { complete: true };
}

function ordinalInning(n: number): string {
  const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
  return words[n - 1] ?? `${n}th`;
}

// ---- Rare Plays ---------------------------------------------------------------------------------

export const RARE_PLAYS = [
  { id: 'dp', name: 'Double Play', about: 'Our defense turns two.' },
  { id: 'tp', name: 'Triple Play', about: 'Our defense gets all three outs on one play.' },
  { id: 'cycle', name: 'Hitting for the Cycle', about: 'One of ours singles, doubles, triples, and homers in one game.' },
  { id: 'iphr', name: 'Inside-the-Park Home Run', about: 'Around the bases without leaving the yard.' },
  { id: 'slam', name: 'Grand Slam', about: 'A home run with the bases loaded.' },
  { id: 'perfect', name: 'Perfect Inning', about: 'Our defense retires the side in order: three up, three down.' },
  { id: 'walkoff', name: 'Walk-Off Win', about: 'We win it in our last at-bat.' },
] as const;

export type RareId = (typeof RARE_PLAYS)[number]['id'];

/** Rare plays in one game, from our side. */
export function rarePlaysIn(game: GameRecord): Set<RareId> {
  const s = stateOf(game);
  const found = new Set<RareId>();
  const ours = (p: Play) => teamOfHalf(game, p.half) === 'us';
  const hits = new Map<string, Set<Result>>();
  const halves = new Map<string, Play[]>();
  for (const p of s.plays) {
    if (p.t !== 'pa' || !p.result) continue;
    const k = `${p.inning}${p.half}`;
    halves.set(k, [...(halves.get(k) ?? []), p]);
    if (ours(p)) {
      if (p.batter && ['1B', '2B', '3B', 'HR'].includes(p.result)) hits.set(p.batter, (hits.get(p.batter) ?? new Set()).add(p.result));
      if (p.result === 'HR' && p.ip) found.add('iphr');
      if (p.result === 'HR' && p.basesBefore.every(Boolean)) found.add('slam');
    } else {
      if (p.result === 'DP') found.add('dp');
      if (p.result === 'TP') found.add('tp');
    }
  }
  for (const set of hits.values()) if (set.size === 4) found.add('cycle');
  for (const plays of halves.values()) {
    const first = plays[0]!;
    if (ours(first) || first.outsBefore !== 0) continue;
    const tracked = !s.plays.some((p) => p.t === 'quick' && p.inning === first.inning && p.half === first.half);
    if (tracked && plays.length === 3 && plays.every((p) => p.outsOn.length === 1 && p.outsOn[0] === p.batter) && plays[2]!.endsHalf) found.add('perfect');
  }
  if (s.final?.reason === 'walkoff' && s.final.winner === game.setup.us) found.add('walkoff');
  return found;
}

/** The first time each rare play happened, from a team's saved games. */
export function rarePlayFirsts(games: readonly SavedGame[]): Map<RareId, SavedGame> {
  const firsts = new Map<RareId, SavedGame>();
  const sorted = [...games].filter((g) => g.saved).sort((a, b) => a.date.localeCompare(b.date));
  for (const g of sorted) for (const id of rarePlaysIn(g)) if (!firsts.has(id)) firsts.set(id, g);
  return firsts;
}
