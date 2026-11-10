import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_RULE_SETS,
  defaultRules,
  deleteRuleSet,
  hrLeft,
  isLastByTime,
  matchRuleSet,
  mixedRatioProblems,
  replay,
  saveRuleSet,
  switchHomeAway,
  type GameEvent,
} from '../../../src/engine/index.ts';
import { game, pa, quietInning, rules, threeOuts, timed } from '../../helpers/game.ts';

const innings = (n: number) => Array.from({ length: n }, quietInning).flat();
const MIN = 60_000;

describe('walk-off', () => {
  it('ends the instant the winning run scores: bases-loaded triple wins 7–6, not 8–6', () => {
    // Away (them) scores 6 in the top of the 1st, we (home) score 6 in the bottom; then quiet to the 7th.
    const sixRuns: GameEvent[] = [pa('HR'), pa('HR'), pa('HR'), pa('HR'), pa('HR'), pa('HR')];
    const events = [
      ...sixRuns,
      ...threeOuts(),
      ...sixRuns,
      ...threeOuts(),
      ...innings(5),
      ...threeOuts(), // top 7
      pa('1B'),
      pa('1B'),
      pa('1B'),
      pa('3B'),
    ];
    const s = replay(game({ us: 'home' }, events));
    expect(s.score).toEqual({ away: 6, home: 7 });
    expect(s.final).toEqual({ winner: 'home', reason: 'walkoff' });
    const last = s.plays[s.plays.length - 1]!;
    expect(last.runs).toHaveLength(1);
    expect(last.endsGame).toBe(true);
  });

  it('a walk-off home run scores everyone', () => {
    const events = [...innings(6), ...threeOuts(), pa('1B'), pa('1B'), pa('HR')];
    const s = replay(game({ us: 'home' }, events));
    expect(s.score).toEqual({ away: 0, home: 3 });
    expect(s.final?.reason).toBe('walkoff');
  });

  it('no bottom of the last inning when the home team leads', () => {
    const events = [...innings(6), pa('GO'), pa('GO'), pa('GO')];
    const s = replay(game({ us: 'home' }, [...threeOuts(), pa('HR'), pa('GO'), pa('GO'), pa('GO'), ...innings(5), ...threeOuts()]));
    expect(s.final).toEqual({ winner: 'home', reason: 'regulation' });
    expect(s.line.home).toHaveLength(6);
    expect(replay(game({}, events)).final).toBeNull();
  });
});

describe('run rule', () => {
  it('20 after 3: the away team wins at the end of the 3rd', () => {
    const twenty = Array.from({ length: 20 }, () => pa('HR'));
    const s = replay(game({}, [...twenty, ...threeOuts(), ...threeOuts(), ...innings(2)]));
    expect(s.final).toEqual({ winner: 'away', reason: 'runRule' });
  });

  it('the home team wins the moment it’s 10 ahead after the 5th', () => {
    const events = [...innings(4), ...threeOuts(), ...Array.from({ length: 10 }, () => pa('HR')), pa('1B')];
    const s = replay(game({ us: 'home' }, events));
    expect(s.final).toEqual({ winner: 'home', reason: 'runRule' });
    expect(s.score.home).toBe(10);
    expect(s.issues).toHaveLength(1);
  });

  it('no run rule before its inning', () => {
    const twenty = Array.from({ length: 25 }, () => pa('HR'));
    const s = replay(game({}, [...twenty, ...threeOuts(), ...threeOuts()]));
    expect(s.final).toBeNull();
  });
});

