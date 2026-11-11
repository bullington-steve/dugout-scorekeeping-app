/*
 * Replay: turn a game's event list into its state. Every screen and every
 * stat reads the result of this function; nothing is stored as a total.
 *
 * Rules implemented here (docs/SPEC.md §2–3, docs/FORT_COLLINS_RULES.md):
 * - Results and default runner movement; RBI defaults and overrides.
 * - Walk-off: the game ends the instant the winning run scores, unless it's
 *   a home run (LESSONS 29). The run rule ends the game the same way.
 * - A play that makes the third out on the batter or a force (FC, DP, TP)
 *   scores no runs.
 * - HR limits (+2 differential or N per team); inside-the-park HRs don't
 *   count toward them. A HR past the limit is recorded as HRO.
 * - Run limit per half-inning, except the final inning: the scheduled last
 *   inning or later, or an inning that begins with too little time left.
 * - Clock: starts at the coin toss. Time running out during an inning makes
 *   it the last (LAST); running out between innings means the next inning
 *   doesn't start. A tie at time still gets its extra innings.
 * - Extra innings (a number or until decided), ties, tiebreak runner on 2nd.
 * - Courtesy runners per team per inning (never for the tiebreak runner).
 * - Count: walks, strikeouts, foul with the last strike, one courtesy foul,
 *   and the Mixed League walk (three straight balls sends the batter to 2nd).
 * - Dugout Mode quick buttons for the other team's half.
 */

import { runRuleLead, type Rules } from './rules.ts';
import type {
  Base,
  Dest,
  GameEvent,
  GameRecord,
  Half,
  Loc,
  PaEvent,
  PitchEvent,
  Pos,
  Result,
  RunnerKey,
  Side,
  Slot,
  Team,
} from './types.ts';

export interface Runner {
  /** Who is standing on the base (a courtesy runner after a swap). */
  player: string;
  /** Who batted to put this runner on (for the Book box). */
  batter: string;
  /** Index into plays of the plate appearance that put them on (-1 = tiebreak runner). */
  play: number;
  tb?: boolean;
  courtesy?: boolean;
}

export interface RunScored {
  player: string;
  /** Who gets the RBI, or null. */
  rbi: string | null;
  /** Who batted to put this runner on base (the Book box that gets the run). */
  batter: string;
  from: RunnerKey;
}

export interface Play {
  /** Index of the event in game.events. */
  i: number;
  t: GameEvent['t'];
  inning: number;
  half: Half;
  /** Batting team. */
  team: Team;
  outsBefore: number;
  basesBefore: [string | null, string | null, string | null];
  runs: RunScored[];
  /** Players put out on this play (batter included). */
  outsOn: string[];
  // Plate appearances
  batter?: string;
  slot?: number;
  result?: Result;
  /** The pad said HR but the team was over the limit: recorded as HRO. */
  converted?: boolean;
  ip?: boolean;
  fielder?: Pos;
  loc?: Loc;
  bbTo?: 1 | 2;
  pitches?: PitchEvent['pitch'][];
  /** Furthest the batter got: 0 = out at the plate, 1–3, 4 = scored. Updated as the game goes on. */
  reached?: Dest;
  /** The batter reached base and was put out later as a runner. */
  thrownOut?: boolean;
  /** For runner events. */
  from?: Base;
  to?: Dest;
  /** For quick events. */
  quick?: 'run' | 'out' | 'hit' | 'error' | 'hr';
  endsHalf: boolean;
  endsGame: boolean;
}

export type FinalReason = 'regulation' | 'extra' | 'time' | 'runRule' | 'walkoff' | 'tie' | 'ended';

export interface Final {
  winner: Side | null;
  reason: FinalReason;
}

export interface Count {
  balls: number;
  strikes: number;
  ballsThrown: number;
  noStrike: boolean;
  courtesyFoulUsed: boolean;
  pitches: PitchEvent['pitch'][];
}

