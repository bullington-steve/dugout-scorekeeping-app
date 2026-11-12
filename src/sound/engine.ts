/*
 * The ballpark organ (SPEC §13): every built-in sound is made live with Web
 * Audio, so nothing needs downloading and it works with no signal. Three
 * voices (Ballpark Hammond, Old-Time Calliope, Stadium Pipe Organ), an echo
 * (Small Gym, Ballpark, Big Stadium), a drum kit for walk-ups, and a crowd.
 *
 * Notes are scheduled a little ahead in small batches, so a 75-second tune
 * doesn't build thousands of oscillators at once on an older iPhone.
 */
import { chordNotes, hzOf, parseChords, parseMelody } from './notes.ts';
import type { CrowdKind, Style, Tune } from './tunes.ts';

export type Voice = 'hammond' | 'calliope' | 'pipe';
export type Echo = 'gym' | 'ballpark' | 'stadium';

interface VoiceShape {
  partials: [ratio: number, gain: number][];
  attack: number;
  release: number;
  vibratoHz: number;
  vibratoCents: number;
  click: boolean;
  breath: boolean;
  /** Hammond percussion: a harmonic that rings at each key press and dies away fast. */
  percussion?: { ratio: number; level: number; decay: number };
  /** A Leslie speaker's swirl: the volume rising and falling as the rotor turns. */
  leslie?: { hz: number; depth: number };
  /** Tube preamp warmth: a gentle soft clip. 0 is clean. */
  drive?: number;
}

export const VOICES: Record<Voice, { name: string; shape: VoiceShape }> = {
  // A Hammond B-3 through a Leslie, the ballpark sound (Steve, Nov 12): sine tonewheels set on the
  // drawbars 88 8630 000 (16', 5 1/3', 8', 4', 2 2/3', 2'), third-harmonic percussion on every key,
  // key click, the Leslie's fast rotor (pitch wobble and swirl), and a little tube growl.
  hammond: {
    name: 'Ballpark Hammond',
    shape: {
      partials: [[0.5, 0.36], [1.5, 0.3], [1, 0.4], [2, 0.3], [3, 0.14], [4, 0.08]],
      attack: 0.004,
      release: 0.05,
      vibratoHz: 6.8,
      vibratoCents: 9,
      click: true,
      breath: false,
      percussion: { ratio: 3, level: 0.3, decay: 0.22 },
      leslie: { hz: 5.9, depth: 0.22 },
      drive: 1.6,
    },
  },
  calliope: {
    name: 'Old-Time Calliope',
    shape: { partials: [[1, 0.6], [2, 0.12], [3, 0.24], [5, 0.06]], attack: 0.02, release: 0.09, vibratoHz: 7.2, vibratoCents: 26, click: false, breath: true },
  },
  pipe: {
    name: 'Stadium Pipe Organ',
    shape: { partials: [[0.5, 0.22], [1, 0.5], [2, 0.38], [4, 0.24], [8, 0.1]], attack: 0.045, release: 0.28, vibratoHz: 0, vibratoCents: 0, click: false, breath: false },
  },
};

