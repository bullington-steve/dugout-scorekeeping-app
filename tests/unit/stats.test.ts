import { describe, expect, it } from 'vitest';
import type { GameEvent, GameRecord } from '../../src/engine/index.ts';
import {
  battingCounts,
  battingRates,
  contactRates,
  direction,
  fieldingCounts,
  fieldingPct,
  lineupHistory,
  playingTime,
  playingTimeMark,
  recordText,
  sprayDots,
  teamLeaders,
  teamRecord,
} from '../../src/stats/index.ts';
import { game, pa, quietInning, threeOuts } from '../helpers/game.ts';

let n = 0;
const g = (events: GameEvent[], extra: Partial<GameRecord> = {}, setup: Partial<GameRecord['setup']> = {}): GameRecord => ({
  ...game(setup, events),
  id: `g${++n}`,
  ...extra,
});

describe('batting rules (SPEC §7)', () => {
  it('FC is an at-bat with no hit; HRO is an at-bat left out of BABIP; FBO is not a strikeout', () => {
    const c = battingCounts([g([pa('1B'), pa('FC', { fcOut: 1 }), pa('HRO')])]);
    expect(c.get('p2')).toMatchObject({ AB: 1, H: 0, PA: 1 });
    expect(c.get('p3')).toMatchObject({ AB: 1, HRO: 1, K: 0 });
    expect(battingRates(c.get('p3')!).BABIP).toBeNull();
    const f = battingCounts([g([pa('FBO')])]);
    expect(f.get('p1')).toMatchObject({ AB: 1, FBO: 1, K: 0 });
    const k = battingCounts([g([pa('K'), pa('KL')])]);
    expect([k.get('p1')?.K, k.get('p2')?.K]).toEqual([1, 1]);
  });

  it('OBP counts sac flies; SLG and OPS add up', () => {
    const c = battingCounts([g([pa('3B'), pa('SF'), pa('HR'), pa('BB')])]).get('p2')!;
    expect(c).toMatchObject({ PA: 1, AB: 0, SF: 1, RBI: 1 });
    const r = battingRates(c);
    expect(r.OBP).toBe(0);
    expect(r.AVG).toBeNull();
    const hr = battingRates(battingCounts([g([pa('HR'), pa('BB'), pa('1B')])]).get('p1')!);
    expect([hr.AVG, hr.OBP, hr.SLG, hr.OPS]).toEqual([1, 1, 4, 5]);
  });

  it('a courtesy runner’s runs count for the courtesy runner', () => {
    const c = battingCounts([g([pa('2B'), { t: 'courtesy', base: 2, player: 'p9' }, pa('1B', { adv: { 2: 4 } })])]);
    expect(c.get('p9')?.R).toBe(1);
    expect(c.get('p1')?.R).toBe(0);
    expect(c.get('p2')?.RBI).toBe(1);
  });

  it('average with runners in scoring position', () => {
    const c = battingCounts([g([pa('2B'), pa('1B'), pa('GO'), pa('BB')])]);
    expect(c.get('p2')).toMatchObject({ rispAB: 1, rispH: 1 });
    expect(c.get('p3')).toMatchObject({ rispAB: 1, rispH: 0 });
  });

  it('pull and opposite field depend on the batting side; LCF and RCF count toward a side', () => {
    expect(direction(6, 'R')).toBe('pull');
    expect(direction(6, 'L')).toBe('oppo');
    expect(direction(11, 'L')).toBe('pull');
    expect(direction(10, 'R')).toBe('pull');
    expect(direction(12, 'R')).toBe('center');
    expect(direction(1, 'S')).toBe('center');
    const c = battingCounts([g([pa('GO', { fielder: 6 }), pa('F', { fielder: 8 })])]).get('p1')!;
    expect(contactRates(c).ground).toBe(1);
  });

  it('opponent hitters aren’t in our team’s stats', () => {
    const c = battingCounts([g([...threeOuts(), pa('HR')])]);
    expect([...c.keys()].some((k) => k.startsWith('T'))).toBe(false);
  });
});

