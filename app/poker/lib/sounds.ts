// Web Audio API synthesised poker sounds — no audio files required.
const RATE_LIMIT_MS = 60;
const DEFAULT_VOL = 0.72;

let audioCtx: AudioContext | null = null;
let muted = false;
let vol = DEFAULT_VOL;
const lastPlayed: Record<string, number> = {};

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

function out(c: AudioContext): GainNode {
  const g = c.createGain();
  g.gain.value = muted ? 0 : vol;
  g.connect(c.destination);
  return g;
}

function rateOk(name: string): boolean {
  const now = Date.now();
  if (now - (lastPlayed[name] ?? 0) < RATE_LIMIT_MS) return false;
  lastPlayed[name] = now;
  return true;
}

function osc(c: AudioContext, dst: AudioNode, freq: number, type: OscillatorType, gain: number, dur: number, attack = 0.005, freqEnd?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (freqEnd != null) o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + dur);
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(dst);
  o.start(c.currentTime); o.stop(c.currentTime + dur + 0.02);
}

function noise(c: AudioContext, dst: AudioNode, dur: number, gain: number, fq: number, ftype: BiquadFilterType = 'bandpass', q = 1) {
  const sz = Math.floor(c.sampleRate * (dur + 0.05));
  const buf = c.createBuffer(1, sz, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const flt = c.createBiquadFilter();
  flt.type = ftype; flt.frequency.value = fq; flt.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(flt); flt.connect(g); g.connect(dst);
  src.start(c.currentTime); src.stop(c.currentTime + dur + 0.05);
}

function chipClick(c: AudioContext, dst: AudioNode, t = 0) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.55, c.currentTime + t);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.08);
  g.connect(dst);
  const o = c.createOscillator();
  o.type = 'sine'; o.frequency.setValueAtTime(1700, c.currentTime + t);
  o.frequency.exponentialRampToValueAtTime(420, c.currentTime + t + 0.08);
  o.connect(g); o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.09);
  // noise burst
  const sz2 = Math.floor(c.sampleRate * 0.035);
  const b2 = c.createBuffer(1, sz2, c.sampleRate);
  const d2 = b2.getChannelData(0);
  for (let i = 0; i < sz2; i++) d2[i] = Math.random() * 2 - 1;
  const s2 = c.createBufferSource(); s2.buffer = b2;
  const f2 = c.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 3200;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.28, c.currentTime + t);
  g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t + 0.035);
  s2.connect(f2); f2.connect(g2); g2.connect(dst);
  s2.start(c.currentTime + t); s2.stop(c.currentTime + t + 0.04);
}

function cardSwoosh(c: AudioContext, dst: AudioNode, offset = 0) {
  const sz = Math.floor(c.sampleRate * 0.16);
  const buf = c.createBuffer(1, sz, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const flt = c.createBiquadFilter(); flt.type = 'bandpass'; flt.Q.value = 0.6;
  flt.frequency.setValueAtTime(7500, c.currentTime + offset);
  flt.frequency.exponentialRampToValueAtTime(1400, c.currentTime + offset + 0.16);
  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime + offset);
  g.gain.linearRampToValueAtTime(0.45, c.currentTime + offset + 0.018);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + 0.16);
  src.connect(flt); flt.connect(g); g.connect(dst);
  src.start(c.currentTime + offset); src.stop(c.currentTime + offset + 0.18);
}

type SoundFn = (c: AudioContext, dst: AudioNode) => void;

const sounds: Record<string, SoundFn> = {
  deal(c, dst) { cardSwoosh(c, dst, 0); cardSwoosh(c, dst, 0.08); },
  flop(c, dst) { cardSwoosh(c, dst, 0); cardSwoosh(c, dst, 0.1); cardSwoosh(c, dst, 0.2); },
  turn(c, dst) { cardSwoosh(c, dst); },
  river(c, dst) { cardSwoosh(c, dst); },
  showdown(c, dst) {
    osc(c, dst, 440, 'sine', 0.28, 0.4, 0.01, 880);
    osc(c, dst, 660, 'sine', 0.18, 0.32, 0.02);
  },
  fold(c, dst) {
    osc(c, dst, 110, 'sine', 0.35, 0.18, 0.001, 55);
    noise(c, dst, 0.09, 0.12, 700, 'lowpass', 2);
  },
  check(c, dst) { chipClick(c, dst, 0); chipClick(c, dst, 0.065); },
  call(c, dst) { for (let i = 0; i < 3; i++) chipClick(c, dst, i * 0.05); },
  raise(c, dst) {
    for (let i = 0; i < 5; i++) chipClick(c, dst, i * 0.038);
    osc(c, dst, 190, 'sine', 0.12, 0.28, 0.001, 95);
  },
  allin(c, dst) {
    for (let i = 0; i < 8; i++) chipClick(c, dst, i * 0.028);
    osc(c, dst, 140, 'sine', 0.28, 0.45, 0.001, 70);
    osc(c, dst, 280, 'triangle', 0.16, 0.35, 0.02);
  },
  win(c, dst) {
    [440, 554, 659, 880].forEach((f, i) => {
      const g2 = c.createGain(); g2.gain.value = 1; g2.connect(c.destination);
      setTimeout(() => osc(c, g2, f, 'sine', 0.22, 0.3, 0.01), i * 95);
    });
  },
};

export const PokerSounds = {
  play(name: string) {
    if (muted || !rateOk(name)) return;
    const c = ctx();
    if (!c) return;
    const fn = sounds[name];
    if (!fn) return;
    try { fn(c, out(c)); } catch { /* audio errors are non-fatal */ }
  },
  unlock() {
    const c = ctx();
    if (c?.state === 'suspended') c.resume();
  },
  setMute(m: boolean) { muted = m; },
  setVolume(v: number) { vol = Math.max(0, Math.min(1, v)); },
  isMuted() { return muted; },
  getVolume() { return vol; },
};
