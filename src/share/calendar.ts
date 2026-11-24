/*
 * Add to Calendar (Steve, Nov 24): scheduled games as a standard calendar file (.ics, RFC 5545) that
 * the iPhone's Calendar opens. No account and no server: the file is made on this iPhone. Times are
 * "floating" (the wall-clock time at the park), which is what a rec league schedule means.
 */
import type { ScheduledGame } from '../store/model.ts';

/** How long a game holds the calendar when it has a start time. */
const GAME_MINUTES = 75;

const pad = (n: number) => String(n).padStart(2, '0');

/** Text inside a calendar field: backslash, semicolon, comma, and line breaks escaped. */
function esc(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 bytes continue on the next line after one space (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function utcStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** "Diamond Dogs vs Poudre River Rats" at home or not sure yet, "Diamond Dogs at Poudre River Rats" away. */
export function gameTitle(team: string, e: ScheduledGame): string {
  return `${team} ${e.side === 'away' ? 'at' : 'vs'} ${e.opponent}`;
}

/** One calendar file holding the given games. Each game keeps its id, so adding it again updates it. */
export function calendarFile(team: string, games: readonly ScheduledGame[], now: number): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ScoreKept//Schedule//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of games) {
    const [y, m, d] = e.date.split('-').map(Number) as [number, number, number];
    const day = `${y}${pad(m)}${pad(d)}`;
    lines.push('BEGIN:VEVENT', `UID:${e.id}@scorekept`, `DTSTAMP:${utcStamp(now)}`);
    if (/^\d{2}:\d{2}$/.test(e.time)) {
      const [hh, mm] = e.time.split(':').map(Number) as [number, number];
      const end = new Date(y, m - 1, d, hh, mm + GAME_MINUTES);
      lines.push(`DTSTART:${day}T${pad(hh)}${pad(mm)}00`, `DTEND:${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`);
    } else {
      // No time yet: an all-day entry on the date.
      const next = new Date(y, m - 1, d + 1);
      lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`);
    }
    lines.push(`SUMMARY:${esc(gameTitle(team, e))}`);
    if (e.park) lines.push(`LOCATION:${esc(e.park)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