describe('record and leaders', () => {
  it('W–L with ties', () => {
    const win = g([pa('HR'), { t: 'end' }]);
    const loss = g([...threeOuts(), pa('HR'), { t: 'end' }]);
    const tie = g([{ t: 'end' }]);
    const live = g([pa('1B')]);
    const r = teamRecord([win, loss, tie, live]);
    expect(r).toEqual({ w: 1, l: 1, t: 1 });
    expect(recordText(r)).toBe('1–1–1');
    expect(recordText({ w: 7, l: 3, t: 0 })).toBe('7–3');
  });

  it('runs leader shares ties', () => {
    const l = teamLeaders([g([pa('HR'), pa('HR')])]);
    expect(l.R).toEqual({ players: ['p1', 'p2'], value: 1 });
  });
});

describe('fielding and playing time (Defense card)', () => {
  // We bat first (away), so they bat in the bottom: our defensive innings.
  const card = [
    { p1: 6, p2: 4, p3: 'sit' },
    undefined, // inning 2 copies inning 1
    { p1: 4, p2: 'sit', p3: 6 },
  ] as GameRecord['defense'];
  const events = [
    ...threeOuts(),
    pa('GO', { fielder: 6 }),
    pa('E', { fielder: 4 }),
    pa('F', { fielder: 4 }),
    pa('L', { fielder: 6 }),
    ...threeOuts(),
    pa('GO', { fielder: 6 }),
    pa('GO', { fielder: 6 }),
    pa('GO', { fielder: 6 }),
    ...threeOuts(),
    pa('P', { fielder: 6 }),
    pa('P', { fielder: 4 }),
    pa('K'),
  ];
  const one = g(events, { defense: card, present: ['p1', 'p2', 'p3', 'p11'] });

  it('credit follows the card inning by inning', () => {
    const f = fieldingCounts([one]);
    expect(f.get('p1')).toEqual({ innings: { 6: 2, 4: 1 }, plays: 6, errors: 0 });
    expect(f.get('p2')).toEqual({ innings: { 4: 2 }, plays: 1, errors: 1 });
    expect(f.get('p3')).toEqual({ innings: { 6: 1 }, plays: 1, errors: 0 });
    expect(fieldingPct(f.get('p2')!)).toBe(0.5);
  });

  it('playing time counts only innings they batted, split among players who came', () => {
    const pt = playingTime([one]);
    // 3 defensive innings with 2 fielders each = 6 field innings; 13 attendees (lineup of 10 plus p11).
    expect(pt.get('p1')).toMatchObject({ games: 1, fieldInnings: 3 });
    expect(pt.get('p1')!.fairShare).toBeCloseTo(6 / 11);
    expect(playingTimeMark(pt.get('p1')!)).toBe('over');
    expect(playingTimeMark(pt.get('p4')!)).toBe('under');
  });

  it('an absent player gets no fair share for that game', () => {
    const other = g(quietInning(), { present: ['p1'] }, { lineups: { us: [{ player: 'p1', pos: 1 }], them: [] } });
    const pt = playingTime([other]);
    expect(pt.get('p2')).toBeUndefined();
    expect(pt.get('p1')).toEqual({ games: 1, fieldInnings: 1, fairShare: 1 });
  });

  it('the bottom of the last inning that was never played doesn’t count', () => {
    const home = g([...threeOuts(), pa('HR'), pa('GO'), pa('GO'), pa('GO'), ...Array.from({ length: 5 }, quietInning).flat(), ...threeOuts()], {}, { us: 'home', lineups: { us: [{ player: 'p1', pos: 6 }], them: [] } });
    expect(playingTime([home]).get('p1')?.fieldInnings).toBe(7);
  });

  it('Lineups history shows spot, moves, and subs', () => {
    const h = lineupHistory([g([...threeOuts(), { t: 'sub', team: 'us', slot: 2, player: 'p12' }], { defense: card })]);
    expect(h.get('p1')?.get(`g${n}`)).toEqual({ spot: 1, positions: [6], sub: false });
    expect(h.get('p12')?.get(`g${n}`)).toEqual({ spot: 3, positions: [], sub: true });
  });

  it('spray dots only for balls with a spot on the field', () => {
    const dots = sprayDots([g([pa('1B', { loc: { x: -80, y: 200, type: 'line' } }), pa('GO', { fielder: 6 }), pa('F', { loc: { x: 10, y: 250 } })])], 'us');
    expect(dots.map((d) => d.kind)).toEqual(['1B', 'out']);
    expect(sprayDots([g([pa('1B', { loc: { x: 0, y: 100 } })])], 'us', 'outs')).toEqual([]);
  });
});
