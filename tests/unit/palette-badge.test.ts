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

import { fitPennant, MARK_GROUNDS, markOutline } from '../../src/ui/teammark.ts';
import { teamColor } from '../../src/ui/palette.ts';
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
  it('every pennant and patch outline reaches 3:1 on every background, for all 18 × 18 color pairs (Steve, Nov 17)', () => {
    const problems: string[] = [];
    for (const p of PALETTE_NAMES) for (const s of PALETTE_NAMES) for (const [ground, colors] of Object.entries(MARK_GROUNDS)) {
      const edge = markOutline(s, ground as keyof typeof MARK_GROUNDS);
      for (const g of colors) if (contrastRatio(edge, g) < 3) problems.push(`${p}/${s} on ${ground} ${g}: ${contrastRatio(edge, g).toFixed(2)}`);
    }
    expect(problems).toEqual([]);
    // The secondary is used whenever it stands out on its own: red on the cream page, gold on the night.
    expect(markOutline('red', 'day')).toBe(teamColor('red'));
    expect(markOutline('gold', 'night')).toBe(teamColor('gold'));
    // Otherwise cream on dark grounds, navy on the light page.
    expect(markOutline('forest green', 'board')).toBe('#f3efe4');
    expect(markOutline('white', 'day')).toBe('#1b2a4a');
  });
});
