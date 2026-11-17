import { describe, expect, it } from 'vitest';
import { PALETTE_NAMES, badgeColors, contrastRatio } from '../../src/ui/palette.ts';

describe('team badge contrast', () => {
  it('every pair of team colors gives badge lettering at least 4.5:1', () => {
    for (const p of PALETTE_NAMES) for (const s of PALETTE_NAMES) {
      const { bg, ink } = badgeColors(p, s);
      expect(contrastRatio(bg, ink), `${p} / ${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

import { fitPennant, paleColor } from '../../src/ui/teammark.ts';
describe('the felt pennant and the patch (Steve, Nov 17)', () => {
  // A stand-in for the athletic face: each letter about half its size wide.
  const measure = (t: string, size: number) => t.length * size * 0.5;
  it('fits the lettering to the felt, shrinking for longer names, and gives way to the patch under 12 points', () => {
    const four = fitPennant('DOGS', 96, 48, measure)!;
    const six = fitPennant('THUNDR', 96, 48, measure)!;
    expect(four.size).toBeGreaterThan(six.size);
    expect(six.size).toBeGreaterThanOrEqual(12);
    expect(fitPennant('THUNDR', 40, 20, measure)).toBeNull();
  });
  it('pale team colors get the navy edge by day', () => {
    for (const c of ['white', 'silver', 'columbia blue', 'yellow']) expect(paleColor(c), c).toBe(true);
    for (const c of ['navy', 'red', 'kelly green', 'black']) expect(paleColor(c), c).toBe(false);
  });
});