export interface GameState {
  inning: number;
  half: Half;
  outs: number;
  /** bases[0] is first base. */
  bases: [Runner | null, Runner | null, Runner | null];
  score: Record<Side, number>;
  /** Runs per inning per side (index 0 = inning 1). */
  line: Record<Side, number[]>;
  hits: Record<Side, number>;
  errors: Record<Side, number>;
  /** Over-the-fence home runs (the ones that count toward the limit). */
  hr: Record<Side, number>;
  lineups: Record<Team, Slot[]>;
  /** Next batting slot per team. */
  nextSlot: Record<Team, number>;
  count: Count;
  /** Innings to play before extras (grows with Play Another Inning or +). */
  scheduled: number;
  /** The inning time ran out in, if it has. */
  timeLast: number | null;
  final: Final | null;
  plays: Play[];
  /** For each event: the half it happened in and whether it was applied. */
  eventHalves: { inning: number; half: Half; applied: boolean }[];
  /** Events that couldn't be applied, with why. */
  issues: { i: number; why: string }[];
  /** Runs this half (for the run limit). */
  halfRuns: number;
  /** Has the current half seen an event yet? */
  halfBegun: boolean;
  halfOver: boolean;
  /** Time each inning began (first event of its top half). */
  inningStart: Record<number, number>;
  /** Courtesy runners used per team per inning. */
  courtesyUsed: Record<Team, Record<number, number>>;
  /** Last batter of each team's most recent half (for the tiebreak runner). */
  lastBatter: Record<Team, string | null>;
  deadline: number;
  /** Dugout or Scorekeeper Mode as of the last play. */
  mode: 'dugout' | 'scorekeeper';
  /** The half the game would have gone to next when it ended (for Play Another Inning). */
  pending: { half: Half; inning: number } | null;
  /** Play Another Inning after time ran out: don't end this inning before it starts. */
  timeOverrideInning: number | null;
}

export interface ReplayOptions {
  /** The current time, for the clock. Defaults to the last event's time. */
  now?: number;
}

const EMPTY_BASES = (): [Runner | null, Runner | null, Runner | null] => [null, null, null];

class Invalid extends Error {}

export function replay(game: GameRecord, opts: ReplayOptions = {}): GameState {
  const r = new Replayer(game);
  game.events.forEach((ev, i) => r.apply(ev, i));
  const lastAt = [...game.events].reverse().find((e) => e.at !== undefined)?.at;
  r.finish(opts.now ?? lastAt);
  return r.s;
}

class Replayer {
  readonly s: GameState;
  readonly rules: Rules;
  readonly game: GameRecord;
  /** Dugout or Scorekeeper Mode right now (Game Settings can switch it mid-game). */
  mode: 'dugout' | 'scorekeeper';

  constructor(game: GameRecord) {
    this.game = game;
    this.mode = game.setup.mode;
    const { setup } = game;
    this.rules = setup.rules;
    const them =
      setup.lineups.them.length > 0
        ? setup.lineups.them.map((x) => ({ ...x }))
        : Array.from({ length: 10 }, (_, n) => ({ player: `Batter ${n + 1}` }));
    const deadline =
      setup.rules.timeLimit > 0 && setup.startedAt !== null
        ? setup.startedAt + setup.rules.timeLimit * 60_000
        : Infinity;
    this.s = {
      inning: 1,
      half: 'top',
      outs: 0,
      bases: EMPTY_BASES(),
      score: { away: 0, home: 0 },
      line: { away: [], home: [] },
      hits: { away: 0, home: 0 },
      errors: { away: 0, home: 0 },
      hr: { away: 0, home: 0 },
      lineups: { us: setup.lineups.us.map((x) => ({ ...x })), them },
      nextSlot: { us: 0, them: 0 },
      count: this.freshCount(),
      scheduled: setup.rules.innings,
      timeLast: null,
      final: null,
      plays: [],
      eventHalves: [],
      issues: [],
      halfRuns: 0,
      halfBegun: false,
      halfOver: false,
      inningStart: {},
      courtesyUsed: { us: {}, them: {} },
      lastBatter: { us: null, them: null },
      deadline,
      mode: setup.mode,
      pending: null,
      timeOverrideInning: null,
    };
  }

