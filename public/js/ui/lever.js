/**
 * Alavanca com física: você ARRASTA (puxa para baixo, na sua direção).
 *
 * - O braço segue o ponteiro com um pouco de "peso" (mola rígida).
 * - Ao soltar, ele mantém o embalo: um puxão rápido vai até o fim sozinho;
 *   um puxão lento que não passou do ponto volta pela mola de retorno.
 * - Chegou no fim (pos = 1) → trava, faz "clunk" e emite 'pull'.
 * - Catraca: um tique a cada dente durante o percurso.
 *
 * Visual: a alavanca está de pé no painel; puxar a traz em sua direção,
 * então a haste encurta, passa pelo pivô e aponta para baixo, e a bola cresce.
 */
import { Emitter } from '../core/emitter.js';
import { pixelSVG, ballMap } from '../art/pixel.js';

const KNOB = { K: '#120827', B: '#ff4747', S: '#c4213a', L: '#ffc2c2' };
const LEAN = 8 * Math.PI / 180; // inclinação da haste
const ROD = 213;                // comprimento da haste (px do palco)
const BOTTOM = -0.5;            // no fim, a haste aponta para baixo com metade do tamanho
const TRAVEL = ROD * (1 - BOTTOM) * Math.cos(LEAN); // percurso vertical da bola

const RETURN_K = 16;      // mola que devolve a alavanca
const RETURN_DAMP = 2.4;  // atrito no retorno
const GRAB_K = 520;       // quão "grudada" no dedo (menor = mais pesada)
const GRAB_DAMP = 42;
const NOTCHES = 8;

export class Lever extends Emitter {
  pos = 0;
  vel = 0;
  #target = 0;
  #dragging = false;
  #fired = false;
  #lastNotch = 0;
  #start = null;
  #samples = [];
  #raf = 0;

  constructor({ root, sfx, getScale }) {
    super();
    this.root = root;
    this.knob = root.querySelector('.lever__knob');
    this.sfx = sfx;
    this.getScale = getScale;
    this.knob.innerHTML = pixelSVG(ballMap(10), KNOB);
    this.#bind();
    this.#render();
  }

  /** Puxão automático (botão ALEATÓRIO, teclado): um empurrão forte. */
  autoPull() {
    if (this.#dragging || this.#fired) return;
    this.vel = 9;
    this.#wake();
  }

  // ─────────────────────────────────────────── entrada
  #bind() {
    const grab = (e) => {
      e.preventDefault();
      this.knob.setPointerCapture(e.pointerId);
      this.#dragging = true;
      this.root.classList.add('is-grabbed');
      this.#start = { y: e.clientY, pos: this.pos };
      this.#target = this.pos;
      this.#samples = [];
      this.#wake();
    };
    this.knob.addEventListener('pointerdown', grab);
    this.root.querySelector('.lever__rod').addEventListener('pointerdown', grab);

    this.knob.addEventListener('pointermove', (e) => {
      if (!this.#dragging) return;
      const px = TRAVEL * (this.getScale?.() ?? 1);
      this.#target = clamp(this.#start.pos + (e.clientY - this.#start.y) / px, 0, 1.02);
      this.#samples.push({ t: performance.now(), p: this.#target });
      if (this.#samples.length > 6) this.#samples.shift();
    });
    const release = () => {
      if (!this.#dragging) return;
      this.#dragging = false;
      this.root.classList.remove('is-grabbed');
      // embalo = velocidade média dos últimos movimentos do ponteiro
      const s = this.#samples;
      if (s.length >= 2) {
        const dt = (s.at(-1).t - s[0].t) / 1000;
        if (dt > 0 && performance.now() - s.at(-1).t < 90) this.vel = Math.max(this.vel, (s.at(-1).p - s[0].p) / dt);
      }
      this.#wake();
    };
    this.knob.addEventListener('pointerup', release);
    this.knob.addEventListener('pointercancel', release);
    this.knob.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        this.autoPull();
      }
    });
  }

  // ─────────────────────────────────────────── física
  #wake() {
    if (this.#raf) return;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      this.#integrate(dt);
      this.#render();
      if (!this.#dragging && Math.abs(this.pos) < 0.001 && Math.abs(this.vel) < 0.01) {
        this.pos = 0;
        this.vel = 0;
        this.#raf = 0;
        this.#render();
        return;
      }
      this.#raf = requestAnimationFrame(step);
    };
    this.#raf = requestAnimationFrame(step);
  }

  #integrate(dt) {
    const n = 4; // sub-passos: a mola rígida fica estável
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const acc = this.#dragging && !this.#fired
        ? GRAB_K * (this.#target - this.pos) - GRAB_DAMP * this.vel
        : -RETURN_K * (this.pos + 0.15 * this.pos ** 3) - RETURN_DAMP * this.vel; // mola aperta no fim
      this.vel += acc * h;
      this.pos += this.vel * h;

      if (this.pos >= 1) {
        this.pos = 1;
        if (!this.#fired) this.#fire();
        this.vel = -Math.abs(this.vel) * 0.15; // quique no batente
      }
      if (this.pos < 0) {
        this.pos = 0;
        this.vel = Math.abs(this.vel) * 0.2;
      }
    }
    if (this.#fired && this.pos < 0.05 && !this.#dragging) this.#fired = false;

    const notch = Math.floor(this.pos * NOTCHES);
    if (notch !== this.#lastNotch) {
      if (notch > this.#lastNotch) this.sfx.ratchet(notch / NOTCHES);
      this.#lastNotch = notch;
    }
  }

  #fire() {
    this.#fired = true;
    this.#dragging = false; // solta sozinha no batente, como uma de verdade
    this.root.classList.remove('is-grabbed');
    this.sfx.lever();
    this.emit('pull');
  }

  #render() {
    const p = clamp(this.pos, 0, 1);
    const f = 1 + (BOTTOM - 1) * p; // 1 → -0.5
    const s = this.root.style;
    s.setProperty('--f', f.toFixed(4));
    s.setProperty('--kx', `${(Math.sin(LEAN) * f * ROD).toFixed(1)}px`);
    s.setProperty('--ky', `${(-Math.cos(LEAN) * f * ROD).toFixed(1)}px`);
    s.setProperty('--ks', (1 + 0.4 * p).toFixed(3));
    // a bola passa na frente da base quando vem na sua direção
    this.knob.style.zIndex = p > 0.55 ? 3 : 2;
    this.knob.setAttribute('aria-valuenow', Math.round(p * 100));
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
