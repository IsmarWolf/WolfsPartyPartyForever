/**
 * Joystick arrastável. Inclinar além da zona morta dispara 'nav'
 * na direção; segurando, repete (como segurar uma seta).
 * As setas do teclado físico também inclinam o bastão (feedback visual).
 */
import { pixelSVG, ballMap, ellipseMap } from '../art/pixel.js';

const DEADZONE = 0.45;
const REPEAT_DELAY = 380;
const REPEAT_EVERY = 130;
const RANGE_PX = 46; // arrasto (em px da tela, já escalado) para inclinação total

const BALL = { K: '#120827', B: '#ff4747', S: '#c4213a', L: '#ffc2c2' };
const BASE = { K: '#120827', B: '#2a1a5e', S: '#0f0824', L: '#4a2f96' };

export class Joystick {
  #dir = null;
  #timer = 0;
  #start = null;

  constructor({ root, onDir, getScale }) {
    this.root = root;
    this.onDir = onDir;
    this.getScale = getScale;
    root.innerHTML = `
      <div class="joy__base">${pixelSVG(ellipseMap(25, 10), BASE)}</div>
      <div class="joy__lever">
        <div class="joy__rod"></div>
        <div class="joy__ball">${pixelSVG(ballMap(7), BALL)}</div>
      </div>`;
    this.#bind();
  }

  #bind() {
    const r = this.root;
    r.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      r.setPointerCapture(e.pointerId);
      r.classList.add('is-grabbed');
      this.#start = { x: e.clientX, y: e.clientY };
    });
    r.addEventListener('pointermove', (e) => {
      if (!this.#start) return;
      const range = RANGE_PX * (this.getScale?.() ?? 1);
      let x = (e.clientX - this.#start.x) / range;
      let y = (e.clientY - this.#start.y) / range;
      const len = Math.hypot(x, y);
      if (len > 1) { x /= len; y /= len; }
      this.#set(x, y);
      this.#updateDir(x, y);
    });
    const release = () => {
      if (!this.#start) return;
      this.#start = null;
      r.classList.remove('is-grabbed');
      this.#set(0, 0);
      this.#updateDir(0, 0);
    };
    r.addEventListener('pointerup', release);
    r.addEventListener('pointercancel', release);
  }

  #set(x, y) {
    this.root.style.setProperty('--jx', x.toFixed(3));
    this.root.style.setProperty('--jy', y.toFixed(3));
  }

  #updateDir(x, y) {
    let dir = null;
    if (Math.hypot(x, y) > DEADZONE) {
      dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    }
    if (dir === this.#dir) return;
    this.#dir = dir;
    clearTimeout(this.#timer);
    if (!dir) return;
    this.onDir(dir);
    const repeat = () => {
      this.onDir(dir);
      this.#timer = setTimeout(repeat, REPEAT_EVERY);
    };
    this.#timer = setTimeout(repeat, REPEAT_DELAY);
  }

  /** Inclina por um instante (quando a seta vem do teclado físico). */
  nudge(dir) {
    if (this.#start) return;
    const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    if (!v) return;
    this.#set(v[0] * 0.8, v[1] * 0.8);
    clearTimeout(this._nudge);
    this._nudge = setTimeout(() => this.#set(0, 0), 140);
  }
}
