import { describe, expect, it } from 'vitest';
import { clearErrors, ERROR_LOG_KEY, errorLines, logError, readErrors, shortWhere } from '../../src/app/errorlog.ts';
import { MemoryKV } from '../helpers/kv.ts';

describe('the error log for Send Feedback', () => {
  it('keeps when, what, and which file, without the web address', () => {
    const kv = new MemoryKV();
    logError(kv, 'Cannot read properties of undefined', shortWhere('at draw (https://example.github.io/app/assets/screen-abc123.js:12:40)'), 1000);
    expect(readErrors(kv)).toEqual([{ at: 1000, message: 'Cannot read properties of undefined', where: 'screen-abc123.js:12' }]);
    expect(errorLines(readErrors(kv), () => 'Sat 6:30 PM')).toEqual(['Sat 6:30 PM: Cannot read properties of undefined (screen-abc123.js:12)']);
  });

  it('keeps the last 20, cuts long messages, and counts a repeating error once', () => {
    const kv = new MemoryKV();
    for (let i = 0; i < 25; i++) logError(kv, `problem ${i}`, undefined, i * 10_000);
    const list = readErrors(kv);
    expect(list).toHaveLength(20);
    expect(list[0]!.message).toBe('problem 5');
    logError(kv, 'x'.repeat(500), undefined, 1e9);
    logError(kv, 'x'.repeat(500), undefined, 1e9 + 100);
    expect(readErrors(kv)).toHaveLength(20);
    expect(readErrors(kv).at(-1)!.message).toHaveLength(200);
  });

  it('a broken or full log never throws, and Clear empties it', () => {
    const kv = new MemoryKV();
    kv.setItem(ERROR_LOG_KEY, '{nope');
    expect(readErrors(kv)).toEqual([]);
    kv.limit = 0;
    expect(() => logError(kv, 'full', undefined, 1)).not.toThrow();
    kv.limit = Infinity;
    logError(kv, 'one', undefined, 1);
    clearErrors(kv);
    expect(readErrors(kv)).toEqual([]);
  });
});
