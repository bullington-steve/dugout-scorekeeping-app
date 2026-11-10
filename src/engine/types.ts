/*
 * The scoring engine's data model. A game is its setup plus a list of
 * events (every tap). Everything else (score, outs, runners, the line score,
 * every stat) is computed by replaying the events. See docs/SPEC.md §2.
 *
 * Nothing in src/engine touches the DOM.
 */

import type { Rules } from './rules.ts';

/** Which side of the field a team is on. */
export type Side = 'away' | 'home';
/** Batting from our point of view. */
export type Team = 'us' | 'them';
export type Half = 'top' | 'bottom';

/** Bases a runner can stand on. */
export type Base = 1 | 2 | 3;
/** Where a runner ends a play: 0 = out, 1–3 = that base, 4 = scored. */
export type Dest = 0 | 1 | 2 | 3 | 4;

/**
 * Fielding positions: P 1, C 2, 1B 3, 2B 4, 3B 5, SS 6, LF 7, CF 8, RF 9,
 * LCF 10, RCF 11, SF (short fielder) 12. EH = extra hitter (bats only).
 */
export type Pos = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type LineupPos = Pos | 'EH';

/** Every result on the scoring pad. */
export type Result =
  // Batter reaches
  | '1B'
  | '2B'
  | '3B'
  | 'HR'
  | 'BB'
  | 'E'
  | 'FC'
  // Batter out
  | 'K' // strikeout swinging
  | 'KL' // strikeout looking (backwards K)
  | 'GO' // grounder
  | 'F' // fly out
  | 'L' // line out
  | 'P' // pop out
  | 'SF' // sac fly
  | 'DP' // double play
  | 'TP' // triple play
  | 'HRO' // home run ruled an out (over the league limit)
  | 'FBO'; // foul ball out

export type BattedType = 'ground' | 'line' | 'fly' | 'pop';

/** Where a ball went, in field coordinates (home plate at 0,0; feet). */
export interface Loc {
  x: number;
  y: number;
  /** Chosen with Grounder / Line Drive / Fly Ball for hits. */
  type?: BattedType;
}

/** Runner key in an advance map: 'B' is the batter, 1–3 are runners by starting base. */
export type RunnerKey = 'B' | Base;

interface EventBase {
  /** When it was tapped (ms since 1970). Needed for the clock and run limit. */
  at?: number;
}

/** A plate appearance from the scoring pad. */
export interface PaEvent extends EventBase {
  t: 'pa';
  result: Result;
  /** Fielder credited (from the field or Fielder Buttons). Optional: Skip. */
  fielder?: Pos;
  loc?: Loc;
  /** HR: inside the park (counts as a HR, not toward the league limit). */
  ip?: boolean;
  /** FC: the runner (by starting base) put out; null = nobody, everyone safe. */
  fcOut?: Base | null;
  /** Walks in a Mixed League: To First (1) or To Second (2). */
  bbTo?: 1 | 2;
  /** Overrides to where the batter and each runner ended up. */
  adv?: Partial<Record<RunnerKey, Dest>>;
  /** Who gets the RBI for each runner who scored (null = no RBI). */
  rbi?: Partial<Record<RunnerKey, string | null>>;
}

/** One pitch, when Balls and Strikes is on. */
export interface PitchEvent extends EventBase {
  t: 'pitch';
  pitch: 'ball' | 'look' | 'swing' | 'foul';
  /** For a foul that ends the at-bat (FBO). */
  fielder?: Pos;
  loc?: Loc;
}

/** A runner moved by tapping a lit base. */
export interface RunnerEvent extends EventBase {
  t: 'runner';
  from: Base;
  /** 0 = out, 2 or 3 = advanced, 4 = scored. */
  to: Dest;
  /** For a run: who gets the RBI (null or missing = no RBI). */
  rbi?: string | null;
}

/** A courtesy runner takes over a base. */
export interface CourtesyEvent extends EventBase {
  t: 'courtesy';
  base: Base;
  player: string;
}

/** Dugout Mode quick buttons for the other team's half. */
export interface QuickEvent extends EventBase {
  t: 'quick';
  /** +1 Run, +1 Out, + Hit, + Our Error, + Their HR. */
  kind: 'run' | 'out' | 'hit' | 'error' | 'hr';
}

/** End Their Half-Inning Now (or any half). */
export interface EndHalfEvent extends EventBase {
  t: 'endHalf';
  /** Set when the app inserted it (home/away switch), not a person. */
  auto?: 'switch';
}

/** A substitution in a batting slot. */
export interface SubEvent extends EventBase {
  t: 'sub';
  team: Team;
  slot: number;
  player: string;
}

/** A late arrival added to the bottom of the order. */
export interface AddSlotEvent extends EventBase {
  t: 'addSlot';
  team: Team;
  player: string;
}

/** Play Another Inning, or + after the last inning. */
export interface ExtendEvent extends EventBase {
  t: 'extend';
}

/**
 * End Game Now. Saving a game that ended because time ran out between
 * innings also records one, with reason 'time', so the saved result never
 * depends on what time it is when the game is opened again.
 */
export interface EndEvent extends EventBase {
  t: 'end';
  reason?: 'time';
}

export type GameEvent =
  | PaEvent
  | PitchEvent
  | RunnerEvent
  | CourtesyEvent
  | QuickEvent
  | EndHalfEvent
  | SubEvent
  | AddSlotEvent
  | ExtendEvent
  | EndEvent;

export interface Slot {
  /** Our players: player id. Their batters: the name from the batting order. */
  player: string;
  pos?: LineupPos;
}

/** Positions for one inning on the Defense card: player id → position or sitting. */
export type DefenseInning = Record<string, LineupPos | 'sit'>;

export interface GameSetup {
  /** Which side we are: picked at the coin toss. */
  us: Side;
  mode: 'dugout' | 'scorekeeper';
  rules: Rules;
  /** Balls and Strikes on for this game. */
  count: boolean;
  /** Hit Location on for this game (fielding and spray stats count only these plays). */
  hitLocation: boolean;
  /** Coin toss time: the clock starts here. */
  startedAt: number | null;
  lineups: { us: Slot[]; them: Slot[] };
}

export interface GameRecord {
  id: string;
  setup: GameSetup;
  events: GameEvent[];
  /**
   * The Defense card, one entry per inning (index 0 = inning 1). An inning
   * with no entry copies the one before it; inning 1 defaults to the lineup.
   */
  defense?: DefenseInning[];
  /** Players marked Here (Who's Here). Everyone in the lineup counts as here. */
  present?: string[];
}