  // ---- who's who -----------------------------------------------------------

  get battingSide(): Side {
    return this.s.half === 'top' ? 'away' : 'home';
  }
  get fieldingSide(): Side {
    return this.s.half === 'top' ? 'home' : 'away';
  }
  get battingTeam(): Team {
    return this.battingSide === this.game.setup.us ? 'us' : 'them';
  }
  /** Do we track batters and runners for the team at bat? */
  get tracksRunners(): boolean {
    return this.battingTeam === 'us' || this.mode === 'scorekeeper';
  }

  regEnd(): number {
    return this.s.timeLast !== null ? Math.min(this.s.scheduled, this.s.timeLast) : this.s.scheduled;
  }

  runLimitActive(): boolean {
    const { runLimit, runLimitFinalMinutes } = this.rules;
    if (runLimit <= 0) return false;
    const i = this.s.inning;
    if (i >= this.s.scheduled || i > this.regEnd()) return false;
    const start = this.s.inningStart[i];
    if (start !== undefined && this.s.deadline - start < runLimitFinalMinutes * 60_000) return false;
    return true;
  }

  freshCount(): Count {
    const c = this.game.setup.rules.count;
    return {
      balls: c.startBalls,
      strikes: c.startStrikes,
      ballsThrown: 0,
      noStrike: true,
      courtesyFoulUsed: false,
      pitches: [],
    };
  }

  // ---- the event loop -----------------------------------------------------

  apply(ev: GameEvent, i: number): void {
    const s = this.s;
    const record = (applied: boolean) => s.eventHalves.push({ inning: s.inning, half: s.half, applied });
    if (s.final && ev.t !== 'extend') {
      s.issues.push({ i, why: 'game is over' });
      record(false);
      return;
    }
    if (ev.t !== 'extend' && ev.t !== 'end' && ev.t !== 'sub' && ev.t !== 'addSlot' && ev.t !== 'mode') {
      if (!s.halfBegun) {
        this.beginHalf(ev.at);
        if (s.final) {
          s.issues.push({ i, why: 'time ran out between innings' });
          record(false);
          return;
        }
      }
      this.noteTime(ev.at);
    }
    try {
      this.dispatch(ev, i);
      record(true);
    } catch (e) {
      if (!(e instanceof Invalid)) throw e;
      s.issues.push({ i, why: e.message });
      record(false);
    }
    if (s.halfOver && !s.final) this.afterHalf();
  }

  finish(now: number | undefined): void {
    const s = this.s;
    if (s.final) return;
    if (now !== undefined && now >= s.deadline) {
      if (!s.halfBegun && this.gapCheck()) {
        // Time ran out between innings: the next inning doesn't start (unless tied).
        s.timeLast = s.inning - 1;
        this.endOfInning(s.inning - 1);
        if (s.final) return;
      } else if (s.timeLast === null) s.timeLast = s.inning;
    }
    if (!s.halfBegun) this.placeTiebreakRunner();
  }

  /** First event of a half: the inning's start time, time between innings, the tiebreak runner. */
  beginHalf(at: number | undefined): void {
    const s = this.s;
    if (s.half === 'top' && at !== undefined && s.inningStart[s.inning] === undefined) {
      if (at >= s.deadline && this.gapCheck()) {
        s.timeLast = s.inning - 1;
        this.endOfInning(s.inning - 1);
        if (s.final) return;
      }
      s.inningStart[s.inning] = at;
    }
    s.halfBegun = true;
    this.placeTiebreakRunner();
  }

  /** Between innings with no time-out decided yet for this gap. */
  gapCheck(): boolean {
    const s = this.s;
    return s.half === 'top' && s.inning > 1 && s.timeLast === null && s.timeOverrideInning !== s.inning;
  }

  noteTime(at: number | undefined): void {
    const s = this.s;
    if (at !== undefined && at >= s.deadline && s.timeLast === null) s.timeLast = s.inning;
  }

