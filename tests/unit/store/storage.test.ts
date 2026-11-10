import { describe, expect, it } from 'vitest';
import {
  PREMIGRATION_KEY,
  QUARANTINE_PREFIX,
  SCHEMA_VERSION,
  STORE_KEY,
  Store,
  emptyData,
  newTeam,
  type AppData,
} from '../../../src/store/index.ts';
import { MemoryKV } from '../../helpers/kv.ts';

const withTeam = (): AppData => {
  const d = emptyData();
  d.teams.push(newTeam('t1', 'Diamond Dogs'));
  d.activeTeamId = 't1';
  return d;
};

describe('saving and loading', () => {
  it('starts new, saves, and loads the same data back', () => {
    const kv = new MemoryKV();
    const store = new Store(kv);
    expect(store.load().status).toBe('new');
    expect(store.save(withTeam())).toEqual({ ok: true });
    const again = new Store(kv).load();
    expect(again.status).toBe('ok');
    expect(again.data.teams[0]?.name).toBe('Diamond Dogs');
    expect(again.data.teams[0]?.abbr).toBe('DOG');
    expect(JSON.parse(kv.getItem(STORE_KEY)!).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('fills missing fields with defaults (older documents restore with defaults)', () => {
    const kv = new MemoryKV();
    kv.setItem(STORE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, teams: [{ id: 't', name: 'X', players: [], games: [] }] }));
    const { data, status } = new Store(kv).load();
    expect(status).toBe('ok');
    expect(data.defaults.ruleSetId).toBe('fc-2hr');
    expect(data.defaults.balls).toBe(false);
    expect(data.teams[0]?.schedule).toEqual([]);
  });

  it('reports a full device instead of failing quietly', () => {
    const kv = new MemoryKV();
    kv.limit = 100;
    const result = new Store(kv).save(withTeam());
    expect(result).toMatchObject({ ok: false, error: 'full' });
  });
});

describe('damaged data is quarantined, never overwritten', () => {
  it('sets unreadable data aside and starts fresh', () => {
    const kv = new MemoryKV();
    kv.setItem(STORE_KEY, '{"schemaVersion":1,"teams":[{"id":"t","na');
    const store = new Store(kv, { now: () => 1234 });
    const r = store.load();
    expect(r.status).toBe('quarantined');
    expect(r.quarantineKey).toBe(`${QUARANTINE_PREFIX}1234`);
    expect(kv.getItem(`${QUARANTINE_PREFIX}1234`)).toBe('{"schemaVersion":1,"teams":[{"id":"t","na');
    expect(kv.getItem(STORE_KEY)).toBeNull();
    expect(store.quarantined()).toEqual([{ key: `${QUARANTINE_PREFIX}1234`, at: 1234, size: 41 }]);
    // Saving new data never touches the quarantined copy.
    store.save(withTeam());
    expect(kv.getItem(`${QUARANTINE_PREFIX}1234`)).not.toBeNull();
  });

  it('quarantines a document with a damaged game', () => {
    const kv = new MemoryKV();
    kv.setItem(STORE_KEY, JSON.stringify({ schemaVersion: 1, teams: [{ id: 't', name: 'X', players: [], games: [{ id: 'g' }] }] }));
    expect(new Store(kv).load()).toMatchObject({ status: 'quarantined', problem: 'a game in X is damaged' });
  });

  it('two quarantines in the same millisecond keep both copies', () => {
    const kv = new MemoryKV();
    kv.setItem(STORE_KEY, 'bad one');
    new Store(kv, { now: () => 5 }).load();
    kv.setItem(STORE_KEY, 'bad two');
    new Store(kv, { now: () => 5 }).load();
    expect(new Store(kv).quarantined().map((q) => kv.getItem(q.key))).toEqual(['bad one', 'bad two']);
  });

  it('if the copy can’t be made, the original stays and nothing is written', () => {
    const kv = new MemoryKV();
    kv.setItem(STORE_KEY, 'x'.repeat(60));
    kv.limit = 100;
    const store = new Store(kv);
    expect(store.load().status).toBe('quarantined');
    expect(kv.getItem(STORE_KEY)).toBe('x'.repeat(60));
    expect(store.save(withTeam())).toMatchObject({ ok: false, error: 'readonly' });
  });
});

describe('versions', () => {
  it('data from a newer app is read but never overwritten', () => {
    const kv = new MemoryKV();
    const newer = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, teams: [], futureThing: true });
    kv.setItem(STORE_KEY, newer);
    const store = new Store(kv);
    expect(store.load().status).toBe('newer');
    expect(store.save(withTeam())).toMatchObject({ ok: false, error: 'readonly' });
    expect(kv.getItem(STORE_KEY)).toBe(newer);
  });

  it('migrates older data step by step and keeps the copy from before', () => {
    const kv = new MemoryKV();
    const old = JSON.stringify({ schemaVersion: 1, teams: [{ id: 't', name: 'Old', players: [], games: [] }] });
    kv.setItem(STORE_KEY, old);
    const store = new Store(kv, {
      schemaVersion: 3,
      migrations: {
        1: (d) => ({ ...d, schemaVersion: 2, step1: true }),
        2: (d) => ({ ...d, schemaVersion: 3, step2: true }),
      },
    });
    const r = store.load();
    expect(r.status).toBe('migrated');
    expect(r.data).toMatchObject({ step1: true, step2: true });
    expect(kv.getItem(PREMIGRATION_KEY)).toBe(old);
    expect(JSON.parse(kv.getItem(STORE_KEY)!).schemaVersion).toBe(3);
  });

  it('a missing migration quarantines instead of guessing', () => {
    const kv = new MemoryKV();
    kv.setItem(STORE_KEY, JSON.stringify({ schemaVersion: 1, teams: [] }));
    expect(new Store(kv, { schemaVersion: 2, migrations: {} }).load().status).toBe('quarantined');
  });

  it('storage that can’t be read at all starts fresh without writing', () => {
    const kv = new MemoryKV();
    kv.failReads = true;
    expect(new Store(kv).load().status).toBe('quarantined');
  });
});