describe('ties and extra innings', () => {
  it('Fort Collins: one extra inning, then a tie', () => {
    const r = rules('fc-2hr', { timeLimit: 0 });
    const s7 = replay(game({ rules: r }, innings(7)));
    expect(s7.final).toBeNull();
    expect(s7.inning).toBe(8);
    const s8 = replay(game({ rules: r }, [...innings(7), ...threeOuts(), ...threeOuts()]));
    expect(s8.final).toEqual({ winner: null, reason: 'tie' });
  });

  it('until decided keeps going', () => {
    const s = replay(game({ rules: rules('basic') }, innings(10)));
    expect(s.final).toBeNull();
    const won = replay(game({ rules: rules('basic') }, [...innings(9), pa('HR'), ...threeOuts(), ...threeOuts()]));
    expect(won.final).toEqual({ winner: 'away', reason: 'extra' });
  });

  it('Play Another Inning after a tie, and + adds an inning', () => {
    const r = rules('fc-2hr', { timeLimit: 0, extras: 0 });
    const tied = [...innings(7)];
    expect(replay(game({ rules: r }, tied)).final?.reason).toBe('tie');
    const more = replay(game({ rules: r }, [...tied, { t: 'extend' }, pa('HR'), ...threeOuts(), ...threeOuts()]));
    expect(more.final).toEqual({ winner: 'away', reason: 'regulation' });
    const plus = replay(game({ rules: r }, [{ t: 'extend' }, ...innings(7)]));
    expect(plus.final).toBeNull();
    expect(plus.scheduled).toBe(8);
  });

  it('End Game Now', () => {
    const s = replay(game({}, [pa('HR'), { t: 'end' }, pa('1B')]));
    expect(s.final).toEqual({ winner: 'away', reason: 'ended' });
    expect(s.issues).toEqual([{ i: 2, why: 'game is over' }]);
  });
});

describe('tiebreak runner', () => {
  it('the last batter of the previous inning starts on 2nd in extra innings', () => {
    const r = rules('fc-2hr', { timeLimit: 0 });
    const s = replay(game({ rules: r }, innings(7)));
    // We're away: 7 innings x 3 batters = 21 PAs, last batter slot 21 → p1.
    expect(s.bases[1]).toMatchObject({ player: 'p1', tb: true });
    const scored = replay(game({ rules: r }, [...innings(7), pa('2B')]));
    expect(scored.score.away).toBe(1);
    expect(scored.plays.at(-1)?.runs[0]?.player).toBe('p1');
  });

  it('no courtesy runner for the tiebreak runner', () => {
    const r = rules('fc-2hr', { timeLimit: 0 });
    const s = replay(game({ rules: r }, [...innings(7), { t: 'courtesy', base: 2, player: 'p9' }]));
    expect(s.issues[0]?.why).toBe('no courtesy runner for the tiebreak runner');
  });
});

describe('courtesy runner', () => {
  it('takes the base and gets credit for the run; once per inning', () => {
    const s = replay(
      game({}, [
        pa('2B'),
        { t: 'courtesy', base: 2, player: 'p9' },
        pa('1B', { adv: { 2: 4 } }),
        { t: 'courtesy', base: 1, player: 'p8' },
      ]),
    );
    expect(s.plays[2]?.runs[0]).toMatchObject({ player: 'p9', batter: 'p1', rbi: 'p2' });
    expect(s.plays[0]?.reached).toBe(4);
    expect(s.issues[0]?.why).toBe('courtesy runner already used this inning');
  });
});

describe('home run limits', () => {
  it('+2 differential: two ahead turns the next HR into an out', () => {
    const r = rules('fc-2hr', { timeLimit: 0 });
    const s = replay(game({ rules: r }, [pa('HR'), pa('HR'), pa('HR')]));
    expect(s.score.away).toBe(2);
    expect(s.plays[2]).toMatchObject({ result: 'HRO', converted: true });
    expect(s.outs).toBe(1);
    expect(hrLeft(s, r, 'away')).toBe(0);
    expect(hrLeft(s, r, 'home')).toBe(4);
  });

  it('inside-the-park HRs don’t count toward the limit', () => {
    const r = rules('fc-1hr', { timeLimit: 0 });
    const s = replay(game({ rules: r }, [pa('HR'), pa('HR', { ip: true }), pa('HR')]));
    expect(s.score.away).toBe(2);
    expect(s.plays[1]).toMatchObject({ result: 'HR', ip: true });
    expect(s.plays[2]?.result).toBe('HRO');
    expect(s.hr.away).toBe(1);
  });

  it('their HRs from the quick buttons count for the differential', () => {
    const r = rules('fc-2hr', { timeLimit: 0 });
    const events: GameEvent[] = [
      pa('HR'),
      pa('HR'),
      ...threeOuts(),
      { t: 'quick', kind: 'hr' },
      { t: 'quick', kind: 'out' },
      { t: 'quick', kind: 'out' },
      { t: 'quick', kind: 'out' },
      pa('HR'),
    ];
    const s = replay(game({ rules: r, mode: 'dugout' }, events));
    expect(s.plays.at(-1)?.result).toBe('HR');
    expect(s.score).toEqual({ away: 3, home: 1 });
  });
});