  placeTiebreakRunner(): void {
    const s = this.s;
    if (!this.rules.tbRunner || s.inning <= this.regEnd() || !this.tracksRunners) return;
    if (s.outs !== 0 || s.bases.some(Boolean) || s.plays.some((p) => p.inning === s.inning && p.half === s.half))
      return;
    const team = this.battingTeam;
    const player = s.lastBatter[team] ?? this.previousSlotPlayer(team);
    s.bases[1] = { player, batter: player, play: -1, tb: true };
  }

  previousSlotPlayer(team: Team): string {
    const order = this.s.lineups[team];
    const n = order.length;
    return order[(this.s.nextSlot[team] - 1 + n) % n]?.player ?? 'Batter';
  }

  dispatch(ev: GameEvent, i: number): void {
    switch (ev.t) {
      case 'pa':
        return this.plateAppearance(ev, i);
      case 'pitch':
        return this.pitch(ev, i);
      case 'runner':
        return this.runner(ev, i);
      case 'courtesy':
        return this.courtesy(ev, i);
      case 'quick':
        return this.quick(ev, i);
      case 'endHalf': {
        const p = this.newPlay(i, 'endHalf');
        this.s.halfOver = true;
        p.endsHalf = true;
        return;
      }
      case 'sub': {
        const order = this.s.lineups[ev.team];
        const slot = order[ev.slot];
        if (!slot) throw new Invalid('no such batting slot');
        order[ev.slot] = { ...slot, player: ev.player };
        return;
      }
      case 'addSlot':
        this.s.lineups[ev.team].push({ player: ev.player });
        return;
      case 'mode':
        this.mode = ev.mode;
        this.s.mode = ev.mode;
        return;
      case 'extend': {
        const s = this.s;
        if (s.final) {
          const next = s.pending;
          const reached = next ? next.inning : s.inning;
          s.scheduled = Math.max(s.scheduled, next && next.half === 'top' ? reached - 1 : reached) + 1;
          s.timeLast = null;
          s.final = null;
          s.pending = null;
          if (next) this.startHalf(next.half, next.inning);
          if (s.deadline !== Infinity) s.timeOverrideInning = s.inning;
        } else {
          s.scheduled += 1;
        }
        return;
      }
      case 'end': {
        const s = this.s;
        const p = this.newPlay(i, 'end');
        const d = s.score.home - s.score.away;
        s.final = { winner: d > 0 ? 'home' : d < 0 ? 'away' : null, reason: ev.reason ?? 'ended' };
        p.endsGame = true;
        return;
      }
    }
  }

  newPlay(i: number, t: GameEvent['t']): Play {
    const s = this.s;
    const p: Play = {
      i,
      t,
      inning: s.inning,
      half: s.half,
      team: this.battingTeam,
      outsBefore: s.outs,
      basesBefore: [s.bases[0]?.player ?? null, s.bases[1]?.player ?? null, s.bases[2]?.player ?? null],
      runs: [],
      outsOn: [],
      endsHalf: false,
      endsGame: false,
    };
    s.plays.push(p);
    return p;
  }

  // ---- plate appearances ----------------------------------------------------

  hrAllowed(): boolean {
    const hr = this.rules.hr;
    const mine = this.s.hr[this.battingSide];
    const theirs = this.s.hr[this.fieldingSide];
    if (hr.kind === 'perGame') return mine < hr.max;
    if (hr.kind === 'differential') return mine - theirs < hr.gap;
    return true;
  }

