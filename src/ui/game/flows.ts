/*
 * What happens after a tap on the pad or a base: the questions some plays
 * ask (home run kind, which runner is out, where the ball went), then one
 * event for the engine. See docs/SPEC.md §2.
 */
import type { App } from '../../app/app.ts';
import { battingTeamOf } from '../../app/view.ts';
import { hrLeft } from '../../engine/replay.ts';
import type { Base, PaEvent, Result } from '../../engine/types.ts';
import { ordinal } from '../../engine/words.ts';
import { usesField } from '../../game/field.ts';
import { choose, type Choice } from '../sheet.ts';
import type { MenuItem } from './board.ts';
import { pickSpot } from './fieldsheet.ts';

const BASE_WORD = ['first', 'second', 'third'] as const;
const NEXT_WORD = ['second', 'third', 'home'] as const;

function runnerName(app: App, key: string): string {
  return app.team?.players.find((p) => p.id === key)?.name ?? key;
}

/** Asks "which runner was out" on the board, not in a sheet (Master Spec §5). */
export type PickRunner = (prompt: string, bases: Base[], extras?: { label: string; value: string }[]) => Promise<Base | string | null>;

export async function recordResult(app: App, picked: Result, pickRunner?: PickRunner): Promise<void> {
  const game = app.game;
  const s = app.state();
  if (!game || !s || s.final) return;
  let result = picked;
  const ev: PaEvent = { t: 'pa', result };

  if (result === 'HR') {
    const side = s.half === 'top' ? 'away' : 'home';
    const left = hrLeft(s, game.setup.rules, side);
    if (left === 0) {
      const answer = await choose(
        'Over the Limit',
        [
          { label: 'Record Home Run Out', value: 'HRO', kind: 'out' },
          { label: 'Inside the Park', sub: 'Doesn’t count toward the limit', value: 'IP', kind: 'hit' },
        ],
        'This team has used its home runs. One over the fence is an out.',
      );
      if (!answer) return;
      if (answer === 'HRO') result = 'HRO';
      else ev.ip = true;
    } else {
      const answer = await choose('Home Run', [
        { label: 'Over the Fence', value: 'over', kind: 'hit' },
        { label: 'Inside the Park', sub: left === Infinity ? undefined : 'Doesn’t count toward the limit', value: 'ip', kind: 'hit' },
      ]);
      if (!answer) return;
      if (answer === 'ip') ev.ip = true;
    }
  }

  // FC and DP with runners on: one runner is the answer; with several, tap the one who was out.
  const occupied = ([1, 2, 3] as const).filter((b) => s.bases[b - 1]);
  if ((result === 'FC' || result === 'DP') && pickRunner && occupied.length >= 1) {
    if (occupied.length === 1) ev.fcOut = occupied[0]!;
    else {
      const answer = await pickRunner(
        result === 'FC' ? 'Tap which runner was out' : 'Tap the runner out with the batter',
        [...occupied],
        result === 'FC' ? [{ label: 'Nobody Out', value: 'nobody' }] : [],
      );
      if (answer === null) return;
      ev.fcOut = answer === 'nobody' ? null : (answer as Base);
    }
  } else if (result === 'FC') {
    const choices: Choice<Base | 'nobody'>[] = [];
    for (const b of [3, 2, 1] as const) {
      const r = s.bases[b - 1];
      if (!r) continue;
      choices.push({
        label: `${runnerName(app, r.player)} – Runner from ${capital(BASE_WORD[b - 1]!)} Out at ${capital(NEXT_WORD[b - 1]!)}`,
        value: b,
        kind: 'out',
      });
    }
    choices.push({ label: 'Nobody – Everyone Safe', value: 'nobody', kind: 'hit' });
    const answer = await choose(
      'Runner Out, Batter Safe',
      choices,
      'If the batter is thrown out while a runner advances, score Grounder and move the runner.',
    );
    if (!answer) return;
    ev.fcOut = answer === 'nobody' ? null : answer;
  }

  if (result === 'BB' && game.setup.rules.mixed) {
    const answer = await choose(
      'Walk',
      [
        { label: 'To First', value: 1 as const, kind: 'hit' },
        { label: 'To Second', sub: 'Three straight balls, or an intentional walk', value: 2 as const, kind: 'hit' },
      ],
    );
    if (!answer) return;
    ev.bbTo = answer;
  }

  if (game.setup.hitLocation && usesField(result)) {
    const spot = await pickSpot(app, result);
    if (spot === null) return;
    if (spot !== 'skip') {
      if (spot.fielder) ev.fielder = spot.fielder;
      if (spot.loc) ev.loc = spot.loc;
    }
  }
  ev.result = result;
  app.addEvent(ev);
}

