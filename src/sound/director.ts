/*
 * The sound director (SPEC §13): after each play, decide what plays and in
 * what order, never two at once: the play's sound, then the next batter's
 * walk-up, then a situation sound (taking the lead, a rally). When two things
 * happen on one play, only the bigger one plays. Our offense's sounds play
 * when we bat and our defense's when we field (Both Teams adds theirs).
 *
 * planFor() is pure (tested in tests/unit/sound); the queue that plays the
 * plan lives in src/ui/sound/player.ts.
 */
import type { GameState } from '../engine/replay.ts';
import type { GameEvent } from '../engine/types.ts';
import type { AppData, SavedGame, SoundMoment } from '../store/model.ts';
import { audioPrefs, tuneFor } from './settings.ts';
import { tuneById } from './tunes.ts';
import { umpireCall } from './speech.ts';

export type PlanItem =
  | { kind: 'tune'; id: string; why: SoundMoment | 'stretch' | 'between' | 'birthday' }
  | { kind: 'crowd'; crowd: 'cheer' | 'roar' | 'groan' }
  | { kind: 'say'; text: string }
  | { kind: 'walkup'; player: string };

const HITS = new Set(['1B', '2B', '3B', 'HR']);
const OUTS = new Set(['K', 'KL', 'GO', 'F', 'L', 'P', 'IF', 'FBO', 'SF', 'DP', 'TP', 'HRO', 'FC']);

function sideOf(half: 'top' | 'bottom'): 'away' | 'home' {
  return half === 'top' ? 'away' : 'home';
}

function battingUs(game: SavedGame, s: GameState): boolean {
  return sideOf(s.half) === game.setup.us;
}

/** The batter due up for us, if we're batting. */
export function dueUp(game: SavedGame, s: GameState): string | null {
  if (s.final || !battingUs(game, s)) return null;
  const order = s.lineups.us;
  return order.length ? (order[s.nextSlot.us % order.length]?.player ?? null) : null;
}

export interface PlanOptions {
  /** Birthday walk-ups already played this game (player ids). */
  birthdaysDone: Set<string>;
  /** Today as MM-DD. */
  today: string;
  /** The next between-innings tune. */
  betweenTune: string | null;
}

