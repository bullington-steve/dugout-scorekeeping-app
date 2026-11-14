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
 * One line of play-by-play: "Jess Kowalczyk singles to left field. Jordan
 * scores. RBI: Casey." `name` turns a player key into a display name.
 */
export function describePlay(p: Play, name: (key: string) => string): string {
  const parts: string[] = [];
  if (p.t === 'pa' && p.result && p.batter) {
    let s = `${name(p.batter)} ${VERB[p.result]}`;
    if (p.result === 'HR' && p.ip) s = `${name(p.batter)} hits an inside-the-park home run`;
    if (p.result === 'BB' && p.bbTo === 2) s += ' to second';
    const to = TO[p.result];
    if (p.fielder && to) s += ` ${to} ${POSITION_NAMES[p.fielder]}`;
    parts.push(`${s}.`);
    for (const out of p.outsOn) if (out !== p.batter) parts.push(`${name(out)} is out.`);
  } else if (p.t === 'runner' && p.from) {
    const runner = p.basesBefore[p.from - 1];
    if (runner && p.to === 0) parts.push(`${name(runner)} is out on the bases.`);
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
  for (const r of p.runs) {
    if (r.player === 'them') continue;
    parts.push(`${name(r.player)} scores.${r.rbi ? ` RBI: ${name(r.rbi)}.` : ''}`);
  }
  return parts.join(' ');
}

export function ordinal(n: number): string {
  return n === 1 ? 'first' : n === 2 ? 'second' : n === 3 ? 'third' : 'home';
}
