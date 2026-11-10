/*
 * Batting stats as pure functions of saved games (docs/SPEC.md §7).
 * Rules: FC is an AB with no hit. HRO is an AB and an out, left out of
 * BABIP. FBO is an AB and an out, not a strikeout. A courtesy runner's runs
 * count for the courtesy runner. No HBP, no steals in softball.
 */
import type { Play } from '../engine/replay.ts';
import type { BattedType, GameRecord, Pos, Result } from '../engine/types.ts';
import { ourBatters, stateOf } from './games.ts';

export interface BattingCounts {
  G: number;
  PA: number;
  AB: number;
  R: number;
  H: number;
  '1B': number;
  '2B': number;
  '3B': number;
  HR: number;
  RBI: number;
  BB: number;
  K: number;
  SF: number;
  TB: number;
  HRO: number;
  FBO: number;
  /** Times reached on error. */
  ROE: number;
  /** At-bats and hits with a runner on 2nd or 3rd. */
  rispAB: number;
  rispH: number;
  // Contact (only balls in play whose type is known)
  ground: number;
  line: number;
  fly: number;
  pop: number;
  // Direction (only balls in play with a fielder)
  pull: number;
  center: number;
  oppo: number;
}

export type Bats = 'R' | 'L' | 'S';

export function emptyCounts(): BattingCounts {
  return {
    G: 0,
    PA: 0,
    AB: 0,
    R: 0,
    H: 0,
    '1B': 0,
    '2B': 0,
    '3B': 0,
    HR: 0,
    RBI: 0,
    BB: 0,
    K: 0,
    SF: 0,
    TB: 0,
    HRO: 0,
    FBO: 0,
    ROE: 0,
    rispAB: 0,
    rispH: 0,
    ground: 0,
    line: 0,
    fly: 0,
    pop: 0,
    pull: 0,
    center: 0,
    oppo: 0,
  };
}

const HIT_BASES: Partial<Record<Result, number>> = { '1B': 1, '2B': 2, '3B': 3, HR: 4 };

/** Batted-ball type from the result, or from the field for hits and errors. */
export function battedType(p: Pick<Play, 'result' | 'loc'>): BattedType | null {
  switch (p.result) {
    case 'GO':
    case 'DP':
    case 'TP':
    case 'FC':
      return 'ground';
    case 'F':
    case 'SF':
    case 'HRO':
      return 'fly';
    case 'L':
      return 'line';
    case 'P':
    case 'FBO':
      return 'pop';
    case '1B':
    case '2B':
    case '3B':
    case 'HR':
    case 'E':
      return p.loc?.type ?? null;
    default:
      return null;
  }
}

/** Left side of the field, center, right side, by the fielder credited. */
export function fieldSide(pos: Pos): 'left' | 'center' | 'right' {
  if (pos === 5 || pos === 6 || pos === 7 || pos === 10) return 'left';
  if (pos === 3 || pos === 4 || pos === 9 || pos === 11) return 'right';
  return 'center'; // P, C, CF, short fielder
}

/** Pull, center, or opposite field. Switch hitters count as right-handed. */
export function direction(pos: Pos, bats: Bats): 'pull' | 'center' | 'oppo' {
  const side = fieldSide(pos);
  if (side === 'center') return 'center';
  const pullSide = bats === 'L' ? 'right' : 'left';
  return side === pullSide ? 'pull' : 'oppo';
}

export interface BattingOptions {
  bats?: (player: string) => Bats | undefined;
}

/** Counting stats for each of our players across the given games. */
export function battingCounts(games: readonly GameRecord[], opts: BattingOptions = {}): Map<string, BattingCounts> {
  const out = new Map<string, BattingCounts>();
  const get = (p: string) => {
    let c = out.get(p);
    if (!c) {
      c = emptyCounts();
      out.set(p, c);
    }
    return c;
  };

  for (const game of games) {
    for (const p of ourBatters(game)) get(p).G += 1;
    for (const play of stateOf(game).plays) {
      if (play.team !== 'us') continue;
      for (const run of play.runs) {
        get(run.player).R += 1;
        if (run.rbi) get(run.rbi).RBI += 1;
      }
      if (play.t !== 'pa' || !play.batter || !play.result) continue;
      const c = get(play.batter);
      const r = play.result;
      c.PA += 1;
      const isAB = r !== 'BB' && r !== 'SF';
      if (isAB) c.AB += 1;
      const bases = HIT_BASES[r] ?? 0;
      if (bases) {
        c.H += 1;
        c.TB += bases;
        c[r as '1B' | '2B' | '3B' | 'HR'] += 1;
      }
      if (r === 'BB') c.BB += 1;
      if (r === 'K' || r === 'KL') c.K += 1;
      if (r === 'SF') c.SF += 1;
      if (r === 'HRO') c.HRO += 1;
      if (r === 'FBO') c.FBO += 1;
      if (r === 'E') c.ROE += 1;
      if (isAB && (play.basesBefore[1] || play.basesBefore[2])) {
        c.rispAB += 1;
        if (bases) c.rispH += 1;
      }
      const type = battedType(play);
      if (type) c[type] += 1;
      if (play.fielder && r !== 'K' && r !== 'KL' && r !== 'BB') {
        c[direction(play.fielder, opts.bats?.(play.batter) ?? 'R')] += 1;
      }
    }
  }
  return out;
}

