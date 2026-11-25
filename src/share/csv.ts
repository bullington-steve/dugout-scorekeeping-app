/*
 * CSV export (Steve, Nov 25): season batting and the games list as spreadsheet files that open in
 * Numbers, Excel, or Google Sheets. Made on this iPhone from what was scored; nothing goes online.
 */
import { battingRates, type BattingCounts } from '../stats/batting.ts';

/** One field: quoted when it holds a comma, quote, or line break (RFC 4180). */
function field(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Rows to CSV text, with a byte-order mark so Excel reads names like “Bodø” correctly. */
export function csv(rows: (string | number)[][]): string {
  return `﻿${rows.map((r) => r.map(field).join(',')).join('\r\n')}\r\n`;
}

const rate = (v: number | null) => (v === null ? '' : v.toFixed(3));

export interface BattingRow {
  name: string;
  number: string;
  c: BattingCounts;
}

/** Season batting: one row per batter, counts then rates, sorted by name. */
export function battingCsv(rows: readonly BattingRow[]): string {
  const head = ['Player', 'No.', 'G', 'PA', 'AB', 'R', 'H', '1B', '2B', '3B', 'HR', 'RBI', 'BB', 'K', 'SF', 'AVG', 'OBP', 'SLG', 'OPS'];
  const body = [...rows]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, number, c }) => {
      const r = battingRates(c);
      return [name, number, c.G, c.PA, c.AB, c.R, c.H, c['1B'], c['2B'], c['3B'], c.HR, c.RBI, c.BB, c.K, c.SF, rate(r.AVG), rate(r.OBP), rate(r.SLG), rate(r.OPS)];
    });
  return csv([head, ...body]);
}

export interface GameRow {
  date: string;
  opponent: string;
  side: 'Home' | 'Away';
  park: string;
  result: string;
  runsFor: number;
  runsAgainst: number;
}

/** The games list: date (YYYY-MM-DD, so spreadsheets sort it), opponent, side, park, result, score. */
export function gamesCsv(rows: readonly GameRow[]): string {
  const head = ['Date', 'Opponent', 'Home or Away', 'Park', 'Result', 'Runs For', 'Runs Against'];
  return csv([head, ...[...rows].sort((a, b) => a.date.localeCompare(b.date)).map((g) => [g.date, g.opponent, g.side, g.park, g.result, g.runsFor, g.runsAgainst])]);
}
