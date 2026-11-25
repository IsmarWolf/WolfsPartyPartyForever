/**
 * Estúdio do Gabinete — editor de pixel para desenhar a carcaça do fliperama.
 * Salva sozinho no navegador; "SALVAR NO JOGO" grava também no projeto
 * (public/cabinet/cabinet.json) quando rodando com `npm start`.
 */
import { SIZE, PIECES, DEFAULT_LAYOUT, emptyDesign, loadBest, loadRemote, saveLocal, saveRemote, clearLocal } from '../cabinet/design.js';
import { defaultTemplate } from './template.js';
import { pixelSVG } from '../art/pixel.js';

const BASE = '../';
const LAYERS = ['base', 'neon', 'front'];
const ZOOMS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32];
const UNDO_MAX = 60;

const ICONS = {
  pencil: ['......KK', '.....KYK', '....KYK.', '...KYK..', '..KYK...', '.KYK....', 'KWK.....', 'KK......'],
  eraser: ['....KKKK', '...KPPPK', '..KPPPK.', '.KWWPK..', 'KWWWK...', 'KWWK....', '.KK.....', '........'],
  line: ['......KK', '.....KK.', '....KK..', '...KK...', '..KK....', '.KK.....', 'KK......', '........'],
  rect: ['KKKKKKKK', 'K......K', 'K......K', 'K......K', 'K......K', 'K......K', 'KKKKKKKK', '........'],
  ellipse: ['..KKKK..', '.K....K.', 'K......K', 'K......K', 'K......K', '.K....K.', '..KKKK..', '........'],
  fill: ['...K....', '..KWK...', '.KWWWK..', 'KWWWWWK.', '.KWWWK.Y', '..KWK..Y', '...K..YY', '........'],
  picker: ['.....KK.', '....KKKK', '.....KK.', '....K.K.', '...KWK..', '..KWK...', '.KWK....', 'K.......'],
  pieces: ['...KK...', '..KKKK..', '...KK...', 'KK.KK.KK', 'KKKKKKKK', 'KK.KK.KK', '...KK...', '..KKKK..'],
  hand: ['..K.K...', '.KWKWK..', '.KWKWKK.', '.KWWWWWK', 'KKWWWWWK', 'KWWWWWWK', '.KWWWWK.', '..KKKK..'],
  mirror: ['...KK...', 'K..KK..K', 'KK.KK.KK', 'KKKKKKKK', 'KK.KK.KK', 'K..KK..K', '...KK...', '........'],
  filled: ['KKKKKKKK', 'KYYYYYYK', 'KYYYYYYK', 'KYYYYYYK', 'KYYYYYYK', 'KYYYYYYK', 'KKKKKKKK', '........'],
  grid: ['K.K.K.K.', 'KKKKKKKK', 'K.K.K.K.', 'KKKKKKKK', 'K.K.K.K.', 'KKKKKKKK', 'K.K.K.K.', '........'],
  eye: ['........', '..KKKK..', '.K.WW.K.', 'K.WKKW.K', 'K.WKKW.K', '.K.WW.K.', '..KKKK..', '........'],
  trash: ['..KKKK..', 'KKKKKKKK', '.KWKWKW.', '.KWKWKW.', '.KWKWKW.', '.KWKWKW.', '..KKKK..', '........'],
  glow: ['...Y....', '.Y.Y.Y..', '..YYY...', 'YYYKYYY.', '..YYY...', '.Y.Y.Y..', '...Y....', '........'],
};
const icon = (name) => pixelSVG(ICONS[name], { K: 'currentColor', W: '#f6ead2', Y: '#ffc43d', P: '#ff9ad2' });

