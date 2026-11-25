/**
 * Painel do fliperama: joystick, teclado deitado e botões A/B.
 * Cada controle vira uma ação na camada de Input.
 * (A alavanca tem física própria: ver lever.js.)
 */
import { pixelSVG, ellipseMap, MAPS } from '../art/pixel.js';
import { Joystick } from './joystick.js';

const KEY_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const BUTTONS = {
  a: { cap: { K: '#120827', B: '#ff4fa8', S: '#c42a7e', L: '#ffb3dc' }, label: 'PRONTO' },
  b: { cap: { K: '#120827', B: '#2ee6ff', S: '#1a8fe0', L: '#c8fbff' }, label: 'APAGAR' },
};
const RING = { K: '#120827', B: '#0f0824', S: '#0f0824', L: '#0f0824' };
const DECK_SPARKLES = [[268, 800, '#ff9ad2'], [116, 860, '#b89cff'], [1046, 830, '#ff8a6a'], [452, 930, '#b89cff'], [860, 936, '#ff9ad2']];

export class Cabinet {
  constructor({ deck, soundToggle, input, sfx, getScale }) {
    Object.assign(this, { deck, soundToggle, input, sfx });
    this.#render();
    this.joystick = new Joystick({
      root: deck.querySelector('.joy'),
      getScale,
      onDir: (dir) => this.input.dispatch({ type: 'nav', dir }),
    });
    this.#bind();
  }

  #render() {
    const letters = KEY_ROWS.map((row, r) => {
      let html = [...row].map((c) => `<button class="key" type="button" data-id="key-${c}">${c}</button>`).join('');
      if (r === 2) html += `<button class="key key--erase" type="button" data-id="key-backspace" aria-label="Apagar">⌫</button>`;
      if (r === 3) html += `<button class="key key--space" type="button" data-id="key-space">ESPAÇO</button>`;
      return html;
    }).join('');

    const button = (id) => `
      <button class="abtn abtn--${id}" type="button" data-id="btn-${id}">
        <span class="abtn__well">
          <span class="abtn__ring">${pixelSVG(ellipseMap(22, 9), RING)}</span>
          <span class="abtn__cap">${pixelSVG(ellipseMap(22, 9), BUTTONS[id].cap)}</span>
        </span>${BUTTONS[id].label}</button>`;

    this.deck.innerHTML = `
      ${DECK_SPARKLES.map(([x, y, c]) => `<div class="deck__deco deco-sparkle" style="left:${x}px;top:${y}px">${pixelSVG(MAPS.sparkle, { W: c })}</div>`).join('')}
      <div class="joy" role="group" aria-label="Joystick: arraste para navegar"></div>
      <div class="keyboard">${letters}</div>
      ${button('b')}${button('a')}`;
  }

  static actionFor(id) {
    if (id === 'key-backspace' || id === 'btn-b') return { type: 'backspace' };
    if (id === 'key-space') return { type: 'char', char: ' ' };
    if (id.startsWith('key-')) return { type: 'char', char: id.slice(4) };
    if (id === 'btn-a') return { type: 'confirm' };
    return null;
  }

  #bind() {
    this.deck.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-id]');
      if (!el) return;
      e.preventDefault();
      const action = Cabinet.actionFor(el.dataset.id);
      if (action) this.input.dispatch(action, el.dataset.id);
    });

    this.input.on('flash', (id) => this.flash(id));

    this.#syncSound();
    this.soundToggle.addEventListener('click', () => {
      this.sfx.toggleMute();
      this.#syncSound();
      this.sfx.nav();
    });
  }

  #syncSound() {
    this.soundToggle.setAttribute('aria-pressed', String(this.sfx.muted));
    this.soundToggle.querySelector('span').textContent = this.sfx.muted ? 'MUDO' : 'SOM';
  }

  /** Afunda o controle na tela (também quando vem do teclado físico). */
  flash(id) {
    if (id.startsWith('arrow-')) return this.joystick.nudge(id.slice(6));
    const el = this.deck.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.classList.add('is-pressed');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('is-pressed'), 120);
  }
}
