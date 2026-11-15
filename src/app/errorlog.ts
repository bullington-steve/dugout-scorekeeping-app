/*
 * The error log (beta, Nov 15). When something goes wrong in the app (a script error or a promise
 * nobody caught), a short line is kept on this iPhone: when, what, and which file. Send Feedback
 * can add the recent ones to the note, so a tester's "it froze" comes with what actually broke.
 * Nothing is sent anywhere; the scorekeeper sees the lines and chooses to paste them.
 *
 * Kept small and plain: the last 20, each message cut to 200 characters, no names or scores, and
 * stored under its own key so a full or broken log can never touch the season.
 */

export const ERROR_LOG_KEY = 'scorekept:errors';
const KEEP = 20;
const MAX = 200;

export interface LoggedError {
  /** When, in ms. */
  at: number;
  message: string;
  /** The file and line it came from, without the web address ("screen-abc123.js:12"). */
  where?: string;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readErrors(kv: Store): LoggedError[] {
  try {
    const list = JSON.parse(kv.getItem(ERROR_LOG_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? (list.filter((e) => e && typeof e.message === 'string' && typeof e.at === 'number') as LoggedError[]) : [];
  } catch {
    return [];
  }
}

/** "screen-abc123.js:12" from a stack line or a file address. */
export function shortWhere(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const m = /([\w.-]+\.(?:js|ts|mjs))(?::(\d+))?/.exec(text);
  return m ? (m[2] ? `${m[1]}:${m[2]}` : m[1]) : undefined;
}

export function logError(kv: Store, message: string, where: string | undefined, now: number): void {
  try {
    const list = readErrors(kv);
    const msg = message.replace(/\s+/g, ' ').trim().slice(0, MAX) || 'Unknown error';
    const last = list[list.length - 1];
    // The same error over and over (a loop) counts once.
    if (last && last.message === msg && last.where === where && now - last.at < 5000) return;
    list.push({ at: now, message: msg, ...(where ? { where } : {}) });
    kv.setItem(ERROR_LOG_KEY, JSON.stringify(list.slice(-KEEP)));
  } catch {
    // A full or locked storage: the log is never worth an error of its own.
  }
}

export function clearErrors(kv: Store): void {
  try {
    kv.removeItem(ERROR_LOG_KEY);
  } catch {
    /* nothing to do */
  }
}

/** The lines Send Feedback adds, newest last, with the date and time from the iPhone's own format. */
export function errorLines(list: readonly LoggedError[], format: (at: number) => string): string[] {
  return list.map((e) => `${format(e.at)}: ${e.message}${e.where ? ` (${e.where})` : ''}`);
}

/** Listen for errors for the life of the page. */
export function watchErrors(win: Window, kv: Store, now: () => number = () => Date.now()): void {
  win.addEventListener('error', (e) => {
    const err = e.error as Error | undefined;
    logError(kv, err?.message ?? e.message ?? 'Error', shortWhere(err?.stack?.split('\n')[1]) ?? shortWhere(e.filename ? `${e.filename}:${e.lineno}` : undefined), now());
  });
  win.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as unknown;
    const message = r instanceof Error ? r.message : typeof r === 'string' ? r : 'A task failed';
    logError(kv, message, r instanceof Error ? shortWhere(r.stack?.split('\n')[1]) : undefined, now());
  });
}