/**
 * Tap a lit base (Master Spec §5): a compact menu on the board. Right after a play: +1 Advance,
 * Score (with or without the RBI), Out, −1 Move Back. Between pitches: SB, WP, PB, CS, PO. Both:
 * CR (courtesy runner) and More (the full list in a sheet).
 */
export function baseMenu(app: App, index: 0 | 1 | 2, show: (title: string, items: MenuItem[]) => void): void {
  const game = app.game;
  const s = app.state();
  if (!game || !s || s.final) return;
  const runner = s.bases[index];
  if (!runner) return;
  const from = (index + 1) as Base;
  const team = battingTeamOf(game, s);
  const name = team === 'us' ? runnerName(app, runner.player) : runner.player;
  const next = index < 2 ? s.bases[index + 1] : null;
  const up = (from + 1) as 2 | 3 | 4;
  const blocked = next ? `${capital(BASE_WORD[index + 1]!)} is taken.` : undefined;

  const lastPa = [...s.plays].reverse().find((p) => p.inning === s.inning && p.half === s.half && p.t === 'pa');
  const since = lastPa ? game.events.slice(lastPa.i + 1) : [];
  const afterPlay = !!lastPa && since.every((e) => (e.t === 'runner' && !e.how) || e.t === 'courtesy');
  const rbiBatter = afterPlay && lastPa?.batter && runner.batter !== lastPa.batter ? lastPa.batter : null;
  const move = (to: 0 | 1 | 2 | 3 | 4, how?: 'SB' | 'WP' | 'PB' | 'CS' | 'PO' | 'back', rbi?: string | null) =>
    app.addEvent({ t: 'runner', from, to, ...(how ? { how } : {}), ...(rbi !== undefined ? { rbi } : {}) });

  const items: MenuItem[] = [];
  if (afterPlay) {
    if (index < 2) items.push({ code: '+1', word: 'Advance', label: `Advance to ${capital(NEXT_WORD[index]!)}`, kind: 'hit', dimmed: blocked, pick: () => move(up) });
    if (rbiBatter) {
      const who = team === 'us' ? runnerName(app, rbiBatter) : rbiBatter;
      items.push({ code: 'Score', word: `RBI ${who.split(' ')[0]}`, label: `Scored on the Play, RBI to ${who}`, kind: 'hit', pick: () => move(4, undefined, rbiBatter) });
      items.push({ code: 'Score', word: 'No RBI', label: 'Scored, No RBI', kind: 'hit', pick: () => move(4, undefined, null) });
    } else items.push({ code: 'Score', word: 'Run', label: 'Score', kind: 'hit', pick: () => move(4, undefined, null) });
    items.push({ code: 'Out', word: 'On Base', label: 'Out on the Bases', kind: 'out', pick: () => move(0) });
    if (from > 1) {
      const back = (from - 1) as 1 | 2;
      items.push({ code: '−1', word: 'Move Back', label: `Move Back to ${capital(BASE_WORD[back - 1]!)}`, dimmed: s.bases[back - 1] ? `${capital(BASE_WORD[back - 1]!)} is taken.` : undefined, pick: () => move(back, 'back') });
    }
  } else {
    const toWord = from === 3 ? 'Home' : capital(NEXT_WORD[index]!);
    items.push({ code: 'SB', word: 'Steal', label: `Stolen Base, to ${toWord}`, kind: 'hit', dimmed: blocked, pick: () => move(up, 'SB') });
    items.push({ code: 'WP', word: 'Wild Pitch', label: `Wild Pitch, to ${toWord}`, kind: 'hit', dimmed: blocked, pick: () => move(up, 'WP') });
    items.push({ code: 'PB', word: 'Passed Ball', label: `Passed Ball, to ${toWord}`, kind: 'hit', dimmed: blocked, pick: () => move(up, 'PB') });
    items.push({ code: 'CS', word: 'Caught', label: 'Caught Stealing', kind: 'out', pick: () => move(0, 'CS') });
    items.push({ code: 'PO', word: 'Picked Off', label: 'Picked Off', kind: 'out', pick: () => move(0, 'PO') });
  }
  const used = s.courtesyUsed[team][s.inning] ?? 0;
  if (!runner.tb && used < game.setup.rules.courtesyPerInning) items.push({ code: 'CR', word: 'Courtesy', label: 'Courtesy Runner', pick: () => void courtesy(app, index) });
  items.push({ code: '…', word: 'More', label: 'More Choices', pick: () => void runnerChoices(app, index) });
  show(`${name} on ${capital(BASE_WORD[index]!)}`, items);
}

