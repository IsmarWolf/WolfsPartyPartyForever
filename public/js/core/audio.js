/**
 * Efeitos sonoros 8-bit sintetizados na hora (Web Audio) — sem arquivos.
 * O contexto só nasce no primeiro gesto do usuário (regra dos navegadores).
 */
import { loadMuted, saveMuted } from './storage.js';

// escala pentatônica: qualquer sequência de notas soa bem junta
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98, 1760.0];

class Sfx {
  #ctx = null;
  #master = null;
  muted = loadMuted();

  /** Chame em qualquer gesto do usuário para destravar o áudio. */
  unlock() {
    if (!this.#ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.#ctx = new Ctx();
      this.#master = this.#ctx.createGain();
      this.#master.gain.value = this.muted ? 0 : 0.35;
      this.#master.connect(this.#ctx.destination);
    }
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    saveMuted(this.muted);
    if (this.#master) this.#master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  #ready() {
    return this.#ctx && this.#ctx.state === 'running' && !this.muted;
  }

  tone({ freq, to, type = 'square', dur = 0.08, vol = 0.25, delay = 0 }) {
    if (!this.#ready()) return;
    const t = this.#ctx.currentTime + delay;
    const osc = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.#master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ dur = 0.1, vol = 0.2, freq = 1200, delay = 0 }) {
    if (!this.#ready()) return;
    const t = this.#ctx.currentTime + delay;
    const len = Math.ceil(this.#ctx.sampleRate * dur);
    const buffer = this.#ctx.createBuffer(1, len, this.#ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.#ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.#ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = this.#ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.#master);
    src.start(t);
  }

  // ── sons nomeados ──────────────────────────────────────────────
  key()     { this.noise({ dur: 0.03, vol: 0.25, freq: 3000 }); this.tone({ freq: 1400, dur: 0.025, vol: 0.05 }); }
  nav()     { this.tone({ freq: 660, dur: 0.05, vol: 0.12 }); }
  change(d = 1) { this.tone({ freq: d > 0 ? 880 : 740, to: d > 0 ? 1100 : 600, dur: 0.06, vol: 0.14 }); }
  erase()   { this.tone({ freq: 440, to: 220, dur: 0.07, vol: 0.12 }); }
  tick()    { this.tone({ freq: 1800 + Math.random() * 600, dur: 0.018, vol: 0.06, type: 'triangle' }); }

  /** Trava de cada parte no aleatório: sobe na escala a cada passo. */
  lock(step) {
    const f = PENTA[step % PENTA.length];
    this.tone({ freq: f, dur: 0.09, vol: 0.18 });
    this.tone({ freq: f * 2, dur: 0.05, vol: 0.05, type: 'triangle', delay: 0.02 });
  }

  /** Dente da catraca da alavanca — sobe de tom conforme desce. */
  ratchet(p = 0) {
    this.noise({ dur: 0.02, vol: 0.18, freq: 2600 + p * 1200 });
    this.tone({ freq: 300 + p * 500, dur: 0.02, vol: 0.06, type: 'square' });
  }

  lever() {
    this.noise({ dur: 0.08, vol: 0.35, freq: 600 });
    this.tone({ freq: 160, to: 60, dur: 0.18, vol: 0.3, type: 'triangle' });
    this.noise({ dur: 0.05, vol: 0.2, freq: 2400, delay: 0.16 });
  }

  fanfare() {
    [0, 2, 4, 5].forEach((n, i) => this.tone({ freq: PENTA[n], dur: 0.12, vol: 0.16, delay: i * 0.07 }));
  }

  confirm() {
    [2, 4, 7].forEach((n, i) => this.tone({ freq: PENTA[n], dur: 0.14, vol: 0.18, delay: i * 0.08 }));
  }

  error() {
    this.tone({ freq: 220, dur: 0.09, vol: 0.18 });
    this.tone({ freq: 180, dur: 0.12, vol: 0.18, delay: 0.1 });
  }

  whoosh() {
    this.noise({ dur: 0.6, vol: 0.18, freq: 800 });
    this.tone({ freq: 200, to: 1600, dur: 0.6, vol: 0.08, type: 'sawtooth' });
  }
}

export const sfx = new Sfx();
