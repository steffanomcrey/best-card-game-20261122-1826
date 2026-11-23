// audio.js — Court of Embers sounds, WebAudio oscillators only, no files.
// A short blip per action; a rising arpeggio on victory, a falling one on defeat.
let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}
export function isMuted() {
  return muted;
}

function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq, startIn, dur, type = 'sine', gain = 0.08) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = ac.currentTime + startIn;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const sfx = {
  deal() { tone(520, 0, 0.08, 'triangle'); },
  play() { tone(392, 0, 0.12, 'triangle'); tone(587, 0.05, 0.12, 'triangle'); },
  attack() { tone(180, 0, 0.15, 'sawtooth', 0.06); tone(120, 0.06, 0.15, 'sawtooth', 0.05); },
  counter() { tone(660, 0, 0.1, 'square', 0.05); tone(880, 0.08, 0.14, 'square', 0.05); },
  turn() { tone(440, 0, 0.09, 'sine'); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle')); },
  loss() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.14, 0.24, 'sine')); },
  error() { tone(140, 0, 0.12, 'square', 0.05); },
};
