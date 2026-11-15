import { describe, expect, it } from 'vitest';
import { chordNotes, midiOf, parseChords, parseMelody } from '../../../src/sound/notes.ts';
import { TUNES } from '../../../src/sound/tunes.ts';

describe('tune notation', () => {
  it('reads notes, sharps, flats, rests, and chords', () => {
    expect(midiOf('C4')).toBe(60);
    expect(midiOf('F#4')).toBe(66);
    expect(midiOf('Bb3')).toBe(58);
    const { notes, beats } = parseMelody('D4:2 D5 r [C5,E5,G5]:0.5');
    expect(beats).toBe(4.5);
    expect(notes.map((n) => n.midi)).toEqual([[62], [74], [72, 76, 79]]);
    expect(chordNotes('A7')).toEqual([57, 61, 64, 67]);
    expect(parseChords('D - . Em')).toEqual(['D', 'D', null, 'Em']);
  });
});

describe('every tune', () => {
  for (const t of TUNES) {
    it(`${t.name}: reads, and its chords line up with its bars`, () => {
      const { beats } = parseMelody(t.melody);
      expect(beats).toBeGreaterThan(0);
      const chords = parseChords(t.chords);
      if (chords.length) {
        const bars = (beats - (t.pickup ?? 0)) / t.beats;
        expect(Math.abs(bars - chords.length)).toBeLessThan(0.51);
      }
      expect(t.source).not.toBe('');
    });
  }

  it('Take Me Out to the Ball Game is the whole 32-bar chorus, about 30 seconds', () => {
    const t = TUNES.find((x) => x.id === 'take-me-out')!;
    const { beats } = parseMelody(t.melody);
    expect(beats).toBe(96);
    expect((beats * 60) / t.bpm).toBeGreaterThan(28);
    expect((beats * 60) / t.bpm).toBeLessThan(32);
  });

  it('eight original walk-ups, each 5 to 9 seconds', () => {
    const w = TUNES.filter((t) => t.group === 'walkup' && t.artist === 'ScoreKept Organ');
    expect(w).toHaveLength(8);
    for (const t of w) {
      const s = (parseMelody(t.melody).beats * 60) / t.bpm;
      expect(s, t.name).toBeGreaterThanOrEqual(4.5);
      expect(s, t.name).toBeLessThanOrEqual(9);
    }
  });

  it('classical walk-ups from Steve\u2019s scores stay under 20 seconds', () => {
    const w = TUNES.filter((t) => t.group === 'walkup' && t.artist !== 'ScoreKept Organ');
    expect(w.map((t) => t.id).sort()).toEqual(['wu-mars', 'wu-rex']);
    for (const t of w) expect((parseMelody(t.melody).beats * 60) / t.bpm, t.name).toBeLessThan(20);
  });
});

describe('Stadium Sounds (Steve’s soundboard, Nov 15)', () => {
  it('fourteen recordings, each a file the app ships, in their own album', async () => {
    const { existsSync } = await import('node:fs');
    const { ALBUMS } = await import('../../../src/sound/tunes.ts');
    const st = TUNES.filter((t) => t.group === 'stadium');
    expect(st).toHaveLength(14);
    expect(ALBUMS.map((a) => a.name)).toContain('Stadium Sounds');
    for (const t of st) {
      expect(t.file, t.name).toMatch(/\.mp3$/);
      expect(existsSync(new URL(`../../../src/assets/sounds/${t.file!.split('/').pop()}`, import.meta.url)), t.name).toBe(true);
      expect(parseMelody(t.melody).beats).toBeLessThan(8);
    }
  });
});
