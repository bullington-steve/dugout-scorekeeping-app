/* MIDI export (Steve, Nov 24): every Organ tune as a standard MIDI file, all in one zip. */
import { describe, expect, it } from 'vitest';
import { crc32, hasNotes, midiName, tuneMidi, tunesZip, zip } from '../../src/sound/midi.ts';
import { parseMelody } from '../../src/sound/notes.ts';
import { TUNES, tuneById } from '../../src/sound/tunes.ts';

/** Read a format-0 MIDI file back: tempo, meter, and every note-on per channel, in beats. */
function readMidi(b: Uint8Array) {
  const s = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  expect(s(0, 4)).toBe('MThd');
  const ppq = (b[12]! << 8) | b[13]!;
  expect(s(14, 4)).toBe('MTrk');
  const len = (b[18]! << 24) | (b[19]! << 16) | (b[20]! << 8) | b[21]!;
  expect(22 + len).toBe(b.length);
  let p = 22;
  let tick = 0;
  let tempo = 0;
  let meter = 0;
  let ended = false;
  const ons: { ch: number; note: number; beat: number }[] = [];
  const vlq = () => {
    let v = 0;
    for (;;) {
      const x = b[p++]!;
      v = (v << 7) | (x & 0x7f);
      if (!(x & 0x80)) return v;
    }
  };
  while (p < b.length) {
    tick += vlq();
    const st = b[p++]!;
    if (st === 0xff) {
      const type = b[p++]!;
      const n = vlq();
      if (type === 0x51) tempo = (b[p]! << 16) | (b[p + 1]! << 8) | b[p + 2]!;
      if (type === 0x58) meter = b[p]!;
      if (type === 0x2f) ended = true;
      p += n;
    } else if ((st & 0xf0) === 0x90) {
      ons.push({ ch: st & 15, note: b[p]!, beat: tick / ppq });
      p += 2;
    } else if ((st & 0xf0) === 0x80) p += 2;
    else if ((st & 0xf0) === 0xc0) p += 1;
    else throw new Error(`unexpected status ${st.toString(16)} at ${p}`);
  }
  return { tempo, meter, ons, ended };
}

describe('MIDI export', () => {
  it('Take Me Out to the Ball Game comes out note for note, at its tempo and meter, with the chords on their own channel', () => {
    const t = TUNES.find((x) => /Take Me Out/.test(x.name))!;
    const got = readMidi(tuneMidi(t));
    expect(got.ended).toBe(true);
    expect(got.tempo).toBe(Math.round(60_000_000 / t.bpm));
    expect(got.meter).toBe(t.beats);
    const melody = parseMelody(t.melody).notes.flatMap((n) => n.midi.map((m) => ({ note: m, beat: n.at })));
    const right = got.ons.filter((o) => o.ch === 0).map((o) => ({ note: o.note, beat: Math.round(o.beat * 1000) / 1000 }));
    expect(right).toEqual(melody.map((m) => ({ note: m.note, beat: Math.round(m.beat * 1000) / 1000 })));
    if (t.chords) expect(got.ons.some((o) => o.ch === 1)).toBe(true);
  });

  it('every tune with notes writes a readable file; recorded sounds are left out', () => {
    for (const t of TUNES.filter(hasNotes)) expect(() => readMidi(tuneMidi(t)), t.name).not.toThrow();
    expect(midiName(tuneById('over-the-fence')!)).toBe('Over the Fence Is Out!.mid');
  });

  it('the zip holds one .mid per tune, with correct checksums', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    const z = tunesZip(TUNES);
    const count = TUNES.filter(hasNotes).length;
    // The end record says how many files, and each local header's checksum matches its bytes.
    const end = z.length - 22;
    expect(z[end]! | (z[end + 1]! << 8) | (z[end + 2]! << 16) | (z[end + 3]! << 24)).toBe(0x06054b50);
    expect(z[end + 10]! | (z[end + 11]! << 8)).toBe(count);
    let p = 0;
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const crc = (z[p + 14]! | (z[p + 15]! << 8) | (z[p + 16]! << 16) | (z[p + 17]! << 24)) >>> 0;
      const size = z[p + 18]! | (z[p + 19]! << 8) | (z[p + 20]! << 16) | (z[p + 21]! << 24);
      const nameLen = z[p + 26]! | (z[p + 27]! << 8);
      names.push(new TextDecoder().decode(z.slice(p + 30, p + 30 + nameLen)));
      const body = z.slice(p + 30 + nameLen, p + 30 + nameLen + size);
      expect(crc32(body)).toBe(crc);
      expect(String.fromCharCode(...body.slice(0, 4))).toBe('MThd');
      p += 30 + nameLen + size;
    }
    expect(new Set(names).size).toBe(count);
    expect(names.every((n) => n.endsWith('.mid'))).toBe(true);
    expect(zip([]).length).toBe(22);
  });
});
