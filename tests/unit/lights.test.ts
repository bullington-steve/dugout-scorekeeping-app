import { describe, expect, it } from 'vitest';
import { isNightGame, sunsetMs } from '../../src/ui/lights.ts';

/** Minutes past midnight in Fort Collins' own time (MDT in June, MST in December). */
function localMinutes(ms: number, offsetHours: number): number {
  const d = new Date(ms + offsetHours * 3_600_000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

describe('Fort Collins sunset', () => {
  it('8:34 p.m. on June 21 and 4:36 p.m. on December 21, within a few minutes', () => {
    expect(Math.abs(localMinutes(sunsetMs(new Date(2026, 5, 21)), -6) - (20 * 60 + 34))).toBeLessThanOrEqual(4);
    expect(Math.abs(localMinutes(sunsetMs(new Date(2026, 11, 21)), -7) - (16 * 60 + 36))).toBeLessThanOrEqual(4);
  });

  it('a 9 p.m. summer game is a night game; a 6:30 p.m. summer game isn’t', () => {
    const june = (h: number, m: number) => Date.UTC(2026, 5, 21, h + 6, m);
    expect(isNightGame(june(21, 0))).toBe(true);
    expect(isNightGame(june(18, 30))).toBe(false);
  });
});
