import { describe, expect, it } from 'vitest';
import {
  addToOrder,
  autoFill,
  countLine,
  duplicatePositions,
  firstOpenPosition,
  grouped,
  openInfield,
  orderCheck,
  sameAsLastGame,
  strongBats,
  suggestOrder,
  takenPositions,
  type OrderInput,
} from '../../src/game/lineup.ts';
import type { Player } from '../../src/store/model.ts';

const P = (id: string, positions: Player['positions'], extra: Partial<Player> = {}): Player => ({ id, name: id, number: '', positions, ...extra });
const none = () => ({ ops: null, avg: null });

describe('lineup builder rules', () => {
  it('groups like a video-game roster, best hitters first', () => {
    const ops: Record<string, number> = { a: 0.5, b: 0.9 };
    const g = grouped([P('p', [1]), P('c', [2]), P('a', [6]), P('b', [4]), P('o', [10]), P('x', [])], (id) => ({ ops: ops[id] ?? null, avg: null }));
    expect(g.get('Pitchers')!.map((p) => p.id)).toEqual(['p']);
    expect(g.get('Infield')!.map((p) => p.id)).toEqual(['b', 'a']);
    expect(g.get('Outfield')!.map((p) => p.id)).toEqual(['o']);
    expect(g.get('Bats Only')!.map((p) => p.id)).toEqual(['x']);
  });

  it('each player gets their first open position; only EH repeats', () => {
    let order = addToOrder([], P('a', [6, 4]));
    order = addToOrder(order, P('b', [6, 4]));
    order = addToOrder(order, P('c', [6]));
    expect(order.map((s) => s.pos)).toEqual([6, 4, 'EH']);
    expect([...takenPositions(order)]).toEqual([6, 4]);
    expect(firstOpenPosition(undefined, new Set())).toBe('EH');
    expect(duplicatePositions([{ player: 'a', pos: 6 }, { player: 'b', pos: 6 }, { player: 'c', pos: 'EH' }, { player: 'd', pos: 'EH' }])).toEqual([6]);
  });

  it('open infield spots and the count line', () => {
    const order = [
      { player: 'a', pos: 1 as const },
      { player: 'b', pos: 7 as const },
      { player: 'c', pos: 10 as const },
      { player: 'd', pos: 11 as const },
      { player: 'e', pos: 9 as const },
      { player: 'f', pos: 'EH' as const },
    ];
    expect(openInfield(order)).toEqual([2, 3, 4, 5, 6]);
    expect(countLine(order)).toBe('Batting 6 · In the field 5 (4 outfielders) · 1 EH');
  });

  it('Same as Last Game skips anyone not here; Auto-Fill adds everyone else', () => {
    const last = [{ player: 'a', pos: 6 as const }, { player: 'b', pos: 4 as const }, { player: 'c', pos: 2 as const }];
    expect(sameAsLastGame(last, new Set(['a', 'c']))).toEqual([{ player: 'a', pos: 6 }, { player: 'c', pos: 2 }]);
    const here = [P('c', [2]), P('a', [6]), P('d', [6, 3])];
    expect(autoFill(last, here)).toEqual([{ player: 'a', pos: 6 }, { player: 'c', pos: 2 }, { player: 'd', pos: 3 }]);
  });

  it('strong bats: ★4–5, or the top third by OPS when unrated', () => {
    const ops: Record<string, number> = { a: 0.9, b: 0.8, c: 0.4, d: 0.3, e: 0.2, f: 0.1 };
    const players = [P('a', []), P('b', []), P('c', []), P('d', []), P('e', []), P('f', []), P('r', [], { rating: 5 })];
    expect([...strongBats(players, (id) => ({ ops: ops[id] ?? null, avg: null }))].sort()).toEqual(['a', 'b', 'r']);
  });

  it('Suggest Order: a strong bat every third slot, sides alternating, the wrap checked', () => {
    const input: OrderInput[] = [
      { id: 's1', strong: true, side: 'R' },
      { id: 's2', strong: true, side: 'L' },
      { id: 's3', strong: true, side: 'R' },
      { id: 'l1', strong: false, side: 'L' },
      { id: 'r1', strong: false, side: 'R' },
      { id: 'l2', strong: false, side: 'L' },
      { id: 'r2', strong: false, side: 'R' },
      { id: 'l3', strong: false, side: 'L' },
      { id: 'x', strong: false, side: 'S' },
    ];
    const order = suggestOrder(input);
    expect(order).toHaveLength(9);
    expect([order[0], order[3], order[6]]).toEqual(['s1', 's2', 's3']);
    const byId = new Map(input.map((x) => [x.id, x]));
    expect(orderCheck(order.map((id) => byId.get(id)!))).toEqual([]);
  });

  it('five righties in nine can’t all be split up, and the check says so', () => {
    const order: OrderInput[] = ['R', 'R', 'R', 'R', 'R', 'L', 'L', 'L', 'S'].map((side, i) => ({ id: `p${i}`, strong: i % 3 === 0, side: side as 'R' | 'L' | 'S' }));
    const byId = new Map(order.map((x) => [x.id, x]));
    const suggested = suggestOrder(order).map((id) => byId.get(id)!);
    expect(orderCheck(suggested).some((p) => p.includes('back to back'))).toBe(true);
  });

  it('the order check explains what can’t be met', () => {
    const order: OrderInput[] = Array.from({ length: 11 }, (_, i) => ({ id: `p${i}`, strong: i < 3, side: 'R' }));
    const problems = orderCheck(order);
    expect(problems[0]).toBe('3 strong bats for 11 spots; it takes 4.');
    expect(problems).toContain('Right-handed batters back to back at 1st and 2nd.');
  });

  it('the order check notices a long gap without a strong bat, around the wrap', () => {
    const order: OrderInput[] = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, strong: i === 0 || i === 1, side: undefined }));
    expect(orderCheck(order)).toEqual(['4 batters in a row without a strong bat, after 2nd.']);
  });
});
