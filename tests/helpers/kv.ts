/* An in-memory stand-in for localStorage, with an optional size limit. */
import type { KV } from '../../src/store/storage.ts';

export class MemoryKV implements KV {
  map = new Map<string, string>();
  limit = Infinity;
  failReads = false;
  getItem(k: string): string | null {
    if (this.failReads) throw new Error('storage unavailable');
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    let size = v.length;
    for (const [key, val] of this.map) if (key !== k) size += val.length;
    if (size > this.limit) throw new DOMException('full', 'QuotaExceededError');
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }
  get length(): number {
    return this.map.size;
  }
}
