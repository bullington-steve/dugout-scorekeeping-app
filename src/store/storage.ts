/*
 * Saving and loading, built so a season can't be lost (docs/SPEC.md §16,
 * docs/LESSONS.md 1, 2, 31, 32):
 *
 * - One document under one key that never changes with the app's name.
 * - Data that can't be read is quarantined under its own key, never
 *   overwritten, and the app starts fresh with a way back (Restore).
 * - Data from a NEWER version of the app is never overwritten: the store
 *   goes read-only until the app updates.
 * - Older data is migrated step by step; the copy before migrating is kept.
 * - A failed save is reported (the screen shows a loud red banner).
 */
import { emptyData, SCHEMA_VERSION, type AppData } from './model.ts';

export const STORE_KEY = 'scorekept:data';
export const PREMIGRATION_KEY = 'scorekept:data:before-migration';
export const QUARANTINE_PREFIX = 'scorekept:quarantine:';

/** The bits of localStorage the store uses (so tests can pass a fake). */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

export type LoadStatus =
  /** Nothing saved yet. */
  | 'new'
  | 'ok'
  | 'migrated'
  /** Couldn't read what was saved; it was set aside and the app starts fresh. */
  | 'quarantined'
  /** Saved by a newer version of the app; read-only until this one updates. */
  | 'newer';

export interface LoadResult {
  data: AppData;
  status: LoadStatus;
  quarantineKey?: string;
  problem?: string;
}

export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] turns schema n into n + 1. Never remove one (LESSONS 32). */
export const MIGRATIONS: Record<number, Migration> = {};

export interface StoreOptions {
  now?: () => number;
  /** For tests: pretend the app is at another schema with other migrations. */
  schemaVersion?: number;
  migrations?: Record<number, Migration>;
}

export class Store {
  private readonly kv: KV;
  private readOnly = false;
  private readonly now: () => number;
  private readonly schema: number;
  private readonly migrations: Record<number, Migration>;

  constructor(kv: KV, opts: StoreOptions = {}) {
    this.kv = kv;
    this.now = opts.now ?? (() => Date.now());
    this.schema = opts.schemaVersion ?? SCHEMA_VERSION;
    this.migrations = opts.migrations ?? MIGRATIONS;
  }

  load(): LoadResult {
    let raw: string | null;
    try {
      raw = this.kv.getItem(STORE_KEY);
    } catch (e) {
      return { data: emptyData(), status: 'quarantined', problem: `storage unavailable: ${String(e)}` };
    }
    if (raw === null) return { data: emptyData(), status: 'new' };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.quarantine(raw, 'not valid JSON');
    }
    if (!isRecord(parsed) || typeof parsed.schemaVersion !== 'number') {
      return this.quarantine(raw, 'no schema version');
    }
    if (parsed.schemaVersion > this.schema) {
      this.readOnly = true;
      const problem = `saved by a newer version (schema ${parsed.schemaVersion})`;
      const data = looksLikeData(parsed) ? withDefaults(parsed) : emptyData();
      return { data, status: 'newer', problem };
    }

    let doc: Record<string, unknown> = parsed;
    let migrated = false;
    try {
      while ((doc.schemaVersion as number) < this.schema) {
        const step = this.migrations[doc.schemaVersion as number];
        if (!step) throw new Error(`no migration from ${String(doc.schemaVersion)}`);
        doc = step(doc);
        migrated = true;
      }
    } catch (e) {
      return this.quarantine(raw, `migration failed: ${String(e)}`);
    }
    const problem = validate(doc);
    if (problem) return this.quarantine(raw, problem);