describe('run limit (Recreational)', () => {
  const r = rules('fc-rec', { timeLimit: 55 });
  const start = Date.UTC(2026, 5, 1, 18, 0);

  it('stops at 5 runs and ends the half', () => {
    const events = timed([pa('HR'), pa('HR'), pa('HR'), pa('1B'), pa('1B'), pa('1B'), pa('3B'), pa('1B')], start);
    const s = replay(game({ rules: rules('fc-rec', { timeLimit: 0, hr: { kind: 'unlimited' } }), startedAt: start }, events));
    expect(s.score.away).toBe(5);
    expect(s.half).toBe('bottom');
    expect(s.plays[6]?.runs).toHaveLength(2);
    expect(s.plays[6]?.endsHalf).toBe(true);
  });

  it('no limit in an inning that begins with under 10 minutes left', () => {
    const unlimited = { ...r, hr: { kind: 'unlimited' } as const };
    const sixRuns = () => Array.from({ length: 6 }, () => pa('HR'));
    // The 4th begins 46 minutes in: 9 minutes left, so it's the final inning.
    const late = [...timed(innings(3), start), ...timed(sixRuns(), start + 46 * MIN, 10_000)];
    const s = replay(game({ rules: unlimited, startedAt: start }, late));
    expect([s.inning, s.half, s.score.away]).toEqual([4, 'top', 6]);
    // The same inning begun 30 minutes in stops at 5.
    const early = [...timed(innings(3), start), ...timed(sixRuns(), start + 30 * MIN, 10_000)];
    const e = replay(game({ rules: unlimited, startedAt: start }, early));
    expect([e.inning, e.half, e.score.away]).toEqual([4, 'bottom', 5]);
  });

  it('no limit in the scheduled last inning', () => {
    const noClock = rules('fc-rec', { timeLimit: 0, hr: { kind: 'unlimited' } });
    const sixRuns = Array.from({ length: 6 }, () => pa('HR'));
    const s = replay(game({ rules: noClock }, [...innings(6), ...sixRuns]));
    expect(s.score.away).toBe(6);
    expect(s.half).toBe('top');
  });
});

describe('the clock', () => {
  const r = rules('fc-2hr');
  const start = Date.UTC(2026, 5, 1, 18, 0);

  it('time running out during an inning makes it the last (LAST); a tie goes to one extra', () => {
    // One event every 9 minutes: the 2nd inning begins at 54, time runs out during it.
    const events = timed([...innings(2), pa('HR'), pa('GO')], start, 9 * MIN);
    const s = replay(game({ rules: r, startedAt: start }, events));
    expect(s.timeLast).toBe(2);
    expect([s.inning, s.outs]).toEqual([3, 1]);
    expect(s.score.away).toBe(2); // tiebreak runner and the batter
    expect(s.final).toBeNull();
  });

  it('time running out between innings with the score tied still allows the extra inning', () => {
    const events = timed([...innings(2), ...quietInning()], start, 10 * MIN);
    const s = replay(game({ rules: r, startedAt: start }, events));
    expect(s.timeLast).toBe(1);
    expect(s.final).toEqual({ winner: null, reason: 'tie' });
    expect(s.issues).toHaveLength(6);
  });

  it('shows LAST while the inning goes on', () => {
    const events = timed([...threeOuts(), pa('GO')], start, 20 * MIN);
    const s = replay(game({ rules: r, startedAt: start }, events));
    expect(isLastByTime(s)).toBe(true);
    expect(s.final).toBeNull();
  });

  it('time running out between innings: the next inning doesn’t start', () => {
    const one = timed([pa('HR'), ...threeOuts(), ...threeOuts()], start, MIN); // ends at 6 minutes
    const s = replay(game({ rules: r, startedAt: start }, one), { now: start + 56 * MIN });
    expect(s.final).toEqual({ winner: 'away', reason: 'time' });
    const late = replay(game({ rules: r, startedAt: start }, [...one, { t: 'pa', result: '1B', at: start + 56 * MIN }]));
    expect(late.final?.reason).toBe('time');
    expect(late.issues).toHaveLength(1);
  });

  it('a tie at time still gets its extra inning, with the tiebreak runner', () => {
    const one = timed(innings(1), start, MIN);
    const s = replay(game({ rules: r, startedAt: start }, one), { now: start + 60 * MIN });
    expect(s.final).toBeNull();
    expect(s.bases[1]?.tb).toBe(true);
  });

  it('Undo never resets the clock: the clock lives in the setup, not the events', () => {
    const s = replay(game({ rules: r, startedAt: start }, []), { now: start + 60 * MIN });
    expect(s.timeLast).toBe(1);
  });
});

