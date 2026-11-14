/*
 * The hand scorer: an independent scorekeeper that plays random seasons and
 * keeps its own stat sheet, the way a person with a pencil would.
 *
 * It must NOT use the engine's logic (no replay, no defaultDests, no stats
 * code). It reads only the rule sets as data and the event types, works out
 * every play from docs/SPEC.md by itself, and writes the events a person
 * would tap. tests/unit/hand-scorer.test.ts then checks that the engine and
 * stats, replaying those taps, land on exactly the same sheet.
 */
import { BUILT_IN_RULE_SETS, type Rules } from '../../src/engine/rules.ts';
import { autoRotate } from '../../src/game/defense.ts';
import type {
  BattedType,
  DefenseInning,
  Dest,
  GameEvent,
  GameRecord,
  LineupPos,
  Loc,
  Pos,
  Result,
} from '../../src/engine/types.ts';

// ---- random numbers -------------------------------------------------------------

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- the sheet ----------------------------------------------------------------------

export interface SheetLine {
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
  ROE: number;
  rispAB: number;
  rispH: number;
  ground: number;
  line: number;
  fly: number;
  pop: number;
  pull: number;
  center: number;
  oppo: number;
}

const blankLine = (): SheetLine => ({
  G: 0, PA: 0, AB: 0, R: 0, H: 0, '1B': 0, '2B': 0, '3B': 0, HR: 0, RBI: 0, BB: 0, K: 0, SF: 0, TB: 0,
  HRO: 0, FBO: 0, ROE: 0, rispAB: 0, rispH: 0, ground: 0, line: 0, fly: 0, pop: 0, pull: 0, center: 0, oppo: 0,
});

export interface SheetGame {
  id: string;
  score: { away: number; home: number };
  winner: 'away' | 'home' | null;
  reason: string;
  /** When the scorer decided the game was over (for replaying with the clock). */
  endNow: number;
  /** The events without the saved-game end marker. */
  liveEvents: GameEvent[];
}

export interface Sheet {
  batting: Map<string, SheetLine>;
  fielding: Map<string, { innings: Record<number, number>; plays: number; errors: number }>;
  playing: Map<string, { games: number; fieldInnings: number; fairShare: number }>;
  record: { w: number; l: number; t: number };
  games: SheetGame[];
}

export interface Season {
  games: GameRecord[];
  sheet: Sheet;
  bats: Map<string, 'R' | 'L' | 'S'>;
  coverage: Set<string>;
}

// ---- the scorekeeper's own rate formulas (written from the stat definitions) -------------

export function sheetRates(c: SheetLine): Record<string, number | null> {
  const safe = (n: number, d: number) => (d === 0 ? null : n / d);
  const avg = safe(c.H, c.AB);
  const obp = safe(c.H + c.BB, c.AB + c.BB + c.SF);
  const slg = safe(c['1B'] + 2 * c['2B'] + 3 * c['3B'] + 4 * c.HR, c.AB);
  const woba = safe(
    0.696 * c.BB + 0.89 * c['1B'] + 1.272 * c['2B'] + 1.623 * c['3B'] + 2.103 * c.HR,
    c.AB + c.BB + c.SF,
  );
  return {
    AVG: avg,
    OBP: obp,
    SLG: slg,
    OPS: obp === null || slg === null ? null : obp + slg,
    ISO: slg === null || avg === null ? null : slg - avg,
    // Balls in play: at-bats that weren't strikeouts, home runs, or home runs ruled outs, plus sac flies.
    BABIP: safe(c.H - c.HR, c.AB - c.K - c.HR - c.HRO + c.SF),
    'K%': safe(c.K, c.PA),
    'BB%': safe(c.BB, c.PA),
    'BB/K': safe(c.BB, c.K),
    wOBA: woba,
    RC: safe((c.H + c.BB) * (c['1B'] + 2 * c['2B'] + 3 * c['3B'] + 4 * c.HR), c.AB + c.BB),
    RISP: safe(c.rispH, c.rispAB),
  };
}

// ---- simulation ------------------------------------------------------------------------

type Side = 'away' | 'home';
interface Man {
  player: string;
  tb?: boolean;
}

const DEFAULT_ROSTER = Array.from({ length: 14 }, (_, n) => `u${n + 1}`);
const OPPONENTS = ['Oak Hollow Sluggers', 'Horsetooth Hackers', 'Old Town Alley Cats', 'Two Left Mitts'];
const FOUR_OF: Pos[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 9];
const THREE_OF: Pos[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12];
const OUTS_FIELDED = new Set<Result>(['GO', 'F', 'L', 'P', 'SF', 'DP', 'TP', 'FBO', 'FC']);

