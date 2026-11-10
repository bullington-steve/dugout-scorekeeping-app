/*
 * Song files (walk-ups, own game sounds) live in IndexedDB, not
 * localStorage: a single song can be several megabytes. See SPEC §13, §16.
 */

export interface SoundFile {
  id: string;
  name: string;
  /** "audio/mpeg", "audio/mp4", "audio/wav". */
  type: string;
  bytes: Uint8Array;
}

const DB_NAME = 'scorekept-sounds';
const STORE = 'files';

function open(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(idb: IDBFactory, mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open(idb).then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = work(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? req.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error ?? new Error('aborted'));
        };
      }),
  );
}

export class SoundStore {
  private readonly idb: IDBFactory;
  constructor(idb: IDBFactory = indexedDB) {
    this.idb = idb;
  }
  put(file: SoundFile): Promise<IDBValidKey> {
    return run(this.idb, 'readwrite', (s) => s.put({ ...file }));
  }
  get(id: string): Promise<SoundFile | undefined> {
    return run(this.idb, 'readonly', (s) => s.get(id) as IDBRequest<SoundFile | undefined>);
  }
  all(): Promise<SoundFile[]> {
    return run(this.idb, 'readonly', (s) => s.getAll() as IDBRequest<SoundFile[]>);
  }
  delete(id: string): Promise<undefined> {
    return run(this.idb, 'readwrite', (s) => s.delete(id));
  }
  async replaceAll(files: SoundFile[]): Promise<void> {
    await run(this.idb, 'readwrite', (s) => s.clear());
    for (const f of files) await this.put(f);
  }
}

// ---- base64 for backups (each song adds about a third of its size) ---------------

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
