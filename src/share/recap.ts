/*
 * The recap of a game (SPEC §15): what the Recap picture and the shared text
 * say. Pure: everything comes from the scored plays; nothing is generated.
 */
import { replay, type GameState } from '../engine/replay.ts';
import { battingCounts, type BattingCounts } from '../stats/batting.ts';
import type { SavedGame, Team } from '../store/model.ts';

export interface RecapStar {
  player: string;
  name: string;
  /** "3-for-4, HR, 4 RBI". */
  line: string;
}

export interface RecapLine {
  abbr: string;
  name: string;
  innings: (number | null)[];
  r: number;
  h: number;
  e: number;
}

export interface Recap {
  final: boolean;
  /** W, L, T, or null in progress. */
  result: 'W' | 'L' | 'T' | null;
  /** "Final", "Final, 5 innings, time", or "Top 4th". */
  status: string;
  date: string;
  park: string;
  us: RecapLine;
  them: RecapLine;
  /** Away first, as a line score is written. */
  lines: [RecapLine, RecapLine];
  innings: number;
  stars: RecapStar[];
  box: RecapStar[];
}

const ORD = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;

/** A player's line for the day: "3-for-4, 2B, HR, 4 RBI, 2 R, BB". */
export function dayLine(c: BattingCounts): string {
  const parts = [`${c.H}-for-${c.AB}`];
  for (const [k, label] of [
    ['2B', '2B'],
    ['3B', '3B'],
    ['HR', 'HR'],
  ] as const)
    if (c[k]) parts.push(c[k] > 1 ? `${c[k]} ${label}` : label);
  if (c.RBI) parts.push(`${c.RBI} RBI`);
  if (c.R) parts.push(`${c.R} R`);
  if (c.BB) parts.push(c.BB > 1 ? `${c.BB} BB` : 'BB');
  return parts.join(', ');
}

/** Stars of the Game: ranked by total bases, then RBI, runs, and walks. */
function rank(a: BattingCounts, b: BattingCounts): number {
  return b.TB - a.TB || b.RBI - a.RBI || b.R - a.R || b.BB - a.BB;
}

export function recapOf(game: SavedGame, team: Team, s: GameState = replay(game)): Recap {
  const us = game.setup.us;
  const them = us === 'away' ? 'home' : 'away';
  const innings = Math.max(s.line.away.length, s.line.home.length, 1);
  const lineFor = (side: 'away' | 'home', abbr: string, name: string): RecapLine => ({
    abbr,
    name,
    innings: Array.from({ length: innings }, (_, i) => s.line[side][i] ?? null),
    r: s.score[side],
    h: s.hits[side],
    e: s.errors[side],
  });
  const ours = lineFor(us, team.abbr || team.name.slice(0, 4).toUpperCase(), team.name);
  const theirs = lineFor(them, game.opponentAbbr || game.opponent.slice(0, 3).toUpperCase(), game.opponent);
  const result = s.final ? (s.final.winner === null ? 'T' : s.final.winner === us ? 'W' : 'L') : null;
  const name = (id: string) => team.players.find((p) => p.id === id)?.name ?? id;
  const counts = battingCounts([game]);
  const box = [...counts.entries()]
    .filter(([id, c]) => c.PA > 0 && team.players.some((p) => p.id === id))
    .sort((a, b) => rank(a[1], b[1]))
    .map(([player, c]) => ({ player, name: name(player), line: dayLine(c), c }));
  const stars = box.filter((x) => x.c.TB + x.c.RBI + x.c.R + x.c.BB > 0).slice(0, 3);
  const half = s.half === 'top' ? 'Top' : 'Bottom';
  return {
    final: !!s.final,
    result,
    status: s.final ? (innings !== game.setup.rules.innings ? `Final, ${innings} innings` : 'Final') : `${half} ${ORD(s.inning)}`,
    date: game.date,
    park: game.park,
    us: ours,
    them: theirs,
    lines: us === 'away' ? [ours, theirs] : [theirs, ours],
    innings,
    stars: stars.map(({ player, name, line }) => ({ player, name, line })),
    box: box.map(({ player, name, line }) => ({ player, name, line })),
  };
}

/** The line score as fixed-width text, for a code block. */
export function lineScoreText(r: Recap): string {
  const w = Math.max(...r.lines.map((l) => l.abbr.length), 4);
  const cell = (v: string | number | null, n = 2) => String(v ?? '').padStart(n);
  const head = `${''.padEnd(w)} ${r.lines[0].innings.map((_, i) => cell(i + 1)).join(' ')} ${cell('R', 3)} ${cell('H', 3)} ${cell('E', 3)}`;
  const row = (l: RecapLine) => `${l.abbr.padEnd(w)} ${l.innings.map((v) => cell(v ?? (r.final ? 'x' : ''))).join(' ')} ${cell(l.r, 3)} ${cell(l.h, 3)} ${cell(l.e, 3)}`;
  return [head, row(r.lines[0]), row(r.lines[1])].join('\n');
}

/**
 * The text to share, Discord-formatted: the final in bold, the line score in
 * a code block, the Game MVP first, then the box score. Under 2,000
 * characters (Discord's limit).
 */
export function recapText(r: Recap, when: string): string {
  const score = `${r.us.name} ${r.us.r}, ${r.them.name} ${r.them.r}`;
  const head = r.final ? `**${r.status.toUpperCase()}: ${score}**${r.result === 'W' ? ' (W)' : r.result === 'L' ? ' (L)' : ' (T)'}` : `**${score}** · ${r.status}`;
  const lines = [head, [when, r.park].filter(Boolean).join(' · '), '```', lineScoreText(r), '```'];
  if (r.stars[0]) lines.push(`🏆 Game MVP: ${r.stars[0].name}, ${r.stars[0].line}`);
  if (r.stars.length > 1) lines.push(`Stars: ${r.stars.slice(1).map((s) => `${s.name}, ${s.line}`).join('; ')}`);
  const box = r.box.map((b) => `${b.name}: ${b.line}`);
  let text = lines.join('\n');
  if (box.length) {
    text += '\n\n**Box score**\n';
    for (const b of box) {
      if (text.length + b.length + 1 > 1950) break;
      text += `${b}\n`;
    }
  }
  return text.trim();
}