  plateAppearance(ev: PaEvent, i: number): void {
    if (!this.tracksRunners) throw new Invalid('Dugout Mode uses quick buttons for their half');
    const s = this.s;
    let result = ev.result;
    let converted = false;
    if (result === 'HR' && !ev.ip && !this.hrAllowed()) {
      result = 'HRO';
      converted = true;
    }

    const occupied = ([1, 2, 3] as const).filter((b) => s.bases[b - 1]);
    if (result === 'FC' && occupied.length === 0) throw new Invalid('FC needs a runner on base');
    if (result === 'FC' && ev.fcOut != null && !s.bases[ev.fcOut - 1]) throw new Invalid('no runner on that base');
    if (result === 'DP' && (occupied.length === 0 || s.outs >= 2)) throw new Invalid('no double play possible');
    if (result === 'TP' && (occupied.length < 2 || s.outs !== 0)) throw new Invalid('no triple play possible');

    const dests = defaultDests(result, occupied, ev);
    if (ev.adv) {
      for (const [k, d] of Object.entries(ev.adv)) {
        const key: RunnerKey = k === 'B' ? 'B' : (Number(k) as Base);
        if (key !== 'B' && !s.bases[key - 1]) throw new Invalid(`no runner on ${key}`);
        if (d !== undefined) dests.set(key, d);
      }
    }
    checkDests(dests);

    const slotIndex = s.nextSlot[this.battingTeam];
    const slot = s.lineups[this.battingTeam][slotIndex];
    if (!slot) throw new Invalid('empty batting order');
    const batter = slot.player;

    const p = this.newPlay(i, 'pa');
    Object.assign(p, {
      batter,
      slot: slotIndex,
      result,
      converted: converted || undefined,
      ip: result === 'HR' && ev.ip ? true : undefined,
      fielder: ev.fielder,
      loc: ev.loc,
      bbTo: result === 'BB' ? (dests.get('B') === 2 ? 2 : 1) : undefined,
      pitches: s.count.pitches.length ? [...s.count.pitches] : undefined,
    } satisfies Partial<Play>);

    if (result === 'HR' && !ev.ip) s.hr[this.battingSide] += 1;
    if (result === '1B' || result === '2B' || result === '3B' || result === 'HR') s.hits[this.battingSide] += 1;
    if (result === 'E') s.errors[this.fieldingSide] += 1;

    const noRbi = result === 'E' || result === 'DP' || result === 'TP';
    const batterRunner: Runner = { player: batter, batter, play: s.plays.length - 1 };
    this.resolve(p, dests, batterRunner, {
      forceThirdOut: result === 'FC' || result === 'DP' || result === 'TP',
      isHR: result === 'HR',
      rbiFor: (key) => (ev.rbi && key in ev.rbi ? (ev.rbi[key] ?? null) : noRbi ? null : batter),
    });

    s.lastBatter[this.battingTeam] = batter;
    s.nextSlot[this.battingTeam] = (slotIndex + 1) % s.lineups[this.battingTeam].length;
    s.count = this.freshCount();
  }

  /**
   * Move everyone at once. dests holds the batter ('B') and each runner by
   * starting base. Outs first decide whether runs can score; runs score lead
   * runner first so walk-offs, the run rule, and the run limit cut off cleanly.
   */
  resolve(
    p: Play,
    dests: Map<RunnerKey, Dest>,
    batterRunner: Runner | null,
    opts: { forceThirdOut: boolean; isHR: boolean; rbiFor: (k: RunnerKey) => string | null },
  ): void {
    const s = this.s;
    const before = s.bases;
    const who = (k: RunnerKey): Runner => (k === 'B' ? batterRunner! : before[k - 1]!);
    const keys = [...dests.keys()].sort((a, b) => order(b) - order(a)); // lead runner first

    let playOuts = 0;
    for (const k of keys) if (dests.get(k) === 0) playOuts += 1;
    const batterOut = dests.get('B') === 0;
    const thirdOut = s.outs + playOuts >= 3;
    const runsCount = !(thirdOut && (batterOut || opts.forceThirdOut));

    const after: [Runner | null, Runner | null, Runner | null] = [...before];
    for (const k of keys) if (k !== 'B') after[k - 1] = null;

    const scorers: RunnerKey[] = [];
    for (const k of keys) {
      const d = dests.get(k)!;
      const r = who(k);
      if (d === 0) {
        p.outsOn.push(r.player);
        this.markReached(r, 0);
      } else if (d === 4) {
        scorers.push(k);
      } else {
        after[d - 1] = r;
        this.markReached(r, d);
      }
    }
    s.bases = after;
    s.outs = Math.min(3, s.outs + playOuts);

    if (runsCount) {
      for (const k of scorers) {
        const r = who(k);
        if (!this.scoreRun(p, r, opts.rbiFor(k), k, opts.isHR)) break;
      }
    }
    if (s.outs >= 3) s.halfOver = true;
    if (s.halfOver) p.endsHalf = true;
  }

