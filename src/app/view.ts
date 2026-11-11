/*
 * What the Game screen shows, worked out from the game and its state.
 * Plain data, no DOM, so it's tested without a browser.
 */
import { hrLeft, type GameState } from '../engine/replay.ts';
import type { Result, Side, Team as BattingTeam } from '../engine/types.ts';
import { POSITION_ABBR } from '../engine/words.ts';
import { battingCounts, battingRates, defenseFor } from '../stats/index.ts';
import type { SavedGame, Team } from '../store/model.ts';

export interface TeamOnBoard {
  abbr: string;
  name: string;
  runs: number;
  us: boolean;
  /** HR-limit lamps: how many, and how many are lit (used). */
  hrLamps: number;
  hrUsed: number;
}

export interface BaseView {
  occupied: boolean;
  name: string;
  tiebreak: boolean;
}

export interface BoardView {
  away: TeamOnBoard;
  home: TeamOnBoard;
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  /** Minutes left ("38"), then "4:59" in the last five minutes, "LAST", or null without a time limit. */
  time: string | null;
  bases: [BaseView, BaseView, BaseView];
  count: { show: boolean; balls: number; strikes: number; ballLamps: number; strikeLamps: number };
  /** Broadcast-style top line. */
  top: { spot: string; name: string; pos: string; line: string };
  /** On Deck (with In the Hole for wider boards), or Due Up while we're in the field in Dugout Mode. */
  next: { label: string; spot: string; name: string; pos: string; line: string; hole: string };
  /** The words VoiceOver reads for the board. */
  spoken: string;
}

export type PadMode = 'pad' | 'quick' | 'final';

export interface PadView {
  mode: PadMode;
  /** Dimmed results and why. */
  dimmed: Partial<Record<Result, string>>;
  /** HRs left before the next is an out (Infinity with no limit). */
  hrLeft: number;
  countOn: boolean;
  batting: BattingTeam;
}

const SIDE_OF = (half: 'top' | 'bottom'): Side => (half === 'top' ? 'away' : 'home');

export function battingTeamOf(game: SavedGame, s: GameState): BattingTeam {
  return SIDE_OF(s.half) === game.setup.us ? 'us' : 'them';
}

/** ".267" style; 1.000 stays "1.000". */
export function avgText(v: number | null): string {
  if (v === null) return '.000';
  return v >= 1 ? v.toFixed(3) : v.toFixed(3).replace(/^0/, '');
}

export function boardView(team: Team, game: SavedGame, s: GameState, now: number): BoardView {
  const usSide = game.setup.us;
  const name = (id: string) => team.players.find((p) => p.id === id)?.name ?? id;
  const lamps = (side: Side) => {
    const r = game.setup.rules.hr;
    if (r.kind === 'unlimited') return { hrLamps: 0, hrUsed: 0 };
    const total = r.kind === 'perGame' ? r.max : r.gap;
    return { hrLamps: total, hrUsed: Math.max(0, total - hrLeft(s, game.setup.rules, side)) };
  };
  const teamOnBoard = (side: Side): TeamOnBoard => {
    const us = side === usSide;
    return {
      abbr: us ? team.abbr || team.name.slice(0, 4).toUpperCase() : game.opponentAbbr || 'OPP',
      name: us ? team.name : game.opponent,
      runs: s.score[side],
      us,
      ...lamps(side),
    };
  };

  const time = clockText(game, s, now);

  const batting = battingTeamOf(game, s);
  const order = s.lineups[batting];
  const slot = s.nextSlot[batting];
  const at = (n: number) => order[(slot + n) % Math.max(1, order.length)];
  const tracked = batting === 'us' || s.mode === 'scorekeeper';
  const defense = defenseFor(game, s.inning);

  // Season line: saved games this season plus today's.
  const season = team.games.filter((g) => g.saved && g.seasonId === game.seasonId && g.id !== game.id);
  const seasonCounts = battingCounts([...season, game]);
  const todayCounts = battingCounts([game]);
  const lineFor = (id: string): string => {
    const c = seasonCounts.get(id);
    const t = todayCounts.get(id);
    const parts = [`${avgText(c ? battingRates(c).AVG : null)} AVG`];
    if (t && t.AB > 0) parts.push(`${t.H}-FOR-${t.AB}`);
    if (t && t.RBI > 0) parts.push(`${t.RBI} RBI`);
    return parts.join(' · ');
  };

  const posOf = (id: string) => {
    const pos = defense[id];
    return pos === undefined || pos === 'sit' ? '' : pos === 'EH' ? 'EH' : POSITION_ABBR[pos];
  };
  const spotOf = (n: number) => String(((slot + n) % Math.max(1, order.length)) + 1);
  let top: BoardView['top'];
  let next: BoardView['next'];
  if (tracked && order.length) {
    const ours = batting === 'us';
    const cur = at(0)!;
    top = { spot: spotOf(0), name: ours ? name(cur.player) : cur.player, pos: ours ? posOf(cur.player) : '', line: ours ? lineFor(cur.player) : '' };
    const deck = at(1)!;
    const hole = at(2)!;
    next = {
      label: 'On Deck',
      spot: spotOf(1),
      name: ours ? name(deck.player) : deck.player,
      pos: ours ? posOf(deck.player) : '',
      line: ours ? lineFor(deck.player) : '',
      hole: order.length > 2 ? `${spotOf(2)}. ${ours ? name(hole.player) : hole.player}` : '',
    };
  } else {
    top = { spot: '', name: `${game.opponent} at Bat`, pos: '', line: '' };
    const ours = s.lineups.us;
    const n = s.nextSlot.us;
    const due = [0, 1, 2]
      .map((k) => (n + k) % Math.max(1, ours.length))
      .filter((i, k, all) => ours[i] && all.indexOf(i) === k)
      .map((i) => `${i + 1}. ${name(ours[i]!.player)}`);
    next = { label: 'Due Up', spot: '', name: due.join(' · '), pos: '', line: '', hole: '' };
  }
  if (s.final) {
    top = { spot: '', name: 'Final', pos: '', line: '' };
    next = { label: '', spot: '', name: '', pos: '', line: '', hole: '' };
  }

  const base = (i: 0 | 1 | 2): BaseView => {
    const r = s.bases[i];
    return { occupied: !!r, name: r ? (batting === 'us' ? name(r.player) : r.player) : '', tiebreak: !!r?.tb };
  };
  const c = game.setup.rules.count;
  const away = teamOnBoard('away');
  const home = teamOnBoard('home');
  const halfWord = s.half === 'top' ? 'Top' : 'Bottom';
  const spoken = s.final
    ? `Final. ${away.name} ${away.runs}, ${home.name} ${home.runs}.`
    : `${away.name} ${away.runs}, ${home.name} ${home.runs}. ${halfWord} of the ${ordinalWord(s.inning)}, ${s.outs} ${s.outs === 1 ? 'out' : 'outs'}.`;
  return {
    away,
    home,
    inning: s.inning,
    half: s.half,
    outs: Math.min(s.outs, 2),
    time,
    bases: [base(0), base(1), base(2)],
    count: {
      show: game.setup.count && tracked && !s.final,
      balls: s.count.balls,
      strikes: s.count.strikes,
      ballLamps: Math.max(1, c.walkAt - 1),
      strikeLamps: Math.max(1, c.outAt - 1),
    },
    top,
    next,
    spoken,
  };
}