/** Pick the courtesy runner for the runner on this base. */
async function courtesy(app: App, index: 0 | 1 | 2): Promise<void> {
  const game = app.game;
  const s = app.state();
  if (!game || !s) return;
  const runner = s.bases[index];
  if (!runner) return;
  const team = battingTeamOf(game, s);
  const from = (index + 1) as Base;
  const name = team === 'us' ? runnerName(app, runner.player) : runner.player;
  const onBase = new Set(s.bases.filter(Boolean).map((r) => r!.player));
  const pool =
    team === 'us'
      ? (game.present?.length ? game.present : game.setup.lineups.us.map((x) => x.player)).filter((p) => !onBase.has(p))
      : s.lineups.them.map((x) => x.player).filter((p) => !onBase.has(p));
  const who = await choose(
    'Courtesy Runner',
    pool.map((p) => ({ label: team === 'us' ? runnerName(app, p) : p, value: p })),
    `Runs for ${name} at ${ordinal(from)}.`,
  );
  if (who) app.addEvent({ t: 'courtesy', base: from, player: who });
}

/** Tap a lit base: Advance, Scored (with or without RBI), Out, Courtesy Runner. */
export async function runnerChoices(app: App, index: 0 | 1 | 2): Promise<void> {
  const game = app.game;
  const s = app.state();
  if (!game || !s || s.final) return;
  const runner = s.bases[index];
  if (!runner) return;
  const from = (index + 1) as Base;
  const team = battingTeamOf(game, s);
  const name = team === 'us' ? runnerName(app, runner.player) : runner.player;

  // The RBI choice is only for the play that just happened.
  let rbiBatter: string | null = null;
  const lastPa = [...s.plays].reverse().find((p) => p.inning === s.inning && p.half === s.half && p.t === 'pa');
  // Not for the batter of that play: nobody drives himself in on his own hit.
  if (lastPa?.batter && runner.batter !== lastPa.batter) {
    const since = game.events.slice(lastPa.i + 1);
    if (since.every((e) => e.t === 'runner' || e.t === 'courtesy')) rbiBatter = lastPa.batter;
  }

  type Action = 'advance' | 'rbi' | 'score' | 'out' | 'courtesy';
  const choices: Choice<Action>[] = [];
  if (index < 2 && !s.bases[index + 1]) choices.push({ label: `Advance to ${capital(NEXT_WORD[index])}`, value: 'advance', kind: 'hit' });
  if (rbiBatter) {
    const batterName = team === 'us' ? runnerName(app, rbiBatter) : rbiBatter;
    choices.push({ label: `Scored on the Play (RBI to ${batterName})`, value: 'rbi', kind: 'hit' });
    choices.push({ label: 'Scored, No RBI', sub: 'Error, overthrow, or passed ball', value: 'score', kind: 'hit' });
  } else {
    choices.push({ label: 'Score', value: 'score', kind: 'hit' });
  }
  choices.push({ label: 'Out', value: 'out', kind: 'out' });
  const used = s.courtesyUsed[team][s.inning] ?? 0;
  if (!runner.tb && used < game.setup.rules.courtesyPerInning) choices.push({ label: 'Courtesy Runner', value: 'courtesy' });

  const action = await choose(`${name} on ${capital(BASE_WORD[index])}`, choices);
  if (!action) return;
  if (action === 'advance') app.addEvent({ t: 'runner', from, to: (from + 1) as 2 | 3 });
  else if (action === 'rbi') app.addEvent({ t: 'runner', from, to: 4, rbi: rbiBatter });
  else if (action === 'score') app.addEvent({ t: 'runner', from, to: 4, rbi: null });
  else if (action === 'out') app.addEvent({ t: 'runner', from, to: 0 });
  else {
    const onBase = new Set(s.bases.filter(Boolean).map((r) => r!.player));
    const pool =
      team === 'us'
        ? (game.present?.length ? game.present : game.setup.lineups.us.map((x) => x.player)).filter((p) => !onBase.has(p))
        : s.lineups.them.map((x) => x.player).filter((p) => !onBase.has(p));
    const who = await choose(
      'Courtesy Runner',
      pool.map((p) => ({ label: team === 'us' ? runnerName(app, p) : p, value: p })),
      `Runs for ${name} at ${ordinal(from)}.`,
    );
    if (who) app.addEvent({ t: 'courtesy', base: from, player: who });
  }
}

function capital(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}
