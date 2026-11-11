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
import { pickSpot } from './fieldsheet.ts';

const BASE_WORD = ['first', 'second', 'third'] as const;
const NEXT_WORD = ['second', 'third', 'home'] as const;

function runnerName(app: App, key: string): string {
  return app.team?.players.find((p) => p.id === key)?.name ?? key;
}

export async function recordResult(app: App, picked: Result): Promise<void> {
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

  if (result === 'FC') {
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