export type Rate = number | null;

/** wOBA weights (MLB, used only to rank your own hitters). */
export const WOBA_WEIGHTS = { BB: 0.696, '1B': 0.89, '2B': 1.272, '3B': 1.623, HR: 2.103 } as const;

const div = (a: number, b: number): Rate => (b > 0 ? a / b : null);

export const RATE_NAMES = ['AVG', 'OBP', 'SLG', 'OPS', 'ISO', 'BABIP', 'K%', 'BB%', 'BB/K', 'wOBA', 'RC', 'RISP'] as const;
export type RateName = (typeof RATE_NAMES)[number];
export type Formulas = Record<RateName, (c: BattingCounts, f?: Formulas) => Rate>;

/** Every rate as a separate function, so a test can prove the comparison catches a broken one. */
export const FORMULAS: Formulas = {
  AVG: (c: BattingCounts) => div(c.H, c.AB),
  OBP: (c: BattingCounts) => div(c.H + c.BB, c.AB + c.BB + c.SF),
  SLG: (c: BattingCounts) => div(c.TB, c.AB),
  OPS: (c, f = FORMULAS) => {
    const obp = f.OBP(c);
    const slg = f.SLG(c);
    return obp === null || slg === null ? null : obp + slg;
  },
  ISO: (c, f = FORMULAS) => {
    const slg = f.SLG(c);
    const avg = f.AVG(c);
    return slg === null || avg === null ? null : slg - avg;
  },
  BABIP: (c: BattingCounts) => div(c.H - c.HR, c.AB - c.K - c.HR - c.HRO + c.SF),
  'K%': (c: BattingCounts) => div(c.K, c.PA),
  'BB%': (c: BattingCounts) => div(c.BB, c.PA),
  'BB/K': (c: BattingCounts) => div(c.BB, c.K),
  wOBA: (c: BattingCounts) =>
    div(
      WOBA_WEIGHTS.BB * c.BB +
        WOBA_WEIGHTS['1B'] * c['1B'] +
        WOBA_WEIGHTS['2B'] * c['2B'] +
        WOBA_WEIGHTS['3B'] * c['3B'] +
        WOBA_WEIGHTS.HR * c.HR,
      c.AB + c.BB + c.SF,
    ),
  RC: (c: BattingCounts) => div((c.H + c.BB) * c.TB, c.AB + c.BB),
  RISP: (c: BattingCounts) => div(c.rispH, c.rispAB),
};


export function battingRates(c: BattingCounts, f: Formulas = FORMULAS): Record<RateName, Rate> {
  const out = {} as Record<RateName, Rate>;
  for (const name of RATE_NAMES) out[name] = f[name](c, f);
  return out;
}

/** Contact percentages (of balls in play with a known type or direction). */
export function contactRates(c: BattingCounts): Record<'ground' | 'line' | 'fly' | 'pop' | 'pull' | 'center' | 'oppo', Rate> {
  const typed = c.ground + c.line + c.fly + c.pop;
  const aimed = c.pull + c.center + c.oppo;
  return {
    ground: div(c.ground, typed),
    line: div(c.line, typed),
    fly: div(c.fly, typed),
    pop: div(c.pop, typed),
    pull: div(c.pull, aimed),
    center: div(c.center, aimed),
    oppo: div(c.oppo, aimed),
  };
}

/** Plain-English explanations shown under the Batting tables. */
export const STAT_HELP: Record<string, string> = {
  G: 'Games played.',
  PA: 'Plate appearances: every trip to the plate.',
  AB: 'At-bats: plate appearances minus walks and sac flies.',
  R: 'Runs scored.',
  H: 'Hits.',
  '2B': 'Doubles.',
  '3B': 'Triples.',
  HR: 'Home runs, inside the park included.',
  RBI: 'Runs batted in.',
  BB: 'Walks.',
  K: 'Strikeouts. A foul out isn’t a strikeout.',
  AVG: 'Batting average: hits per at-bat.',
  OBP: 'On-base percentage: how often a batter reaches on a hit or walk.',
  SLG: 'Slugging: total bases per at-bat.',
  OPS: 'On-base plus slugging.',
  wOBA: 'Weighted on-base average, with big-league weights. Good for ranking your own hitters only.',
  ISO: 'Isolated power: slugging minus average.',
  BABIP: 'Batting average on balls in play. Home runs and home run outs don’t count.',
  'K%': 'Strikeouts per plate appearance.',
  'BB%': 'Walks per plate appearance.',
  'BB/K': 'Walks per strikeout.',
  RISP: 'Average with a runner on second or third.',
  RC: 'Runs created: an estimate of runs a hitter makes.',
  ROE: 'Times reached on an error.',
  HRO: 'Home runs ruled outs for being over the league limit.',
  FBO: 'Foul ball outs.',
};
