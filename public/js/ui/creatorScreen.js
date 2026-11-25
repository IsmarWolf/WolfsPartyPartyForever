/**
 * Tela de criação (conteúdo da tela do fliperama).
 * Duas abas: MONTAR (partes prontas) e DESENHAR (pixel a pixel).
 * O nome e o PRONTO ficam no rodapé, comuns às duas.
 *
 * Eventos: 'done' (profile), 'random' (pediu o sorteio pelo botão da tela)
 */
import { SLOTS, NAME_MAX } from '../character/model.js';
import { drawAvatar } from '../character/renderer.js';
import { Emitter } from '../core/emitter.js';
import { pixelSVG, MAPS } from '../art/pixel.js';
import { DrawPanel } from './drawPanel.js';

const ACCENTS = ['--red', '--orange', '--green', '--cyan', '--p-400', '--salmon', '--cream', '--cyan', '--cyan'];
const ARROW_L = ['...W', '..WW', '.WWW', 'WWWW', '.WWW', '..WW', '...W'];
const ARROW_R = ARROW_L.map((r) => [...r].reverse().join(''));
const arrowSVG = (m) => pixelSVG(m, { W: 'currentColor' });
const DIE = pixelSVG(MAPS.die, { K: '#120827', W: '#f6ead2', S: '#d9c6a3' });
const STAR = pixelSVG(MAPS.starGold, { Y: '#ffc43d', L: '#ffe58f', O: '#e0861c' });

export class CreatorScreen extends Emitter {
  active = 0;

  constructor({ root, model, input, sfx }) {
    super();
    Object.assign(this, { root, model, input, sfx });
    this.#render();
    this.draw = new DrawPanel({ root: this.el.drawPanel, model, sfx });
    this.#bind();
    this.#setMode(model.mode, false);
    this.refreshAll();
  }

  // ─────────────────────────────────────────── montagem
  #render() {
    this.root.innerHTML = `
      <div class="screen-sparkles">${Array.from({ length: 22 }, (_, i) =>
        `<i style="left:${(i * 37) % 97 + 1}%;top:${(i * 53) % 93 + 2}%;--d:${1.4 + (i % 4) * .5}s"></i>`).join('')}</div>
      <div class="creator">
        <header class="creator__top">
          <div class="tabs" role="tablist">
            <button class="tab" type="button" role="tab" data-mode="build">MONTAR</button>
            <button class="tab" type="button" role="tab" data-mode="draw">DESENHAR</button>
          </div>
          <button class="pbtn pbtn--random" type="button" data-ui="random">${DIE}ALEATÓRIO</button>
        </header>

        <div class="panel panel--build" data-ui="build">
          <div class="stage" data-ui="stage">
            <div class="stage__star">${STAR}</div>
            <div class="stage__floor"></div>
            <canvas class="stage__sprite pixel" data-ui="sprite"></canvas>
            <div class="stage__burst" data-ui="burst"></div>
          </div>
          <ul class="options" role="listbox" aria-label="Aparência">
            ${SLOTS.map((s, i) => `
              <li class="opt" role="option" data-index="${i}" style="--accent:var(${ACCENTS[i % ACCENTS.length]})">
                <span class="opt__tag"></span>
                <span class="opt__label">${s.label}</span>
                <button class="opt__arrow" type="button" data-dir="-1" aria-label="Anterior">${arrowSVG(ARROW_L)}</button>
                <span class="opt__value" data-ui="value"></span>
                <button class="opt__arrow" type="button" data-dir="1" aria-label="Próximo">${arrowSVG(ARROW_R)}</button>
              </li>`).join('')}
          </ul>
        </div>

        <div class="panel panel--draw" data-ui="draw" hidden></div>

        <footer class="creator__bottom">
          <label class="nameplate" data-ui="nameplate">
            <span class="nameplate__label">NOME</span>
            <span class="nameplate__box"><span class="nameplate__value" data-ui="name"></span><span class="nameplate__caret"></span></span>
          </label>
          <span class="hint" data-ui="hint"></span>
          <button class="pbtn pbtn--go" type="button" data-ui="ready">PRONTO ▶</button>
        </footer>
      </div>`;

