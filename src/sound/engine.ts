/*
 * The ballpark organ (SPEC §13): every built-in sound is made live with Web
 * Audio, so nothing needs downloading and it works with no signal. Three
 * Hammond B-3 through a Leslie (Hammond only since 2026.11.12-15, Steve's call), an echo
 * (Small Gym, Ballpark, Big Stadium), a drum kit for walk-ups, and a crowd.
 *
 * Notes are scheduled a little ahead in small batches, so a 75-second tune
 * doesn't build thousands of oscillators at once on an older iPhone.
 */
import { chordNotes, hzOf, parseChords, parseMelody } from './notes.ts';
import type { CrowdKind, Style, Tune } from './tunes.ts';

export type Voice = 'hammond';
export type Echo = 'off' | 'gym' | 'ballpark' | 'stadium';

/** A drawbar setting (0–8) as a loudness: each step down is about 3 dB. */
const bar = (n: number) => (n <= 0 ? 0 : 10 ** (-(8 - n) * 3 / 20));
/** The nine Hammond drawbars as pitches over the played note: 16', 5 1/3', 8', 4', 2 2/3', 2', 1 3/5', 1 1/3', 1'. */
const FOOTAGES = [0.5, 1.5, 1, 2, 3, 4, 5, 6, 8];
/** A drawbar registration like "888865432" as tonewheel partials, scaled so a full setting isn't louder than a light one. */
function drawbars(reg: string, scale: number): [number, number][] {
  return [...reg].map((c, i) => [FOOTAGES[i]!, bar(Number(c)) * scale] as [number, number]).filter(([, g]) => g > 0);
}

interface VoiceShape {
  /** Upper manual, for the melody. */
  partials: [ratio: number, gain: number][];
  /** Lower manual, for the left-hand chords. */
  lower: [ratio: number, gain: number][];
  /** Bass pedals: the 16' fundamental with a touch of the 8'. */
  bass: [ratio: number, gain: number][];
  attack: number;
  release: number;
  vibratoHz: number;
  vibratoCents: number;
  click: boolean;
  /** Hammond percussion: a harmonic that rings at each key press and dies away fast. */
  percussion?: { ratio: number; level: number; decay: number };
  /** Double the melody an octave down, the way ballpark organists play it. 0 is off. */
  octave: number;
}

export const VOICES: Record<Voice, { name: string; shape: VoiceShape }> = {
  // A Hammond B-3 through a Leslie, set up the way ballpark organists do it (Steve's guide, Nov 12):
  // upper manual 888865432 for a thick melody, lower manual 848000000 for warm chords, pedals 82,
  // melody doubled an octave down, light percussion and key click. The cabinet (tube warmth, C3
  // chorus, the fast two-rotor Leslie) and the stadium (EQ and long reverb) are shared, in context().
  hammond: {
    name: 'Ballpark Hammond',
    shape: {
      partials: drawbars('888865432', 0.3),
      lower: drawbars('848000000', 0.42),
      bass: [[1, 0.9], [2, 0.9 * bar(2)]],
      attack: 0.005,
      release: 0.09,
      vibratoHz: 6.8,
      vibratoCents: 4,
      click: true,
      percussion: { ratio: 2, level: 0.18, decay: 0.3 },
      octave: 0.55,
    },
  },
};

/** The room: a reverb's length, its pre-delay (the gap before the wash, like a far outfield wall), and how much. */
export const ECHOES: Record<Echo, { name: string; decay: number; preDelay: number; wet: number }> = {
  // Off: just the organ, no room at all (Steve, Nov 13).
  off: { name: 'Off', decay: 0, preDelay: 0, wet: 0 },
  gym: { name: 'Small Gym', decay: 1.3, preDelay: 0.025, wet: 0.22 },
  ballpark: { name: 'Ballpark', decay: 2.8, preDelay: 0.05, wet: 0.38 },
  stadium: { name: 'Big Stadium', decay: 3.8, preDelay: 0.06, wet: 0.42 },
};

