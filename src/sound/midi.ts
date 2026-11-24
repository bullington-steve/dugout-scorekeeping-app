/*
 * MIDI export (Steve, Nov 24): every Organ tune as a standard MIDI file, so it can be opened in
 * GarageBand or any music app and checked against its sheet music note for note. The right hand
 * (melody) is channel 1 and the left hand (the chords, in the tune's own style) channel 2, both on
 * General MIDI's Drawbar Organ, at the tune's own tempo and meter. Drums and crowd stay out.
 */
import { accompaniment } from './engine.ts';
import { chordNotes, parseChords, parseMelody } from './notes.ts';
import type { Tune } from './tunes.ts';

const PPQ = 480;
const ORGAN = 16; // General MIDI program 17, Drawbar Organ (0-based)

type Ev = { tick: number; order: number; bytes: number[] };

/** A variable-length quantity (SMF delta times and meta lengths). */
function vlq(n: number): number[] {
  const out = [n & 0x7f];
  for (let v = n >> 7; v > 0; v >>= 7) out.unshift((v & 0x7f) | 0x80);
  return out;
}

const text = (s: string) => [...new TextEncoder().encode(s)];
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/** Tunes that are notes for the organ (recorded sounds have no notes to write). */
export function hasNotes(t: Tune): boolean {
  return !t.file && parseMelody(t.melody).notes.length > 0;
}

/** One tune as a format-0 MIDI file. */
export function tuneMidi(t: Tune): Uint8Array {
  const evs: Ev[] = [];
  const at = (beats: number) => Math.round(beats * PPQ);
  const on = (tick: number, ch: number, note: number, vel: number) => evs.push({ tick, order: 2, bytes: [0x90 | ch, note & 127, vel] });
  const off = (tick: number, ch: number, note: number) => evs.push({ tick, order: 1, bytes: [0x80 | ch, note & 127, 0] });
  // Header: name, tempo, meter, and the organ on both hands.
  evs.push({ tick: 0, order: 0, bytes: [0xff, 0x03, ...vlq(text(t.name).length), ...text(t.name)] });
  const usPerBeat = Math.round(60_000_000 / t.bpm);
  evs.push({ tick: 0, order: 0, bytes: [0xff, 0x51, 0x03, (usPerBeat >> 16) & 255, (usPerBeat >> 8) & 255, usPerBeat & 255] });
  evs.push({ tick: 0, order: 0, bytes: [0xff, 0x58, 0x04, t.beats, 2, 24, 8] });
  const credit = `${t.artist}. Exported from ScoreKept.`;
  evs.push({ tick: 0, order: 0, bytes: [0xff, 0x02, ...vlq(text(credit).length), ...text(credit)] });
  evs.push({ tick: 0, order: 0, bytes: [0xc0, ORGAN] }, { tick: 0, order: 0, bytes: [0xc1, ORGAN] });
  // The right hand: the melody as written, a touch short of full length so repeated notes re-strike.
  const melody = parseMelody(t.melody);
  for (const n of melody.notes)
    for (const m of n.midi) {
      on(at(n.at), 0, m, 96);
      off(at(n.at + n.beats * 0.95), 0, m);
    }
  // The left hand: each bar's chord in the tune's style, the same hits the Organ plays.
  const start = t.pickup ?? 0;
  const lift = 12 * (t.chordOctave ?? 0);
  parseChords(t.chords).forEach((c, bar) => {
    if (!c) return;
    for (const hit of accompaniment(t.style ?? 'stab', t.beats)) {
      const when = start + bar * t.beats + hit.at;
      if (when >= melody.beats) continue;
      const notes = (hit.bass ? [chordNotes(c)[hit.fifth ? 2 : 0]! - 12] : chordNotes(c).slice(1)).map((m) => m + lift);
      for (const m of notes) {
        on(at(when), 1, m, hit.bass ? 84 : 64);
        off(at(when + hit.len * 0.9), 1, m);
      }
    }
  });
  const end = Math.max(at(melody.beats), ...evs.map((e) => e.tick));
  evs.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const track: number[] = [];
  let last = 0;
  for (const e of evs) {
    track.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  track.push(...vlq(end - last), 0xff, 0x2f, 0x00);
  return new Uint8Array([...text('MThd'), ...u32(6), 0, 0, 0, 1, (PPQ >> 8) & 255, PPQ & 255, ...text('MTrk'), ...u32(track.length), ...track]);
}

/** A file name from a tune's title: "Take Me Out to the Ball Game.mid". */
export function midiName(t: Tune): string {
  return `${t.name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim() || t.id}.mid`;
}

// ---- A plain zip (stored, no compression) so every tune comes out as one file ----------------

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const le16 = (n: number) => [n & 255, (n >>> 8) & 255];
const le32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

/** Files into one .zip (stored), the kind the Files app opens with a tap. */
export function zip(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const parts: number[][] = [];
  const central: number[] = [];
  let offset = 0;
  for (const f of files) {
    const name = text(f.name);
    const crc = crc32(f.bytes);
    // Version 20, flag 0x0800 (UTF-8 names), stored, a fixed 1980 date.
    const head = [...le32(0x04034b50), ...le16(20), ...le16(0x0800), ...le16(0), ...le16(0), ...le16(0x21), ...le32(crc), ...le32(f.bytes.length), ...le32(f.bytes.length), ...le16(name.length), ...le16(0), ...name];
    parts.push(head, [...f.bytes]);
    central.push(...le32(0x02014b50), ...le16(20), ...le16(20), ...le16(0x0800), ...le16(0), ...le16(0), ...le16(0x21), ...le32(crc), ...le32(f.bytes.length), ...le32(f.bytes.length), ...le16(name.length), ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(offset), ...name);
    offset += head.length + f.bytes.length;
  }
  const endRec = [...le32(0x06054b50), ...le16(0), ...le16(0), ...le16(files.length), ...le16(files.length), ...le32(central.length), ...le32(offset), ...le16(0)];
  const out = new Uint8Array(offset + central.length + endRec.length);
  let p = 0;
  for (const part of [...parts, central, endRec]) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

/** Every Organ tune with notes, each a .mid, in one zip. Names that repeat get a number. */
export function tunesZip(tunes: readonly Tune[]): Uint8Array {
  const seen = new Map<string, number>();
  return zip(
    tunes.filter(hasNotes).map((t) => {
      let name = midiName(t);
      const n = (seen.get(name) ?? 0) + 1;
      seen.set(name, n);
      if (n > 1) name = name.replace(/\.mid$/, ` ${n}.mid`);
      return { name, bytes: tuneMidi(t) };
    }),
  );
}
