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
