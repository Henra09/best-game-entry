// Generated sound, WebAudio only: no asset files. Each effect is a short
// envelope on oscillators and filtered noise, built lazily so nothing plays
// before the first user gesture. `setMuted` keeps the settings honest.
import { COLORS } from './config.js';

function note(context, destination, { type = 'sine', from = 440, to = null, at = 0, hold = 0.15, gain = 0.2, curve = 'exp' }) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = type;
  const start = context.currentTime + at;
  oscillator.frequency.setValueAtTime(from, start);
  if (to !== null) {
    if (curve === 'exp') oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + hold);
    else oscillator.frequency.linearRampToValueAtTime(to, start + hold);
  }
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + hold);
  oscillator.connect(envelope).connect(destination);
  oscillator.start(start);
  oscillator.stop(start + hold + 0.02);
}

function noise(context, destination, { at = 0, hold = 0.15, gain = 0.18, from = 3000, to = 300 }) {
  const frames = Math.floor(context.sampleRate * hold) || 1;
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frames);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass';
  const start = context.currentTime + at;
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + hold);
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(gain, start);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + hold);
  source.connect(filter).connect(envelope).connect(destination);
  source.start(start);
}

/** The rising tone a combo of `chain` steps plays: brighter with every step. */
function chainPitch(chain) {
  return 330 * 1.1225 ** Math.min(chain, 10);
}

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (typeof Ctor !== 'function') return false;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    return true;
  }

  function resume() {
    if (!ensure()) return;
    if (context.state === 'suspended') context.resume();
  }

  return {
    /** Wake the audio graph on the first gesture; call before any effect. */
    wake: resume,
    setMuted(next) {
      muted = next;
      if (master !== null) master.gain.value = next ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    deflect(chain) {
      if (!ensure() || muted || context.state !== 'running') return;
      const pitch = chainPitch(chain);
      note(context, master, { type: 'triangle', from: pitch, to: pitch * 1.5, hold: 0.11, gain: 0.22 });
      noise(context, master, { hold: 0.06, gain: 0.1, from: 5200, to: 1400 });
    },
    pulse() {
      if (!ensure() || muted || context.state !== 'running') return;
      note(context, master, { type: 'sawtooth', from: 220, to: 55, hold: 0.4, gain: 0.3 });
      noise(context, master, { hold: 0.35, gain: 0.24, from: 900, to: 120 });
    },
    mote() {
      if (!ensure() || muted || context.state !== 'running') return;
      note(context, master, { type: 'sine', from: 660, hold: 0.1, gain: 0.16 });
      note(context, master, { type: 'sine', from: 990, at: 0.09, hold: 0.14, gain: 0.16 });
    },
    hurt() {
      if (!ensure() || muted || context.state !== 'running') return;
      note(context, master, { type: 'square', from: 200, to: 70, hold: 0.3, gain: 0.3 });
      noise(context, master, { hold: 0.25, gain: 0.2, from: 700, to: 90 });
    },
    gameOver() {
      if (!ensure() || muted || context.state !== 'running') return;
      note(context, master, { type: 'triangle', from: 392, hold: 0.22, gain: 0.22 });
      note(context, master, { type: 'triangle', from: 311, at: 0.22, hold: 0.22, gain: 0.22 });
      note(context, master, { type: 'triangle', from: 233, at: 0.44, hold: 0.5, gain: 0.24 });
    },
    waveUp() {
      if (!ensure() || muted || context.state !== 'running') return;
      note(context, master, { type: 'triangle', from: 523, hold: 0.12, gain: 0.2 });
      note(context, master, { type: 'triangle', from: 659, at: 0.12, hold: 0.12, gain: 0.2 });
      note(context, master, { type: 'triangle', from: 784, at: 0.24, hold: 0.2, gain: 0.2 });
    },
  };
}

/** Re-exported so the renderer and audio agree on spark colours. */
export const SPARK_COLORS = COLORS;
