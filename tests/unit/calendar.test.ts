/* Add to Calendar (Steve, Nov 24): a standard calendar file the iPhone's Calendar opens. */
import { describe, expect, it } from 'vitest';
import { calendarFile, gameTitle } from '../../src/share/calendar.ts';
import type { ScheduledGame } from '../../src/store/model.ts';

const game = (o: Partial<ScheduledGame>): ScheduledGame => ({ id: 'g1', seasonId: 's', date: '2026-11-29', time: '18:30', opponent: 'Poudre River Rats', park: 'Rolland Moore Park #3', side: 'home', ...o });
const NOW = Date.UTC(2026, 10, 24, 17, 5, 9);

describe('calendar file', () => {
  it('one event per game, the park’s wall-clock time, 75 minutes long, with a stable id', () => {
    const text = calendarFile('Diamond Dogs', [game({}), game({ id: 'g2', date: '2026-12-31', time: '23:00', side: 'away', opponent: 'Hackers' })], NOW);
    expect(text.endsWith('\r\n')).toBe(true);
    expect(text.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    const lines = text.replace(/\r\n /g, '').split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines.filter((l) => l === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(lines).toContain('UID:g1@scorekept');
    expect(lines).toContain('DTSTAMP:20261124T170509Z');
    expect(lines).toContain('DTSTART:20261129T183000');
    expect(lines).toContain('DTEND:20261129T194500');
    expect(lines).toContain('SUMMARY:Diamond Dogs vs Poudre River Rats');
    expect(lines).toContain('LOCATION:Rolland Moore Park #3');
    // Past midnight, the end rolls into the new year; away games say "at".
    expect(lines).toContain('DTEND:20270101T001500');
    expect(lines).toContain('SUMMARY:Diamond Dogs at Hackers');
  });

  it('a game with no time yet is an all-day entry; commas, semicolons, and long names are written safely', () => {
    const long = 'The Very Long Named Fort Collins Recreation Softball Opponents, Tuesdays; Division B';
    const text = calendarFile('Dogs', [game({ time: '', park: 'Spring Canyon, Field 2', opponent: long })], NOW);
    const lines = text.replace(/\r\n /g, '').split('\r\n');
    expect(lines).toContain('DTSTART;VALUE=DATE:20261129');
    expect(lines).toContain('DTEND;VALUE=DATE:20261130');
    expect(lines).toContain('LOCATION:Spring Canyon\\, Field 2');
    expect(lines).toContain(`SUMMARY:Dogs vs ${long.replace(/,/g, '\\,').replace(/;/g, '\\;')}`);
    expect(gameTitle('Dogs', game({ side: null }))).toBe('Dogs vs Poudre River Rats');
  });
});
