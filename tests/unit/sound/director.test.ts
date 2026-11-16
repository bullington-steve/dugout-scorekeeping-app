import { describe, expect, it } from 'vitest';
import { replay } from '../../../src/engine/replay.ts';
import type { GameEvent } from '../../../src/engine/types.ts';
import { planFor, stretchInning, type PlanItem } from '../../../src/sound/director.ts';
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
  it('a ball, strike, or foul that doesn’t end the at-bat makes no sound, and never restarts the walk-up (Steve, Nov 15)', () => {
    for (const pitch of ['ball', 'swing', 'foul'] as const) expect(tunes(plan('away', [{ t: 'pitch', pitch }]))).toEqual([]);
    expect(tunes(plan('away', [pa('1B'), { t: 'pitch', pitch: 'ball' }]))).toEqual([]);
  });

  it('a runner moving after the play doesn’t walk the same batter up again', () => {
    expect(tunes(plan('away', [pa('1B'), { t: 'runner', from: 1, to: 2 }]))).not.toContain('walkup:p2');
  });

  it('our single: the hit sting, then the next batter walks up', () => {
    expect(tunes(plan('away', [pa('1B')]))).toEqual(['g-hit', 'walkup:p2']);
  });

  it('a home run gets Charge!, and the go-ahead adds Take the Lead after the walk-up', () => {
    expect(tunes(plan('away', [pa('HR')]))).toEqual(['charge', 'walkup:p2', 'take-the-lead']);
  });

  it('their strikeout gets Three Strikes (the default since Nov 16); their third out gets Shave and a Haircut, then between-innings music and our leadoff walk-up', () => {
    // We're home, so they bat first.
    expect(tunes(plan('home', [pa('K')]))).toEqual(['three-strikes']);
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

  describe('the stretch (Steve, Nov 16)', () => {
    const outs = (n: number): GameEvent[] => Array.from({ length: n }, () => pa('K'));
    const stretchPlan = (us: 'away' | 'home', events: GameEvent[], stretchDone = false) => {
      const { d, g } = setup(us, events);
      const prev = replay({ ...g, events: events.slice(0, -1) });
      const next = replay(g);
      return planFor(d, g, events[events.length - 1]!, prev, next, { birthdaysDone: new Set(), today: '01-01', betweenTune: 'over-the-fence', stretchDone });
    };
    const stretches = (items: PlanItem[]) => items.filter((i) => i.kind === 'tune' && i.why === 'stretch').length;

    it('is two innings before the last scheduled one: 7th of nine, 5th of seven, 4th of six', () => {
      expect([9, 7, 6, 3, 1].map(stretchInning)).toEqual([7, 5, 4, 1, 1]);
    });

    it('plays once the top of the stretch inning ends, whichever team just batted', () => {
      // Seven innings: four full innings (24 outs) and the top of the 5th (3 more).
      for (const us of ['home', 'away'] as const) {
        expect(stretches(stretchPlan(us, outs(27)))).toBe(1);
        expect(stretches(stretchPlan(us, outs(24)))).toBe(0);
        expect(stretches(stretchPlan(us, outs(30)))).toBe(0);
      }
    });

    it('never twice: not after the Stretch button or once it has played', () => {
      expect(stretches(stretchPlan('home', outs(27), true))).toBe(0);
    });
  });

  it('an HR Out plays Over the Fence Is Out! for either team, unless the home run moment is No Sound', () => {
    expect(tunes(plan('away', [pa('HRO')]))).toContain('over-the-fence');
    expect(tunes(plan('home', [pa('HRO')]))).toContain('over-the-fence');
    expect(tunes(plan('home', [pa('HRO')]))).not.toContain('g-big-out');
    const silent = (d: AppData) => (d.prefs.audio = { pick: { homerun: 'none' } });
    expect(tunes(plan('away', [pa('HRO')], silent))).not.toContain('over-the-fence');
  });
});

describe('defaults (Steve, Nov 16)', () => {
  it('a win plays The National Game finale unless someone picked another', () => {
    const outs = (n: number): GameEvent[] => Array.from({ length: n }, () => pa('K'));
    // Away: they bat last; a run rule or the clock isn't needed, a 7-inning game of strikeouts and one
    // homer for us in the 1st ends 1–0 with their last out.
    const events: GameEvent[] = [pa('HR'), ...outs(42)];
    const win = (tweak?: (d: AppData) => void) => tunes(plan('away', events, tweak));
    expect(win()).toContain('national-game-win');
    expect(win((d) => (d.prefs.audio = { pick: { win: 'victory' } }))).toContain('victory');
  });

  it('someone who picked the wah-wah keeps it', () => {
    expect(tunes(plan('home', [pa('K')], (d) => (d.prefs.audio = { pick: { strikeout: 'g-strikeout' } })))).toEqual(['g-strikeout']);
  });
});

