import { describe, expect, it } from 'vitest';
import { spreadMarks } from '../../src/ui/stats/spray.ts';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('spray marks never hide each other (Steve, Nov 26)', () => {
  it('two balls at the same spot fan out at least one mark apart, around that spot', () => {
    const [a, b] = spreadMarks([{ x: 40, y: 200 }, { x: 40, y: 200 }], 18);
    expect(dist(a!, b!)).toBeGreaterThanOrEqual(18 - 1e-9);
    expect((a!.x + b!.x) / 2).toBeCloseTo(40);
    expect((a!.y + b!.y) / 2).toBeCloseTo(200);
  });

  it('a pile of five all show, each one mark from its neighbours', () => {
    const out = spreadMarks(Array.from({ length: 5 }, () => ({ x: -60, y: 150 })), 18);
    for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) expect(dist(out[i]!, out[j]!)).toBeGreaterThanOrEqual(18 - 1e-9);
  });

  it('balls already apart stay exactly where they were hit (must-fail check: no needless moving)', () => {
    const locs = [{ x: 0, y: 100 }, { x: 50, y: 250 }, { x: -80, y: 180 }];
    expect(spreadMarks(locs, 18)).toEqual(locs);
  });

  it('a near miss (closer than a mark) counts as on top', () => {
    const [a, b] = spreadMarks([{ x: 10, y: 120 }, { x: 14, y: 123 }], 18);
    expect(dist(a!, b!)).toBeGreaterThanOrEqual(18 - 1e-9);
  });
});