export const ECHOES: Record<Echo, { name: string; delay: number; feedback: number; wet: number }> = {
  gym: { name: 'Small Gym', delay: 0.07, feedback: 0.2, wet: 0.14 },
  ballpark: { name: 'Ballpark', delay: 0.16, feedback: 0.32, wet: 0.24 },
  stadium: { name: 'Big Stadium', delay: 0.3, feedback: 0.42, wet: 0.32 },
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
  private master: GainNode | null = null;
  private delay: DelayNode | null = null;
  private feedback: GainNode | null = null;
  private wet: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  voice: Voice = 'hammond';
  echo: Echo = 'ballpark';
  private files = new Map<string, Promise<AudioBuffer | null>>();

  /** The audio context, made on first use and resumed on a tap (iOS needs the tap). */
  context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.delay = ctx.createDelay(1);
    this.feedback = ctx.createGain();
    this.wet = ctx.createGain();
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    this.master.connect(ctx.destination);
    this.master.connect(this.delay);
    this.delay.connect(tone).connect(this.feedback).connect(this.delay);
    this.delay.connect(this.wet).connect(ctx.destination);
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
    if (!this.delay || !this.feedback || !this.wet) return;
    const s = ECHOES[e];
    this.delay.delayTime.value = s.delay;
    this.feedback.gain.value = s.feedback;
    this.wet.gain.value = s.wet;
  }

  /** Play a tune. Resolves `ended` when it finishes or is stopped. */
  play(t: Tune, opts: { volume?: number; voice?: Voice } = {}): Playing | null {
    const ctx = this.context();
    if (!ctx || !this.master) return null;
    this.unlock();
    const bus = ctx.createGain();
    bus.gain.value = opts.volume ?? 1;
    const shape = VOICES[opts.voice ?? this.voice].shape;
    // The cabinet: tube growl, then the Leslie's swirl, then out.
    let out: AudioNode = bus;
    const chain: AudioNode[] = [];
    if (shape.drive) {
      const shaper = ctx.createWaveShaper();
      const k = shape.drive;
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(k * x) / Math.tanh(k);
      }
      shaper.curve = curve;
      out = out.connect(shaper);
      chain.push(shaper);
    }
    const rotor = ctx.createOscillator();
    if (shape.leslie) {
      const swirl = ctx.createGain();
      swirl.gain.value = 1 - shape.leslie.depth / 2;
      const amount = ctx.createGain();
      amount.gain.value = shape.leslie.depth / 2;
      rotor.frequency.value = shape.leslie.hz;
      rotor.connect(amount).connect(swirl.gain);
      out = out.connect(swirl);
      chain.push(swirl);
    }
    out.connect(this.master);
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
      for (const m of n.midi) events.push({ at: n.at * beat, run: (when) => this.note(bus, depth, shape, hzOf(m), when, n.beats * beat * 0.92, 0.32 / Math.sqrt(n.midi.length)) });
    }
    // The left hand: the chord each bar, in the tune's style.
    const chords = parseChords(t.chords);
    const start = (t.pickup ?? 0) * beat;
    chords.forEach((c, bar) => {
      if (!c) return;
      for (const hit of accompaniment(t.style ?? 'stab', t.beats)) {
        const notesHere = hit.bass ? [chordNotes(c)[hit.fifth ? 2 : 0]! - 12] : chordNotes(c).slice(1);
        for (const m of notesHere)
          events.push({ at: start + (bar * t.beats + hit.at) * beat, run: (when) => this.note(bus, depth, shape, hzOf(m), when, hit.len * beat * 0.9, hit.bass ? 0.2 : 0.09) });
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
          if (at < beats * beat) events.push({ at, run: (when) => this.drum(bus, k, when) });
        }
    }
    if (t.crowd) events.push({ at: Math.max(0, beats * beat - 1.2), run: (when) => this.crowd(t.crowd!, when) });
    return this.schedule(ctx, bus, events, tuneSeconds(t), [lfo, rotor], chain);
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
    bus.connect(this.master);
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

  private note(bus: AudioNode, vibrato: AudioNode, shape: VoiceShape, hz: number, when: number, length: number, level: number): void {
    const ctx = this.ctx!;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(level, when + shape.attack);
    env.gain.setValueAtTime(level, when + Math.max(shape.attack, length));
    env.gain.linearRampToValueAtTime(0, when + Math.max(shape.attack, length) + shape.release);
    env.connect(bus);
    const end = when + Math.max(shape.attack, length) + shape.release + 0.02;
    for (const [ratio, gain] of shape.partials) {
      const f = hz * ratio;
      if (f > 9000) continue;
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
    if (shape.percussion) {
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
    if (shape.click) this.burst(bus, when, 0.004, 4000, 0.05);
    if (shape.breath) this.burst(env, when, length, 2500, 0.03);
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
