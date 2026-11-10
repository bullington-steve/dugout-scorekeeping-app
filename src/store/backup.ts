/*
 * Backup files: one JSON file with everything, including song files as
 * base64. Discord links are never in it (they're stored separately).
 * Restore reads this format and the first version's backups.
 * See docs/SPEC.md §16 and LESSONS 8 (share the file alone, no title).
 */
import { APP_VERSION } from '../version.ts';
import { importV1, isV1Backup, type ImportReport } from './import-v1.ts';
import { SCHEMA_VERSION, type AppData } from './model.ts';
import { base64ToBytes, bytesToBase64, type SoundFile } from './sounds.ts';
import { validate, withDefaults } from './storage.ts';

export const BACKUP_FORMAT = 'scorekept-backup';

interface BackupFile {
  format: typeof BACKUP_FORMAT;
  /** Bump if the wrapper itself changes. */
  backupVersion: 1;
  schemaVersion: number;
  appVersion: string;
  savedAt: number;
  data: AppData;
  soundFiles: { id: string; name: string; type: string; base64: string }[];
}

/** "scorekept-backup-2026-10-29.json", in local time. */
export function backupFileName(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `scorekept-backup-${y}-${m}-${d}.json`;
}

export function makeBackup(data: AppData, sounds: readonly SoundFile[], now: Date): { name: string; text: string } {
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    backupVersion: 1,
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    savedAt: now.getTime(),
    data: { ...data, lastBackup: now.getTime() },
    soundFiles: sounds.map((s) => ({ id: s.id, name: s.name, type: s.type, base64: bytesToBase64(s.bytes) })),
  };
  return { name: backupFileName(now), text: JSON.stringify(file) };
}

export type ReadResult =
  | { ok: true; data: AppData; sounds: SoundFile[]; source: 'backup' | 'v1'; report?: ImportReport }
  | { ok: false; why: 'not-json' | 'not-a-backup' | 'newer' | 'damaged'; detail?: string };

/** Read any ScoreKept backup: this version's, or the first version's. */
export function readBackup(text: string): ReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, why: 'not-json' };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ok: false, why: 'not-a-backup' };
  const obj = parsed as Record<string, unknown>;

  if (obj.format === BACKUP_FORMAT) {
    const file = obj as unknown as BackupFile;
    if (typeof file.schemaVersion !== 'number' || file.schemaVersion > SCHEMA_VERSION)
      return { ok: false, why: 'newer', detail: `schema ${String(file.schemaVersion)}` };
    if (typeof file.data !== 'object' || file.data === null) return { ok: false, why: 'damaged' };
    const problem = validate(file.data as unknown as Record<string, unknown>);
    if (problem) return { ok: false, why: 'damaged', detail: problem };
    let sounds: SoundFile[];
    try {
      sounds = (file.soundFiles ?? []).map((s) => ({ id: s.id, name: s.name, type: s.type, bytes: base64ToBytes(s.base64) }));
    } catch {
      return { ok: false, why: 'damaged', detail: 'a song file is damaged' };
    }
    const data = withDefaults(file.data as unknown as Record<string, unknown>);
    return { ok: true, data, sounds, source: 'backup' };
  }

  if (isV1Backup(obj)) {
    const result = importV1(obj);
    return { ok: true, data: result.data, sounds: result.sounds, source: 'v1', report: result.report };
  }
  return { ok: false, why: 'not-a-backup' };
}
