// Tiny WebAudio synth — no asset files, all sounds generated procedurally.
export type SfxName =
  | "shoot"
  | "kill"
  | "hurt"
  | "level"
  | "echo"
  | "pickup"
  | "death"
  | "ui";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

const STORAGE_KEY = "void-arena:muted";

export function initAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  muted = window.localStorage.getItem(STORAGE_KEY) === "1";
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.35, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

function tone(
  type: OscillatorType,
  from: number,
  to: number,
  dur: number,
  vol: number,
  delay = 0,
) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, freq: number) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
}

let lastShot = 0;

export function playSfx(name: SfxName) {
  if (muted || !ctx) return;
  switch (name) {
    case "shoot": {
      const now = ctx.currentTime;
      if (now - lastShot < 0.045) return; // throttle rapid fire
      lastShot = now;
      tone("square", 780, 180, 0.07, 0.12);
      noise(0.06, 0.06, 1800);
      break;
    }
    case "kill":
      noise(0.18, 0.12, 420);
      tone("triangle", 220, 60, 0.16, 0.08);
      break;
    case "hurt":
      tone("sawtooth", 260, 70, 0.22, 0.16);
      break;
    case "level":
      tone("triangle", 520, 660, 0.12, 0.14);
      tone("triangle", 660, 990, 0.16, 0.13, 0.1);
      break;
    case "echo":
      tone("sine", 340, 880, 0.35, 0.12);
      tone("sine", 170, 440, 0.4, 0.08, 0.05);
      break;
    case "pickup":
      tone("square", 880, 1320, 0.1, 0.1);
      break;
    case "death":
      tone("sawtooth", 300, 40, 0.9, 0.2);
      noise(0.6, 0.14, 220);
      break;
    case "ui":
      tone("square", 600, 900, 0.06, 0.09);
      break;
  }
}