const TOOLS = [
  { id: 'pencil', key: 'b', label: 'Lápis' },
  { id: 'eraser', key: 'e', label: 'Borracha' },
  { id: 'line', key: 'l', label: 'Linha' },
  { id: 'rect', key: 'r', label: 'Retângulo' },
  { id: 'ellipse', key: 'o', label: 'Elipse' },
  { id: 'fill', key: 'g', label: 'Balde' },
  { id: 'picker', key: 'i', label: 'Conta-gotas' },
  { id: 'pieces', key: 'v', label: 'Mover peças do jogo' },
  { id: 'hand', key: 'h', label: 'Mão (mover a vista)' },
];
const TOGGLES = [
  { id: 'mirror', key: 'm', label: 'Espelho (desenha dos dois lados)' },
  { id: 'filled', key: 'f', label: 'Preencher retângulo/elipse' },
  { id: 'grid', key: '#', label: 'Grade' },
  { id: 'showPieces', key: 'p', label: 'Mostrar peças do jogo', icon: 'eye' },
  { id: 'glow', key: 'n', label: 'Brilho do neon' },
];

// ───────────────────────────────────────────── estado
const state = {
  tool: 'pencil',
  prevTool: 'pencil',
  layer: 'base',
  visible: { base: true, neon: true, front: true },
  color: '#4a2f96',
  brush: 1,
  mirror: true,
  filled: false,
  grid: true,
  showPieces: true,
  glow: true,
  zoom: 3,
  pan: { x: 0, y: 0 },
  design: emptyDesign(),
  selectedPiece: null,
};
const undo = [];
const redo = [];

// ───────────────────────────────────────────── DOM
const $ = (s) => document.querySelector(s);
const viewport = $('#viewport');
const stage = $('#stage');
const canvases = Object.fromEntries([...document.querySelectorAll('[data-canvas]')].map((c) => {
  c.width = SIZE.w;
  c.height = SIZE.h;
  return [c.dataset.canvas, c];
}));
const ctx = Object.fromEntries(Object.entries(canvases).map(([k, c]) => [k, c.getContext('2d', { willReadFrequently: true })]));
const cursorEl = $('#cursor');

// ───────────────────────────────────────────── ferramentas (UI)
function renderTools() {
  const tools = TOOLS.map((t) =>
    `<button class="tool" type="button" data-tool="${t.id}" title="${t.label} (${t.key.toUpperCase()})">${icon(t.id)}<kbd>${t.key.toUpperCase()}</kbd></button>`).join('');
  const toggles = TOGGLES.map((t) =>
    `<button class="tool tool--toggle" type="button" data-toggle="${t.id}" title="${t.label} (${t.key.toUpperCase()})">${icon(t.icon ?? t.id)}<kbd>${t.key.toUpperCase()}</kbd></button>`).join('');
  $('.tools').innerHTML = `${tools}<hr>${toggles}<hr>
    <div class="brush">PINCEL<output id="brush-out">1</output>
      <input type="range" id="brush-range" min="1" max="10" value="1" aria-label="Tamanho do pincel" />
      <button type="button" data-brush="1">1</button><button type="button" data-brush="5">5</button><button type="button" data-brush="10">10</button></div>
    <hr><button class="tool tool--danger" type="button" data-cmd="clear-all" title="Apagar o desenho inteiro (todas as camadas)">${icon('trash')}</button>`;
}

function syncUI() {
  document.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('is-on', b.dataset.tool === state.tool));
  document.querySelectorAll('[data-toggle]').forEach((b) => b.classList.toggle('is-on', !!state[b.dataset.toggle]));
  document.querySelectorAll('[data-brush]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.brush) === state.brush));
  const range = $('#brush-range');
  if (range) { range.value = state.brush; $('#brush-out').textContent = `${state.brush}px`; }
  document.querySelectorAll('.layer').forEach((l) => {
    l.classList.toggle('is-active', l.dataset.layer === state.layer);
    l.classList.toggle('is-hidden', !state.visible[l.dataset.layer]);
  });
  for (const k of LAYERS) canvases[k].style.visibility = state.visible[k] ? 'visible' : 'hidden';
  canvases.glow.style.visibility = state.visible.neon ? 'visible' : 'hidden';
  stage.classList.toggle('is-mirror', state.mirror);
  stage.classList.toggle('show-grid', state.grid && state.zoom >= 4);
  stage.classList.toggle('hide-pieces', !state.showPieces);
  stage.classList.toggle('no-glow', !state.glow);
  viewport.classList.toggle('tool-pieces', state.tool === 'pieces');
  $('#current-color').style.background = state.color;
  document.querySelectorAll('.palette button').forEach((b) => b.classList.toggle('is-on', b.dataset.color === state.color));
  $('#auto-deco').checked = state.design.autoDeco;
}

