/*
 * Fielding and playing time, credited by the Defense card inning by inning.
 * Only plays with a fielder (Hit Location or Fielder Buttons) count.
 */
import type { GameRecord, Pos, Result } from '../engine/types.ts';
import { attendees, defenseFor, defensiveInnings, isFieldPos, playerAt, stateOf } from './games.ts';

export interface FieldingCounts {
  /** Innings at each position. */
  innings: Partial<Record<Pos, number>>;
  /** Outs the player made a play on. */
  plays: number;
  errors: number;
}

/** Results that count as a fielding play for the credited fielder. */
export const FIELDED_OUTS: ReadonlySet<Result> = new Set<Result>(['GO', 'F', 'L', 'P', 'IF', 'SF', 'DP', 'TP', 'FBO', 'FC']);

export function fieldingCounts(games: readonly GameRecord[]): Map<string, FieldingCounts> {
  const out = new Map<string, FieldingCounts>();
  const get = (p: string) => {
    let c = out.get(p);
    if (!c) {
      c = { innings: {}, plays: 0, errors: 0 };
      out.set(p, c);
    }
    return c;
  };
  for (const game of games) {
    for (const inning of defensiveInnings(game)) {
      const card = defenseFor(game, inning);
      for (const [player, pos] of Object.entries(card)) {
        if (!isFieldPos(pos)) continue;
        const c = get(player);
        c.innings[pos] = (c.innings[pos] ?? 0) + 1;
      }
    }
    for (const play of stateOf(game).plays) {
      if (play.team !== 'them' || play.t !== 'pa' || !play.fielder || !play.result) continue;
      const who = playerAt(game, play.inning, play.fielder);
      if (!who) continue;
      if (play.result === 'E') get(who).errors += 1;
      else if (FIELDED_OUTS.has(play.result)) get(who).plays += 1;
    }
  }
  return out;
}

export function fieldingPct(c: FieldingCounts): number | null {
  const chances = c.plays + c.errors;
  return chances > 0 ? c.plays / chances : null;
}

export interface PlayingTime {
  games: number;
  fieldInnings: number;
  /** Fair share of field innings over the games this player attended. */
  fairShare: number;
}

/**
 * Innings (playing time). A game's field innings = the sum, over our
 * defensive innings, of players at field positions on that inning's card.
 * Each attendee's fair share of a game is that total divided by attendees.
 * Only innings the other team actually batted count (LESSONS 30).
 */
export function playingTime(games: readonly GameRecord[]): Map<string, PlayingTime> {
  const out = new Map<string, PlayingTime>();
  for (const game of games) {
    const here = attendees(game);
    if (here.length === 0) continue;
    let total = 0;
    const mine = new Map<string, number>();
    for (const inning of defensiveInnings(game)) {
      const card = defenseFor(game, inning);
      for (const [player, pos] of Object.entries(card)) {
        if (!isFieldPos(pos)) continue;
        total += 1;
        mine.set(player, (mine.get(player) ?? 0) + 1);
      }
    }
    const share = total / here.length;
    for (const p of here) {
      const pt = out.get(p) ?? { games: 0, fieldInnings: 0, fairShare: 0 };
      pt.games += 1;
      pt.fieldInnings += mine.get(p) ?? 0;
      pt.fairShare += share;
      out.set(p, pt);
    }
  }
  return out;
}

/** ▲ over, ▼ under, = even (within half an inning). */
export function playingTimeMark(pt: PlayingTime): 'over' | 'under' | 'even' {
  const d = pt.fieldInnings - pt.fairShare;
  if (d > 0.5) return 'over';
  if (d < -0.5) return 'under';
  return 'even';
}
