/*
 * The intro's two sounds (SPEC §12): an aluminum-bat crack and a crowd cheer.
 * Made here from noise and tones until Steve supplies recordings: drop
 * sounds/intro-bat.mp3 or sounds/intro-cheer.mp3 into public/ and they're
 * used instead. Everything is prepared before the PLAY BALL! tap, because
 * iOS only plays audio after a tap and it should start instantly (LESSONS 7).
 */
type Ctx = AudioContext;

const RATE = 44100;

function noise(seconds: number, seed = 1): Float32Array<ArrayBuffer> {
  const out = new Float32Array(new ArrayBuffer(Math.floor(seconds * RATE) * 4));
  let x = seed * 2654435761;
  for (let i = 0; i < out.length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out[i] = (x / 0x3fffffff) - 1;
  }
  return out;
}

/** A crack (a sharp burst) and the ring of an aluminum bat (a few bell-like tones). */
async function makeBat(): Promise<AudioBuffer> {
  const len = 1.2;
  const off = new OfflineAudioContext(1, Math.floor(len * RATE), RATE);
  const burst = off.createBuffer(1, Math.floor(0.03 * RATE), RATE);
  const n = noise(0.03, 7);
  for (let i = 0; i < n.length; i++) n[i]! *= Math.exp(-i / (0.004 * RATE));
  burst.copyToChannel(n, 0);
  const src = off.createBufferSource();
  src.buffer = burst;
  const hp = off.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1200;
  const crack = off.createGain();
  crack.gain.value = 1.0;
  src.connect(hp).connect(crack).connect(off.destination);
  src.start(0);
  // The ring: inharmonic partials, about a third as loud as the crack.
  for (const [f, decay, level] of [
    [1170, 0.5, 0.12],
    [2890, 0.35, 0.08],
    [4310, 0.25, 0.05],
    [6120, 0.15, 0.03],
  ] as const) {
    const o = off.createOscillator();
    o.frequency.value = f;
    const g = off.createGain();
    g.gain.setValueAtTime(level, 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, decay);
    o.connect(g).connect(off.destination);
    o.start(0.003);
    o.stop(decay);
  }
  return off.startRendering();
}

/** About five seconds of a crowd: shaped noise swelling up, rippling, and fading out. */
async function makeCheer(): Promise<AudioBuffer> {
  const len = 5;
  const off = new OfflineAudioContext(2, Math.floor(len * RATE), RATE);
  for (let ch = 0; ch < 2; ch++) {
    const buf = off.createBuffer(1, Math.floor(len * RATE), RATE);
    const n = noise(len, 11 + ch);
    // Many voices: a ripple of small swells on top of the big one.
    for (let i = 0; i < n.length; i++) {
      const t = i / RATE;
      const swell = Math.min(1, t / 0.6) * Math.min(1, (len - t) / 1.6);
      const ripple = 0.75 + 0.25 * Math.sin(t * 6.3 + ch) * Math.sin(t * 2.1 + 1.3 * ch);
      n[i]! *= swell * ripple;
    }
    buf.copyToChannel(n, 0);
    const src = off.createBufferSource();
    src.buffer = buf;
    const low = off.createBiquadFilter();
    low.type = 'bandpass';
    low.frequency.value = 650;
    low.Q.value = 0.7;
    const high = off.createBiquadFilter();
    high.type = 'bandpass';
    high.frequency.value = 1900;
    high.Q.value = 1.1;
    const mix = off.createGain();
    mix.gain.value = 0.32;
    const pan = off.createStereoPanner();
    pan.pan.value = ch === 0 ? -0.5 : 0.5;
    src.connect(low).connect(mix);
    src.connect(high).connect(mix);
    mix.connect(pan).connect(off.destination);
    src.start(0);
  }
  // A couple of whistles from the stands.
  for (const [at, from, to] of [
    [0.7, 2300, 3100],
    [1.6, 2600, 2200],
  ] as const) {
    const o = off.createOscillator();
    o.frequency.setValueAtTime(from, at);
    o.frequency.linearRampToValueAtTime(to, at + 0.45);
    const g = off.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.035, at + 0.05);
    g.gain.linearRampToValueAtTime(0, at + 0.5);
    o.connect(g).connect(off.destination);
    o.start(at);
    o.stop(at + 0.55);
  }
  return off.startRendering();
}

async function fromFile(ctx: Ctx, name: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(`./sounds/${name}`);
    if (!res.ok) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export interface IntroSounds {
  play: () => void;
}

/** Get both sounds ready before the tap. Resolves even if audio isn't available. */
export async function prepareIntroSounds(): Promise<IntroSounds> {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC || typeof OfflineAudioContext === 'undefined') return { play: () => undefined };
  try {
    const ctx = new AC();
    const [bat, cheer] = await Promise.all([
      fromFile(ctx, 'intro-bat.mp3').then((b) => b ?? makeBat()),
      fromFile(ctx, 'intro-cheer.mp3').then((b) => b ?? makeCheer()),
    ]);
    return {
      play: () => {
        void ctx.resume();
        const start = ctx.currentTime + 0.02;
        for (const [buf, at] of [
          [bat, start],
          [cheer, start + 0.25],
        ] as const) {
          const s = ctx.createBufferSource();
          s.buffer = buf;
          s.connect(ctx.destination);
          s.start(at);
        }
      },
    };
  } catch {
    return { play: () => undefined };
  }
}