/** When the clock starts showing seconds. */
export const SECONDS_FROM = 5 * 60;

/**
 * The board's clock: whole minutes left ("38", rounded up) until the last
 * five minutes, then minutes and seconds ("4:59"); "LAST" when time's up;
 * null without a time limit.
 */
export function clockText(game: SavedGame, s: GameState, now: number): string | null {
  if (game.setup.rules.timeLimit <= 0 || game.setup.startedAt === null) return null;
  const left = s.deadline - now;
  if (s.timeLast !== null || left <= 0) return 'LAST';
  const secs = Math.ceil(left / 1000);
  if (secs > SECONDS_FROM) return String(Math.ceil(secs / 60));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

export function padView(game: SavedGame, s: GameState): PadView {
  const batting = battingTeamOf(game, s);
  const tracked = batting === 'us' || s.mode === 'scorekeeper';
  const mode: PadMode = s.final ? 'final' : tracked ? 'pad' : 'quick';
  const on = s.bases.filter(Boolean).length;
  const dimmed: PadView['dimmed'] = {};
  if (!on) dimmed.FC = 'Needs a runner on base';
  if (!(s.bases[2] && s.outs < 2)) dimmed.SF = 'Needs a runner on third with fewer than two outs';
  if (!(on && s.outs < 2)) dimmed.DP = 'Needs a runner on base with fewer than two outs';
  if (!(on >= 2 && s.outs === 0)) dimmed.TP = 'Needs two runners on base and nobody out';
  if (game.setup.rules.hr.kind === 'unlimited') dimmed.HRO = 'This league has no home run limit';
  const side = SIDE_OF(s.half);
  return { mode, dimmed, hrLeft: hrLeft(s, game.setup.rules, side), countOn: game.setup.count, batting };
}


export function ordinalWord(n: number): string {
  const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
  if (n <= 10) return words[n - 1]!;
  const suffix = n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/** "Run rule. Diamond Dogs win 20–0." */
export function finalText(game: SavedGame, team: Team, s: GameState): { headline: string; score: string } {
  const f = s.final;
  if (!f) return { headline: '', score: '' };
  const us = game.setup.us;
  const them: Side = us === 'home' ? 'away' : 'home';
  const ours = s.score[us];
  const theirs = s.score[them];
  const why: Record<string, string> = {
    regulation: 'Final.',
    extra: 'Final in extra innings.',
    time: 'Time limit.',
    runRule: 'Run rule.',
    walkoff: 'Walk-off.',
    tie: 'Tie game.',
    ended: 'Game ended.',
  };
  const hi = Math.max(ours, theirs);
  const lo = Math.min(ours, theirs);
  const winner = f.winner === null ? null : f.winner === us ? team.name : game.opponent;
  const result = winner ? `${winner} win ${hi}–${lo}.` : `Tied ${ours}–${theirs}.`;
  return { headline: `${why[f.reason] ?? 'Final.'} ${result}`, score: `${ours}–${theirs}` };
}