function renderPalette() {
  $('#palette').innerHTML = state.design.palette.map((c) =>
    `<button type="button" data-color="${c}" style="--c:${c}" title="${c}"></button>`).join('');
  syncUI();
}

// ───────────────────────────────────────────── vista (zoom / pan)
function applyView() {
  const { zoom, pan } = state;
  stage.style.width = `${SIZE.w * zoom}px`;
  stage.style.height = `${SIZE.h * zoom}px`;
  stage.style.transform = `translate(${pan.x}px, ${pan.y}px)`;
  stage.style.setProperty('--z', zoom);
  $('#status-zoom').textContent = `${Math.round(zoom * 100)}%`;
  renderPieces();
  syncUI();
}

function fit() {
  const r = viewport.getBoundingClientRect();
  const z = Math.min((r.width - 40) / SIZE.w, (r.height - 40) / SIZE.h);
  state.zoom = ZOOMS.filter((v) => v <= z).at(-1) ?? 1;
  state.pan = { x: (r.width - SIZE.w * state.zoom) / 2, y: (r.height - SIZE.h * state.zoom) / 2 };
  applyView();
}

function zoomAt(dir, cx, cy) {
  const i = ZOOMS.indexOf(state.zoom);
  const next = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 4 : i) + dir))];
  const r = viewport.getBoundingClientRect();
  const px = cx - r.left;
  const py = cy - r.top;
  state.pan.x = px - ((px - state.pan.x) / state.zoom) * next;
  state.pan.y = py - ((py - state.pan.y) / state.zoom) * next;
  state.zoom = next;
  applyView();
}

function toPixel(e) {
  const r = stage.getBoundingClientRect();
  return { x: Math.floor((e.clientX - r.left) / state.zoom), y: Math.floor((e.clientY - r.top) / state.zoom) };
}

// ───────────────────────────────────────────── desenho
const mirrorX = (x) => SIZE.w - 1 - x;

function stamp(c, x, y, erase) {
  const s = state.brush;
  const o = Math.floor((s - 1) / 2);
  const pts = state.mirror ? [[x, y], [mirrorX(x) - (s - 1) + 2 * o, y]] : [[x, y]];
  for (const [px, py] of pts) {
    if (erase) c.clearRect(px - o, py - o, s, s);
    else c.fillRect(px - o, py - o, s, s);
  }
}

function linePts(x0, y0, x1, y1) {
  const pts = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
}

function shapePts(tool, a, b) {
  if (tool === 'line') return linePts(a.x, a.y, b.x, b.y);
  const x0 = Math.min(a.x, b.x); const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y); const y1 = Math.max(a.y, b.y);
  const w = x1 - x0 + 1; const h = y1 - y0 + 1;
  const inside = tool === 'rect'
    ? (i, j) => i >= 0 && j >= 0 && i < w && j < h
    : (i, j) => ((i + 0.5 - w / 2) / (w / 2)) ** 2 + ((j + 0.5 - h / 2) / (h / 2)) ** 2 <= 1;
  const pts = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!inside(i, j)) continue;
      const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
      if (state.filled || edge) pts.push([x0 + i, y0 + j]);
    }
  }
  return pts;
}

function drawPts(c, pts, erase = false) {
  c.fillStyle = state.color;
  for (const [x, y] of pts) stamp(c, x, y, erase);
}