  markReached(r: Runner, d: Dest): void {
    if (r.play < 0) return;
    const p = this.s.plays[r.play];
    if (!p) return;
    if (d === 0 && p.reached !== undefined) p.thrownOut = true;
    else p.reached = d;
  }

  /** Score one run. Returns false when no more runs can score on this play. */
  scoreRun(p: Play, r: Runner, rbi: string | null, from: RunnerKey, isHR: boolean): boolean {
    const s = this.s;
    if (s.halfOver) return false;
    // On a game-ending home run every runner still scores.
    if (s.final && !(isHR && p.endsGame)) return false;
    const side = this.battingSide;
    s.score[side] += 1;
    const line = s.line[side];
    line[s.inning - 1] = (line[s.inning - 1] ?? 0) + 1;
    s.halfRuns += 1;
    p.runs.push({ player: r.player, rbi, batter: r.batter, from });
    this.markReached(r, 4);

    if (this.runLimitActive() && s.halfRuns >= this.rules.runLimit) {
      s.halfOver = true;
      return false;
    }
    if (side === 'home' && s.half === 'bottom') {
      const lead = s.score.home - s.score.away;
      if (s.inning >= this.regEnd() && lead > 0) {
        this.endGame(p, 'home', 'walkoff');
        return isHR;
      }
      if (lead >= runRuleLead(this.rules, s.inning)) {
        this.endGame(p, 'home', 'runRule');
        return isHR;
      }
    }
    return true;
  }

  endGame(p: Play | null, winner: Side | null, reason: FinalReason): void {
    if (this.s.final) return;
    this.s.final = { winner, reason };
    if (p) p.endsGame = true;
    else {
      const last = this.s.plays[this.s.plays.length - 1];
      if (last) last.endsGame = true;
    }
  }

  // ---- the count -------------------------------------------------------------

  pitch(ev: PitchEvent, i: number): void {
    if (!this.tracksRunners) throw new Invalid('no count in Dugout Mode for their half');
    const s = this.s;
    const c = s.count;
    const rules = this.rules.count;
    c.pitches.push(ev.pitch);
    const pa = (e: Omit<PaEvent, 't'>) => this.plateAppearance({ t: 'pa', ...e }, i);
    switch (ev.pitch) {
      case 'ball':
        c.balls += 1;
        c.ballsThrown += 1;
        if (this.rules.mixed && c.noStrike && c.ballsThrown >= 3) return pa({ result: 'BB', bbTo: 2 });
        if (c.balls >= rules.walkAt) return pa({ result: 'BB', bbTo: 1 });
        return;
      case 'look':
      case 'swing':
        c.strikes += 1;
        c.noStrike = false;
        if (c.strikes >= rules.outAt) return pa({ result: ev.pitch === 'look' ? 'KL' : 'K' });
        return;
      case 'foul':
        c.noStrike = false;
        if (c.strikes < rules.outAt - 1) {
          c.strikes += 1;
          return;
        }
        if (!rules.foulOut) return;
        if (rules.courtesyFoul && !c.courtesyFoulUsed) {
          c.courtesyFoulUsed = true;
          return;
        }
        return pa({ result: 'FBO', fielder: ev.fielder, loc: ev.loc });
    }
  }

  // ---- runners -----------------------------------------------------------------

  runner(ev: Extract<GameEvent, { t: 'runner' }>, i: number): void {
    const s = this.s;
    const r = s.bases[ev.from - 1];
    if (!r) throw new Invalid('no runner there');
    if (ev.to !== 0 && ev.to !== 4) {
      if (ev.to <= ev.from) throw new Invalid('runners only move forward');
      if (s.bases[ev.to - 1]) throw new Invalid('that base is taken');
    }
    const p = this.newPlay(i, 'runner');
    p.from = ev.from;
    p.to = ev.to;
    const dests = new Map<RunnerKey, Dest>([[ev.from, ev.to]]);
    this.resolve(p, dests, null, {
      forceThirdOut: false,
      isHR: false,
      rbiFor: () => ev.rbi ?? null,
    });
  }

