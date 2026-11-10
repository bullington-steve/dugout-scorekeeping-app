/*
 * Team-level stats: record, leaders, the Lineups history grid, spray dots.
 */
import type { Play } from '../engine/replay.ts';
import type { GameRecord, LineupPos, Loc } from '../engine/types.ts';
import { battingCounts, type BattingCounts } from './batting.ts';
import { defenseFor, ourBatters, resultFor, stateOf } from './games.ts';

export interface Record3 {
  w: number;
  l: number;
  t: number;
}

export function teamRecord(games: readonly GameRecord[]): Record3 {
  const r = { w: 0, l: 0, t: 0 };
  for (const g of games) {
    const res = resultFor(g);
    if (res === 'W') r.w += 1;
    else if (res === 'L') r.l += 1;
    else if (res === 'T') r.t += 1;
  }
  return r;
}

/** "7–3" or "7–3–1" with ties. */
export function recordText(r: Record3): string {
  return r.t ? `${r.w}–${r.l}–${r.t}` : `${r.w}–${r.l}`;
}

/** Leaders for a counting stat; ties share the lead. */
export function leaders(counts: Map<string, BattingCounts>, stat: keyof BattingCounts): { players: string[]; value: number } {
  let best = 0;
  let players: string[] = [];
  for (const [p, c] of counts) {
    const v = c[stat];
    if (v > best) {
      best = v;
      players = [p];
    } else if (v === best && v > 0) players.push(p);
  }
  return { players, value: best };
}

export function teamLeaders(games: readonly GameRecord[]): Record<'R' | 'H' | 'HR' | 'RBI' | 'BB', { players: string[]; value: number }> {
  const c = battingCounts(games);
  return {
    R: leaders(c, 'R'),
    H: leaders(c, 'H'),
    HR: leaders(c, 'HR'),
    RBI: leaders(c, 'RBI'),
    BB: leaders(c, 'BB'),
  };
}

export interface LineupCell {
  /** Batting spot (1-based), or null for someone who only fielded. */
  spot: number | null;
  /** Positions in the order played: ["SS", "2B"] shows as "SS→2B". */
  positions: LineupPos[];
  sub: boolean;
}

/** The Lineups grid: every player by every game. */
export function lineupHistory(games: readonly GameRecord[]): Map<string, Map<string, LineupCell>> {
  const grid = new Map<string, Map<string, LineupCell>>();
  for (const game of games) {
    const s = stateOf(game);
    const starters = game.setup.lineups.us;
    const lastInning = Math.max(1, s.inning);
    for (const player of ourBatters(game)) {
      const startSpot = starters.findIndex((x) => x.player === player);
      let spot: number | null = startSpot >= 0 ? startSpot + 1 : null;
      let sub = false;
      for (const ev of game.events) {
        if (ev.t === 'sub' && ev.team === 'us' && ev.player === player) {
          spot = ev.slot + 1;
          sub = true;
        }
        if (ev.t === 'addSlot' && ev.team === 'us' && ev.player === player) {
          spot = game.setup.lineups.us.length + 1;
          sub = true;
        }
      }
      const positions: LineupPos[] = [];
      for (let i = 1; i <= lastInning; i++) {
        const pos = defenseFor(game, i)[player];
        if (pos === undefined || pos === 'sit') continue;
        if (positions[positions.length - 1] !== pos) positions.push(pos);
      }
      const row = grid.get(player) ?? new Map<string, LineupCell>();
      row.set(game.id, { spot, positions, sub });
      grid.set(player, row);
    }
  }
  return grid;
}

export interface SprayDot {
  gameId: string;
  play: Play;
  loc: Loc;
  kind: '1B' | '2B' | '3B' | 'HR' | 'out' | 'E';
}

/** Balls in play with a spot on the field, for spray charts. */
export function sprayDots(
  games: readonly GameRecord[],
  team: 'us' | 'them',
  filter: 'all' | 'hits' | 'outs' = 'all',
): SprayDot[] {
  const dots: SprayDot[] = [];
  for (const game of games) {
    for (const play of stateOf(game).plays) {
      if (play.team !== team || play.t !== 'pa' || !play.loc || !play.result) continue;
      const r = play.result;
      const kind: SprayDot['kind'] =
        r === '1B' || r === '2B' || r === '3B' || r === 'HR' ? r : r === 'E' ? 'E' : 'out';
      if (filter === 'hits' && !(kind === '1B' || kind === '2B' || kind === '3B' || kind === 'HR')) continue;
      if (filter === 'outs' && kind !== 'out') continue;
      dots.push({ gameId: game.id, play, loc: play.loc, kind });
    }
  }
  return dots;
}
