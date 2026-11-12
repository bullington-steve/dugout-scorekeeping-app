import { describe, expect, it } from 'vitest';
import { replay } from '../../../src/engine/replay.ts';
import type { GameEvent } from '../../../src/engine/types.ts';
import { planFor, type PlanItem } from '../../../src/sound/director.ts';
import { emptyData, newTeam, type AppData, type SavedGame } from '../../../src/store/model.ts';
import { game, pa, threeOuts } from '../../helpers/game.ts';

function setup(us: 'away' | 'home', events: GameEvent[], tweak: (d: AppData) => void = () => undefined) {
  const base = game({ us }, events);
  const g: SavedGame = { ...base, seasonId: null, date: '2026-11-12', opponent: 'Them', opponentAbbr: 'THM', park: '', saved: false };
  const d = emptyData();
  const t = newTeam('t', 'Dogs');
  t.players = base.setup.lineups.us.map((s, n) => ({ id: s.player, name: `Player ${n + 1}`, number: String(n + 1), positions: [] }));
  t.games = [g];
  d.teams = [t];
  d.activeTeamId = 't';
  tweak(d);
  return { d, g };
}

/** Plan for the last event, with the state before and after it. */
function plan(us: 'away' | 'home', events: GameEvent[], tweak?: (d: AppData) => void): PlanItem[] {
  const { d, g } = setup(us, events, tweak);
  const prev = replay({ ...g, events: events.slice(0, -1) });
  const next = replay(g);
  return planFor(d, g, events[events.length - 1]!, prev, next, { birthdaysDone: new Set(), today: '01-01', betweenTune: 'take-me-out' });
}

const tunes = (items: PlanItem[]) => items.map((i) => (i.kind === 'tune' ? i.id : i.kind === 'walkup' ? `walkup:${i.player}` : i.kind));

describe('the sound director', () => {
  it('our single: the hit sting, then the next batter walks up', () => {
    expect(tunes(plan('away', [pa('1B')]))).toEqual(['g-hit', 'walkup:p2']);
  });

  it('a home run gets Charge!, and the go-ahead adds Take the Lead after the walk-up', () => {
    expect(tunes(plan('away', [pa('HR')]))).toEqual(['charge', 'walkup:p2', 'take-the-lead']);
  });

  it('their strikeout gets the wah-wah; their third out gets Shave and a Haircut, then between-innings music and our leadoff walk-up', () => {
    // We're home, so they bat first.
    expect(tunes(plan('home', [pa('K')]))).toEqual(['g-strikeout']);
    expect(tunes(plan('home', threeOuts()))).toEqual(['shave-haircut', 'take-me-out', 'walkup:p1']);
  });

  it('Little League has no taunt; Quiet is walk-ups only', () => {
    expect(tunes(plan('home', [pa('K')], (d) => (d.prefs.audio = { pack: 'little' })))).toEqual([]);
    expect(tunes(plan('away', [pa('1B')], (d) => (d.prefs.audio = { pack: 'quiet' })))).toEqual(['walkup:p2']);
  });

  it('a saved pick wins over the pack, and No Sound means silence', () => {
    expect(tunes(plan('away', [pa('1B')], (d) => (d.prefs.audio = { pick: { hit: 'charge' } })))).toEqual(['charge', 'walkup:p2']);
    expect(tunes(plan('away', [pa('1B')], (d) => (d.prefs.audio = { pick: { hit: 'none' }, autoWalkup: false })))).toEqual([]);
  });

  it('the PA announcer speaks before the walk-up', () => {
    const items = plan('away', [pa('1B')], (d) => (d.prefs.audio = { announce: true }));
    expect(items[1]).toEqual({ kind: 'say', text: 'Now batting, number 2, Player 2.' });
  });

  it('a birthday walks up to Happy Birthday', () => {
    const items = plan('away', [pa('1B')], (d) => (d.teams[0]!.players[1]!.birthday = '01-01'));
    expect(tunes(items)).toEqual(['g-hit', 'happy-birthday']);
  });
});
