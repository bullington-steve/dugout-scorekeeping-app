/*
 * Sound settings with their defaults, the sound packs, and which tune plays
 * for each moment (SPEC §13). A pick is saved only when it differs from the
 * pack, so changing packs later still works for everything else.
 */
import type { AppData, AudioPrefs, SoundMoment } from '../store/model.ts';

export const MOMENTS: { id: SoundMoment; name: string; when: string }[] = [
  { id: 'hit', name: 'Hit', when: 'Our batter gets a hit' },
  { id: 'walk', name: 'Walk', when: 'Our batter walks' },
  { id: 'run', name: 'Run Scores', when: 'We score' },
  { id: 'homerun', name: 'Home Run', when: 'We hit one out' },
  { id: 'takeLead', name: 'Take the Lead', when: 'We go ahead' },
  { id: 'tie', name: 'Tie Game', when: 'We tie it up' },
  { id: 'rally', name: 'Rally', when: 'Tied or behind, and a runner reaches second or third' },
  { id: 'strikeout', name: 'Strikeout', when: 'Their batter strikes out' },
  { id: 'bigout', name: 'Big Out', when: 'An out with their runners in scoring position, or our double play' },
  { id: 'sideRetired', name: 'Side Retired', when: 'Our defense gets the third out' },
  { id: 'win', name: 'Win', when: 'We win' },
  { id: 'otherOut', name: 'Other Outs', when: 'Any other out' },
];

export const PACKS: { id: NonNullable<AudioPrefs['pack']>; name: string; about: string; tunes: Record<SoundMoment, string> }[] = [
  {
    id: 'classic',
    name: 'Classic Ballpark',
    about: 'Stings, fanfares, and the wah-wah on their strikeouts.',
    tunes: { hit: 'g-hit', walk: 'g-walk', run: 'g-run', homerun: 'charge', takeLead: 'take-the-lead', tie: 'g-tie', rally: 'here-we-go', strikeout: 'g-strikeout', bigout: 'g-big-out', sideRetired: 'shave-haircut', win: 'victory', otherOut: 'none' },
  },
  {
    id: 'little',
    name: 'Little League',
    about: 'Everything cheerful, no taunts.',
    tunes: { hit: 'g-hit', walk: 'g-walk', run: 'g-run', homerun: 'charge', takeLead: 'take-the-lead', tie: 'g-tie', rally: 'clap-rally', strikeout: 'none', bigout: 'g-big-out', sideRetired: 'shave-haircut', win: 'victory', otherOut: 'none' },
  },
  {
    id: 'big',
    name: 'Big League',
    about: 'More fanfare: Charge! for a rally, the Hallelujah Chorus for a win.',
    tunes: { hit: 'g-hit', walk: 'g-walk', run: 'g-run', homerun: 'charge', takeLead: 'take-the-lead', tie: 'g-tie', rally: 'charge', strikeout: 'g-strikeout', bigout: 'g-big-out', sideRetired: 'shave-haircut', win: 'hallelujah', otherOut: 'none' },
  },
  {
    id: 'quiet',
    name: 'Quiet',
    about: 'Walk-ups only.',
    tunes: { hit: 'none', walk: 'none', run: 'none', homerun: 'none', takeLead: 'none', tie: 'none', rally: 'none', strikeout: 'none', bigout: 'none', sideRetired: 'none', win: 'none', otherOut: 'none' },
  },
];

export interface ResolvedAudio {
  on: boolean;
  autoWalkup: boolean;
  pack: NonNullable<AudioPrefs['pack']>;
  voice: 'hammond';
  echo: NonNullable<AudioPrefs['echo']>;
  leslie: boolean;
  crowd: boolean;
  bothTeams: boolean;
  announce: boolean;
  umpire: boolean;
  betweenInnings: boolean;
}

export function audioPrefs(d: AppData): ResolvedAudio {
  const a = d.prefs.audio ?? {};
  return {
    // Setup asks; a device that was never asked plays sound (the speaker button turns it off).
    on: d.prefs.sound !== false,
    autoWalkup: a.autoWalkup ?? true,
    pack: a.pack ?? 'classic',
    // Hammond only (Steve, Nov 12). A device that saved Calliope or Pipe Organ still plays the Hammond.
    voice: 'hammond',
    // Standard sound (Steve, Nov 13): the plain organ with a short echo, best from the iPhone itself.
    // Big Speaker Mode turns on the Leslie and the Ballpark echo.
    echo: a.echo ?? 'gym',
    leslie: a.leslie ?? false,
    crowd: a.crowd ?? false,
    bothTeams: a.bothTeams ?? false,
    announce: a.announce ?? false,
    umpire: a.umpire ?? false,
    betweenInnings: a.betweenInnings ?? true,
  };
}

/** The tune for a moment: the saved pick, or the pack's. 'none' means silence. */
export function tuneFor(d: AppData, moment: SoundMoment): string {
  const a = d.prefs.audio ?? {};
  const pack = PACKS.find((p) => p.id === (a.pack ?? 'classic')) ?? PACKS[0]!;
  return a.pick?.[moment] ?? pack.tunes[moment];
}

/** Save a pick only when it differs from the pack. */
export function setPick(d: AppData, moment: SoundMoment, tune: string): void {
  const a = (d.prefs.audio ??= {});
  const pack = PACKS.find((p) => p.id === (a.pack ?? 'classic')) ?? PACKS[0]!;
  const pick = { ...(a.pick ?? {}) };
  if (pack.tunes[moment] === tune) delete pick[moment];
  else pick[moment] = tune;
  a.pick = pick;
}
