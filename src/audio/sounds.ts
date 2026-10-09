// Sound effects synthesised with the Web Audio API, so the app ships no audio files.
// Browsers only let audio start after a user gesture, so call `unlockAudio()` from an input handler.

export type SoundName = 'reveal' | 'cascade' | 'flag' | 'unflag' | 'win' | 'lose';

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Creates or resumes the audio context. Call it from a click / key / touch handler. */
export function unlockAudio(): void {
  getContext();
}

interface ToneOptions {
  freq: number;
  /** Glide to this frequency over the note's duration. */
  endFreq?: number;
  type?: OscillatorType;
  start?: number;
  duration: number;
  volume: number;
}

function tone(ac: AudioContext, out: AudioNode, { freq, endFreq, type = 'sine', start = 0, duration, volume }: ToneOptions) {
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
  // Short attack and exponential decay avoid clicks at the start and end of each note.
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** A burst of filtered white noise: the "boom" of an explosion. */
function noise(ac: AudioContext, out: AudioNode, { duration, volume }: { duration: number; volume: number }) {
  const t = ac.currentTime;
  const length = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const source = ac.createBufferSource();
  source.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, t);
  filter.frequency.exponentialRampToValueAtTime(120, t + duration);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(filter).connect(gain).connect(out);
  source.start(t);
}

const SOUNDS: Record<SoundName, (ac: AudioContext, out: AudioNode) => void> = {
  // A soft "tick".
  reveal: (ac, out) => tone(ac, out, { freq: 620, endFreq: 300, type: 'triangle', duration: 0.07, volume: 0.25 }),
  // A quick rising ripple when a flood fill opens many cells.
  cascade: (ac, out) => {
    [523, 659, 784, 1047].forEach((freq, i) =>
      tone(ac, out, { freq, type: 'sine', start: i * 0.035, duration: 0.09, volume: 0.16 }),
    );
  },
  flag: (ac, out) => {
    tone(ac, out, { freq: 880, type: 'square', duration: 0.05, volume: 0.07 });
    tone(ac, out, { freq: 1320, type: 'square', start: 0.05, duration: 0.07, volume: 0.07 });
  },
  unflag: (ac, out) => {
    tone(ac, out, { freq: 1100, type: 'square', duration: 0.05, volume: 0.05 });
    tone(ac, out, { freq: 740, type: 'square', start: 0.045, duration: 0.06, volume: 0.05 });
  },
  // A C-major arpeggio.
  win: (ac, out) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone(ac, out, { freq, type: 'triangle', start: i * 0.11, duration: i === 3 ? 0.5 : 0.16, volume: 0.28 }),
    );
  },
  lose: (ac, out) => {
    noise(ac, out, { duration: 0.6, volume: 0.7 });
    tone(ac, out, { freq: 150, endFreq: 38, type: 'sine', duration: 0.5, volume: 0.6 });
  },
};

export function playSound(name: SoundName): void {
  const ac = getContext();
  if (!ac || !master) return;
  try {
    SOUNDS[name](ac, master);
  } catch {
    // Audio is a nice-to-have; never let it break the game.
  }
}
