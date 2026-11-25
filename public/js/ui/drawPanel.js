/**
 * Modo DESENHAR: editor de pixel para quem quer o próprio boneco.
 * - Começa copiando o personagem montado (dá para limpar e fazer do zero).
 * - "GUIA" mostra a silhueta montada por trás, como molde.
 * - O contorno escuro é automático, igual aos outros personagens.
 * Mouse/toque desenham direto; joystick/setas + ESPAÇO também.
 */
import { GRID } from '../character/parts.js';
import { DRAW_PALETTE } from '../character/palettes.js';
import { drawAvatar, composeLook, lookToCustom, paintGrid, CELLS } from '../character/renderer.js';

const TOOLS = [
  { id: 'pencil', label: 'LÁPIS' },
  { id: 'eraser', label: 'BORRACHA' },
  { id: 'fill',   label: 'BALDE' },
  { id: 'picker', label: 'PEGAR COR' },
];
const UNDO_MAX = 40;

export class DrawPanel {
  tool = 'pencil';
  color = 0;
  cursor = { x: 8, y: 8 };
  guide = true;
  #undo = [];
  #painting = false;

  constructor({ root, model, sfx }) {
    Object.assign(this, { root, model, sfx });
    this.#render();
    this.#bind();
  }

  /** Chamado ao entrar na aba: garante que existe um desenho. */
  open() {
    if (!this.model.custom) {
      this.model.setCustom(lookToCustom(this.model.look, DRAW_PALETTE));
    }
    this.#renderPalette();
    this.#refresh();
  }