/**
 * Choices the sample season (tools/make-sample.ts) pins down. Every random
 * draw still happens in the same order, so the permanent seeds play exactly
 * the same games when no options are given.
 */
export interface SimOptions {
  roster?: readonly string[];
  ruleSetId?: string;
  mode?: 'dugout' | 'scorekeeper';
  count?: boolean;
  hitLocation?: boolean;
  /** The opponent for each game, in order. */
  opponents?: readonly string[];
  /** The opponent's batting order, by opponent. */
  theirOrders?: Record<string, readonly string[]>;
  /** Always use the Defense card. */
  defenseCard?: boolean;
}

export function simulateSeason(seed: number, gameCount = 5, opts: SimOptions = {}): Season {
  const ROSTER = opts.roster ?? DEFAULT_ROSTER;
  const rand = rng(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const shuffle = <T>(xs: readonly T[]): T[] => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };

  const bats = new Map<string, 'R' | 'L' | 'S'>();
  for (const p of ROSTER) bats.set(p, pick(['R', 'R', 'R', 'L', 'S'] as const));

  const sheet: Sheet = {
    batting: new Map(),
    fielding: new Map(),
    playing: new Map(),
    record: { w: 0, l: 0, t: 0 },
    games: [],
  };
  const coverage = new Set<string>();
  const games: GameRecord[] = [];
  const line = (p: string) => {
    let l = sheet.batting.get(p);
    if (!l) {
      l = blankLine();
      sheet.batting.set(p, l);
    }
    return l;
  };
  const fieldLine = (p: string) => {
    let l = sheet.fielding.get(p);
    if (!l) {
      l = { innings: {}, plays: 0, errors: 0 };
      sheet.fielding.set(p, l);
    }
    return l;
  };

  let clock = Date.UTC(2026, 4, 5, 18, 30);

  for (let g = 0; g < gameCount; g++) {
    clock += 7 * 24 * 3600_000;
    const picked = pick(BUILT_IN_RULE_SETS);
    const ruleSet = BUILT_IN_RULE_SETS.find((r) => r.id === opts.ruleSetId) ?? picked;
    const rules: Rules = structuredClone(ruleSet.rules);
    const mixed = rand() < 0.25;
    const courtesyFoul = rand() < 0.2;
    if (!opts.ruleSetId) {
      if (mixed) rules.mixed = true;
      if (courtesyFoul) rules.count.courtesyFoul = true;
    }
    const randomMode = rand() < 0.4 ? 'dugout' : 'scorekeeper';
    const mode = opts.mode ?? randomMode;
    const us: Side = rand() < 0.5 ? 'away' : 'home';
    const randomCount = rand() < 0.4;
    const countOn = opts.count ?? randomCount;
    const randomLocation = rand() < 0.75;
    const hitLocation = opts.hitLocation ?? randomLocation;
    const step = pick([10_000, 25_000, 40_000]);
    const startedAt = clock;
    const deadline = rules.timeLimit > 0 ? startedAt + rules.timeLimit * 60_000 : Infinity;
    coverage.add(mode).add(us).add(ruleSet.id);
    if (countOn) coverage.add('count');

    // Who's here, the batting order, and the Defense card.
    const present = shuffle(ROSTER).slice(0, 10 + Math.floor(rand() * 4));
    const orderSize = Math.min(present.length, 10 + Math.floor(rand() * 2));
    const order = present.slice(0, orderSize);
    const bench = present.slice(orderSize);
    const startPos = rand() < 0.5 ? FOUR_OF : THREE_OF;
    const lineupUs = order.map((player, n) => ({ player, pos: (startPos[n] ?? 'EH') as LineupPos }));
    const randomOpponent = pick(OPPONENTS);
    const opponent = opts.opponents?.[g] ?? randomOpponent;
    const theirOrder = opts.theirOrders?.[opponent]?.slice() ?? Array.from({ length: 10 }, (_, n) => `${opponent.split(' ')[0]} ${n + 1}`);

    const card: (DefenseInning | undefined)[] = [];
    const useCard = rand() < 0.8 || opts.defenseCard === true;
    if (useCard) {
      for (let i = 0; i < 20; i++) {
        if (i > 0 && rand() < 0.3) {
          card.push(undefined); // copies forward
          continue;
        }
        const fielders = shuffle(present).slice(0, 10);
        const spots = rand() < 0.5 ? FOUR_OF : THREE_OF;
        const inning: DefenseInning = {};
        for (const p of present) inning[p] = 'sit';
        fielders.forEach((p, n) => (inning[p] = spots[n]!));
        card.push(inning);
      }
    }
    if (opts.defenseCard === true) {
      // The sample season: a card a real manager would keep, from Auto-Rotate
      // (same outfield all game, fair sits). The random card above still runs
      // so every other game draws the same numbers as before.
      const plan = Math.min(rules.innings, 7);
      const draft = {
        id: 'draft',
        setup: { us: 'away' as const, mode: 'scorekeeper' as const, rules, count: false, hitLocation: false, startedAt: null, lineups: { us: lineupUs, them: [] } },
        events: [],
        present,
        plan,
      };
      const rotated = autoRotate(draft, present.map((id) => ({ id, name: id, number: '', positions: [] })));
      card.length = 0;
      card.push(...rotated.defense);
    }
    const defenseAt = (inning: number): DefenseInning => {
      for (let i = Math.min(inning, card.length) - 1; i >= 0; i--) if (card[i]) return card[i]!;
      const d: DefenseInning = {};
      for (const s of lineupUs) d[s.player] = s.pos;
      return d;
    };

    // ---- game state, kept by hand ----
    const events: GameEvent[] = [];
    let t = startedAt;
    let inning = 1;
    let half: 'top' | 'bottom' = 'top';
    let outs = 0;
    let bases: (Man | null)[] = [null, null, null];
    const score = { away: 0, home: 0 };
    const hr = { away: 0, home: 0 };
    const lineups = { us: lineupUs.map((s) => s.player), them: theirOrder };
    const slot = { us: 0, them: 0 };
    let timeLast: number | null = null;
    let final: { winner: Side | null; reason: string } | null = null;
    let endNow = t;
    let halfRuns = 0;
    let halfStarted = false;
    let halfOver = false;
    let finalThisPlay = false;
    const inningStart: Record<number, number> = {};
    const courtesyUsed: Record<string, number> = {};
    const lastBatter: Record<'us' | 'them', string | null> = { us: null, them: null };
    const defensiveInnings = new Set<number>();
    const subs: string[] = [];
    let balls = 0;
    let strikes = 0;
    let ballsThrown = 0;
    let noStrike = true;
    let courtesyFoulUsed = false;

    const battingSide = (): Side => (half === 'top' ? 'away' : 'home');
    const fieldingSide = (): Side => (half === 'top' ? 'home' : 'away');
    const team = (): 'us' | 'them' => (battingSide() === us ? 'us' : 'them');
    const tracked = () => team() === 'us' || mode === 'scorekeeper';
    const regEnd = () => (timeLast === null ? rules.innings : Math.min(rules.innings, timeLast));
    const lead = (i: number) => {
      let need = Infinity;
      for (const r of rules.runRule) if (i >= r.after && r.runs < need) need = r.runs;
      return need;
    };
    const limitOn = () => {
      if (rules.runLimit <= 0) return false;
      if (inning >= rules.innings || inning > regEnd()) return false;
      const begun = inningStart[inning];
      if (begun !== undefined && deadline - begun < rules.runLimitFinalMinutes * 60_000) return false;
      return true;
    };
    const resetCount = () => {
      balls = rules.count.startBalls;
      strikes = rules.count.startStrikes;
      ballsThrown = 0;
      noStrike = true;
      courtesyFoulUsed = false;
    };
    resetCount();

    const emit = (ev: GameEvent) => {
      if (events.length > 4000) throw new Error(`seed ${seed} game ${g}: runaway game in inning ${inning} ${half}, outs ${outs}`);
      events.push({ ...ev, at: t });
      if (ev.t !== 'sub') {
        if (team() === 'them') defensiveInnings.add(inning);
      }
      endNow = t;
      t += Math.round(step * (0.5 + rand()));
    };
    const endGame = (winner: Side | null, reason: string) => {
      if (final) return;
      final = { winner, reason };
      coverage.add(reason);
    };
    const reasonAt = (i: number) =>
      i > regEnd() ? 'extra' : timeLast !== null && timeLast < rules.innings ? 'time' : 'regulation';
    const inningOver = (i: number) => {
      const diff = score.home - score.away;
      const winner: Side | null = diff > 0 ? 'home' : diff < 0 ? 'away' : null;
      if (i >= regEnd()) {
        if (winner) return endGame(winner, reasonAt(i));
        coverage.add('tiedAfterRegulation');
        const extrasSoFar = i - regEnd();
        if (rules.extras === 'untilDecided' || extrasSoFar < rules.extras) return;
        if (rules.allowTie) endGame(null, 'tie');
        return;
      }
      if (winner && Math.abs(diff) >= lead(i)) endGame(winner, 'runRule');
    };

    /** Before tapping anything in a half: the inning's start, the clock, the tiebreak runner. */
    const ready = (): boolean => {
      if (!halfStarted) {
        if (half === 'top' && inningStart[inning] === undefined) {
          if (inning > 1 && t >= deadline && timeLast === null) {
            timeLast = inning - 1;
            coverage.add('timeBetweenInnings');
            inningOver(inning - 1);
            if (final) {
              endNow = t;
              return false;
            }
          }
          inningStart[inning] = t;
        }
        halfStarted = true;
        if (rules.tbRunner && inning > regEnd() && tracked()) {
          const who = lastBatter[team()]!;
          bases = [null, { player: who, tb: true }, null];
          coverage.add('tbRunner');
        }
      }
      if (t >= deadline && timeLast === null) {
        timeLast = inning;
        coverage.add('timeLast');
      }
      return true;
    };

    const scoreRun = (who: string, rbi: string | null, isHR: boolean): boolean => {
      if (halfOver) return false;
      if (final && !(isHR && finalThisPlay)) return false;
      const side = battingSide();
      score[side] += 1;
      halfRuns += 1;
      if (team() === 'us') {
        line(who).R += 1;
        if (rbi) line(rbi).RBI += 1;
      }
      if (limitOn() && halfRuns >= rules.runLimit) {
        halfOver = true;
        coverage.add('runLimit');
        return false;
      }
      if (rules.runLimit > 0 && halfRuns > rules.runLimit) coverage.add('runLimitExempt');
      if (half === 'bottom') {
        const ahead = score.home - score.away;
        if (inning >= regEnd() && ahead > 0) {
          endGame('home', 'walkoff');
          finalThisPlay = true;
          if (isHR) coverage.add('walkoffHR');
          return isHR;
        }
        if (ahead >= lead(inning)) {
          endGame('home', 'runRule');
          finalThisPlay = true;
          return isHR;
        }
      }
      return true;
    };

    /** Move everyone. dest keys: 'B' and 1–3 by starting base. */
    const resolve = (
      dest: Map<'B' | 1 | 2 | 3, Dest>,
      batter: string | null,
      forced: boolean,
      isHR: boolean,
      rbiOf: (k: 'B' | 1 | 2 | 3) => string | null,
    ) => {
      finalThisPlay = false;
      const keys = [...dest.keys()].sort((a, b) => (b === 'B' ? 0 : b) - (a === 'B' ? 0 : a));
      const man = (k: 'B' | 1 | 2 | 3): Man => (k === 'B' ? { player: batter! } : bases[k - 1]!);
      let made = 0;
      for (const k of keys) if (dest.get(k) === 0) made += 1;
      const batterOut = dest.get('B') === 0;
      const noRuns = outs + made >= 3 && (batterOut || forced);
      const next = [...bases];
      for (const k of keys) if (k !== 'B') next[k - 1] = null;
      const scorers: ('B' | 1 | 2 | 3)[] = [];
      for (const k of keys) {
        const d = dest.get(k)!;
        if (d === 4) scorers.push(k);
        else if (d > 0) next[d - 1] = man(k);
      }
      const movers = new Map(keys.map((k) => [k, man(k)]));
      bases = next;
      outs = Math.min(3, outs + made);
      if (!noRuns) {
        for (const k of scorers) if (!scoreRun(movers.get(k)!.player, rbiOf(k), isHR)) break;
      } else if (scorers.length) coverage.add('noRunsOnThirdOut');
      if (outs >= 3) halfOver = true;
    };

    const occupied = () => ([1, 2, 3] as const).filter((b) => bases[b - 1]);

    const hrAllowed = () => {
      const mine = hr[battingSide()];
      const theirs = hr[fieldingSide()];
      if (rules.hr.kind === 'perGame') return mine < rules.hr.max;
      if (rules.hr.kind === 'differential') return mine - theirs < rules.hr.gap;
      return true;
    };

    /** Where the ball went, and who's credited. */
    const fieldFor = (result: Result): { fielder?: Pos; loc?: Loc } => {
      if (!hitLocation || result === 'K' || result === 'KL' || result === 'BB') return {};
      let spots: Pos[];
      if (team() === 'them') {
        const d = defenseAt(inning);
        spots = Object.values(d).filter((v): v is Pos => typeof v === 'number');
      } else spots = THREE_OF;
      if (result === 'FBO') spots = [2, 3, 5];
      // Deep balls go to the true outfielders, never the shallow short fielder.
      if (result === 'HR' || result === 'HRO') spots = spots.filter((s) => s >= 7 && s !== 12);
      const fielder = pick(spots.length ? spots : THREE_OF);
      if (rand() < 0.2) return { fielder }; // Fielder Buttons: no spot
      const hit = result === '1B' || result === '2B' || result === '3B' || result === 'HR' || result === 'E';
      const type: BattedType | undefined = hit ? pick(['ground', 'line', 'fly'] as const) : undefined;
      return { fielder, loc: { x: Math.round(rand() * 300 - 150), y: Math.round(rand() * 300), type } };
    };

    const tallyPA = (batter: string, result: Result, f: { fielder?: Pos; loc?: Loc }, risp: boolean) => {
      coverage.add(result);
      if (team() === 'them') {
        if (!f.fielder) return;
        const d = defenseAt(inning);
        const who = Object.keys(d).find((p) => d[p] === f.fielder);
        if (!who) return;
        if (result === 'E') fieldLine(who).errors += 1;
        else if (OUTS_FIELDED.has(result)) fieldLine(who).plays += 1;
        return;
      }
      const c = line(batter);
      c.PA += 1;
      const ab = result !== 'BB' && result !== 'SF';
      if (ab) c.AB += 1;
      const tb = result === '1B' ? 1 : result === '2B' ? 2 : result === '3B' ? 3 : result === 'HR' ? 4 : 0;
      if (tb) {
        c.H += 1;
        c.TB += tb;
        c[result as '1B' | '2B' | '3B' | 'HR'] += 1;
      }
      if (result === 'BB') c.BB += 1;
      if (result === 'K' || result === 'KL') c.K += 1;
      if (result === 'SF') c.SF += 1;
      if (result === 'HRO') c.HRO += 1;
      if (result === 'FBO') c.FBO += 1;
      if (result === 'E') c.ROE += 1;
      if (ab && risp) {
        c.rispAB += 1;
        if (tb) c.rispH += 1;
      }
      // Contact type: outs by what they are; hits and errors only when the field said.
      const typeByResult: Partial<Record<Result, BattedType>> = {
        GO: 'ground', DP: 'ground', TP: 'ground', FC: 'ground',
        F: 'fly', SF: 'fly', HRO: 'fly', L: 'line', P: 'pop', FBO: 'pop',
      };
      const type = typeByResult[result] ?? (tb || result === 'E' ? f.loc?.type : undefined);
      if (type) c[type] += 1;
      if (f.fielder) {
        const leftSide = [5, 6, 7, 10].includes(f.fielder);
        const rightSide = [3, 4, 9, 11].includes(f.fielder);
        if (!leftSide && !rightSide) c.center += 1;
        else {
          const pullsLeft = bats.get(batter) !== 'L';
          if (leftSide === pullsLeft) c.pull += 1;
          else c.oppo += 1;
        }
      }
    };

    /** A full plate appearance with a result. */
    const plateAppearance = (chosen: Result, fromCount: { bbTo?: 1 | 2 } | null) => {
      const tm = team();
      const n = lineups[tm].length;
      const batter = lineups[tm][slot[tm] % n]!;
      let result = chosen;
      const ev: Extract<GameEvent, { t: 'pa' }> = { t: 'pa', result };
      let ip = false;
      if (result === 'HR') {
        ip = rand() < 0.25;
        if (ip) {
          ev.ip = true;
          coverage.add('insideParkHR');
        } else if (!hrAllowed()) {
          result = 'HRO';
          if (rand() < 0.5) {
            ev.result = 'HRO';
          } else coverage.add('hrConverted');
        }
      }
      const f = fieldFor(result);
      if (f.fielder) ev.fielder = f.fielder;
      if (f.loc) ev.loc = f.loc;
      const on = occupied();
      const risp = !!(bases[1] || bases[2]);

      // Where everyone goes, worked out by hand.
      const dest = new Map<'B' | 1 | 2 | 3, Dest>();
      for (const b of on) dest.set(b, b);
      const pushFrom = (who: 'B' | 1 | 2 | 3, start: number, spots: (('B' | 1 | 2 | 3) | null)[]) => {
        // spots[i] = who stands on base i+1 now
        let carrying: 'B' | 1 | 2 | 3 = who;
        for (let base = start; base <= 4; base++) {
          if (base === 4) {
            dest.set(carrying, 4);
            return;
          }
          const there = spots[base - 1];
          spots[base - 1] = carrying;
          dest.set(carrying, base as Dest);
          if (!there) return;
          carrying = there;
        }
      };
      let variant = false;
      let forced = false;
      let bbTo: 1 | 2 = 1;
      const standing = (): (('B' | 1 | 2 | 3) | null)[] => [bases[0] ? 1 : null, bases[1] ? 2 : null, bases[2] ? 3 : null];

      if (result === '1B' || result === '2B' || result === '3B' || result === 'HR') {
        const nb = result === 'HR' ? 4 : Number(result[0]);
        dest.set('B', nb as Dest);
        for (const b of on) dest.set(b, Math.min(4, b + nb) as Dest);
        if (result === '1B' && rand() < 0.35 && on.length) {
          // Extra base: lead runner takes one more.
          const leadRunner = on[on.length - 1]!;
          const to = Math.min(4, leadRunner + 2) as Dest;
          const taken = [...dest.entries()].some(([k, d]) => k !== leadRunner && d === to && to < 4);
          if (!taken) {
            dest.set(leadRunner, to);
            variant = true;
          }
        }
      } else if (result === 'BB' || result === 'E') {
        const spots = standing();
        bbTo = result === 'BB' ? (fromCount ? (fromCount.bbTo ?? 1) : rules.mixed && rand() < 0.5 ? 2 : 1) : 1;
        pushFrom('B', 1, spots);
        if (bbTo === 2) {
          spots[0] = null;
          pushFrom('B', 2, spots);
          coverage.add('walkToSecond');
          if (!fromCount) ev.bbTo = 2;
        }
        if (result === 'E' && bases[2] && dest.get(3) === 3 && rand() < 0.5) {
          dest.set(3, 4);
          variant = true;
          coverage.add('runOnError');
        }
      } else if (result === 'FC') {
        forced = true;
        const out = rand() < 0.2 ? null : pick(on);
        ev.fcOut = out;
        const spots = standing();
        if (out !== null) {
          dest.set(out, 0);
          spots[out - 1] = null;
          coverage.add('fcRunnerOut');
        } else coverage.add('fcNobody');
        pushFrom('B', 1, spots);
      } else if (result === 'SF') {
        dest.set('B', 0);
        dest.set(3, 4);
      } else if (result === 'DP') {
        forced = true;
        dest.set('B', 0);
        dest.set(on[0]!, 0);
      } else if (result === 'TP') {
        forced = true;
        dest.set('B', 0);
        dest.set(on[0]!, 0);
        dest.set(on[1]!, 0);
      } else {
        dest.set('B', 0);
        if (result === 'GO' && on.length && rand() < 0.3) {
          // Runners move up on the ground ball, lead runner first.
          const taken = new Set<number>();
          for (const b of [...on].reverse()) {
            const to = Math.min(4, b + 1);
            if (to < 4 && taken.has(to)) {
              taken.add(b);
              continue;
            }
            dest.set(b, to as Dest);
            if (to < 4) taken.add(to);
          }
          variant = true;
          coverage.add('advanceOnGrounder');
        }
      }

      // RBI: the batter, except on errors, double plays, and triple plays; sometimes changed by hand.
      const rbiDefault = result === 'E' || result === 'DP' || result === 'TP' ? null : batter;
      const rbiOverride = new Map<'B' | 1 | 2 | 3, string | null>();
      // A walk or strikeout from the count isn't its own tap, so there's nothing to change by hand.
      for (const [k, d] of dest) {
        if (d === 4 && !fromCount && rand() < 0.12) {
          const who = rand() < 0.5 ? null : batter;
          rbiOverride.set(k, who);
          coverage.add('rbiOverride');
        }
      }
      if (variant) {
        ev.adv = {};
        for (const [k, d] of dest) ev.adv[k] = d;
        coverage.add('adv');
      }
      if (rbiOverride.size) {
        ev.rbi = {};
        for (const [k, v] of rbiOverride) ev.rbi[k] = v;
      }
      if (!fromCount) emit(ev);
      else if (result === 'FBO') {
        // The foul that ended it carries the fielder.
        const last = events[events.length - 1] as Extract<GameEvent, { t: 'pitch' }>;
        if (f.fielder) last.fielder = f.fielder;
        if (f.loc) last.loc = f.loc;
      }

      if (!ip && result === 'HR') hr[battingSide()] += 1;
      tallyPA(batter, result, f, risp);
      resolve(dest, batter, forced, result === 'HR', (k) => (rbiOverride.has(k) ? rbiOverride.get(k)! : rbiDefault));
      lastBatter[tm] = batter;
      slot[tm] = (slot[tm] + 1) % n;
      resetCount();
    };

    const legalResults = (): Result[] => {
      const on = occupied();
      const list: Result[] = ['1B', '1B', '1B', '1B', '2B', '2B', '3B', 'HR', 'HR', 'E', 'GO', 'GO', 'GO', 'F', 'F', 'L', 'P', 'K', 'KL', 'BB', 'FBO'];
      // A home run out only happens once the team is over its home-run limit (Steve, Nov 2026).
      if (!hrAllowed()) list.push('HRO');
      if (on.length) list.push('FC', 'FC');
      if (bases[2] && outs < 2) list.push('SF', 'SF');
      if (on.length && outs < 2) list.push('DP', 'DP');
      if (on.length >= 2 && outs === 0) list.push('TP', 'TP');
      return list;
    };

    const atBat = () => {
      const chosen = pick(legalResults());
      if (!countOn) {
        plateAppearance(chosen, null);
        return;
      }
      // With the count on, pitch until the count decides it or the ball is put in play.
      const byCount = chosen === 'BB' || chosen === 'K' || chosen === 'KL' || chosen === 'FBO';
      const before = byCount ? 30 : Math.floor(rand() * 4);
      for (let n = 0; n < before; n++) {
        if (!ready()) return;
        let pitch: 'ball' | 'look' | 'swing' | 'foul' = pick(['ball', 'ball', 'look', 'swing', 'foul'] as const);
        if (!rules.count.foulOut && strikes >= rules.count.outAt - 1 && pitch === 'foul') pitch = 'swing';
        emit({ t: 'pitch', pitch });
        if (pitch === 'ball') {
          balls += 1;
          ballsThrown += 1;
          if (rules.mixed && noStrike && ballsThrown >= 3) return plateAppearance('BB', { bbTo: 2 });
          if (balls >= rules.count.walkAt) return plateAppearance('BB', { bbTo: 1 });
        } else if (pitch === 'look' || pitch === 'swing') {
          strikes += 1;
          noStrike = false;
          if (strikes >= rules.count.outAt) return plateAppearance(pitch === 'look' ? 'KL' : 'K', {});
        } else {
          noStrike = false;
          if (strikes < rules.count.outAt - 1) strikes += 1;
          else if (rules.count.foulOut) {
            if (rules.count.courtesyFoul && !courtesyFoulUsed) {
              courtesyFoulUsed = true;
              coverage.add('courtesyFoul');
            } else {
              coverage.add('foulOutByCount');
              return plateAppearance('FBO', {});
            }
          }
        }
      }
      if (byCount) return;
      if (!ready()) return;
      plateAppearance(chosen, null);
    };

    const runnerMove = (): boolean => {
      const on = occupied();
      if (!on.length) return false;
      const b = pick(on);
      const roll = rand();
      if (roll < 0.4 && b < 3 && !bases[b]) {
        emit({ t: 'runner', from: b, to: (b + 1) as Dest });
        resolve(new Map([[b, (b + 1) as Dest]]), null, false, false, () => null);
        coverage.add('runnerAdvance');
      } else if (roll < 0.75) {
        const rbi = rand() < 0.5 ? lastBatter[team()] : null;
        const credit = team() === 'us' ? rbi : null;
        emit({ t: 'runner', from: b, to: 4, rbi: credit });
        resolve(new Map([[b, 4 as Dest]]), null, false, false, () => credit);
        coverage.add(credit ? 'runnerScoresRbi' : 'runnerScoresNoRbi');
      } else {
        emit({ t: 'runner', from: b, to: 0 });
        resolve(new Map([[b, 0 as Dest]]), null, false, false, () => null);
        coverage.add('runnerOut');
      }
      return true;
    };

    const courtesyRun = (): boolean => {
      const key = `${team()}:${inning}`;
      if ((courtesyUsed[key] ?? 0) >= rules.courtesyPerInning) return false;
      const on = occupied().filter((b) => !bases[b - 1]!.tb);
      if (!on.length) return false;
      const b = pick(on);
      const pool = team() === 'us' ? present : theirOrder;
      const free = pool.filter((p) => !bases.some((m) => m?.player === p));
      if (!free.length) return false;
      const player = pick(free);
      emit({ t: 'courtesy', base: b, player });
      bases[b - 1] = { player };
      courtesyUsed[key] = (courtesyUsed[key] ?? 0) + 1;
      coverage.add('courtesy');
      return true;
    };

    const quickButton = () => {
      const roll = rand();
      if (roll < 0.03) {
        emit({ t: 'endHalf' });
        halfOver = true;
        coverage.add('endHalf');
        return;
      }
      if (roll < 0.55) {
        emit({ t: 'quick', kind: 'out' });
        outs += 1;
        if (outs >= 3) halfOver = true;
      } else if (roll < 0.75) {
        emit({ t: 'quick', kind: 'run' });
        finalThisPlay = false;
        scoreRun('them', null, false);
      } else if (roll < 0.88) {
        emit({ t: 'quick', kind: 'hit' });
      } else if (roll < 0.94) {
        emit({ t: 'quick', kind: 'error' });
      } else {
        emit({ t: 'quick', kind: 'hr' });
        hr[battingSide()] += 1;
        finalThisPlay = false;
        scoreRun('them', null, true);
      }
      coverage.add('quick');
    };

    // ---- play ball ----
    while (!final && inning <= 30) {
      if (team() === 'us' && bench.length > subs.length && rand() < 0.06) {
        const player = bench.filter((p) => !subs.includes(p))[0]!;
        const s = Math.floor(rand() * lineups.us.length);
        emit({ t: 'sub', team: 'us', slot: s, player });
        lineups.us[s] = player;
        subs.push(player);
        coverage.add('sub');
      }
      let spins = 0;
      while (!halfOver && !final) {
        if (++spins > 3000) throw new Error(`seed ${seed} game ${g}: stuck in inning ${inning} ${half}, outs ${outs}`);
        if (!ready()) break;
        if (!tracked()) {
          quickButton();
          continue;
        }
        const roll = rand();
        if (roll < 0.07 && runnerMove()) continue;
        if (roll < 0.1 && courtesyRun()) continue;
        atBat();
      }
      if (final) break;
      // End of a half.
      if (half === 'top') {
        const ahead = score.home - score.away;
        if (ahead > 0 && inning >= regEnd()) endGame('home', reasonAt(inning));
        else if (ahead > 0 && ahead >= lead(inning)) endGame('home', 'runRule');
        half = 'bottom';
      } else {
        inningOver(inning);
        inning += 1;
        half = 'top';
      }
      outs = 0;
      bases = [null, null, null];
      halfRuns = 0;
      halfStarted = false;
      halfOver = false;
      resetCount();
    }
    if (!final) throw new Error(`seed ${seed} game ${g}: no final after 30 innings`);
    const done = final as { winner: Side | null; reason: string };

    const id = `s${seed}-g${g + 1}`;
    const saved = [...events];
    if (done.reason === 'time' && events.length && endNow > events[events.length - 1]!.at!) {
      saved.push({ t: 'end', reason: 'time', at: endNow });
    }
    games.push({
      id,
      setup: {
        us,
        mode,
        rules,
        count: countOn,
        hitLocation,
        startedAt,
        lineups: { us: lineupUs, them: theirOrder.map((player) => ({ player })) },
      },
      events: saved,
      defense: useCard ? (card as DefenseInning[]) : undefined,
      present,
    });
    sheet.games.push({ id, score: { ...score }, winner: done.winner, reason: done.reason, endNow, liveEvents: events });

    // Record, games played, playing time, fielding innings.
    const ours = done.winner === null ? 't' : done.winner === us ? 'w' : 'l';
    sheet.record[ours] += 1;
    for (const p of new Set([...lineupUs.map((s) => s.player), ...subs])) line(p).G += 1;
    let total = 0;
    const mine = new Map<string, number>();
    for (const i of defensiveInnings) {
      const d = defenseAt(i);
      for (const [p, pos] of Object.entries(d)) {
        if (typeof pos !== 'number') continue;
        total += 1;
        mine.set(p, (mine.get(p) ?? 0) + 1);
        const fl = fieldLine(p);
        fl.innings[pos] = (fl.innings[pos] ?? 0) + 1;
      }
    }
    for (const p of present) {
      const pt = sheet.playing.get(p) ?? { games: 0, fieldInnings: 0, fairShare: 0 };
      pt.games += 1;
      pt.fieldInnings += mine.get(p) ?? 0;
      pt.fairShare += total / present.length;
      sheet.playing.set(p, pt);
    }
  }
  return { games, sheet, bats, coverage };
}

/** Every tag the permanent seeds must cover between them. */
export const REQUIRED_COVERAGE = [
  '1B', '2B', '3B', 'HR', 'BB', 'E', 'FC', 'K', 'KL', 'GO', 'F', 'L', 'P', 'SF', 'DP', 'TP', 'HRO', 'FBO',
  'dugout', 'scorekeeper', 'away', 'home', 'count', 'fc-2hr', 'fc-1hr', 'fc-rec', 'basic',
  'walkoff', 'walkoffHR', 'runRule', 'regulation', 'extra', 'tie', 'time', 'timeLast', 'timeBetweenInnings',
  'tiedAfterRegulation', 'tbRunner', 'runLimit', 'runLimitExempt', 'courtesy', 'hrConverted', 'insideParkHR',
  'walkToSecond', 'courtesyFoul', 'foulOutByCount', 'fcRunnerOut', 'fcNobody', 'runOnError', 'advanceOnGrounder',
  'noRunsOnThirdOut', 'rbiOverride', 'adv', 'runnerAdvance', 'runnerScoresRbi', 'runnerScoresNoRbi', 'runnerOut',
  'sub', 'quick', 'endHalf',
] as const;
