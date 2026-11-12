/*
 * Every tune the ballpark organ knows (SPEC §13). Public-domain melodies are
 * played as written; each says where its notes came from. "From the sheet"
 * means Steve supplied the sheet music and the notes were read off it. "From
 * memory" means it still needs checking against a sheet (BACKLOG). Originals
 * were written for ScoreKept and copy no one's hook.
 *
 * The format is in notes.ts. Groups are the Organ pad's albums.
 */

export type TuneGroup = 'rally' | 'celebrate' | 'pregame' | 'between' | 'drama' | 'sendoff' | 'walkup' | 'game';
export type Style = 'waltz' | 'polka' | 'march' | 'shuffle' | 'hold' | 'stab' | 'none';
export type CrowdKind = 'cheer' | 'roar' | 'groan';

export interface Tune {
  id: string;
  name: string;
  /** Who wrote it, with the year when known: the Organ shows it like an iPod's artist line
   *  (Steve, Nov 12: "make sure we're crediting artists"). ScoreKept's own tunes say ScoreKept Organ. */
  artist: string;
  group: TuneGroup;
  bpm: number;
  /** Beats per bar. */
  beats: number;
  melody: string;
  chords?: string;
  style?: Style;
  /** Beats before the first full bar (a pickup). */
  pickup?: number;
  drums?: string;
  crowd?: CrowdKind;
  /** A deeper wobble, for the strikeout taunt. */
  wah?: boolean;
  /** Where the notes came from. */
  source: string;
}

