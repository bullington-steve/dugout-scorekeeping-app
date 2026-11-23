import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { replay } from '../../../src/engine/index.ts';
import { makeBackup, readBackup } from '../../../src/store/index.ts';
import { bookBalance } from '../../../src/app/book.ts';
import { battingCounts } from '../../../src/stats/index.ts';
import { fixV1Spots, importV1 } from '../../../src/store/import-v1.ts';

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
    // Hit locations come over in the rebuild's field units (Nov 16): (50, 90) on the old field is
    // shallow left field here, and the line drive keeps its type.
    expect(s.plays[0]?.loc).toMatchObject({ type: 'line' });
    expect(s.plays[0]?.loc?.v1).toBeUndefined();
    expect(s.plays[0]!.loc!.x).toBeLessThan(0);
    expect(s.plays[0]!.loc!.y).toBeGreaterThan(Math.abs(s.plays[0]!.loc!.x));
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

describe('a real first-version backup (Oct 28, 2026, names replaced)', () => {
  // Steve's own file, sent Nov 15: one fall game, 13–23 to MGN, over by the run rule after the
  // top of the 5th. The names are swapped for Player A, B, C; every play is as he scored it.
  const file = JSON.parse(readFileSync(new URL('../../fixtures/v1-backup-real-game.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  it('imports every play, with the score, the line, and the box he kept', () => {
    const { data, report } = importV1(file);
    expect(report.games).toHaveLength(1);
    const g = report.games[0]!;
    expect([g.us, g.them, g.result, g.reason]).toEqual([13, 23, 'L', 'runRule']);
    expect(g.refused).toEqual([]);
    expect(report.warnings).toEqual([]);
    const game = data.teams[0]!.games[0]!;
    const s = replay(game);
    expect(s.line).toEqual({ away: [0, 0, 3, 10, 0], home: [10, 4, 4, 5] });
    const box = battingCounts([game]);
    const line = (id: string) => {
      const c = box.get(id)!;
      return [c.PA, c.AB, c.H, c.HR, c.R, c.RBI];
    };
    expect(line('novrsdc0')).toEqual([4, 4, 3, 1, 2, 5]); // the three-run homer
    expect(line('rtkeq802')).toEqual([3, 3, 3, 0, 2, 1]); // 3 for 3 with a double and a triple
    expect(line('bfd8swsf')).toEqual([3, 2, 1, 0, 1, 2]); // the sac fly
    let runs = 0;
    for (const c of box.values()) runs += c.R;
    expect(runs).toBe(13);
    expect(data.teams[0]!.seasons.map((x) => x.name)).toEqual(['Fall 2026']);
  });

  // Steve sent the same file again Nov 23 ("do whatever you need test-wise with it"): checked
  // against the real names on Nov 23, it differs from this copy only in names, the park, jersey
  // numbers, and walk-up songs, so every play here is his.
  it('balances like a proved paper book, and comes back the same from a new backup (Nov 23)', () => {
    const r = readBackup(JSON.stringify(file));
    if (!r.ok) throw new Error(r.why);
    expect(r.source).toBe('v1');
    expect(bookBalance(r.data.teams[0]!.games[0]!)).toEqual([]);
    const again = readBackup(makeBackup(r.data, r.sounds, new Date('2026-11-23T12:00:00')).text);
    if (!again.ok) throw new Error(again.why);
    expect({ ...again.data, lastBackup: 0 }).toEqual({ ...r.data, lastBackup: 0 });
  });
});

describe('first-version ball spots (Steve, Nov 16: every hit drew in foul ground)', () => {
  const real = JSON.parse(readFileSync('tests/fixtures/v1-backup-real-game.json', 'utf8'));
  const spots = (data: ReturnType<typeof importV1>['data']) =>
    data.teams.flatMap((t) => t.games.flatMap((g) => g.events.filter((e) => e.t === 'pa' && e.loc).map((e) => e as Extract<typeof e, { t: 'pa' }>)));

  it('every imported hit lands in fair territory, in the rebuild’s units, with no first-version flag left', () => {
    const { data } = importV1(real);
    const balls = spots(data);
    expect(balls.length).toBe(14);
    for (const b of balls) {
      expect(b.loc!.v1).toBeUndefined();
      if (['1B', '2B', '3B', 'HR'].includes(b.result)) {
        // Fair ground is between the foul lines: |x| no more than y.
        expect(Math.abs(b.loc!.x), `${b.result} at ${b.loc!.x},${b.loc!.y}`).toBeLessThanOrEqual(b.loc!.y);
      }
    }
    // The left fielder's singles are in left field; the homer is past the fence.
    const lf = balls.find((b) => b.result === '1B' && b.fielder === 7)!;
    expect(lf.loc!.x).toBeLessThan(0);
    const hr = balls.find((b) => b.result === 'HR')!;
    expect(Math.hypot(hr.loc!.x, hr.loc!.y)).toBeGreaterThan(275);
  });

  it('saved games imported before the fix are converted when they load, and only once', () => {
    const { data } = importV1(real);
    // Put the old, unconverted spots back, the way they were saved before Nov 16.
    const raw = real.games[0].events.filter((e: { t: string; loc?: number[] }) => e.t === 'pa' && e.loc);
    const balls = spots(data);
    balls.forEach((b, i) => (b.loc = { x: raw[i].loc[0], y: raw[i].loc[1], v1: true, ...(b.loc!.type ? { type: b.loc!.type } : {}) }));
    const once = fixV1Spots(structuredClone(data));
    const twice = fixV1Spots(structuredClone(once));
    expect(spots(once).map((b) => b.loc)).toEqual(spots(twice).map((b) => b.loc));
    expect(spots(once).map((b) => b.loc)).toEqual(spots(importV1(real).data).map((b) => b.loc));
  });
});
