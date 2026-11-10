import { describe, expect, it } from 'vitest';
import { shareFile } from '../../../src/store/share.ts';

describe('sharing a backup', () => {
  it('shares the file alone: no title, no text (LESSONS 8)', async () => {
    const calls: ShareData[] = [];
    const nav = { canShare: () => true, share: async (d: ShareData) => void calls.push(d) };
    expect(await shareFile('scorekept-backup-2026-10-29.json', '{}', nav)).toBe('shared');
    expect(Object.keys(calls[0]!)).toEqual(['files']);
    expect(calls[0]!.files![0]!.name).toBe('scorekept-backup-2026-10-29.json');
  });

  it('cancelling the share sheet is not an error', async () => {
    const nav = { canShare: () => true, share: () => Promise.reject(new DOMException('no', 'AbortError')) };
    expect(await shareFile('b.json', '{}', nav, () => {})).toBe('cancelled');
  });

  it('downloads when files can’t be shared', async () => {
    const got: string[] = [];
    expect(await shareFile('b.json', '{}', {}, (f) => got.push(f.name))).toBe('downloaded');
    expect(got).toEqual(['b.json']);
  });
});
