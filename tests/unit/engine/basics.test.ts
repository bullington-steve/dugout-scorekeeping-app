import { describe, expect, it } from 'vitest';
import { bookCode, describePlay, replay, undo, replaceEvent, deleteEvent } from '../../../src/engine/index.ts';
import { game, pa, threeOuts, quietInning } from '../../helpers/game.ts';

describe('replay basics', () => {
  it('starts in the top of the first with nobody on', () => {
    const s = replay(game());
    expect([s.inning, s.half, s.outs]).toEqual([1, 'top', 0]);
    expect(s.bases).toEqual([null, null, null]);
    expect(s.score).toEqual({ away: 0, home: 0 });
  });

  it('three outs switch sides and the order carries on', () => {
    const s = replay(game({}, [...threeOuts(), pa('1B')]));
    expect([s.inning, s.half, s.outs]).toEqual([1, 'bottom', 0]);
    expect(s.bases[0]?.player).toBe('T1');
    expect(s.nextSlot.us).toBe(3);
    expect(s.line.away).toEqual([0]);
  });

  it('a home run scores everyone and undo takes it back', () => {
    const events = [pa('1B'), pa('BB'), pa('HR')];
    const s = replay(game({}, events));
    expect(s.score.away).toBe(3);
    expect(s.plays[2]?.runs.map((r) => [r.player, r.rbi])).toEqual([
      ['p1', 'p3'],
      ['p2', 'p3'],
      ['p3', 'p3'],
    ]);
    const back = replay(game({}, undo(events)));
    expect(back.score.away).toBe(0);
    expect(back.bases.map((b) => b?.player ?? null)).toEqual(['p2', 'p1', null]);
  });

  it('hits move runners by the hit’s bases', () => {
    const s = replay(game({}, [pa('1B'), pa('2B')]));
    expect(s.bases.map((b) => b?.player ?? null)).toEqual([null, 'p2', 'p1']);
    const t = replay(game({}, [pa('1B'), pa('1B'), pa('3B')]));
    expect(t.score.away).toBe(2);
    expect(t.bases[2]?.player).toBe('p3');
  });

  it('walks and errors push only forced runners', () => {
    const s = replay(game({}, [pa('2B'), pa('BB'), pa('E', { fielder: 6 })]));
    expect(s.bases.map((b) => b?.player ?? null)).toEqual(['p3', 'p2', 'p1']);
    expect(s.errors.home).toBe(1);
    const t = replay(game({}, [pa('1B'), pa('1B'), pa('1B'), pa('BB')]));
    expect(t.score.away).toBe(1);
    expect(t.plays[3]?.runs[0]?.rbi).toBe('p4');
  });

  it('no RBI on an error or a double play', () => {
    const s = replay(game({}, [pa('3B'), pa('E')]));
    expect(s.plays[1]?.runs).toEqual([]);
    const withRun = replay(game({}, [pa('3B'), pa('E', { adv: { 3: 4 } })]));
    expect(withRun.plays[1]?.runs[0]).toMatchObject({ player: 'p1', rbi: null });
  });

  it('sac fly scores the runner from third with an RBI', () => {
    const s = replay(game({}, [pa('3B'), pa('SF', { fielder: 8 })]));
    expect(s.score.away).toBe(1);
    expect(s.outs).toBe(1);
    expect(s.plays[1]?.runs[0]?.rbi).toBe('p2');
    expect(bookCode(s.plays[1]!)).toBe('SF8');
  });

  it('fielder’s choice: a named runner out, or nobody', () => {
    const s = replay(game({}, [pa('1B'), pa('1B'), pa('FC', { fcOut: 2 })]));
    // Runner from 2nd out at 3rd; batter to 1st forces the runner from 1st to 2nd.
    expect(s.outs).toBe(1);
    expect(s.bases.map((b) => b?.player ?? null)).toEqual(['p3', 'p2', null]);
    expect(s.plays[2]?.outsOn).toEqual(['p1']);
    const nobody = replay(game({}, [pa('1B'), pa('FC', { fcOut: null })]));
    expect(nobody.outs).toBe(0);
    expect(nobody.bases.map((b) => b?.player ?? null)).toEqual(['p2', 'p1', null]);
  });

  it('FC with bases empty is refused', () => {
    const s = replay(game({}, [pa('FC')]));
    expect(s.issues).toHaveLength(1);
    expect(s.plays).toHaveLength(0);
  });

  it('a forced run doesn’t count when the play makes the third out', () => {
    const events = [pa('GO'), pa('1B'), pa('1B'), pa('1B'), pa('DP')];
    const s = replay(game({}, events));
    expect(s.score.away).toBe(0);
    expect(s.half).toBe('bottom');
  });

  it('double play and triple play', () => {
    const dp = replay(game({}, [pa('1B'), pa('DP', { fielder: 6 })]));
    expect(dp.outs).toBe(2);
    expect(dp.plays[1]?.outsOn).toEqual(['p1', 'p2']);
    const tp = replay(game({}, [pa('1B'), pa('1B'), pa('TP', { fielder: 5 })]));
    expect([tp.half, tp.score.away]).toEqual(['bottom', 0]);
    expect(tp.plays[2]?.outsOn).toEqual(['p1', 'p2', 'p3']);
    expect(bookCode(tp.plays[2]!)).toBe('TP');
    expect(describePlay(tp.plays[2]!, (k) => k)).toBe('p3 hits into a triple play. p1 is out. p2 is out.');
  });

  it('infield fly rule: the batter is out, runners hold, and it needs first and second with fewer than two outs', () => {
    const s = replay(game({}, [pa('1B'), pa('1B'), pa('IF', { fielder: 6 })]));
    expect(s.issues).toHaveLength(0);
    expect(s.outs).toBe(1);
    expect(s.bases.map((b) => !!b)).toEqual([true, true, false]);
    expect(bookCode(s.plays[2]!)).toBe('IF6');
    expect(describePlay(s.plays[2]!, (k) => k)).toBe('p3 is out on the infield fly rule to shortstop.');
    // Only a runner on first, or two outs: not possible.
    expect(replay(game({}, [pa('1B'), pa('IF')])).issues).toHaveLength(1);
    expect(replay(game({}, [pa('1B'), pa('1B'), pa('GO'), pa('GO'), pa('IF')])).issues).toHaveLength(1);
  });

  it('triple play needs two runners and nobody out', () => {
    expect(replay(game({}, [pa('1B'), pa('TP')])).issues).toHaveLength(1);
    expect(replay(game({}, [pa('1B'), pa('1B'), pa('GO'), pa('TP')])).issues).toHaveLength(1);
  });

  it('runners: advance, score with or without an RBI, and get out', () => {
    const s = replay(
      game({}, [
        pa('1B'),
        { t: 'runner', from: 1, to: 2 },
        pa('1B', { adv: { 2: 3 } }),
        { t: 'runner', from: 3, to: 4, rbi: 'p2' },
        { t: 'runner', from: 1, to: 4 },
        pa('1B'),
        { t: 'runner', from: 1, to: 0 },
      ]),
    );
    expect(s.score.away).toBe(2);
    const runs = s.plays.flatMap((p) => p.runs);
    expect(runs.map((r) => [r.player, r.rbi])).toEqual([
      ['p1', 'p2'],
      ['p2', null],
    ]);
    expect(s.outs).toBe(1);
    expect(s.plays[0]?.reached).toBe(4);
    expect(s.plays[5]?.thrownOut).toBe(true);
  });

  it('a runner can’t move onto a taken base', () => {
    const s = replay(game({}, [pa('1B'), pa('1B'), { t: 'runner', from: 1, to: 2 }]));
    expect(s.issues[0]?.why).toBe('that base is taken');
  });

  it('editing a past play re-scores everything after it', () => {
    const events = [pa('1B'), pa('2B'), pa('GO')];
    expect(replay(game({}, events)).score.away).toBe(0);
    const edited = replaceEvent(events, 0, pa('2B'));
    const s = replay(game({}, edited));
    expect(s.score.away).toBe(1);
    const removed = deleteEvent(events, 1);
    expect(replay(game({}, removed)).bases[0]?.player).toBe('p1');
  });

  it('the line score counts scoreless halves', () => {
    const s = replay(game({}, [...quietInning(), ...quietInning()]));
    expect(s.line).toEqual({ away: [0, 0], home: [0, 0] });
    expect(s.inning).toBe(3);
  });
});

describe('Book codes', () => {
  it('writes codes a scorekeeper would', () => {
    expect(bookCode({ result: 'GO', fielder: 6 })).toBe('6-3');
    expect(bookCode({ result: 'GO', fielder: 3 })).toBe('3U');
    expect(bookCode({ result: 'GO' })).toBe('GO');
    expect(bookCode({ result: 'F', fielder: 8 })).toBe('F8');
    expect(bookCode({ result: 'F', fielder: 10 })).toBe('F10');
    expect(bookCode({ result: 'L', fielder: 11 })).toBe('L11');
    expect(bookCode({ result: 'KL' })).toBe('ꓘ');
    expect(bookCode({ result: 'E', fielder: 4 })).toBe('E4');
    expect(bookCode({ result: 'FBO', fielder: 2 })).toBe('FBO2');
  });
});