  // ─────────────────────────────────────────── montagem
  #render() {
    this.root.innerHTML = `
      <div class="editor" data-ui="editor">
        <canvas class="editor__guide pixel" data-ui="guide"></canvas>
        <canvas class="editor__art pixel" data-ui="art"></canvas>
        <div class="editor__grid"></div>
        <div class="editor__cursor" data-ui="cursor"></div>
      </div>
      <div class="drawside">
        <div class="tools">${TOOLS.map((t) => `<button class="tool" type="button" data-tool="${t.id}">${t.label}</button>`).join('')}</div>
        <div class="swatches" data-ui="swatches"></div>
        <div class="drawside__row">
          <div class="drawside__actions">
            <button class="tool tool--soft" type="button" data-act="undo">DESFAZER</button>
            <button class="tool tool--soft" type="button" data-act="guide">GUIA</button>
            <button class="tool tool--soft" type="button" data-act="copy">COPIAR MONTADO</button>
            <button class="tool tool--soft" type="button" data-act="clear">LIMPAR</button>
          </div>
          <div class="drawside__preview"><canvas class="pixel" data-ui="preview"></canvas></div>
        </div>
      </div>`;
    const $ = (s) => this.root.querySelector(`[data-ui="${s}"]`);
    this.el = { editor: $('editor'), guide: $('guide'), art: $('art'), cursor: $('cursor'), swatches: $('swatches'), preview: $('preview') };
  }

  #renderPalette() {
    const pal = this.model.custom.palette;
    this.el.swatches.innerHTML = pal.map((c, i) =>
      `<button class="swatch" type="button" data-color="${i}" style="--c:${c}" aria-label="Cor ${i + 1}"></button>`).join('');
    this.#syncUI();
  }

  #bind() {
    const { editor } = this.el;
    const cellFrom = (e) => {
      const r = editor.getBoundingClientRect();
      const x = Math.floor(((e.clientX - r.left) / r.width) * GRID.w);
      const y = Math.floor(((e.clientY - r.top) / r.height) * GRID.h);
      return x >= 0 && y >= 0 && x < GRID.w && y < GRID.h ? { x, y } : null;
    };
    editor.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const cell = cellFrom(e);
      if (!cell) return;
      editor.setPointerCapture(e.pointerId);
      this.#painting = true;
      this.#pushUndo();
      this.cursor = cell;
      this.#apply(cell);
    });
    editor.addEventListener('pointermove', (e) => {
      const cell = cellFrom(e);
      if (!cell) return;
      this.cursor = cell;
      this.#placeCursor();
      if (this.#painting && (this.tool === 'pencil' || this.tool === 'eraser')) this.#apply(cell, true);
    });
    const stop = () => { this.#painting = false; };
    editor.addEventListener('pointerup', stop);
    editor.addEventListener('pointercancel', stop);

    this.root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tool]');
      const c = e.target.closest('[data-color]');
      const a = e.target.closest('[data-act]');
      if (t) { this.tool = t.dataset.tool; this.sfx.nav(); }
      if (c) { this.color = Number(c.dataset.color); if (this.tool === 'eraser' || this.tool === 'picker') this.tool = 'pencil'; this.sfx.nav(); }
      if (a) this.#action(a.dataset.act);
      this.#syncUI();
    });
  }

  // ─────────────────────────────────────────── operações
  get #data() { return [...this.model.custom.data]; }

  #save(arr) {
    this.model.setCustom({ ...this.model.custom, data: arr.join('') });
    this.#refresh();
  }

  #pushUndo() {
    this.#undo.push(this.model.custom.data);
    if (this.#undo.length > UNDO_MAX) this.#undo.shift();
  }

  #apply({ x, y }, dragging = false) {
    const data = this.#data;
    const i = y * GRID.w + x;
    const ch = this.color.toString(36);
    if (this.tool === 'pencil') {
      if (data[i] === ch) return;
      data[i] = ch;
      if (!dragging || Math.random() < 0.5) this.sfx.tick();
    } else if (this.tool === 'eraser') {
      if (data[i] === '.') return;
      data[i] = '.';
      this.sfx.tick();
    } else if (this.tool === 'fill') {
      floodFill(data, x, y, ch);
      this.sfx.change(1);
    } else if (this.tool === 'picker') {
      if (data[i] !== '.') this.color = parseInt(data[i], 36);
      this.tool = 'pencil';
      this.sfx.nav();
      this.#syncUI();
      return;
    }
    this.#save(data);
  }

  #action(act) {
    if (act === 'undo') {
      const prev = this.#undo.pop();
      if (!prev) return this.sfx.error();
      this.model.setCustom({ ...this.model.custom, data: prev });
      this.sfx.erase();
    } else if (act === 'guide') {
      this.guide = !this.guide;
      this.sfx.nav();
    } else if (act === 'copy') {
      this.#pushUndo();
      this.model.setCustom(lookToCustom(this.model.look, this.model.custom.palette));
      this.#renderPalette();
      this.sfx.change(1);
    } else if (act === 'clear') {
      this.#pushUndo();
      this.model.setCustom({ ...this.model.custom, data: '.'.repeat(CELLS) });
      this.sfx.erase();
    }
    this.#refresh();
  }

  /** Teclado/joystick */
  moveCursor(dir) {
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    this.cursor = {
      x: (this.cursor.x + d[0] + GRID.w) % GRID.w,
      y: (this.cursor.y + d[1] + GRID.h) % GRID.h,
    };
    this.sfx.tick();
    this.#placeCursor();
    if (this.#painting) this.#apply(this.cursor, true);
  }

  paintAtCursor() {
    this.#pushUndo();
    this.#apply(this.cursor);
  }

  // ─────────────────────────────────────────── desenho
  #refresh() {
    if (!this.model.custom) return;
    const art = composeFromCustom(this.model.custom);
    paintGrid(this.el.art, art);
    paintGrid(this.el.guide, composeLook(this.model.look));
    this.el.guide.style.opacity = this.guide ? '0.22' : '0';
    drawAvatar(this.el.preview, { mode: 'draw', custom: this.model.custom, look: this.model.look });
    this.#placeCursor();
    this.#syncUI();
  }

  #placeCursor() {
    const { x, y } = this.cursor;
    this.el.cursor.style.left = `${(x / GRID.w) * 100}%`;
    this.el.cursor.style.top = `${(y / GRID.h) * 100}%`;
  }

  #syncUI() {
    this.root.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('is-on', b.dataset.tool === this.tool));
    this.root.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.color) === this.color));
    this.root.querySelector('[data-act="guide"]').classList.toggle('is-on', this.guide);
  }
}

function composeFromCustom(custom) {
  const grid = Array.from({ length: GRID.h }, () => Array(GRID.w).fill(null));
  for (let i = 0; i < CELLS; i++) {
    const ch = custom.data[i];
    if (ch && ch !== '.') grid[Math.floor(i / GRID.w)][i % GRID.w] = custom.palette[parseInt(ch, 36)] ?? null;
  }
  return grid;
}

function floodFill(data, x, y, ch) {
  const start = data[y * GRID.w + x];
  if (start === ch) return;
  const stack = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= GRID.w || cy >= GRID.h) continue;
    const i = cy * GRID.w + cx;
    if (data[i] !== start) continue;
    data[i] = ch;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}
