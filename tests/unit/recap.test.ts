import { describe, expect, it } from 'vitest';
import { dayLine, lineScoreText, recapOf, recapText } from '../../src/share/recap.ts';
import { emptyCounts } from '../../src/stats/batting.ts';
import { newTeam, type SavedGame } from '../../src/store/model.ts';
import { game, pa, threeOuts } from '../helpers/game.ts';

describe('the recap', () => {
  it('a player’s day: hits for at-bats, extra-base hits, RBI, runs, walks', () => {
    expect(dayLine({ ...emptyCounts(), AB: 4, H: 3, '2B': 1, HR: 1, RBI: 4, R: 2, BB: 1 })).toBe('3-for-4, 2B, HR, 4 RBI, 2 R, BB');
  });

  it('a game in progress: the inning, the line score, the MVP, and Discord text under 2,000 characters', () => {
    const base = game({ us: 'away' }, [pa('1B'), pa('HR'), ...threeOuts().slice(0, 1)]);
    const g: SavedGame = { ...base, seasonId: null, date: '2026-11-12', opponent: 'Horsetooth Hackers', opponentAbbr: 'LAK', park: 'Fossil Creek Park #1', saved: false };
    const t = newTeam('t', 'Diamond Dogs');
    t.abbr = 'DOGS';
    t.players = base.setup.lineups.us.map((s, n) => ({ id: s.player, name: `Player ${n + 1}`, number: '', positions: [] }));
    const r = recapOf(g, t);
    expect(r.final).toBe(false);
    expect(r.status).toBe('Top 1st');
    expect(r.us.r).toBe(2);
    expect(r.stars[0]?.name).toBe('Player 2');
    expect(r.stars[0]?.line).toBe('1-for-1, HR, 2 RBI, 1 R');
    expect(lineScoreText(r)).toContain('DOGS');
    const text = recapText(r, 'Thu, Nov 12');
    expect(text).toContain('**Diamond Dogs 2, Horsetooth Hackers 0** · Top 1st');
    expect(text).toContain('🏆 Game MVP: Player 2');
    expect(text.length).toBeLessThan(2000);
  });
});