describe('the count', () => {
  const fc = rules('fc-2hr', { timeLimit: 0 });
  const pitch = (p: 'ball' | 'look' | 'swing' | 'foul'): GameEvent => ({ t: 'pitch', pitch: p });

  it('Fort Collins: 0–0 start, 3 balls walk, 2 strikes out', () => {
    const s = replay(game({ rules: fc, count: true }, [pitch('ball'), pitch('ball'), pitch('ball')]));
    expect(s.plays[0]).toMatchObject({ result: 'BB', pitches: ['ball', 'ball', 'ball'] });
    const k = replay(game({ rules: fc, count: true }, [pitch('swing'), pitch('look')]));
    expect(k.plays[0]?.result).toBe('KL');
  });

  it('a foul on the last strike is an out, not a strikeout', () => {
    const s = replay(game({ rules: fc, count: true }, [pitch('foul'), pitch('foul')]));
    expect(s.plays[0]?.result).toBe('FBO');
    expect(s.outs).toBe(1);
  });

  it('one courtesy foul', () => {
    const r = rules('fc-2hr', { timeLimit: 0, count: { ...fc.count, courtesyFoul: true } });
    const s = replay(game({ rules: r, count: true }, [pitch('swing'), pitch('foul')]));
    expect(s.plays).toHaveLength(0);
    expect(s.count.courtesyFoulUsed).toBe(true);
    const out = replay(game({ rules: r, count: true }, [pitch('swing'), pitch('foul'), pitch('foul')]));
    expect(out.plays[0]?.result).toBe('FBO');
  });

  it('start at 1–1 with 4 balls and 3 strikes', () => {
    const b = rules('basic');
    const s = replay(game({ rules: b, count: true }, [pitch('ball'), pitch('ball'), pitch('ball')]));
    expect(s.plays[0]?.result).toBe('BB');
    const k = replay(game({ rules: b, count: true }, [pitch('swing'), pitch('foul'), pitch('foul')]));
    expect(k.plays[0]?.result).toBe('FBO');
  });

  it('a ball in play mid-count keeps the pitches', () => {
    const s = replay(game({ rules: fc, count: true }, [pitch('ball'), pitch('swing'), pa('1B')]));
    expect(s.plays[0]?.pitches).toEqual(['ball', 'swing']);
    expect(s.count.balls).toBe(0);
  });
});

describe('Mixed League walk', () => {
  const mixed = rules('fc-2hr', { timeLimit: 0, mixed: true });
  const pitch = (p: 'ball' | 'look'): GameEvent => ({ t: 'pitch', pitch: p });

  it('three straight balls sends the batter to second', () => {
    const s = replay(game({ rules: mixed, count: true }, [pa('1B'), pitch('ball'), pitch('ball'), pitch('ball')]));
    expect(s.plays[1]).toMatchObject({ result: 'BB', bbTo: 2 });
    expect(s.bases.map((b) => b?.player ?? null)).toEqual([null, 'p2', 'p1']);
  });

  it('a strike in between means first base only', () => {
    const s = replay(
      game({ rules: rules('basic', { mixed: true }), count: true }, [
        pitch('ball'),
        pitch('look'),
        pitch('ball'),
        pitch('ball'),
        pitch('ball'),
      ]),
    );
    expect(s.plays[0]).toMatchObject({ result: 'BB', bbTo: 1 });
  });

  it('with the count off, BB asks To First or To Second', () => {
    const s = replay(game({ rules: mixed }, [pa('BB', { bbTo: 2 })]));
    expect(s.bases[1]?.player).toBe('p1');
  });

  it('lineup ratio checks', () => {
    const g = (p: string) => (p.startsWith('m') ? 'm' : 'f') as 'm' | 'f';
    expect(mixedRatioProblems(['m1', 'm2', 'f1'], ['m1', 'f1'], g)).toEqual([]);
    expect(mixedRatioProblems(['m1', 'm2', 'm3', 'f1'], ['m1', 'm2', 'f1'], g)).toEqual([
      { where: 'batting', men: 3, others: 1 },
      { where: 'defense', men: 2, others: 1 },
    ]);
  });
});