function floodFill(c, x, y) {
  if (x < 0 || y < 0 || x >= SIZE.w || y >= SIZE.h) return;
  const img = c.getImageData(0, 0, SIZE.w, SIZE.h);
  const d = img.data;
  const at = (px, py) => (py * SIZE.w + px) * 4;
  const target = d.slice(at(x, y), at(x, y) + 4).join(',');
  const rgb = [1, 3, 5].map((i) => parseInt(state.color.slice(i, i + 2), 16));
  const fill = [...rgb, 255].join(',');
  if (target === fill) return;
  const run = (sx, sy) => {
    const stack = [[sx, sy]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || py < 0 || px >= SIZE.w || py >= SIZE.h) continue;
      const i = at(px, py);
      if (d.slice(i, i + 4).join(',') !== target) continue;
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  };
  run(x, y);
  if (state.mirror) run(mirrorX(x), y);
  c.putImageData(img, 0, 0);
}

function pickColor(x, y) {
  const order = [state.layer, ...['front', 'neon', 'base'].filter((l) => l !== state.layer)];
  for (const l of order) {
    if (!state.visible[l]) continue;
    const [r, g, b, a] = ctx[l].getImageData(x, y, 1, 1).data;
    if (a > 0) return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }
  return null;
}

// ───────────────────────────────────────────── histórico
/** Guarda o estado de uma ou mais camadas antes de mudar (um passo de desfazer). */
function snapshot(layers = [state.layer]) {
  undo.push(layers.map((layer) => ({ layer, img: ctx[layer].getImageData(0, 0, SIZE.w, SIZE.h) })));
  if (undo.length > UNDO_MAX) undo.shift();
  redo.length = 0;
}

function swapHistory(from, to) {
  const step = from.pop();
  if (!step) return status('Nada para ' + (from === undo ? 'desfazer' : 'refazer'));
  to.push(step.map(({ layer }) => ({ layer, img: ctx[layer].getImageData(0, 0, SIZE.w, SIZE.h) })));
  for (const { layer, img } of step) ctx[layer].putImageData(img, 0, 0);
  if (step.length === 1) state.layer = step[0].layer;
  changed();
}

// ───────────────────────────────────────────── ponteiro
let drag = null;

viewport.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.piece')) return; // peças cuidam de si
  viewport.setPointerCapture(e.pointerId);
  const p = toPixel(e);
  if (e.button === 1 || state.tool === 'hand' || spaceHeld) {
    drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, px: state.pan.x, py: state.pan.y };
    viewport.classList.add('is-panning');
    return;
  }
  if (e.button !== 0 || state.tool === 'pieces') return;
  if (!state.visible[state.layer]) return status('Esta camada está oculta — clique no ● para mostrar.');
  const c = ctx[state.layer];

  if (state.tool === 'picker') {
    const color = pickColor(p.x, p.y);
    if (color) setColor(color);
    setTool(state.prevTool);
    return;
  }
  snapshot();
  if (state.tool === 'fill') {
    floodFill(c, p.x, p.y);
    changed();
    return;
  }
  if (state.tool === 'pencil' || state.tool === 'eraser') {
    drawPts(c, [[p.x, p.y]], state.tool === 'eraser');
    drag = { kind: 'paint', last: p };
    changed(false);
    return;
  }
  drag = { kind: 'shape', start: p, end: p };
  drawPreview();
});

viewport.addEventListener('pointermove', (e) => {
  const p = toPixel(e);
  updateCursor(p);
  if (!drag) return;
  if (drag.kind === 'pan') {
    state.pan.x = drag.px + e.clientX - drag.sx;
    state.pan.y = drag.py + e.clientY - drag.sy;
    applyView();
  } else if (drag.kind === 'paint') {
    drawPts(ctx[state.layer], linePts(drag.last.x, drag.last.y, p.x, p.y), state.tool === 'eraser');
    drag.last = p;
    changed(false);
  } else if (drag.kind === 'shape') {
    drag.end = p;
    drawPreview();
  }
});

const endDrag = () => {
  if (drag?.kind === 'shape') {
    drawPts(ctx[state.layer], shapePts(state.tool, drag.start, drag.end));
    ctx.preview.clearRect(0, 0, SIZE.w, SIZE.h);
  }
  if (drag && drag.kind !== 'pan') changed();
  drag = null;
  viewport.classList.remove('is-panning');
};
viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);
viewport.addEventListener('pointerleave', () => { $('#status-pos').textContent = '–'; });