    const $ = (sel) => this.root.querySelector(`[data-ui="${sel}"]`);
    this.el = {
      build: $('build'), drawPanel: $('draw'),
      stage: $('stage'), sprite: $('sprite'), burst: $('burst'),
      name: $('name'), nameplate: $('nameplate'), hint: $('hint'),
      random: $('random'), ready: $('ready'),
      rows: [...this.root.querySelectorAll('.opt')],
      tabs: [...this.root.querySelectorAll('.tab')],
    };
  }

  #bind() {
    this.model.on('change', ({ key }) => {
      this.#drawSprite();
      this.#refreshRow(SLOTS.findIndex((s) => s.key === key));
    });
    this.model.on('name', () => { this.el.name.textContent = this.model.name; });
    this.input.on('action', (a) => this.#onAction(a));

    this.el.random.addEventListener('click', () => this.emit('random'));
    this.el.ready.addEventListener('click', () => this.input.dispatch({ type: 'confirm' }, 'btn-a'));
    this.el.tabs.forEach((tab) => tab.addEventListener('click', () => this.#setMode(tab.dataset.mode)));
    this.el.rows.forEach((row, i) => {
      row.addEventListener('click', (e) => {
        if (this.input.locked) return;
        const dir = Number(e.target.closest('[data-dir]')?.dataset.dir);
        if (i !== this.active) this.#setActive(i, !dir);
        if (dir) this.#cycle(dir);
      });
    });
  }

  // ─────────────────────────────────────────── modos
  get mode() { return this.model.mode; }

  #setMode(mode, sound = true) {
    this.model.setMode(mode);
    const draw = mode === 'draw';
    this.el.build.hidden = draw;
    this.el.drawPanel.hidden = !draw;
    this.el.tabs.forEach((t) => {
      const on = t.dataset.mode === mode;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on);
    });
    this.el.hint.innerHTML = draw
      ? '<kbd>◀▲▼▶</kbd> MOVER <kbd>ESPAÇO</kbd> PINTAR'
      : '<kbd>▲▼</kbd> ESCOLHER <kbd>◀▶</kbd> MUDAR';
    if (draw) this.draw.open();
    if (sound) this.sfx.change(1);
  }

  /** Usado pelo sorteio: garante a aba MONTAR. */
  showBuild() {
    if (this.mode !== 'build') this.#setMode('build', false);
  }

  // ─────────────────────────────────────────── ações
  #onAction(action) {
    const draw = this.mode === 'draw';
    switch (action.type) {
      case 'nav':
        if (draw) return this.draw.moveCursor(action.dir);
        if (action.dir === 'up') this.#setActive(this.active - 1);
        if (action.dir === 'down') this.#setActive(this.active + 1);
        if (action.dir === 'left') this.#cycle(-1);
        if (action.dir === 'right') this.#cycle(1);
        break;
      case 'char':
        if (draw && action.char === ' ') return this.draw.paintAtCursor();
        if (this.model.name.length >= NAME_MAX || (action.char === ' ' && !this.model.name)) {
          this.sfx.error();
          break;
        }
        this.sfx.key();
        this.model.setName(this.model.name + action.char);
        break;
      case 'backspace':
        if (!this.model.name) break;
        this.sfx.erase();
        this.model.setName(this.model.name.slice(0, -1));
        break;
      case 'confirm':
        this.#confirm();
        break;
    }
  }

  #setActive(i, withSound = true) {
    const n = SLOTS.length;
    this.active = (i + n) % n;
    this.el.rows.forEach((row, idx) => {
      row.classList.toggle('is-active', idx === this.active);
      row.setAttribute('aria-selected', idx === this.active);
    });
    if (withSound) this.sfx.nav();
  }

  #cycle(dir) {
    this.model.cycle(SLOTS[this.active].key, dir);
    this.sfx.change(dir);
    this.pop();
  }

  #confirm() {
    const name = this.model.name.trim();
    if (!name) {
      this.sfx.error();
      this.el.nameplate.classList.remove('is-error');
      void this.el.nameplate.offsetWidth;
      this.el.nameplate.classList.add('is-error');
      return;
    }
    this.model.setName(name);
    this.sfx.confirm();
    this.emit('done', this.model.toJSON());
  }

  // ─────────────────────────────────────────── desenho
  refreshAll() {
    this.#drawSprite();
    SLOTS.forEach((_, i) => this.#refreshRow(i));
    this.el.name.textContent = this.model.name;
    this.#setActive(this.active, false);
  }

  #drawSprite() {
    drawAvatar(this.el.sprite, { look: this.model.look, mode: 'build' });
  }

  #refreshRow(i) {
    const slot = SLOTS[i];
    const idx = this.model.indexOf(slot.key);
    const opt = slot.options[idx];
    const swatch = slot.kind === 'color'
      ? `<i class="opt__swatch" style="--base:${opt.base};--shade:${opt.shade};--light:${opt.light}"></i>`
      : '';
    this.el.rows[i].querySelector('[data-ui="value"]').innerHTML =
      `${swatch}<span>${opt.label}</span><span class="opt__count">${idx + 1}/${slot.options.length}</span>`;
  }

  // ─────────────────────────────────────────── ganchos para o sorteio
  rowEl(key) {
    return this.el.rows[SLOTS.findIndex((s) => s.key === key)];
  }

  setRolling(on) {
    this.el.stage.classList.toggle('is-rolling', on);
  }

  pop() {
    const { stage } = this.el;
    stage.classList.remove('is-pop');
    void stage.offsetWidth;
    stage.classList.add('is-pop');
  }

  burst() {
    const colors = ['var(--gold)', 'var(--pink)', 'var(--cyan)', 'var(--p-300)'];
    this.el.burst.innerHTML = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 70 + Math.random() * 30;
      return `<i style="--c:${colors[i % 4]};--x:${Math.cos(angle) * dist}px;--y:${Math.sin(angle) * dist}px"></i>`;
    }).join('');
  }
}