  courtesy(ev: Extract<GameEvent, { t: 'courtesy' }>, i: number): void {
    const s = this.s;
    const r = s.bases[ev.base - 1];
    if (!r) throw new Invalid('no runner there');
    if (r.tb) throw new Invalid('no courtesy runner for the tiebreak runner');
    const team = this.battingTeam;
    const used = s.courtesyUsed[team][s.inning] ?? 0;
    if (used >= this.rules.courtesyPerInning) throw new Invalid('courtesy runner already used this inning');
    if (s.bases.some((b) => b?.player === ev.player)) throw new Invalid('that player is already on base');
    s.courtesyUsed[team][s.inning] = used + 1;
    s.bases[ev.base - 1] = { ...r, player: ev.player, courtesy: true };
    const p = this.newPlay(i, 'courtesy');
    p.from = ev.base;
  }

  // ---- Dugout Mode quick buttons -----------------------------------------------

  quick(ev: Extract<GameEvent, { t: 'quick' }>, i: number): void {
    if (this.tracksRunners) throw new Invalid('quick buttons are for their half in Dugout Mode');
    const s = this.s;
    const p = this.newPlay(i, 'quick');
    p.quick = ev.kind;
    const them: Runner = { player: 'them', batter: 'them', play: -1 };
    switch (ev.kind) {
      case 'run':
        this.scoreRun(p, them, null, 'B', false);
        break;
      case 'out':
        s.outs += 1;
        if (s.outs >= 3) s.halfOver = true;
        break;
      case 'hit':
        s.hits[this.battingSide] += 1;
        break;
      case 'error':
        s.errors[this.fieldingSide] += 1;
        break;
      case 'hr':
        s.hr[this.battingSide] += 1;
        s.hits[this.battingSide] += 1;
        this.scoreRun(p, them, null, 'B', true);
        break;
    }
    if (s.halfOver) p.endsHalf = true;
  }

  // ---- ends of halves and innings ------------------------------------------------

  afterHalf(): void {
    const s = this.s;
    const i = s.inning;
    // Make sure both halves show in the line score, even scoreless.
    const side = this.battingSide;
    s.line[side][i - 1] = s.line[side][i - 1] ?? 0;
    if (s.half === 'top') {
      const lead = s.score.home - s.score.away;
      if (lead > 0 && i >= this.regEnd()) this.endGame(null, 'home', this.reasonAt(i));
      else if (lead > 0 && lead >= runRuleLead(this.rules, i)) this.endGame(null, 'home', 'runRule');
      this.startHalf('bottom', i);
    } else {
      this.endOfInning(i);
      this.startHalf('top', i + 1);
    }
  }

  startHalf(half: Half, inning: number): void {
    const s = this.s;
    if (s.final) {
      // Leave the board on the last half played; remember where play would resume.
      s.halfOver = false;
      s.outs = Math.min(s.outs, 3);
      s.pending = { half, inning };
      return;
    }
    s.half = half;
    s.inning = inning;
    s.outs = 0;
    s.bases = EMPTY_BASES();
    s.halfRuns = 0;
    s.halfBegun = false;
    s.halfOver = false;
    s.count = this.freshCount();
  }

  reasonAt(i: number): FinalReason {
    if (i > this.regEnd()) return 'extra';
    if (this.s.timeLast !== null && this.s.timeLast < this.s.scheduled) return 'time';
    return 'regulation';
  }