viewport.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomAt(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
}, { passive: false });

function drawPreview() {
  const c = ctx.preview;
  c.clearRect(0, 0, SIZE.w, SIZE.h);
  drawPts(c, shapePts(state.tool, drag.start, drag.end));
}

function updateCursor({ x, y }) {
  $('#status-pos').textContent = `x ${x} · y ${y}  (palco ${x * SIZE.px}, ${y * SIZE.px})`;
  const s = state.brush;
  const o = Math.floor((s - 1) / 2);
  Object.assign(cursorEl.style, {
    left: `${(x - o) * state.zoom}px`, top: `${(y - o) * state.zoom}px`,
    width: `${s * state.zoom}px`, height: `${s * state.zoom}px`,
  });
}

// ───────────────────────────────────────────── peças do jogo
function pieceBox(id) {
  const def = PIECES[id];
  const l = state.design.layout[id];
  const scale = l.scale ?? 1;
  if (def.anchor === 'pivot') return { x: l.x - def.w / 2, y: l.y - def.h + 40, w: def.w, h: def.h };
  return { x: l.x, y: l.y, w: def.w * scale, h: def.h * scale };
}

function renderPieces() {
  const z = state.zoom / SIZE.px;
  $('#pieces').innerHTML = Object.entries(PIECES).map(([id, def]) => {
    const b = pieceBox(id);
    return `<div class="piece piece--${id}${state.selectedPiece === id ? ' is-selected' : ''}" data-piece="${id}"
      style="left:${b.x * z}px;top:${b.y * z}px;width:${b.w * z}px;height:${b.h * z}px">
      <span>${def.label}</span>${id === 'lever' ? '<i></i><b></b>' : ''}
      ${def.resizable ? '<div class="piece__handle" data-handle></div>' : ''}</div>`;
  }).join('');
  const sel = state.selectedPiece;
  if (sel) {
    const l = state.design.layout[sel];
    $('#piece-info').innerHTML = `${PIECES[sel].label}<br>x ${Math.round(l.x)} · y ${Math.round(l.y)}${l.scale ? ` · tamanho ${Math.round(l.scale * 100)}%` : ''}`;
  }
}

$('#pieces').addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-piece]');
  if (!el || state.tool !== 'pieces') return;
  e.preventDefault();
  e.stopPropagation();
  const id = el.dataset.piece;
  state.selectedPiece = id;
  const l = state.design.layout[id];
  const start = { x: e.clientX, y: e.clientY, lx: l.x, ly: l.y, scale: l.scale ?? 1 };
  const resizing = !!e.target.closest('[data-handle]');
  const move = (ev) => {
    const k = SIZE.px / state.zoom; // px da tela → px do palco
    const dx = (ev.clientX - start.x) * k;
    const dy = (ev.clientY - start.y) * k;
    if (resizing) {
      const def = PIECES[id];
      l.scale = Math.min(1.6, Math.max(0.4, start.scale + dx / def.w));
    } else {
      l.x = Math.round((start.lx + dx) / SIZE.px) * SIZE.px;
      l.y = Math.round((start.ly + dy) / SIZE.px) * SIZE.px;
    }
    renderPieces();
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    changed();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  renderPieces();
});

// ───────────────────────────────────────────── salvar / carregar
const isEmpty = (c) => !c.getImageData(0, 0, SIZE.w, SIZE.h).data.some((v, i) => i % 4 === 3 && v > 0);

function collect() {
  const d = state.design;
  d.savedAt = Date.now();
  for (const k of LAYERS) d.layers[k] = isEmpty(ctx[k]) ? null : canvases[k].toDataURL('image/png');
  return d;
}

let saveTimer = 0;
function changed(full = true) {
  canvases.glow.getContext('2d').clearRect(0, 0, SIZE.w, SIZE.h);
  canvases.glow.getContext('2d').drawImage(canvases.neon, 0, 0);
  if (!full) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!saveLocal(collect())) status('Não deu para salvar no navegador.');
  }, 500);
  syncUI();
}

