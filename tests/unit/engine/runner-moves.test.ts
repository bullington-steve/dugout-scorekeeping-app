/* Master Spec §5 (Nov 14): runner moves between pitches, and which runner a double play gets. */
import { describe, expect, it } from 'vitest';
import { replay } from '../../../src/engine/replay.ts';
import { describePlay } from '../../../src/engine/words.ts';
import { battingCounts } from '../../../src/stats/batting.ts';
import { game, pa } from '../../helpers/game.ts';

const name = (k: string) => k;

describe('runner moves between pitches', () => {
  it('a stolen base moves the runner up, counts as SB, and reads as a steal', () => {
    const s = replay(game({}, [pa('1B'), { t: 'runner', from: 1, to: 2, how: 'SB' }]));
    expect(s.bases[1]?.player).toBe('p1');
    const last = s.plays.at(-1)!;
    expect(describePlay(last, name)).toBe('p1 steals second.');
    expect(battingCounts([game({}, [pa('1B'), { t: 'runner', from: 1, to: 2, how: 'SB' }])]).get('p1')?.SB).toBe(1);
  });

  it('stealing home scores the run with no RBI', () => {
    const s = replay(game({}, [pa('3B'), { t: 'runner', from: 3, to: 4, how: 'SB' }]));
    expect(s.score.away).toBe(1);
    const c = battingCounts([game({}, [pa('3B'), { t: 'runner', from: 3, to: 4, how: 'SB' }])]).get('p1')!;
    expect(c.R).toBe(1);
    expect(c.RBI).toBe(0);
  });

  it('caught stealing and a pickoff are outs; a wild pitch moves the runner', () => {
    const cs = replay(game({}, [pa('1B'), { t: 'runner', from: 1, to: 0, how: 'CS' }]));
    expect(cs.outs).toBe(1);
    expect(describePlay(cs.plays.at(-1)!, name)).toBe('p1 is caught stealing.');
    const po = replay(game({}, [pa('1B'), { t: 'runner', from: 1, to: 0, how: 'PO' }]));
    expect(describePlay(po.plays.at(-1)!, name)).toBe('p1 is picked off at first.');
    const wp = replay(game({}, [pa('2B'), { t: 'runner', from: 2, to: 3, how: 'WP' }]));
    expect(describePlay(wp.plays.at(-1)!, name)).toBe('p1 moves to third on a wild pitch.');
  });

  it('refuses a steal that goes nowhere and a pickoff that is safe', () => {
    expect(replay(game({}, [pa('1B'), { t: 'runner', from: 1, to: 0, how: 'SB' }])).issues).toHaveLength(1);
    expect(replay(game({}, [pa('1B'), { t: 'runner', from: 1, to: 2, how: 'PO' }])).issues).toHaveLength(1);
  });
});

describe('double play: which runner', () => {
  it('defaults to the lead forced runner, and takes the one picked', () => {
    const before = [pa('1B'), pa('1B')];
    const auto = replay(game({}, [...before, pa('DP')]));
    const picked = replay(game({}, [...before, pa('DP', { fcOut: 2 })]));
    expect(auto.outs).toBe(2);
    expect(picked.outs).toBe(2);
    // p1 is on second and p2 on first; picking the runner from second leaves p2 standing.
    expect(picked.bases.filter(Boolean).map((r) => r!.player)).toEqual(['p2']);
    expect(auto.bases.filter(Boolean).map((r) => r!.player)).not.toEqual(picked.bases.filter(Boolean).map((r) => r!.player));
  });
});

describe('rule switches for running between pitches', () => {
  it('missing and off are the same rule set', async () => {
    const { sameRules } = await import('../../../src/engine/rules.ts');
    const { rules } = await import('../../helpers/game.ts');
    const a = rules();
    expect(sameRules(a, { ...a, stealing: false, wildPitchAdvance: false, leftEarlyOut: false })).toBe(true);
    expect(sameRules(a, { ...a, stealing: true })).toBe(false);
  });

  it('leaving early is an out with its own words', () => {
    const s = replay(game({}, [pa('1B'), { t: 'runner', from: 1, to: 0, how: 'LE' }]));
    expect(s.outs).toBe(1);
    expect(describePlay(s.plays.at(-1)!, name)).toBe('p1 is out for leaving early.');
  });
});