interface Scheduled {
  /** Seconds from the start. */
  at: number;
  run: (when: number) => void;
}

export interface Playing {
  /** Seconds. */
  duration: number;
  ended: Promise<void>;
  stop: (fadeMs?: number) => void;
}

/** The length of a tune in seconds, including its last note ringing out. */
export function tuneSeconds(t: Tune): number {
  return (parseMelody(t.melody).beats * 60) / t.bpm + 0.3;
}

export class Organ {
  private ctx: AudioContext | null = null;
  /** Everything the organ and crowd play goes here: EQ, then dry plus stadium reverb. */
  private master: GainNode | null = null;
  /** The organ's cabinet input: tube warmth, chorus, Leslie, then master. */
  private cabinet: GainNode | null = null;
  /** Song files go straight out, with no organ cabinet or reverb on them. */
  private plain: GainNode | null = null;
  private preDelay: DelayNode | null = null;
  private reverb: ConvolverNode | null = null;
  private wet: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  voice: Voice = 'hammond';
  echo: Echo = 'gym';
  leslie = false;
  private cabWet: GainNode | null = null;
  private cabDry: GainNode | null = null;
  private files = new Map<string, Promise<AudioBuffer | null>>();

  /** The audio context, made on first use and resumed on a tap (iOS needs the tap). */
  context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    // The end of the line: a gentle limiter so a big chord in a big room never crackles.
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -12;
    limit.knee.value = 10;
    limit.ratio.value = 4;
    limit.attack.value = 0.005;
    limit.release.value = 0.25;
    limit.connect(ctx.destination);
    this.plain = ctx.createGain();
    this.plain.gain.value = 0.7;
    this.plain.connect(ctx.destination);
    // The stadium: warm low mids (150–300 Hz), rounded highs (rolled off above 6 kHz), then
    // dry plus a long reverb with a pre-delay.
    this.master = ctx.createGain();
    this.master.gain.value = 0.62;
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 220;
    body.Q.value = 0.8;
    body.gain.value = 4.5;
    const round = ctx.createBiquadFilter();
    round.type = 'highshelf';
    round.frequency.value = 6000;
    round.gain.value = -9;
    const top = ctx.createBiquadFilter();
    top.type = 'lowpass';
    top.frequency.value = 9500;
    this.master.connect(body).connect(round).connect(top);
    top.connect(limit);
    this.preDelay = ctx.createDelay(0.2);
    this.reverb = ctx.createConvolver();
    // Our tail is already scaled (hall() below); the browser's own scaling made it nearly silent.
    this.reverb.normalize = false;
    this.wet = ctx.createGain();
    top.connect(this.preDelay).connect(this.reverb).connect(this.wet).connect(limit);
    this.cabinet = this.buildCabinet(ctx);
    this.setEcho(this.echo);
    const n = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;
    return ctx;
  }

  /** Call from a tap: iOS only lets audio start after one (LESSONS 7). */
  unlock(): void {
    const ctx = this.context();
    if (ctx && ctx.state !== 'running') void ctx.resume();
  }

  setEcho(e: Echo): void {
    this.echo = e;
    if (!this.ctx || !this.preDelay || !this.reverb || !this.wet) return;
    const s = ECHOES[e];
    this.preDelay.delayTime.value = s.preDelay;
    this.wet.gain.value = s.wet;
    if (s.decay > 0) this.reverb.buffer = hall(this.ctx, s.decay);
  }

  /**
   * The Hammond's cabinet, shared by every tune: a hint of tube warmth (about 15% saturated),
   * C3 chorus (a gently wobbling short delay mixed with the dry sound), and a Leslie on fast:
   * the bass rotor turning at 5.9 Hz, the horn at 6.8 Hz with its pitch sway (Doppler) and a
   * left-right swing. Its wobblers run all the time; they cost next to nothing.
   */
  /** The Leslie speaker on (tube warmth, chorus, the spinning rotors) or off (the plain organ). */
  setLeslie(on: boolean): void {
    this.leslie = on;
    if (!this.cabWet || !this.cabDry) return;
    this.cabWet.gain.value = on ? 1 : 0;
    this.cabDry.gain.value = on ? 0 : 1;
  }

  private buildCabinet(ctx: AudioContext): GainNode {
    const entry = ctx.createGain();
    // Two ways out: through the cabinet, or straight to the room (Leslie off).
    this.cabWet = ctx.createGain();
    this.cabDry = ctx.createGain();
    entry.connect(this.cabDry).connect(this.master!);
    const input = ctx.createGain();
    entry.connect(this.cabWet).connect(input);
    this.setLeslie(this.leslie);
    const lfo = (hz: number, amount: number, target: AudioParam) => {
      const o = ctx.createOscillator();
      o.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.value = amount;
      o.connect(g).connect(target);
      o.start();
    };
    // Tube warmth: mostly clean, with a soft-clipped copy under it.
    const warm = ctx.createGain();
    const clean = ctx.createGain();
    clean.gain.value = 0.85;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';
    const grit = ctx.createGain();
    grit.gain.value = 0.15;
    input.connect(clean).connect(warm);
    input.connect(shaper).connect(grit).connect(warm);
    // C3 chorus: dry plus a copy through a short delay that sways.
    const chorus = ctx.createGain();
    const dry = ctx.createGain();
    dry.gain.value = 0.7;
    const sway = ctx.createDelay(0.02);
    sway.delayTime.value = 0.004;
    lfo(6.9, 0.0012, sway.delayTime);
    const swayed = ctx.createGain();
    swayed.gain.value = 0.55;
    warm.connect(dry).connect(chorus);
    warm.connect(sway).connect(swayed).connect(chorus);
    // The Leslie: lows to the bass rotor, highs to the horn, split at 800 Hz.
    const out = ctx.createGain();
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 800;
    const drum = ctx.createGain();
    drum.gain.value = 0.88;
    lfo(5.9, 0.18, drum.gain);
    chorus.connect(low).connect(drum).connect(out);
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 800;
    const doppler = ctx.createDelay(0.01);
    doppler.delayTime.value = 0.0015;
    lfo(6.8, 0.0004, doppler.delayTime);
    const horn = ctx.createGain();
    horn.gain.value = 0.8;
    lfo(6.8, 0.3, horn.gain);
    let tail: AudioNode = chorus.connect(high).connect(doppler).connect(horn);
    if (typeof ctx.createStereoPanner === 'function') {
      const pan = ctx.createStereoPanner();
      lfo(6.8, 0.45, pan.pan);
      tail = tail.connect(pan);
    }
    tail.connect(out);
    out.connect(this.master!);
    return entry;
  }

  /** Play a tune. Resolves `ended` when it finishes or is stopped. */
  play(t: Tune, opts: { volume?: number; voice?: Voice } = {}): Playing | null {
    const ctx = this.context();
    if (!ctx || !this.master) return null;
    this.unlock();
    const bus = ctx.createGain();
    bus.gain.value = opts.volume ?? 1;
    const shape = VOICES[opts.voice ?? this.voice].shape;
    bus.connect(this.cabinet ?? this.master);
    // Drums skip the organ cabinet: straight to the room.
    const kit = ctx.createGain();
    kit.connect(this.master);
    const beat = 60 / t.bpm;
    const { notes, beats } = parseMelody(t.melody);
    const events: Scheduled[] = [];
    // Vibrato: one wobble shared by every note of this tune.
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = t.wah ? 3.2 : shape.vibratoHz || 0.01;
    depth.gain.value = t.wah ? 45 : shape.vibratoCents;
    lfo.connect(depth);
    for (const n of notes) {
      const level = 0.3 / Math.sqrt(n.midi.length);
      for (const m of n.midi) {
        events.push({ at: n.at * beat, run: (when) => this.note(bus, depth, shape, shape.partials, hzOf(m), when, n.beats * beat * 0.94, level, true) });
        // The melody doubled an octave down, under single notes (chords are thick already).
        if (shape.octave && n.midi.length === 1) events.push({ at: n.at * beat, run: (when) => this.note(bus, depth, shape, shape.partials, hzOf(m - 12), when, n.beats * beat * 0.94, level * shape.octave, false) });
      }
    }
    // The left hand: the chord each bar, in the tune's style.
    const chords = parseChords(t.chords);
    const start = (t.pickup ?? 0) * beat;
    chords.forEach((c, bar) => {
      if (!c) return;
      for (const hit of accompaniment(t.style ?? 'stab', t.beats)) {
        const notesHere = hit.bass ? [chordNotes(c)[hit.fifth ? 2 : 0]! - 12] : chordNotes(c).slice(1);
        for (const m of notesHere)
          events.push({ at: start + (bar * t.beats + hit.at) * beat, run: (when) => this.note(bus, depth, shape, hit.bass ? shape.bass : shape.lower, hzOf(m), when, hit.len * beat * 0.9, hit.bass ? 0.24 : 0.1, false) });
      }
    });
    // Drums, bar by bar for the whole tune.
    if (t.drums) {
      const steps = t.drums.length;
      const bars = Math.ceil(beats / t.beats);
      for (let b = 0; b < bars; b++)
        for (let i = 0; i < steps; i++) {
          const k = t.drums[i]!;
          if (k === '.') continue;
          const at = (b * t.beats + (i * t.beats) / steps) * beat;
          if (at < beats * beat) events.push({ at, run: (when) => this.drum(kit, k, when) });
        }
    }
    if (t.crowd) events.push({ at: Math.max(0, beats * beat - 1.2), run: (when) => this.crowd(t.crowd!, when) });
    // The swell pedal: lean into the last phrase so the final chord blooms into the room.
    const total = tuneSeconds(t);
    if (total > 2.5) {
      const t0 = ctx.currentTime + 0.04;
      const v = opts.volume ?? 1;
      bus.gain.setValueAtTime(v, t0 + total - 1.8);
      bus.gain.linearRampToValueAtTime(v * 1.3, t0 + total - 0.3);
    }
    return this.schedule(ctx, bus, events, total, [lfo], [kit]);
  }

  /** A crowd on its own: cheer, roar, or groan. */
  crowdOnly(kind: CrowdKind): Playing | null {
    const ctx = this.context();
    if (!ctx || !this.master) return null;
    const bus = ctx.createGain();
    bus.connect(this.master);
    const len = { cheer: 2.6, roar: 4, groan: 1.6 }[kind];
    return this.schedule(ctx, bus, [{ at: 0, run: (when) => this.crowd(kind, when, bus) }], len, []);
  }

  /** A song file from the walk-up store: a slice of it, faded out at the end. */
  async playFile(id: string, load: () => Promise<Uint8Array | null>, opts: { start?: number; length?: number; volume?: number }): Promise<Playing | null> {
    const ctx = this.context();
    if (!ctx || !this.master) return null;
    this.unlock();
    if (!this.files.has(id))
      this.files.set(
        id,
        load().then((bytes) => (bytes ? ctx.decodeAudioData(bytes.slice().buffer as ArrayBuffer).catch(() => null) : null)),
      );
    const buffer = await this.files.get(id)!;
    if (!buffer) return null;
    const start = Math.min(opts.start ?? 0, Math.max(0, buffer.duration - 1));
    const length = Math.min(opts.length ?? 15, buffer.duration - start);
    const bus = ctx.createGain();
    bus.gain.value = opts.volume ?? 1;
    bus.connect(this.plain ?? this.master);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(bus);
    const now = ctx.currentTime + 0.02;
    src.start(now, start, length);
    bus.gain.setValueAtTime(opts.volume ?? 1, now + Math.max(0, length - 1));
    bus.gain.linearRampToValueAtTime(0, now + length);
    return this.schedule(ctx, bus, [], length, [src]);
  }

  /** The click wheel's soft click: a tiny, quiet burst, like plastic under a thumb. */
  click(): void {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    this.unlock();
    this.burst(ctx.destination, ctx.currentTime + 0.005, 0.012, 3200, 0.12);
  }

  /** Forget a decoded file (it was replaced or deleted). */
  forgetFile(id: string): void {
    this.files.delete(id);
  }

  private schedule(ctx: AudioContext, bus: GainNode, events: Scheduled[], duration: number, sources: AudioScheduledSourceNode[], chain: AudioNode[] = []): Playing {
    events.sort((a, b) => a.at - b.at);
    const t0 = ctx.currentTime + 0.04;
    for (const s of sources) if (s instanceof OscillatorNode) s.start(t0);
    let next = 0;
    let done = false;
    let resolve!: () => void;
    const ended = new Promise<void>((r) => (resolve = r));
    const pump = () => {
      const horizon = ctx.currentTime + 0.6;
      while (next < events.length && t0 + events[next]!.at < horizon) {
        events[next]!.run(t0 + events[next]!.at);
        next += 1;
      }
    };
    pump();
    const timer = setInterval(pump, 150);
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(timer);
      clearTimeout(endTimer);
      setTimeout(() => {
        for (const s of sources) {
          try {
            s.stop();
          } catch {
            // Already stopped.
          }
        }
        bus.disconnect();
        for (const n of chain) n.disconnect();
      }, 400);
      resolve();
    };
    const endTimer = setTimeout(finish, (duration + 0.1) * 1000);
    return {
      duration,
      ended,
      stop: (fadeMs = 250) => {
        if (done) return;
        const now = ctx.currentTime;
        bus.gain.cancelScheduledValues(now);
        bus.gain.setValueAtTime(bus.gain.value, now);
        bus.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
        next = events.length;
        setTimeout(finish, fadeMs);
      },
    };
  }

  private note(bus: AudioNode, vibrato: AudioNode, shape: VoiceShape, parts: [number, number][], hz: number, when: number, length: number, level: number, top: boolean): void {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(level, when + shape.attack);
    env.gain.setValueAtTime(level, when + Math.max(shape.attack, length));
    env.gain.linearRampToValueAtTime(0, when + Math.max(shape.attack, length) + shape.release);
    env.connect(bus);
    const end = when + Math.max(shape.attack, length) + shape.release + 0.02;
    for (const [ratio, gain] of parts) {
      const f = hz * ratio;
      // Real tonewheels stop near 6 kHz; anything higher is what made it tinny.
      if (f > 6000) continue;
      const o = ctx.createOscillator();
      o.frequency.value = f;
      vibrato.connect(o.detune);
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(env);
      o.start(when);
      o.stop(end);
      o.onended = () => vibrato.disconnect(o.detune);
    }
    // Percussion and key click belong to the melody's keys only.
    if (top && shape.percussion) {
      const p = shape.percussion;
      const o = ctx.createOscillator();
      o.frequency.value = hz * p.ratio;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level * p.level * 2, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + p.decay);
      o.connect(g).connect(bus);
      o.start(when);
      o.stop(when + p.decay + 0.02);
    }
    if (top && shape.click) this.burst(bus, when, 0.004, 2500, 0.035);
  }

  private burst(dest: AudioNode, when: number, length: number, hz: number, level: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.01, length));
    src.connect(f).connect(g).connect(dest);
    src.start(when, Math.random());
    src.stop(when + length + 0.05);
  }

  private drum(bus: AudioNode, kind: string, when: number): void {
    const ctx = this.ctx!;
    if (kind === 'k') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(140, when);
      o.frequency.exponentialRampToValueAtTime(42, when + 0.18);
      g.gain.setValueAtTime(0.75, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
      o.connect(g).connect(bus);
      o.start(when);
      o.stop(when + 0.3);
    } else if (kind === 'c') {
      for (const d of [0, 0.011, 0.022]) this.burst(bus, when + d, 0.09, 1400, 0.35);
    } else if (kind === 's') {
      this.burst(bus, when, 0.16, 1900, 0.32);
    } else if (kind === 'h') {
      this.burst(bus, when, 0.04, 8000, 0.12);
    }
  }

  private crowd(kind: CrowdKind, when: number, dest?: AudioNode): void {
    const ctx = this.ctx!;
    const out = dest ?? this.master!;
    const len = { cheer: 2.6, roar: 4, groan: 1.6 }[kind];
    for (const [hz, q, lvl] of kind === 'groan' ? ([[420, 1.2, 0.5]] as const) : ([[650, 0.7, 0.32], [1900, 1.1, 0.24]] as const)) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(hz, when);
      if (kind === 'groan') f.frequency.linearRampToValueAtTime(hz * 0.6, when + len);
      f.Q.value = q;
      const g = ctx.createGain();
      const peak = lvl * (kind === 'roar' ? 1.3 : 1);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(peak, when + (kind === 'groan' ? 0.15 : 0.35));
      g.gain.setValueAtTime(peak, when + len * 0.55);
      g.gain.linearRampToValueAtTime(0, when + len);
      src.connect(f).connect(g).connect(out);
      src.start(when, Math.random());
      src.stop(when + len + 0.05);
    }
  }
}