function loadImageInto(layer, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = ctx[layer];
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, SIZE.w, SIZE.h);
      c.drawImage(img, 0, 0, SIZE.w, SIZE.h);
      resolve();
    };
    img.onerror = resolve;
    img.src = src;
  });
}

function loadTemplate() {
  const t = defaultTemplate();
  for (const k of LAYERS) ctx[k].putImageData(new ImageData(t[k], SIZE.w, SIZE.h), 0, 0);
}

async function load() {
  const d = await loadBest(BASE);
  if (d && Object.values(d.layers).some(Boolean)) {
    state.design = d;
    for (const k of LAYERS) if (d.layers[k]) await loadImageInto(k, d.layers[k]);
    status('Desenho salvo carregado.');
  } else {
    if (d) state.design = { ...d, layout: d.layout };
    loadTemplate();
    status('Começando do gabinete atual — edite à vontade.');
  }
  renderPalette();
  changed(false);
}

async function saveToGame() {
  const d = collect();
  saveLocal(d);
  const ok = await saveRemote(d, BASE);
  status(ok
    ? 'Salvo no projeto (public/cabinet/cabinet.json) — todo mundo verá este gabinete.'
    : 'Salvo neste navegador. Para salvar no projeto, abra o Estúdio pelo seu PC com npm start.');
}

// ───────────────────────────────────────────── comandos
let statusTimer = 0;
function status(msg) {
  const el = $('#status-msg');
  el.textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.textContent = ''; }, 6000);
}

function setTool(t) {
  if (t !== 'picker') state.prevTool = t;
  else if (state.tool !== 'picker') state.prevTool = state.tool;
  state.tool = t;
  syncUI();
}

function setColor(c) {
  state.color = c;
  if (!state.design.palette.includes(c)) {
    state.design.palette.push(c);
    if (state.design.palette.length > 64) state.design.palette.shift();
    renderPalette();
  }
  syncUI();
}

const commands = {
  undo: () => swapHistory(undo, redo),
  redo: () => swapHistory(redo, undo),
  save: saveToGame,
  template: async () => {
    snapshot(LAYERS);
    // the project's cabinet.json is the current model; built-in template only if none saved
    const d = await loadRemote(BASE);
    if (d && Object.values(d.layers).some(Boolean)) {
      for (const k of LAYERS) {
        if (d.layers[k]) await loadImageInto(k, d.layers[k]);
        else ctx[k].clearRect(0, 0, SIZE.w, SIZE.h);
      }
    } else loadTemplate();
    changed();
    status('Voltou ao modelo (dá para desfazer camada por camada).');
  },
  clear: () => {
    snapshot();
    ctx[state.layer].clearRect(0, 0, SIZE.w, SIZE.h);
    changed();
  },
  'clear-all': () => {
    snapshot(LAYERS);
    for (const k of LAYERS) ctx[k].clearRect(0, 0, SIZE.w, SIZE.h);
    changed();
    status('Desenho inteiro apagado (Ctrl+Z desfaz).');
  },
  import: () => $('#file-import').click(),
  'export-png': () => {
    const out = document.createElement('canvas');
    out.width = SIZE.w * SIZE.px;
    out.height = SIZE.h * SIZE.px;
    const c = out.getContext('2d');
    c.imageSmoothingEnabled = false;
    for (const k of LAYERS) if (state.visible[k]) c.drawImage(canvases[k], 0, 0, out.width, out.height);
    const a = Object.assign(document.createElement('a'), { href: out.toDataURL('image/png'), download: 'gabinete.png' });
    a.click();
  },
  'copy-json': async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(collect()));
      status('Desenho copiado — cole num arquivo public/cabinet/cabinet.json.');
    } catch {
      status('Não deu para copiar aqui.');
    }
  },
  'reset-layout': () => {
    state.design.layout = structuredClone(DEFAULT_LAYOUT);
    renderPieces();
    changed();
  },
  restore: async () => {
    clearLocal();
    state.design.layers = { base: null, neon: null, front: null };
    state.design.layout = structuredClone(DEFAULT_LAYOUT);
    state.design.savedAt = Date.now();
    await saveRemote({ ...state.design }, BASE);
    clearLocal();
    loadTemplate();
    changed(false);
    renderPieces();
    status('O jogo voltou ao gabinete padrão. O modelo continua aqui para editar.');
  },
};

