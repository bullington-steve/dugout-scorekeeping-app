import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  SoundStore,
  backupFileName,
  base64ToBytes,
  bytesToBase64,
  emptyData,
  makeBackup,
  newTeam,
  readBackup,
  type SoundFile,
} from '../../../src/store/index.ts';
import { replay } from '../../../src/engine/index.ts';
import { game, pa } from '../../helpers/game.ts';

function seasonData() {
  const d = emptyData();
  const t = newTeam('t1', 'Diamond Dogs');
  t.players.push({ id: 'p1', name: 'Jess Kowalczyk', number: '12', positions: [6, 4], bats: 'R', birthday: '06-01' });
  const g = game({}, [pa('1B'), pa('HR')]);
  t.games.push({ ...g, seasonId: 's', date: '2026-10-17', opponent: 'Oak Hollow Sluggers', opponentAbbr: 'SLU', park: 'Rolland Moore Park #3', saved: true });
  d.teams.push(t);
  d.activeTeamId = 't1';
  return d;
}

describe('backups', () => {
  it('names the file scorekept-backup-YYYY-MM-DD.json in local time', () => {
    expect(backupFileName(new Date(2026, 9, 29, 23, 59))).toBe('scorekept-backup-2026-10-29.json');
  });

  it('round trip: everything comes back, including a 5 MB song', () => {
    const song = new Uint8Array(5 * 1024 * 1024);
    for (let i = 0; i < song.length; i++) song[i] = (i * 31 + 7) % 256;
    const sounds: SoundFile[] = [{ id: 'w1', name: 'Walk-Up.mp3', type: 'audio/mpeg', bytes: song }];
    const data = seasonData();
    const { name, text } = makeBackup(data, sounds, new Date(2026, 9, 29));
    expect(name).toBe('scorekept-backup-2026-10-29.json');
    // Each song adds about a third of its size: a 5 MB song makes a ~6.7 MB backup.
    expect(text.length / 1024 / 1024).toBeGreaterThan(6.6);
    expect(text.length / 1024 / 1024).toBeLessThan(6.8);

    const back = readBackup(text);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.source).toBe('backup');
    expect(back.data.teams).toEqual(data.teams);
    expect(back.data.lastBackup).toBe(new Date(2026, 9, 29).getTime());
    expect(back.sounds).toHaveLength(1);
    expect(back.sounds[0]!.bytes).toEqual(song);
    // The restored game replays to the same score.
    expect(replay(back.data.teams[0]!.games[0]!).score).toEqual({ away: 2, home: 0 });
  });

  it('never includes Discord links', () => {
    const data = seasonData() as ReturnType<typeof seasonData> & Record<string, unknown>;
    const { text } = makeBackup(data, [], new Date());
    expect(text).not.toMatch(/discord/i);
  });

  it('refuses things that aren’t backups, damaged backups, and backups from a newer app', () => {
    expect(readBackup('not json')).toEqual({ ok: false, why: 'not-json' });
    expect(readBackup('{"hello":1}')).toEqual({ ok: false, why: 'not-a-backup' });
    const { text } = makeBackup(seasonData(), [], new Date());
    const newer = JSON.parse(text);
    newer.schemaVersion = 999;
    expect(readBackup(JSON.stringify(newer))).toMatchObject({ ok: false, why: 'newer' });
    const damaged = JSON.parse(text);
    damaged.data.teams[0].games = 'oops';
    expect(readBackup(JSON.stringify(damaged))).toMatchObject({ ok: false, why: 'damaged' });
    const badSong = JSON.parse(makeBackup(seasonData(), [{ id: 'x', name: 'x', type: 'audio/mpeg', bytes: new Uint8Array([1]) }], new Date()).text);
    badSong.soundFiles[0].base64 = '***';
    expect(readBackup(JSON.stringify(badSong))).toMatchObject({ ok: false, why: 'damaged' });
  });

  it('a schema 1 backup from before Book names still restores, its teams on first names (Steve, Nov 16 rule)', () => {
    const { text } = makeBackup(seasonData(), [], new Date());
    const old = JSON.parse(text);
    old.schemaVersion = 1;
    old.data.schemaVersion = 1;
    delete old.data.teams[0].bookNames;
    delete old.data.teams[0].opponents;
    delete old.data.teams[0].games[0].opponentId;
    const r = readBackup(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.schemaVersion).toBe(4);
    expect(r.data.teams[0]!.bookNames).toBe('first');
    // …and its opponents became saved teams (schema 3).
    expect(r.data.teams[0]!.opponents.map((o) => o.name)).toEqual(['Oak Hollow Sluggers']);
    expect(r.data.teams[0]!.games[0]!.opponentId).toBe(r.data.teams[0]!.opponents[0]!.id);
    expect(replay(r.data.teams[0]!.games[0]!).score.home + replay(r.data.teams[0]!.games[0]!).score.away).toBeGreaterThan(0);
  });

  it('a schema 2 backup restores with its opponents saved as teams, two games against one opponent sharing it', () => {
    const d = seasonData();
    const t = d.teams[0]!;
    t.games.push({ ...structuredClone(t.games[0]!), id: 'g2', opponent: 'oak hollow  sluggers' });
    t.schedule.push({ id: 's1', seasonId: 's', date: '2026-10-24', time: '18:30', opponent: 'Horsetooth Hackers', park: '', side: null });
    const { text } = makeBackup(d, [], new Date());
    const old = JSON.parse(text);
    old.schemaVersion = 2;
    old.data.schemaVersion = 2;
    delete old.data.teams[0].opponents;
    for (const g of old.data.teams[0].games) delete g.opponentId;
    const r = readBackup(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const team = r.data.teams[0]!;
    expect(team.opponents.map((o) => o.name).sort()).toEqual(['Horsetooth Hackers', 'Oak Hollow Sluggers']);
    expect(team.games[0]!.opponentId).toBe(team.games[1]!.opponentId);
    expect(team.schedule[0]!.opponentId).toBe(team.opponents.find((o) => o.name === 'Horsetooth Hackers')!.id);
  });

  it('a schema 3 backup from before each team kept its own rules restores with every team on the old New Game Defaults (Steve, Nov 24)', () => {
    const d = seasonData();
    const second = newTeam('t2', 'Summer Dogs');
    d.teams.push(second);
    d.defaults.ruleSetId = 'basic';
    d.defaults.rules = { ...structuredClone(d.defaults.rules), innings: 9 };
    const { text } = makeBackup(d, [], new Date());
    const old = JSON.parse(text);
    old.schemaVersion = 3;
    old.data.schemaVersion = 3;
    for (const t of old.data.teams) delete t.league;
    const r = readBackup(JSON.stringify(old));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.schemaVersion).toBe(4);
    for (const t of r.data.teams) {
      expect(t.league.ruleSetId, t.name).toBe('basic');
      expect(t.league.rules.innings, t.name).toBe(9);
    }
    // Each team has its own copy: changing one leaves the other alone.
    r.data.teams[0]!.league.rules.innings = 5;
    expect(r.data.teams[1]!.league.rules.innings).toBe(9);
    // The games are untouched.
    expect(replay(r.data.teams[0]!.games[0]!).score).toEqual(replay(d.teams[0]!.games[0]!).score);
  });

  it('base64 survives every byte value', () => {
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(base64ToBytes(bytesToBase64(all))).toEqual(all);
  });
});

describe('song files in IndexedDB', () => {
  it('stores, lists, replaces, and deletes files', async () => {
    const store = new SoundStore();
    const a: SoundFile = { id: 'a', name: 'A.mp3', type: 'audio/mpeg', bytes: new Uint8Array([1, 2, 3]) };
    const b: SoundFile = { id: 'b', name: 'B.m4a', type: 'audio/mp4', bytes: new Uint8Array([4]) };
    await store.put(a);
    await store.put(b);
    expect((await store.get('a'))?.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect((await store.all()).map((f) => f.id).sort()).toEqual(['a', 'b']);
    await store.delete('a');
    expect(await store.get('a')).toBeUndefined();
    await store.replaceAll([a]);
    expect((await store.all()).map((f) => f.id)).toEqual(['a']);
  });

  it('a 5 MB song goes in and comes back out', async () => {
    const store = new SoundStore();
    const big = new Uint8Array(5 * 1024 * 1024).fill(9);
    await store.put({ id: 'big', name: 'Big.mp3', type: 'audio/mpeg', bytes: big });
    expect((await store.get('big'))?.bytes.length).toBe(big.length);
  });
});