export const TUNES: Tune[] = [
  // ---- Between Innings ----
  {
    id: 'take-me-out',
    name: 'Take Me Out to the Ball Game',
    artist: 'Albert Von Tilzer and Jack Norworth, 1908',
    group: 'between',
    bpm: 190,
    beats: 3,
    style: 'waltz',
    melody:
      'D4:2 D5 | B4 A4 F#4 | A4:3 | E4:3 | D4:2 D5 | B4 A4 F#4 | A4:5 r | B4 A#4 B4 | F#4 G4 A4 | B4:2 G4 | E4:3 | B4:2 B4 | B4 C#5 D5 | E5 C#5 B4 | A4 F#4 E4 | D4:2 D5 | B4 A4 F#4 | A4:3 | E4:2 E4 | D4:2 E4 | F#4 G4 A4 | B4:4 B4 C#5 | D5:3 | D5:3 | D5 C#5 B4 | A4 G#4 A4 | B4:3 | C#5:3 | D5:3 | r [F#4,A4,D5] r',
    chords: 'D D A7 A7 D D E7 A7 B7 B7 Em Em E7 E7 A7 A7 D D A7 A7 D D G A7 G G#dim D E7 Em A7 D D',
    source: 'From the sheet: Albert Von Tilzer and Jack Norworth, 1908 (York Music Co., via IMSLP), chorus melody note for note. Chords simplified from the piano part.',
  },
  {
    id: 'baseball-polka',
    name: 'The Base Ball Polka',
    artist: 'J. R. Blodgett, 1858',
    group: 'between',
    bpm: 112,
    beats: 2,
    style: 'polka',
    melody:
      'C5:0.25 B4:0.25 C5:0.25 D5:0.25 E5:0.25 D#5:0.25 E5:0.25 F5:0.25 | G5:0.5 C5:0.25 C5:0.25 C5:0.5 C5:0.5 | ' +
      'A5:0.5 A5:0.5 Bb5:0.5 A5:0.5 | A5:0.5 G5:0.5 G5:0.25 F#5:0.25 G5:0.5 | C5:0.5 C5:0.5 E5:0.5 D5:0.5 | D5:0.5 C5:0.5 C5:0.25 B4:0.25 C5:0.5 | ' +
      'A5:0.5 A5:0.5 Bb5:0.5 A5:0.5 | A5:0.5 G5:0.5 G5:0.25 F#5:0.25 G5:0.5 | E6:0.25 D6:0.25 C6:0.25 Bb5:0.25 A5:0.25 Bb5:0.25 D5:0.25 E5:0.25 | ' +
      'F5:0.5 F5:0.25 E5:0.25 C5:0.125 D5:0.125 E5:0.125 F5:0.125 F#5:0.125 G5:0.125 G#5:0.125 A5:0.125 | ' +
      'A5:0.5 A5:0.5 Bb5:0.5 A5:0.5 | A5:0.5 G5:0.5 G5:0.25 F#5:0.25 G5:0.5 | C5:0.5 C5:0.5 E5:0.5 D5:0.5 | D5:0.5 C5:0.5 C5:0.25 B4:0.25 C5:0.5 | ' +
      'A5:0.5 A5:0.5 Bb5:0.5 A5:0.5 | A5:0.5 G5:0.5 G5:0.25 F#5:0.25 G5:0.5 | E6:0.25 D6:0.25 C6:0.25 Bb5:0.25 A5:0.25 Bb5:0.25 D5:0.25 E5:0.25 | F5:0.5 F5:0.25 E5:0.25 F5:0.5 r:0.5',
    chords: 'C7 C7 F C7 C7 F F C7 C7 F F C7 C7 F F C7 C7 F',
    source: 'From the sheet: "Base Ball Polka," J. R. Blodgett, 1858 (Levy Sheet Music Collection), introduction and first strain to Fine. Grace notes left off.',
  },
  {
    id: 'tally-one',
    name: 'Tally One for Me',
    artist: 'John T. Rutledge, 1877',
    group: 'between',
    bpm: 168,
    beats: 3,
    style: 'waltz',
    pickup: 1,
    melody: 'G4 | C5:2 C5 | E5:2 G4 | A4:2 A4 | C5:2 A4 | G4:2 G4 | C5:2 E5 | D5:5 G4 | C5:2 C5 | E5:2 G4 | A4:2 A4 | F5:2 A4 | G4:2 C5 | E5:2 D5 | C5:5 r',
    chords: 'C C F F C C G7 G7 C C F F C G7 C C',
    source: 'From the sheet: "Tally One for Me," song and chorus, John T. Rutledge, 1877 (Levy Sheet Music Collection), the waltz chorus.',
  },
  {
    id: 'soul-groove',
    name: 'Soul Organ Groove',
    artist: 'ScoreKept Organ',
    group: 'between',
    bpm: 104,
    beats: 4,
    style: 'shuffle',
    drums: 'k.h.s.h.k.k.s.h.',
    melody: 'F4:0.5 Ab4:0.5 A4:0.5 C5:1 Eb5:0.5 C5:1 | A4:0.5 C5:0.5 F5:1 Eb5:0.5 C5:0.5 A4:1 | Bb4:0.5 Db5:0.5 D5:0.5 F5:1 Ab5:0.5 F5:1 | D5:0.5 F5:0.5 Bb5:1 Ab5:0.5 F5:0.5 D5:1 | F4:0.5 Ab4:0.5 A4:0.5 C5:1 Eb5:0.5 C5:1 | C5:0.5 Eb5:0.5 F5:3',
    chords: 'F7 F7 Bb7 Bb7 F7 F7',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'irish-washerwoman',
    name: 'The Irish Washerwoman',
    artist: 'Traditional',
    group: 'between',
    bpm: 132,
    beats: 3,
    style: 'stab',
    melody:
      'D5:0.5 | B4:0.5 G4:0.5 G4:0.5 D4:0.5 G4:0.5 G4:0.5 | B4:0.5 G4:0.5 B4:0.5 D5:0.5 C5:0.5 B4:0.5 | C5:0.5 A4:0.5 A4:0.5 E4:0.5 A4:0.5 A4:0.5 | C5:0.5 A4:0.5 C5:0.5 E5:0.5 D5:0.5 C5:0.5 | ' +
      'B4:0.5 G4:0.5 G4:0.5 D4:0.5 G4:0.5 G4:0.5 | B4:0.5 G4:0.5 B4:0.5 D5:0.5 C5:0.5 B4:0.5 | C5:0.5 B4:0.5 C5:0.5 A4:0.5 D5:0.5 C5:0.5 | B4:0.5 G4:0.5 G4:2',
    chords: 'G G Am D G G D G',
    pickup: 0.5,
    source: 'From memory (traditional); check against a sheet.',
  },

  {
    id: 'home-run-galop',
    name: 'Home Run Galop',
    artist: 'Edward M. Read, 1903',
    group: 'celebrate',
    bpm: 126,
    beats: 2,
    style: 'polka',
    melody:
      'F5:0.5 E5:0.5 D5:0.5 C5:0.5 | D5:0.5 A4:0.5 C5 | A5:0.75 C5:0.25 A5:0.75 C5:0.25 | Bb5:1.5 r:0.5 | G5:0.5 E5:0.5 D5:0.5 C5:0.5 | D5:0.5 G4:0.5 C5 | G5:0.75 C5:0.25 G5:0.75 C5:0.25 | A5:1.5 r:0.5 | ' +
      'F5:0.5 E5:0.5 D5:0.5 C5:0.5 | D5:0.5 A4:0.5 C5 | A5:0.75 C5:0.25 A5:0.75 C5:0.25 | F5:1.5 r:0.5 | D5:0.5 G5:0.5 F5 | G5:0.5 Bb5:0.5 E5 | G5:0.5 F5:0.25 E5:0.25 D5:0.5 G5:0.5 | C5:1.5 r:0.5 | ' +
      'F5:0.5 E5:0.5 D5:0.5 C5:0.5 | D5:0.5 A4:0.5 C5 | A5:0.75 C5:0.25 A5:0.75 C5:0.25 | Bb5:1.5 r:0.5 | G5:0.5 E5:0.5 D5:0.5 C5:0.5 | D5:0.5 G4:0.5 C5 | G5:0.75 C5:0.25 G5:0.75 C5:0.25 | A5:1.5 r:0.5 | ' +
      'D5:0.5 E5:0.5 F#5:0.5 G5:0.5 | G5 D5 | C5:0.5 D5:0.5 E5:0.5 G5:0.5 | F5 C5 | D5 F5:0.5 r:0.5 | C5 A5:0.5 r:0.5 | G5:0.5 C5:0.5 D5:0.5 E5:0.5 | F5:0.5 r:0.5 [A4,F5]',
    chords: 'F F F C7 C7 C7 C7 F F F C7 F Bb C7 G7 C F F F C7 C7 C7 C7 F D7 Gm C7 F Bb F C7 F',
    source: 'From the sheet: "Home Run Galop," Edward M. Read, from Favorite Pastimes, W. H. Willis & Co., 1903 (Library of Congress), the first strain note for note, 32 bars. Chords simplified from the piano part. The Trio is on the sheet for later.',
  },
  {
    id: 'over-the-fence',
    name: 'Over the Fence Is Out!',
    artist: 'J. P. Skelly, 1895',
    group: 'celebrate',
    bpm: 132,
    beats: 3,
    style: 'waltz',
    melody:
      'A4 G4:1.5 F4:0.5 | C5:2 A4 | D5 r:2 | r:3 | A4 G4 F4 | C5 A4:1.5 F4:0.5 | E4:3 | E4 r E4 | ' +
      'Bb4 Bb4 Bb4 | Bb4 A4 G4 | Bb4 A4 G4 | F4 r A4 | B4 A4 G4 | F4 E4 D4 | G4:3 | G4 r G4 | ' +
      'A4 G4:1.5 F4:0.5 | C5 C5:1.5 A4:0.5 | D5 r:2 | r:2 C5 | Eb5 Eb5 Eb5 | Eb5 D5 C5 | Bb4:3 | Bb4 r G4 | ' +
      'A4 C5 D5 | C5 r A4 | G4 F4 D4 | D5:2 r | D5 E5:1.5 D5:0.5 | Bb4:2 E4 | F4 r:2 | r:3',
    chords: 'F F Bb F F F C7 C7 C7 C7 A7 Dm G7 G7 C C7 F F Dm F F7 F7 Bb Gm F C7 Bb C7 C7 C7 F F',
    source: 'From the sheet: "Over the Fence Is Out!", words and music by J. P. Skelly, Petrie Music Co., 1895 (Library of Congress), the chorus melody note for note. Chords simplified from the piano part.',
  },
  {
    id: 'funiculi',
    name: 'Funiculì, Funiculà',
    artist: 'Luigi Denza and Peppino Turco, 1880',
    group: 'rally',
    bpm: 150,
    beats: 3,
    style: 'waltz',
    melody:
      'D5:1.5 C5:0.5 r | D5:1.5 C5:0.5 r | Eb5 D5:0.5 C5 Eb5:0.5 | D5:2 r | D5:1.5 C5:0.5 r | D5:1.5 C5:0.5 r | Eb5 D5:0.5 C5 Eb5:0.5 | Bb4:0.5 r:0.5 G4:0.5 G4 G4:0.5 | ' +
      'G4 F4:0.5 F4 F4:0.5 | F4 F4:0.5 F4 F4:0.5 | G4 G4:0.5 G4 G4:0.5 | Eb5:3 | F5 Eb5:0.5 C5 Eb5:0.5 | Bb4:0.5 r:0.5 G4:0.5 G4 Ab4:0.5 | Bb4 Ab4:0.5 G4 F4:0.5 | Eb4:1.5 r:1.5',
    chords: 'Bb7 Eb Bb7 Eb Bb7 Eb Bb7 Eb F7 Bb7 G7 Cm Ab Eb Bb7 Eb',
    source: 'From the sheet: "Funiculì-Funiculà," Luigi Denza, words by Peppino Turco, 1880 (G. Ricordi vocal score, via IMSLP), the "Jammo, jammo" refrain, voice line note for note in E-flat. Chords simplified from the piano part.',
  },
  // ---- Rally ----
  {
    id: 'here-we-go',
    name: 'Here We Go',
    artist: 'ScoreKept Organ',
    group: 'rally',
    bpm: 118,
    beats: 4,
    style: 'stab',
    drums: 'k.c.k.c.',
    melody: 'G4:0.5 C5:0.5 E5:1 r:0.5 E5:0.5 G5:1 | G4:0.5 C5:0.5 E5:1 r:0.5 G5:0.5 C6:1',
    chords: 'C F',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'clap-rally',
    name: 'Clap-Along Rally',
    artist: 'ScoreKept Organ',
    group: 'rally',
    bpm: 126,
    beats: 4,
    style: 'none',
    drums: 'k.c.k.cc',
    melody: 'G4:0.5 G#4:0.5 A4:0.5 A#4:0.5 B4:0.5 C5:1.5 | r:2 C5:0.5 D5:0.5 E5:1',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'charge',
    name: 'Charge!',
    artist: 'Traditional',
    group: 'rally',
    bpm: 132,
    beats: 4,
    style: 'none',
    melody: 'G4:0.67 C5:0.66 E5:0.67 G5:1.5 E5:0.5 [C5,E5,G5]:2.5',
    crowd: 'cheer',
    source: 'Traditional stadium fanfare (author unknown; kept at Steve’s call).',
  },
  {
    id: 'william-tell',
    name: 'William Tell Galop',
    artist: 'Gioachino Rossini, 1829',
    group: 'rally',
    bpm: 150,
    beats: 2,
    style: 'polka',
    drums: 'k.c.',
    melody:
      'G4:0.25 G4:0.25 G4:0.5 G4:0.25 G4:0.25 G4:0.5 | G4:0.25 G4:0.25 C5:0.5 D5:0.5 E5:0.5 | G4:0.25 G4:0.25 G4:0.5 G4:0.25 G4:0.25 G4:0.5 | G4:0.25 G4:0.25 E5:0.5 D5:0.5 B4:0.5 | G4:2',
    chords: 'C C G7 G7 C',
    source: 'From memory (Rossini, 1829); check against a sheet.',
  },
  {
    id: 'cavalry',
    name: 'Cavalry Charge',
    artist: 'Traditional',
    group: 'rally',
    bpm: 120,
    beats: 4,
    style: 'none',
    melody: 'G4:0.33 G4:0.33 G4:0.34 C5:0.33 C5:0.33 C5:0.34 E5:0.33 E5:0.33 E5:0.34 C5:0.5 E5:0.5 G5:2.5',
    source: 'From memory (traditional bugle call).',
  },

  // ---- Celebrate ----
  {
    id: 'hallelujah',
    name: 'Hallelujah Chorus',
    artist: 'George Frideric Handel, 1741',
    group: 'celebrate',
    bpm: 92,
    beats: 4,
    style: 'stab',
    melody: 'D5:1 A4:0.75 B4:0.25 A4:1 r:1 | D5:1 A4:0.75 B4:0.25 A4:1 r:1 | D5:0.5 A4:0.375 B4:0.125 A4:0.5 D5:0.5 A4:0.375 B4:0.125 A4:0.5 D5:0.5 A4:0.375 B4:0.125 | A4:2 r:2',
    chords: 'D D D A',
    source: 'From memory (Handel, 1741), the opening; check against a sheet.',
  },
  {
    id: 'ode-to-joy',
    name: 'Ode to Joy',
    artist: 'Ludwig van Beethoven, 1824',
    group: 'celebrate',
    bpm: 120,
    beats: 4,
    style: 'march',
    melody: 'F#4 F#4 G4 A4 | A4 G4 F#4 E4 | D4 D4 E4 F#4 | F#4:1.5 E4:0.5 E4:2 | F#4 F#4 G4 A4 | A4 G4 F#4 E4 | D4 D4 E4 F#4 | E4:1.5 D4:0.5 D4:2',
    chords: 'D A D A D A D D',
    source: 'From memory (Beethoven, 1824); a well-known tune.',
  },
  {
    id: 'victory',
    name: 'Victory Fanfare',
    artist: 'ScoreKept Organ',
    group: 'celebrate',
    bpm: 112,
    beats: 4,
    style: 'none',
    melody: '[C5,E5]:0.5 [E5,G5]:0.5 [G5,C6]:1 [E5,G5]:0.5 [G5,C6]:2.5',
    crowd: 'cheer',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'take-the-lead',
    name: 'Take the Lead',
    artist: 'ScoreKept Organ',
    group: 'celebrate',
    bpm: 120,
    beats: 4,
    style: 'none',
    melody: 'E5:0.5 F5:0.5 G5:1 G5:0.5 A5:0.5 B5:0.5 [E5,G5,C6]:2.5',
    crowd: 'cheer',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'hat-dance',
    name: 'Mexican Hat Dance',
    artist: 'Traditional',
    group: 'celebrate',
    bpm: 132,
    beats: 3,
    style: 'waltz',
    drums: 'k.c.c.',
    melody: 'G4:0.5 C5:1 G4:0.5 C5:1 | G4:0.5 C5:0.5 D5:0.5 E5:1.5 | G4:0.5 B4:1 G4:0.5 B4:1 | G4:0.5 B4:0.5 C5:0.5 D5:1.5',
    chords: 'C C G7 G7',
    source: 'From memory (traditional); check against a sheet.',
  },
  {
    id: 'happy-birthday',
    name: 'Happy Birthday to You',
    artist: 'Mildred J. Hill and Patty Hill',
    group: 'celebrate',
    bpm: 110,
    beats: 3,
    style: 'waltz',
    pickup: 1,
    melody: 'G4:0.75 G4:0.25 | A4 G4 C5 | B4:2 G4:0.75 G4:0.25 | A4 G4 D5 | C5:2 G4:0.75 G4:0.25 | G5 E5 C5 | B4 A4 F5:0.75 F5:0.25 | E5 C5 D5 | C5:3',
    chords: 'C G7 G7 C C F G7 C',
    source: 'From memory (public domain in the US since 2016); a well-known tune.',
  },

  // ---- Pregame ----
  {
    id: 'reveille',
    name: 'Reveille',
    artist: 'Traditional',
    group: 'pregame',
    bpm: 112,
    beats: 2,
    style: 'none',
    pickup: 0.5,
    melody: 'G4:0.5 | C5:0.25 E5:0.25 C5:0.5 G4:0.5 | C5:0.25 E5:0.25 C5:0.5 G4:0.5 | C5:0.25 E5:0.25 C5:0.5 E5:0.5 C5:0.5 | G4:1.5',
    source: 'From memory (traditional bugle call).',
  },

  // ---- Drama ----
  {
    id: 'toccata',
    name: 'Toccata in D Minor',
    artist: 'Johann Sebastian Bach',
    group: 'drama',
    bpm: 60,
    beats: 4,
    style: 'none',
    melody: 'A5:0.125 G5:0.125 A5:1.75 r:0.25 G5:0.125 F5:0.125 E5:0.125 D5:0.125 C#5:0.5 D5:1.5 r:1 | A4:0.125 G4:0.125 A4:1.75 r:0.25 E4:0.5 F4:0.5 C#4:0.5 D4:2',
    source: 'From memory (Bach), the opening bars.',
  },
  {
    id: 'bullfighter',
    name: 'Bullfighter',
    artist: 'ScoreKept Organ',
    group: 'drama',
    bpm: 108,
    beats: 3,
    style: 'stab',
    melody: 'A4:0.5 Bb4:0.5 C#5:0.5 D5:0.5 E5:1 | F5:0.5 E5:0.5 D5:0.5 C#5:0.5 D5:1 | A4:0.5 Bb4:0.5 C#5:0.5 D5:0.5 E5:0.5 F5:0.5 | E5:3',
    chords: 'Dm Dm Dm A7',
    source: 'Original, written for ScoreKept.',
  },

  // ---- Send-Offs ----
  {
    id: 'so-long',
    name: 'So Long',
    artist: 'ScoreKept Organ',
    group: 'sendoff',
    bpm: 100,
    beats: 4,
    style: 'stab',
    melody: 'G5:0.5 E5:0.5 C5:0.5 G4:0.5 A4:0.5 B4:0.5 C5:1 | [E4,G4,C5]:4',
    chords: 'C C',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'three-blind-mice',
    name: 'Three Blind Mice',
    artist: 'Traditional',
    group: 'sendoff',
    bpm: 132,
    beats: 3,
    style: 'waltz',
    melody: 'E4 D4 C4 | E4 D4 C4 | G4 F4:0.5 F4:0.5 E4 | G4 F4:0.5 F4:0.5 E4',
    chords: 'C C C C',
    source: 'From memory (traditional).',
  },
  {
    id: 'shave-haircut',
    name: 'Shave and a Haircut',
    artist: 'Traditional',
    group: 'sendoff',
    bpm: 140,
    beats: 4,
    style: 'none',
    melody: 'C5:1 G4:0.5 G4:0.5 A4:1 G4:1 | r:1 B4:1 C5:2',
    source: 'Traditional.',
  },

  // ---- Walk-ups (originals: organ over kick and clap) ----
  {
    id: 'wu-charge-up',
    name: 'Charge Up',
    artist: 'ScoreKept Organ',
    group: 'walkup',
    bpm: 128,
    beats: 4,
    style: 'stab',
    drums: 'k.c.k.c.',
    melody: 'C5:0.5 E5:0.5 G5:1 C5:0.5 E5:0.5 G5:1 | A5:0.5 G5:0.5 E5:0.5 G5:0.5 C6:2 | C5:0.5 E5:0.5 G5:1 C5:0.5 E5:0.5 G5:1 | A5:0.5 B5:0.5 C6:3',
    chords: 'C F C G',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'wu-stomp-clap',
    name: 'Stomp & Clap',
    artist: 'ScoreKept Organ',
    group: 'walkup',
    bpm: 96,
    beats: 4,
    style: 'none',
    drums: 'k.k.c...k.k.c...',
    melody: 'r:1 G4:0.5 Bb4:0.5 C5:2 | r:1 G4:0.5 Bb4:0.5 C5:0.5 Eb5:0.5 C5:1 | r:1 G4:0.5 Bb4:0.5 C5:2',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'wu-boogie',
    name: 'Ballpark Boogie',
    artist: 'ScoreKept Organ',
    group: 'walkup',
    bpm: 132,
    beats: 4,
    style: 'none',
    drums: 'k.h.s.h.',
    melody: 'C4:0.5 E4:0.5 G4:0.5 A4:0.5 Bb4:0.5 A4:0.5 G4:0.5 E4:0.5 | C4:0.5 E4:0.5 G4:0.5 A4:0.5 Bb4:0.5 A4:0.5 G4:0.5 E4:0.5 | F4:0.5 A4:0.5 C5:0.5 D5:0.5 Eb5:0.5 D5:0.5 C5:0.5 A4:0.5 | [C5,E5,G5]:2',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'wu-heat',
    name: 'Bring the Heat',
    artist: 'ScoreKept Organ',
    group: 'walkup',
    bpm: 120,
    beats: 4,
    style: 'stab',
    drums: 'k..ck.c.',
    melody: 'A4:0.5 C5:0.5 E5:0.5 A5:1 G5:0.5 E5:1 | A4:0.5 C5:0.5 E5:0.5 A5:1 B5:0.5 C6:1 | B5:0.5 A5:0.5 G5:0.5 E5:0.5 A5:2',
    chords: 'Am Am E7',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'wu-bounce',
    name: 'Rally Bounce',
    artist: 'ScoreKept Organ',
    group: 'walkup',
    bpm: 124,
    beats: 4,
    style: 'stab',
    drums: 'k.c.k.c.',
    melody: 'E5:0.5 E5:0.5 r:0.5 E5:0.5 G5:0.5 E5:0.5 D5:0.5 C5:0.5 | D5:0.5 D5:0.5 r:0.5 D5:0.5 F5:0.5 D5:0.5 C5:0.5 B4:0.5 | E5:0.5 E5:0.5 r:0.5 E5:0.5 G5:0.5 A5:0.5 G5:1 | C6:2',
    chords: 'C G C C',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'wu-big-league',
    name: 'Big League',
    artist: 'ScoreKept Organ',
    group: 'walkup',
    bpm: 108,
    beats: 4,
    style: 'march',
    drums: 'k...s...',
    melody: 'C5:1 G4:0.5 C5:0.5 E5:1 C5:0.5 E5:0.5 | G5:2 E5:1 C5:1 | D5:1 B4:0.5 D5:0.5 F5:1 D5:0.5 F5:0.5 | [C5,E5,G5,C6]:3',
    chords: 'C C G7 C',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'wu-funk',
    name: 'Hot Corner Funk',
    artist: 'ScoreKept Organ',
    group: 'walkup',
    bpm: 100,
    beats: 4,
    style: 'none',
    drums: 'k..k..s.k.k...s.',
    melody: 'E4:0.25 r:0.25 E4:0.25 G4:0.25 A4:0.5 Bb4:0.25 B4:0.25 E5:1 r:1 | E4:0.25 r:0.25 E4:0.25 G4:0.25 A4:0.5 Bb4:0.25 B4:0.25 D5:0.5 E5:0.5 G5:1 | E5:0.5 D5:0.5 B4:0.5 A4:0.5 E5:2',
    source: 'Original, written for ScoreKept.',
  },
  {
    id: 'wu-swing',
    name: 'Dugout Swing',
    artist: 'ScoreKept Organ',
    group: 'walkup',
    bpm: 140,
    beats: 4,
    style: 'shuffle',
    drums: 'k.h.s.h.',
    melody: 'C5:0.67 D5:0.33 E5:0.67 G5:0.33 A5:1 G5:1 | E5:0.67 G5:0.33 A5:0.67 G5:0.33 E5:1 C5:1 | D5:0.67 E5:0.33 F5:0.67 A5:0.33 G5:2 | [E5,G5,C6]:2',
    chords: 'C C G7 C',
    source: 'Original, written for ScoreKept.',
  },

  // ---- Game sounds ----
  { id: 'g-hit', name: 'Hit', artist: 'ScoreKept Organ', group: 'game', bpm: 120, beats: 4, melody: '[C5,E5,G5]:0.5 [D5,G5,B5]:1.2', source: 'Original.' },
  { id: 'g-walk', name: 'Walk', artist: 'ScoreKept Organ', group: 'game', bpm: 132, beats: 4, melody: 'G4:0.33 B4:0.33 D5:0.34 G5:1.5', source: 'Original.' },
  { id: 'g-run', name: 'Run Scores', artist: 'ScoreKept Organ', group: 'game', bpm: 132, beats: 4, melody: 'C5:0.33 E5:0.33 G5:0.34 C6:0.5 G5:0.25 [C5,E5,G5,C6]:1.6', crowd: 'cheer', source: 'Original.' },
  { id: 'g-strikeout', name: 'Strikeout', artist: 'ScoreKept Organ', group: 'game', bpm: 100, beats: 4, wah: true, melody: 'G4:0.9 F#4:0.9 F4:0.9 E4:2', source: 'Original.' },
  { id: 'g-big-out', name: 'Big Out', artist: 'ScoreKept Organ', group: 'game', bpm: 120, beats: 4, melody: '[G4,C5]:0.5 [G4,C5]:0.5 [C5,E5,G5]:2', crowd: 'cheer', source: 'Original.' },
  { id: 'g-sound-on', name: 'Sound On', artist: 'ScoreKept Organ', group: 'game', bpm: 160, beats: 2, melody: 'G4:0.25 C5:0.25 E5:0.25 [C5,E5,G5]:0.9', source: 'Original. The speaker button’s confirmation, as in the first version.' },
  { id: 'g-tie', name: 'Tie Game', artist: 'ScoreKept Organ', group: 'game', bpm: 112, beats: 4, melody: 'G4:0.5 G4:0.5 G4:0.5 [C5,E5]:2', source: 'Original.' },
];

const BY_ID = new Map(TUNES.map((t) => [t.id, t]));

export function tuneById(id: string): Tune | undefined {
  return BY_ID.get(id);
}

/** The Organ pad's albums, in order. */
export const ALBUMS: { group: TuneGroup; name: string }[] = [
  { group: 'rally', name: 'Rally' },
  { group: 'celebrate', name: 'Celebrate' },
  { group: 'pregame', name: 'Pregame' },
  { group: 'between', name: 'Between Innings' },
  { group: 'drama', name: 'Drama' },
  { group: 'sendoff', name: 'Send-Offs' },
  { group: 'walkup', name: 'Walk-Ups' },
];
