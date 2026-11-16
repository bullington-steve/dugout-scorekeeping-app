/*
 * Book codes and play-by-play sentences. Fixed wording written in advance;
 * nothing is generated (CLAUDE.md, Words).
 */
import type { Play } from './replay.ts';
import type { Pos, Result } from './types.ts';

export const POSITION_NAMES: Record<Pos, string> = {
  1: 'pitcher',
  2: 'catcher',
  3: 'first base',
  4: 'second base',
  5: 'third base',
  6: 'shortstop',
  7: 'left field',
  8: 'center field',
  9: 'right field',
  10: 'left-center field',
  11: 'right-center field',
  12: 'short field',
};

export const POSITION_ABBR: Record<Pos, string> = {
  1: 'P',
  2: 'C',
  3: '1B',
  4: '2B',
  5: '3B',
  6: 'SS',
  7: 'LF',
  8: 'CF',
  9: 'RF',
  10: 'LCF',
  11: 'RCF',
  12: 'SF',
};

/**
 * A result in plain words for the board's today line (Nov 14: codes like FBO5 belong in the Book):
 * hits keep the codes everyone reads (1B, 2B, 3B, HR) and strikeouts stay K; the rest are words.
 */
export const PLAIN_RESULT: Record<Result | 'TB', string> = {
  '1B': '1B',
  '2B': '2B',
  '3B': '3B',
  HR: 'HR',
  BB: 'Walk',
  E: 'Error',
  FC: 'Fld Choice',
  K: 'K',
  KL: 'K',
  GO: 'Grounder',
  F: 'Fly Out',
  L: 'Line Out',
  P: 'Pop Out',
  IF: 'Inf Fly',
  SF: 'Sac Fly',
  DP: 'Dbl Play',
  TP: 'Tpl Play',
  HRO: 'HR Out',
  FBO: 'Foul Out',
  TB: 'Tiebreak Runner',
};

/** The code a scorekeeper writes in the box: "6-3", "F8", "1B", "ꓘ". */
export function bookCode(p: Pick<Play, 'result' | 'fielder'>): string {
  const f = p.fielder;
  switch (p.result) {
    case '1B':
    case '2B':
    case '3B':
    case 'HR':
    case 'BB':
    case 'DP':
    case 'TP':
    case 'HRO':
      return p.result;
    case 'K':
      return 'K';
    case 'KL':
      return 'ꓘ'; // backwards K
    case 'E':
      return f ? `E${f}` : 'E';
    case 'FC':
      return f ? `FC${f}` : 'FC';
    case 'GO':
      if (!f) return 'GO';
      return f === 3 ? '3U' : `${f}-3`;
    case 'F':
    case 'L':
    case 'P':
      return f ? `${p.result}${f}` : p.result;
    case 'IF':
      return f ? `IF${f}` : 'IF';
    case 'SF':
      return f ? `SF${f}` : 'SF';
    case 'FBO':
      return f ? `FBO${f}` : 'FBO';
    default:
      return '';
  }
}

const VERB: Record<Result, string> = {
  '1B': 'singles',
  '2B': 'doubles',
  '3B': 'triples',
  HR: 'homers',
  BB: 'walks',
  E: 'reaches on an error',
  FC: 'reaches on a fielder’s choice',
  K: 'strikes out swinging',
  KL: 'strikes out looking',
  GO: 'grounds out',
  F: 'flies out',
  L: 'lines out',
  P: 'pops out',
  IF: 'is out on the infield fly rule',
  SF: 'hits a sacrifice fly',
  DP: 'grounds into a double play',
  TP: 'hits into a triple play',
  HRO: 'hits a home run over the limit, ruled an out',
  FBO: 'fouls out',
};

const TO: Partial<Record<Result, string>> = {
  '1B': 'to',
  '2B': 'to',
  '3B': 'to',
  HR: 'to',
  E: 'by the',
  GO: 'to',
  F: 'to',
  L: 'to',
  P: 'to',
  IF: 'to',
  SF: 'to',
  FBO: 'to',
};

/**
 * One line of play-by-play, as short as a scorekeeper would say it (Steve, Nov 16: no repeating
 * the RBI on every run): "Tasha Greer hits a grand slam to left-center field. Travis Pruitt Jr.,
 * Dev Raman, and Becca Lindqvist score." Runners who score share one sentence; the RBI is named
 * only when it isn't the batter's ("Dev Raman scores, no RBI." or "Dev Raman scores, RBI to Becca
 * Lindqvist."). A homer's own run is in the words "homers". `name` turns a player key into a name.
 */