  /** After a full inning (or when time runs out between innings). */
  endOfInning(i: number): void {
    const s = this.s;
    const lead = s.score.home - s.score.away;
    const winner: Side | null = lead > 0 ? 'home' : lead < 0 ? 'away' : null;
    const reg = this.regEnd();
    if (i >= reg) {
      if (winner) return this.endGame(null, winner, this.reasonAt(i));
      const { extras, allowTie } = this.rules;
      const played = i - reg;
      if (extras === 'untilDecided' || played < extras) return;
      if (allowTie) this.endGame(null, null, 'tie');
      return;
    }
    if (winner && Math.abs(lead) >= runRuleLead(this.rules, i)) this.endGame(null, winner, 'runRule');
  }
}

function order(k: RunnerKey): number {
  return k === 'B' ? 0 : k;
}

/** Where everyone goes by default for a result. */
export function defaultDests(result: Result, occupied: Base[], ev: Pick<PaEvent, 'fcOut' | 'bbTo'>): Map<RunnerKey, Dest> {
  const d = new Map<RunnerKey, Dest>();
  for (const b of occupied) d.set(b, b);
  const hitBases = { '1B': 1, '2B': 2, '3B': 3, HR: 4 } as const;
  switch (result) {
    case '1B':
    case '2B':
    case '3B':
    case 'HR': {
      const n = hitBases[result];
      d.set('B', n as Dest);
      for (const b of occupied) d.set(b, Math.min(4, b + n) as Dest);
      return d;
    }
    case 'BB':
      return forceTo(d, occupied, ev.bbTo === 2 ? 2 : 1);
    case 'E':
      return forceTo(d, occupied, 1);
    case 'FC': {
      const out = ev.fcOut ?? null;
      const rest = out === null ? occupied : occupied.filter((b) => b !== out);
      if (out !== null) d.set(out, 0);
      return forceTo(d, rest, 1);
    }
    case 'SF':
      d.set('B', 0);
      if (occupied.includes(3)) d.set(3, 4);
      return d;
    case 'DP':
      d.set('B', 0);
      d.set(occupied[0]!, 0);
      return d;
    case 'TP':
      d.set('B', 0);
      d.set(occupied[0]!, 0);
      d.set(occupied[1]!, 0);
      return d;
    default:
      d.set('B', 0);
      return d;
  }
}

/** Put the batter on `to` (1 or 2), pushing forced runners ahead. */
function forceTo(d: Map<RunnerKey, Dest>, occupied: Base[], to: 1 | 2): Map<RunnerKey, Dest> {
  // Who is where, after any outs already decided.
  const at = new Map<number, RunnerKey>();
  for (const b of occupied) at.set(b, b);
  const place = (k: RunnerKey, base: number): void => {
    if (base >= 4) {
      d.set(k, 4);
      return;
    }
    const there = at.get(base);
    if (there !== undefined && there !== k) place(there, base + 1);
    for (const [b, key] of at) if (key === k) at.delete(b);
    at.set(base, k);
    d.set(k, base as Dest);
  };
  place('B', 1);
  if (to === 2) place('B', 2);
  return d;
}

function checkDests(d: Map<RunnerKey, Dest>): void {
  const seen = new Set<number>();
  for (const [, v] of d) {
    if (v >= 1 && v <= 3) {
      if (seen.has(v)) throw new Invalid('two runners on one base');
      seen.add(v);
    }
  }
}

// ---- helpers for screens ----------------------------------------------------------

/** HRs left before the next one is an out (Infinity with no limit). */
export function hrLeft(state: GameState, rules: Rules, side: Side): number {
  const other: Side = side === 'home' ? 'away' : 'home';
  if (rules.hr.kind === 'perGame') return Math.max(0, rules.hr.max - state.hr[side]);
  if (rules.hr.kind === 'differential') return Math.max(0, rules.hr.gap - (state.hr[side] - state.hr[other]));
  return Infinity;
}

/** The team at bat right now, from our point of view. */
export function battingTeam(state: GameState, us: Side): Team {
  const side: Side = state.half === 'top' ? 'away' : 'home';
  return side === us ? 'us' : 'them';
}

/** Is this inning the last one because time ran out (shows LAST on the board)? */
export function isLastByTime(state: GameState): boolean {
  return state.timeLast !== null && state.timeLast === state.inning;
}
