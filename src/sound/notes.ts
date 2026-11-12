/*
 * How tunes are written down (SPEC §13): a melody as notes and beats, chords
 * one per bar, and an optional drum line. Plain text, so a tune can be read
 * against its sheet music note for note.
 *
 *   melody: "D4:2 D5 B4 A4 F#4 A4:3 r:1 [C5,E5,G5]:0.5"
 *     A note is a pitch (C4 is middle C; # sharp, b flat) and its length in
 *     beats after a colon (1 when left off). "r" is a rest. A chord is
 *     several pitches in brackets. A grace note before a note is written ~C5
 *     (it borrows a sliver of time from the note after it).
 *   chords: "D D A7 Em -" one per bar; "-" holds the chord before; "." is silence.
 *   drums:  "k.c.k.c." one bar, repeated: k kick, c clap, s snare, h hat, . nothing.
 */

export interface NoteEvent {
  /** Start, in beats from the top. */
  at: number;
  beats: number;
  /** MIDI note numbers (several for a chord). */
  midi: number[];
}

const PITCH: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "F#4" → 66. */
export function midiOf(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`Not a note: ${name}`);
  const pc = PITCH[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 12 * (Number(m[3]) + 1) + pc;
}

export function hzOf(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function parseMelody(text: string): { notes: NoteEvent[]; beats: number } {
  const notes: NoteEvent[] = [];
  let at = 0;
  let grace: number | null = null;
  for (const token of text.trim().split(/\s+/).filter(Boolean)) {
    if (token === '|') continue;
    const [head, len] = token.split(':') as [string, string | undefined];
    const beats = len === undefined ? 1 : Number(len);
    if (!Number.isFinite(beats) || beats <= 0) throw new Error(`Bad length: ${token}`);
    if (head.startsWith('~')) {
      grace = midiOf(head.slice(1));
      continue;
    }
    if (head === 'r') {
      at += beats;
      continue;
    }
    const midi = head.startsWith('[') ? head.slice(1, -1).split(',').map(midiOf) : [midiOf(head)];
    if (grace !== null) {
      const g = Math.min(0.12, beats / 4);
      notes.push({ at, beats: g, midi: [grace] });
      notes.push({ at: at + g, beats: beats - g, midi });
      grace = null;
    } else notes.push({ at, beats, midi });
    at += beats;
  }
  return { notes, beats: at };
}

/** Chord name → MIDI notes around middle C, root first: "A7", "Em", "Bb", "G#dim". */
export function chordNotes(name: string): number[] {
  const m = /^([A-G])(#|b)?(m|dim|7|m7|maj7)?$/.exec(name);
  if (!m) throw new Error(`Not a chord: ${name}`);
  const root = 48 + PITCH[m[1]!]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const shape = { '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] }[m[3] ?? '']!;
  return shape.map((s) => root + s);
}

export function parseChords(text: string | undefined): (string | null)[] {
  if (!text) return [];
  const out: (string | null)[] = [];
  let last: string | null = null;
  for (const t of text.trim().split(/\s+/)) {
    if (t === '|') continue;
    if (t === '-') out.push(last);
    else if (t === '.') out.push((last = null));
    else {
      chordNotes(t);
      out.push((last = t));
    }
  }
  return out;
}