interface Hit {
  at: number;
  len: number;
  bass: boolean;
  fifth?: boolean;
}

/** Where the left hand plays within a bar, by style. */
export function accompaniment(style: Style, beats: number): Hit[] {
  switch (style) {
    case 'waltz':
      return [{ at: 0, len: 1, bass: true }, ...Array.from({ length: beats - 1 }, (_, i) => ({ at: i + 1, len: 0.8, bass: false }))];
    case 'polka':
      return Array.from({ length: beats * 2 }, (_, i) => ({ at: i / 2, len: 0.4, bass: i % 2 === 0, fifth: i % 4 === 2 }));
    case 'march':
      return Array.from({ length: beats }, (_, i) => ({ at: i, len: 0.8, bass: i % 2 === 0, fifth: i % 4 === 2 }));
    case 'shuffle':
      return Array.from({ length: beats }, (_, i) => [{ at: i, len: 0.6, bass: true, fifth: i % 2 === 1 }, ...(i % 2 === 1 ? [{ at: i, len: 0.5, bass: false }] : [])]).flat();
    case 'hold':
      return [{ at: 0, len: beats, bass: true }, { at: 0, len: beats, bass: false }];
    case 'stab':
      return [{ at: 0, len: 0.5, bass: true }, { at: 0, len: 0.5, bass: false }];
    case 'none':
      return [];
  }
}

/** One organ for the whole app. */
export const organ = new Organ();

/**
 * A stadium's reverb tail, made on the device: two channels of noise dying away over `decay`
 * seconds, darker as it fades (concrete and open air soak up the highs first).
 */
function hall(ctx: BaseAudioContext, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * decay);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    let energy = 0;
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const k = 0.5 + 0.45 * (t / decay); // more smoothing later: darker tail
      lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
      d[i] = lp * Math.exp((-6.9 * t) / decay);
      energy += d[i]! * d[i]!;
    }
    // Scale to unit energy: the tail comes out about as loud as what went in, before `wet`.
    const g = 1 / Math.sqrt(energy || 1);
    for (let i = 0; i < len; i++) d[i]! *= g;
  }
  return buf;
}