document.addEventListener('click', (e) => {
  const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
  if (cmd) {
    e.target.closest('details')?.removeAttribute('open');
    commands[cmd]?.();
  }
  const tool = e.target.closest('[data-tool]')?.dataset.tool;
  if (tool) setTool(tool);
  const tog = e.target.closest('[data-toggle]')?.dataset.toggle;
  if (tog) { state[tog] = !state[tog]; syncUI(); }
  const brush = e.target.closest('[data-brush]')?.dataset.brush;
  if (brush) { state.brush = Number(brush); syncUI(); }
  const color = e.target.closest('[data-color]')?.dataset.color;
  if (color) setColor(color);
  const pick = e.target.closest('.layer__pick');
  if (pick) { state.layer = pick.parentElement.dataset.layer; syncUI(); }
  const eye = e.target.closest('.layer__eye');
  if (eye) { const l = eye.parentElement.dataset.layer; state.visible[l] = !state.visible[l]; syncUI(); }
});

$('#color-input').addEventListener('change', (e) => setColor(e.target.value));
document.addEventListener('input', (e) => {
  if (e.target.id === 'brush-range') { state.brush = Number(e.target.value); syncUI(); }
});
$('#auto-deco').addEventListener('change', (e) => { state.design.autoDeco = e.target.checked; changed(); });

$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  snapshot();
  const url = URL.createObjectURL(file);
  await loadImageInto(state.layer, url);
  URL.revokeObjectURL(url);
  e.target.value = '';
  changed();
  status('Imagem importada na camada (ajustada para 320×250).');
});

// referência para decalcar
const refs = [$('#ref'), $('#ref-top')];
$('#ref-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  refs.forEach((r) => { r.src = url; });
  syncRef();
});
$('#ref-clear').addEventListener('click', () => { refs.forEach((r) => r.removeAttribute('src')); syncRef(); });
$('#ref-opacity').addEventListener('input', syncRef);
$('#ref-top-toggle').addEventListener('change', syncRef);
function syncRef() {
  const has = !!refs[0].getAttribute('src');
  const top = $('#ref-top-toggle').checked;
  refs[0].hidden = !has || top;
  refs[1].hidden = !has || !top;
  refs.forEach((r) => { r.style.opacity = $('#ref-opacity').value / 100; });
}

// teclado
let spaceHeld = false;
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input')) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); return e.shiftKey ? commands.redo() : commands.undo(); }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); return commands.redo(); }
  if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); return commands.save(); }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === ' ') { spaceHeld = true; viewport.style.cursor = 'grab'; e.preventDefault(); return; }
  const tool = TOOLS.find((t) => t.key === k);
  if (tool) return setTool(tool.id);
  const tog = TOGGLES.find((t) => t.key === k || (t.key === '#' && e.key === '#'));
  if (tog) { state[tog.id] = !state[tog.id]; return syncUI(); }
  if (['1', '2', '3'].includes(k)) { state.layer = LAYERS[Number(k) - 1]; return syncUI(); }
  if (k === '[') { state.brush = Math.max(1, state.brush - 1); return syncUI(); }
  if (k === ']') { state.brush = Math.min(10, state.brush + 1); return syncUI(); }
  const r = viewport.getBoundingClientRect();
  if (k === '+' || k === '=') return zoomAt(1, r.left + r.width / 2, r.top + r.height / 2);
  if (k === '-') return zoomAt(-1, r.left + r.width / 2, r.top + r.height / 2);
  if (k === '0') return fit();
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ') { spaceHeld = false; viewport.style.cursor = ''; }
});
window.addEventListener('resize', fit);

// ───────────────────────────────────────────── início
renderTools();
fit();
load();