describe('Dugout Mode', () => {
  it('quick buttons for their half; the third out brings us up', () => {
    const events: GameEvent[] = [
      ...threeOuts(),
      { t: 'quick', kind: 'run' },
      { t: 'quick', kind: 'hit' },
      { t: 'quick', kind: 'error' },
      { t: 'quick', kind: 'out' },
      { t: 'quick', kind: 'out' },
      { t: 'quick', kind: 'out' },
    ];
    const s = replay(game({ mode: 'dugout' }, events));
    expect([s.inning, s.half]).toEqual([2, 'top']);
    expect(s.score.home).toBe(1);
    expect(s.hits.home).toBe(1);
    expect(s.errors.away).toBe(1);
  });

  it('End Their Half-Inning Now', () => {
    const s = replay(game({ mode: 'dugout' }, [...threeOuts(), { t: 'quick', kind: 'run' }, { t: 'endHalf' }]));
    expect([s.inning, s.half]).toEqual([2, 'top']);
  });

  it('their half takes no plate appearances, ours takes no quick buttons', () => {
    const s = replay(game({ mode: 'dugout' }, [{ t: 'quick', kind: 'run' }, ...threeOuts(), pa('1B')]));
    expect(s.issues.map((x) => x.i)).toEqual([0, 4]);
  });
});

describe('switching home and away', () => {
  it('moves every play to the other half and keeps stats with our players', () => {
    const events: GameEvent[] = [pa('HR'), ...threeOuts(), pa('1B'), ...threeOuts(), ...quietInning()];
    const before = replay(game({}, events));
    const sw = switchHomeAway(game({}, events));
    expect(sw.ok).toBe(true);
    if (!sw.ok) return;
    const after = replay(sw.game);
    expect(sw.game.setup.us).toBe('home');
    expect(after.score).toEqual({ away: before.score.home, home: before.score.away });
    const ours = (s: typeof before) => s.plays.filter((p) => p.team === 'us').map((p) => [p.batter, p.result]);
    expect(ours(after)).toEqual(ours(before));
  });

  it('waits for the end of an inning', () => {
    expect(switchHomeAway(game({}, [pa('1B')]))).toEqual({ ok: false, why: 'mid-inning' });
  });
});

describe('rule sets', () => {
  it('has the four built-ins with Fort Collins 2+ HR as the default', () => {
    expect(BUILT_IN_RULE_SETS.map((s) => s.name)).toEqual([
      'Fort Collins: 2+ HR Division',
      'Fort Collins: 1 HR Division',
      'Fort Collins: Recreational',
      'Basic Slowpitch',
    ]);
    expect(matchRuleSet(defaultRules(), [])).toBe('fc-2hr');
  });

  it('Fort Collins rules match the city rulebook', () => {
    const fc = defaultRules();
    expect(fc).toMatchObject({
      innings: 7,
      timeLimit: 55,
      extras: 1,
      allowTie: true,
      tbRunner: true,
      mixed: false,
      count: { walkAt: 3, outAt: 2, startBalls: 0, startStrikes: 0, foulOut: true, courtesyFoul: false },
    });
    expect(fc.runRule).toEqual([
      { runs: 20, after: 3 },
      { runs: 15, after: 4 },
      { runs: 10, after: 5 },
    ]);
    expect(BUILT_IN_RULE_SETS.every((s) => !s.rules.mixed)).toBe(true);
  });

  it('changing any rule shows Custom; saving names it', () => {
    const changed = { ...defaultRules(), innings: 6 };
    expect(matchRuleSet(changed, [])).toBe('custom');
    const { saved } = saveRuleSet([], 'Six Innings', changed, () => 'mine');
    expect(matchRuleSet(changed, saved)).toBe('mine');
    expect(saveRuleSet(saved, ' six  innings ', changed, () => 'x').error).toBe('duplicate');
    expect(saveRuleSet(saved, '  ', changed, () => 'x').error).toBe('blank');
    expect(deleteRuleSet(saved, 'mine')).toEqual([]);
  });

  it('run-rule order doesn’t make a set Custom', () => {
    const r = defaultRules();
    expect(matchRuleSet({ ...r, runRule: [...r.runRule].reverse() }, [])).toBe('fc-2hr');
  });
});
