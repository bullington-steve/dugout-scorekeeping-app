import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { replay } from '../../../src/engine/index.ts';
import { readBackup } from '../../../src/store/index.ts';
import { battingCounts } from '../../../src/stats/index.ts';

const fixture = readFileSync(new URL('../../fixtures/v1-backup-made-up.json', import.meta.url), 'utf8');

describe('importing a first-version backup', () => {
  const r = readBackup(fixture);
  if (!r.ok) throw new Error('fixture did not import');
  const [team, second] = r.data.teams;

  it('recognizes the first version’s format', () => {
    expect(r.source).toBe('v1');
  });

  it('brings over the team, players, seasons, and both teams', () => {
    expect(team).toMatchObject({ name: 'Made-Up Mudcats', abbr: 'MUD', colors: { primary: 'navy', secondary: 'gold' } });
    expect(team!.players.find((p) => p.id === 'a1')).toEqual({
      id: 'a1',
      name: 'Ann',
      number: '7',
      positions: [6, 4],
      bats: 'R',
      walkup: { tune: 'bounce' },
    });
    expect(team!.players.find((p) => p.id === 'a2')?.positions).toEqual([7, 10, 11]);
    expect(team!.players.find((p) => p.id === 'a4')).toMatchObject({ bats: 'S', birthday: '04-12', gender: 'f', positions: [] });
    expect(team!.seasons).toEqual([{ id: 'fall', name: 'Fall 2026', start: '2026-10-01' }]);
    expect(team!.currentGameId).toBe('gA');
    expect(second).toMatchObject({ name: 'Second Squad', players: [{ id: 'b1', name: 'Ed', positions: [2] }] });
    expect(r.data.activeTeamId).toBe(team!.id);
  });

  it('replays a Dugout Mode game play for play', () => {
    const gA = team!.games.find((g) => g.id === 'gA')!;
    expect(gA).toMatchObject({ date: '2026-10-01', opponent: 'Imaginary Owls', opponentAbbr: 'OWL', park: 'Nowhere Field', saved: false, imported: 'v1' });
    expect(gA.setup).toMatchObject({ us: 'away', mode: 'dugout', count: false, hitLocation: true, startedAt: 1790000000000 });
    expect(gA.ruleSetId).toBe('fc-2hr');
    const s = replay(gA);
    expect(s.issues).toEqual([]);
    expect(s.score).toEqual({ away: 3, home: 2 });
    expect(s.line).toEqual({ away: [3, 0], home: [1, 1] });
    expect(s.hits).toEqual({ away: 4, home: 2 });
    expect(s.errors.away).toBe(1);
    expect([s.inning, s.half, s.final]).toEqual([3, 'top', null]);
    // The run on "Scored, RBI" goes to the batter of the play that just happened.
    expect(s.plays[2]?.runs[0]).toMatchObject({ player: 'a1', rbi: 'a2' });
    // FC "out: 1" is the runner from second.
    expect(s.plays[3]?.outsOn).toEqual(['a2']);
    // Hit locations keep the old field's numbers until the field is drawn.
    expect(s.plays[0]?.loc).toEqual({ x: 50, y: 90, v1: true, type: 'line' });
  });

  it('a Scorekeeper Mode game at home with an opponent order', () => {
    const gB = team!.games.find((g) => g.id === 'gB')!;
    expect(gB.setup.us).toBe('home');
    expect(gB.setup.lineups.them.map((x) => x.player)).toEqual(['Opp One', 'Opp Two']);
    expect(gB.setup.rules).toMatchObject({ hr: { kind: 'unlimited' }, extras: 'untilDecided', allowTie: false });
    expect(gB.setup.rules.count).toMatchObject({ startBalls: 1, startStrikes: 1, foulOut: false });
    expect(gB.ruleSetId).toBe('custom');
    const s = replay(gB);
    expect(s.issues).toEqual([]);
    expect(s.score).toEqual({ away: 0, home: 2 });
    expect(s.errors.away).toBe(1);
  });

  it('stats from imported games', () => {
    const c = battingCounts(team!.games);
    expect(c.get('a1')).toMatchObject({ G: 2, PA: 6, AB: 6, H: 3, R: 3, RBI: 2, TB: 8, ROE: 1 });
    expect(c.get('a2')).toMatchObject({ PA: 2, H: 1, RBI: 1, R: 0 });
    expect(c.get('a3')).toMatchObject({ PA: 2, AB: 2, H: 0, R: 1 });
    expect(c.get('zz')).toMatchObject({ PA: 2, HR: 1, RBI: 2, R: 1 });
  });

  it('reports what it couldn’t place instead of guessing', () => {
    const b = r.report!.games.find((g) => g.id === 'gB')!;
    expect(b.warnings).toEqual([
      'Walk-On was in the lineup but not on the roster; added to the roster',
      'play 6: unknown result "XX"; skipped',
      'play 7: unknown kind "mystery"; skipped',
      'saved to the season but not finished by the rules; kept as played',
    ]);
    expect(team!.players.find((p) => p.id === 'zz')?.name).toBe('Walk-On');
    expect(r.report!.games.find((g) => g.id === 'gA')).toMatchObject({ us: 3, them: 2, result: null, refused: [], warnings: [] });
  });

  it('keeps settings, song files, and anything unused, but never Discord links', () => {
    expect(r.data).toMatchObject({ onboarded: true, parks: ['Nowhere Field'], scorerName: 'Pat', lastBackup: 1790100000000, toursDone: { basics: true } });
    expect(r.data.prefs.sound).toBe(true);
    expect(r.data.defaults).toMatchObject({ mode: 'dugout', hitLocation: true, balls: false, ruleSetId: 'fc-2hr' });
    expect(r.sounds).toEqual([{ id: 's1', name: 'Walkup.mp3', type: 'audio/mpeg', bytes: new Uint8Array([0, 1, 2]) }]);
    expect(r.data.legacyV1).toMatchObject({ version: 2, playerExtras: { a1: { stars: 4 } } });
    expect(JSON.stringify(r.data)).not.toMatch(/discord|webhook/i);
    expect((r.data.legacyV1?.prefs as Record<string, unknown>).other).toEqual({ keep: 1 });
  });
});

/*
 * Steve's real backup never goes in the repo (it's public). To check it,
 * point SCOREKEPT_PRIVATE_BACKUP at the file; CI skips this.
 */
const privatePath = process.env.SCOREKEPT_PRIVATE_BACKUP;
describe.runIf(!!privatePath && existsSync(privatePath))('a real first-version backup (private, local only)', () => {
  it('imports with nothing refused or skipped', () => {
    const real = readBackup(readFileSync(privatePath!, 'utf8'));
    expect(real.ok).toBe(true);
    if (!real.ok) return;
    expect(real.report!.warnings).toEqual([]);
    for (const g of real.report!.games) {
      expect(g.refused, g.id).toEqual([]);
      expect(g.warnings, g.id).toEqual([]);
    }
  });
});