/** What to play after one new event: prev is the state before it, next after. */
export function planFor(d: AppData, game: SavedGame, ev: GameEvent, prev: GameState, next: GameState, opts: PlanOptions): PlanItem[] {
  const a = audioPrefs(d);
  const us = game.setup.us;
  const them = us === 'away' ? 'home' : 'away';
  const weBatted = battingUs(game, prev);
  const items: PlanItem[] = [];
  const add = (moment: SoundMoment, why: SoundMoment = moment): boolean => {
    const id = tuneFor(d, moment);
    if (id === 'none' || !tuneById(id)) return false;
    items.push({ kind: 'tune', id, why });
    return true;
  };
  const crowd = (c: 'cheer' | 'roar' | 'groan') => {
    if (a.crowd) items.push({ kind: 'crowd', crowd: c });
  };
  const rules = game.setup.rules.count;

  // The umpire speaks first, for pitches and the end of an at-bat.
  if (a.umpire && game.setup.count) {
    if (ev.t === 'pitch') {
      const c = next.count;
      const sameBatter = !next.plays.some((p) => p.i === game.events.length - 1 && p.result);
      if (sameBatter) {
        if (ev.pitch === 'ball') items.push({ kind: 'say', text: umpireCall('ball', c.balls) });
        else if (ev.pitch === 'foul' && c.strikes === prev.count.strikes) items.push({ kind: 'say', text: umpireCall('foul', 0) });
        else items.push({ kind: 'say', text: umpireCall('strike', c.strikes) });
      }
    }
    const play = next.plays[next.plays.length - 1];
    if (play && play.i === game.events.length - 1) {
      if (play.result === 'BB') items.push({ kind: 'say', text: umpireCall('walk', rules.walkAt) });
      if (play.result === 'K' || play.result === 'KL') items.push({ kind: 'say', text: umpireCall('strikeout', rules.outAt) });
    }
  }

  const play = next.plays.find((p) => p.i === game.events.length - 1);
  const result = play?.result;
  const usRuns = next.score[us] - prev.score[us];
  const lead = (s: GameState) => s.score[us] - s.score[them];
  const sideRetired = !next.final && (next.half !== prev.half || next.inning !== prev.inning);

  if (next.final && !prev.final) {
    if (next.final.winner === us) {
      add('win');
      crowd(weBatted ? 'roar' : 'cheer');
    }
    return items;
  }

  if (weBatted) {
    let main = false;
    if (result === 'HR') {
      main = add('homerun');
      crowd('roar');
    } else if (usRuns > 0) {
      main = add('run');
      crowd('cheer');
    } else if (result && HITS.has(result)) main = add('hit');
    else if (result === 'BB') main = add('walk');
    else if (result && OUTS.has(result)) {
      main = add('otherOut');
      if (result === 'K' || result === 'KL') crowd('groan');
    }
    void main;
    // Situations, after the walk-up: taking the lead outranks tying it, which outranks a rally.
    const situation: SoundMoment | null =
      lead(prev) <= 0 && lead(next) > 0
        ? 'takeLead'
        : lead(prev) < 0 && lead(next) === 0
          ? 'tie'
          : lead(next) <= 0 && ((next.bases[1] && !prev.bases[1]) || (next.bases[2] && !prev.bases[2]))
            ? 'rally'
            : null;
    walkupAndSituation(d, game, next, items, situation, opts);
    return items;
  }

  // They batted: our defense.
  if (sideRetired) {
    add('sideRetired');
    crowd('cheer');
    // Seventh-inning stretch after the top of the 7th; otherwise between-innings music.
    if (prev.inning === 7 && prev.half === 'top') items.push({ kind: 'tune', id: 'take-me-out', why: 'stretch' });
    else if (a.betweenInnings && opts.betweenTune) items.push({ kind: 'tune', id: opts.betweenTune, why: 'between' });
    walkupAndSituation(d, game, next, items, null, opts);
    return items;
  }
  if (result === 'DP' || result === 'TP') {
    add('bigout');
    crowd('cheer');
  } else if (result === 'K' || result === 'KL') add('strikeout');
  else if (result && OUTS.has(result) && (prev.bases[1] || prev.bases[2])) {
    add('bigout');
    crowd('cheer');
  } else if (a.bothTeams && result && (HITS.has(result) || result === 'BB')) add(result === 'BB' ? 'walk' : 'hit');
  return items;
}

function walkupAndSituation(d: AppData, game: SavedGame, next: GameState, items: PlanItem[], situation: SoundMoment | null, opts: PlanOptions): void {
  const a = audioPrefs(d);
  const batter = dueUp(game, next);
  if (batter && a.autoWalkup) {
    const team = d.teams.find((t) => t.games.some((g) => g.id === game.id));
    const p = team?.players.find((x) => x.id === batter);
    if (a.announce && p) items.push({ kind: 'say', text: `Now batting, ${p.number ? `number ${p.number}, ` : ''}${p.name}.` });
    if (p?.birthday === opts.today && !opts.birthdaysDone.has(p.id)) {
      opts.birthdaysDone.add(p.id);
      items.push({ kind: 'tune', id: 'happy-birthday', why: 'birthday' });
    } else items.push({ kind: 'walkup', player: batter });
  }
  if (situation) {
    const id = tuneFor(d, situation);
    if (id !== 'none' && tuneById(id)) items.push({ kind: 'tune', id, why: situation });
  }
}

/** A player's built-in walk-up when they haven't picked one: spread so teammates differ. */
export function defaultWalkup(players: { id: string }[], id: string): string {
  const walkups = ['wu-charge-up', 'wu-stomp-clap', 'wu-boogie', 'wu-heat', 'wu-bounce', 'wu-big-league', 'wu-funk', 'wu-swing'];
  const i = Math.max(0, players.findIndex((p) => p.id === id));
  return walkups[i % walkups.length]!;
}