    const data = withDefaults(doc);
    if (migrated) {
      try {
        this.kv.setItem(PREMIGRATION_KEY, raw);
      } catch {
        // Keeping the old copy is a bonus; the migrated data is still good.
      }
      const saved = this.save(data);
      if (!saved.ok) return { data, status: 'migrated', problem: `migrated but not saved: ${saved.error}` };
    }
    return { data, status: migrated ? 'migrated' : 'ok' };
  }

  save(data: AppData): SaveResult {
    if (this.readOnly) return { ok: false, error: 'readonly' };
    let text: string;
    try {
      text = JSON.stringify({ ...data, schemaVersion: this.schema });
    } catch (e) {
      return { ok: false, error: 'unknown', detail: String(e) };
    }
    try {
      this.kv.setItem(STORE_KEY, text);
    } catch (e) {
      const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      return { ok: false, error: quota ? 'full' : 'unknown', detail: String(e) };
    }
    // Read it back: a save only counts if it's really there.
    try {
      if (this.kv.getItem(STORE_KEY) !== text) return { ok: false, error: 'unknown', detail: 'read-back mismatch' };
    } catch (e) {
      return { ok: false, error: 'unknown', detail: String(e) };
    }
    return { ok: true };
  }

  get isReadOnly(): boolean {
    return this.readOnly;
  }

  /** Every quarantined copy, oldest first (for Backup & Restore to offer them). */
  quarantined(): { key: string; at: number; size: number }[] {
    const out: { key: string; at: number; size: number }[] = [];
    for (let i = 0; i < this.kv.length; i++) {
      const key = this.kv.key(i);
      if (!key?.startsWith(QUARANTINE_PREFIX)) continue;
      out.push({ key, at: Number(key.slice(QUARANTINE_PREFIX.length)), size: this.kv.getItem(key)?.length ?? 0 });
    }
    return out.sort((a, b) => a.at - b.at);
  }

  private quarantine(raw: string, problem: string): LoadResult {
    let key = `${QUARANTINE_PREFIX}${this.now()}`;
    while (this.kv.getItem(key) !== null) key += '-';
    try {
      this.kv.setItem(key, raw);
      // Only once the copy is safe does the main key make way for fresh data.
      this.kv.removeItem(STORE_KEY);
    } catch {
      // Couldn't copy it aside: leave it where it is and never write over it.
      this.readOnly = true;
      return { data: emptyData(), status: 'quarantined', problem: `${problem}; could not set it aside` };
    }
    return { data: emptyData(), status: 'quarantined', quarantineKey: key, problem };
  }
}

export type SaveResult = { ok: true } | { ok: false; error: 'full' | 'readonly' | 'unknown'; detail?: string };

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function looksLikeData(x: Record<string, unknown>): boolean {
  return Array.isArray(x.teams);
}

/** The minimum a document must have to be trusted. Returns a problem, or null. */
export function validate(doc: Record<string, unknown>): string | null {
  if (!Array.isArray(doc.teams)) return 'teams missing';
  for (const t of doc.teams) {
    if (!isRecord(t) || typeof t.id !== 'string' || typeof t.name !== 'string') return 'a team is damaged';
    if (!Array.isArray(t.players) || !Array.isArray(t.games)) return `team ${t.name} is damaged`;
    for (const g of t.games) {
      if (!isRecord(g) || typeof g.id !== 'string' || !Array.isArray(g.events) || !isRecord(g.setup))
        return `a game in ${t.name} is damaged`;
    }
  }
  return null;
}

/** Fill anything missing with defaults, so older documents load with defaults (SPEC §16). */
export function withDefaults(doc: Record<string, unknown>): AppData {
  const base = emptyData();
  const merged = { ...base, ...doc } as AppData;
  merged.defaults = { ...base.defaults, ...(isRecord(doc.defaults) ? doc.defaults : {}) } as AppData['defaults'];
  merged.prefs = { ...base.prefs, ...(isRecord(doc.prefs) ? doc.prefs : {}) } as AppData['prefs'];
  merged.teams = merged.teams.map((t) =>
    Object.assign(
      {
        abbr: '',
        colors: { primary: 'navy', secondary: 'red' },
        seasons: [],
        currentSeasonId: null,
        currentGameId: null,
        schedule: [],
      },
      t,
    ),
  );
  return merged;
}

/**
 * Ask the browser to keep this site's data even when space runs low.
 * Home Screen apps are already exempt from Safari's 7-day clearing (LESSONS 2).
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