export function describePlay(p: Play, name: (key: string) => string): string {
  const parts: string[] = [];
  if (p.t === 'pa' && p.result && p.batter) {
    let s = `${name(p.batter)} ${VERB[p.result]}`;
    if (p.result === 'HR') {
      // Solo homer, two-run homer, three-run homer, grand slam.
      const n = p.runs.filter((r) => r.player !== 'them').length;
      const kind = n >= 4 ? 'grand slam' : n >= 2 ? `${n === 2 ? 'two' : 'three'}-run ${p.ip ? 'inside-the-park home run' : 'homer'}` : p.ip ? 'inside-the-park home run' : '';
      if (p.ip && n >= 4) s = `${name(p.batter)} hits an inside-the-park grand slam`;
      else if (kind) s = `${name(p.batter)} hits a${kind.startsWith('i') ? 'n' : ''} ${kind}`;
    }
    if (p.result === 'BB' && p.bbTo === 2) s += ' to second';
    const to = TO[p.result];
    if (p.fielder && to) s += ` ${to} ${POSITION_NAMES[p.fielder]}`;
    parts.push(`${s}.`);
    for (const out of p.outsOn) if (out !== p.batter) parts.push(`${name(out)} is out.`);
  } else if (p.t === 'runner' && p.from) {
    const runner = p.basesBefore[p.from - 1];
    const toWord = p.to === 4 ? 'home' : p.to ? ordinal(p.to) : '';
    if (runner && p.how === 'SB') parts.push(`${name(runner)} steals ${toWord}.`);
    else if (runner && (p.how === 'WP' || p.how === 'PB') && p.to && p.to < 4) parts.push(`${name(runner)} moves to ${toWord} on a ${p.how === 'WP' ? 'wild pitch' : 'passed ball'}.`);
    else if (runner && (p.how === 'WP' || p.how === 'PB')) parts.push(`${p.how === 'WP' ? 'Wild pitch' : 'Passed ball'}.`);
    else if (runner && p.how === 'back' && p.to) parts.push(`${name(runner)} goes back to ${ordinal(p.to)}.`);
    else if (runner && p.how === 'LE') parts.push(`${name(runner)} is out for leaving early.`);
    else if (runner && p.how === 'CS') parts.push(`${name(runner)} is caught stealing.`);
    else if (runner && p.how === 'PO') parts.push(`${name(runner)} is picked off at ${ordinal(p.from)}.`);
    else if (runner && p.to === 0) parts.push(`${name(runner)} is out on the bases.`);
    else if (runner && p.to && p.to < 4) parts.push(`${name(runner)} moves to ${ordinal(p.to)}.`);
  } else if (p.t === 'courtesy' && p.from) {
    parts.push(`Courtesy runner at ${ordinal(p.from)}.`);
  } else if (p.t === 'quick') {
    const q = {
      run: 'They score a run.',
      out: 'Out.',
      hit: 'They get a hit.',
      error: 'Error on our defense.',
      hr: 'They hit a home run.',
    } as const;
    if (p.quick) parts.push(q[p.quick]);
  } else if (p.t === 'endHalf') {
    parts.push('Half-inning over.');
  } else if (p.t === 'end') {
    parts.push('Game over.');
  }
  // Who scored, grouped by how the RBI went. The batter's own run on a homer goes without saying.
  const batter = p.t === 'pa' ? p.batter : null;
  const groups = new Map<string, string[]>();
  for (const r of p.runs) {
    if (r.player === 'them') continue;
    if (p.result === 'HR' && r.player === batter) continue;
    const key = r.rbi && r.rbi === batter ? '' : r.rbi ? `to:${r.rbi}` : batter ? 'none' : '';
    groups.set(key, [...(groups.get(key) ?? []), name(r.player)]);
  }
  for (const [key, who] of groups) {
    const verb = who.length === 1 ? 'scores' : 'score';
    const why = key === 'none' ? ', no RBI' : key.startsWith('to:') ? `, RBI to ${name(key.slice(3))}` : '';
    parts.push(`${listOf(who)} ${verb}${why}.`);
  }
  return parts.join(' ');
}

/** "A", "A and B", "A, B, and C" (serial comma). */
function listOf(xs: readonly string[]): string {
  if (xs.length < 3) return xs.join(' and ');
  return `${xs.slice(0, -1).join(', ')}, and ${xs.at(-1)}`;
}

export function ordinal(n: number): string {
  return n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : 'home';
}
