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
