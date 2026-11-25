/**
 * Desenho do gabinete — formato compartilhado entre o Estúdio e o jogo.
 *
 * O palco do jogo tem 1280×1000; o desenho tem 320×250 pixels (cada pixel
 * vira um bloco 4×4 no jogo). Três camadas:
 *   base  — o corpo do gabinete (atrás de tudo)
 *   neon  — partes que brilham (ganham um halo no jogo)
 *   front — o que fica POR CIMA dos controles (bordas do painel, etc.)
 *
 * `layout` diz onde ficam as peças vivas do jogo, em px do palco.
 */

export const SIZE = { w: 320, h: 250, px: 4 };
const KEY = 'wolfsparty:cabinet:v1';

/** Tamanhos de referência das peças (a tela e o letreiro escalam a partir deles). */
export const PIECES = {
  screen:   { label: 'TELA',      w: 836, h: 514, resizable: true },
  marquee:  { label: 'LETREIRO',  w: 888, h: 190, resizable: true },
  joystick: { label: 'JOYSTICK',  w: 130, h: 132 },
  keyboard: { label: 'TECLADO',   w: 380, h: 124 },
  buttons:  { label: 'BOTÕES A/B', w: 176, h: 84 },
  lever:    { label: 'ALAVANCA',  w: 108, h: 300, anchor: 'pivot' },
  sound:    { label: 'SOM',       w: 76, h: 24 },
};

export const DEFAULT_LAYOUT = {
  screen:   { x: 222, y: 234, scale: 1 },
  marquee:  { x: 196, y: 0, scale: 1 },
  joystick: { x: 318, y: 772 },
  keyboard: { x: 470, y: 790 },
  buttons:  { x: 876, y: 800 },
  lever:    { x: 1120, y: 870 },
  sound:    { x: 150, y: 944 },
};

/** Paleta inicial = cores do jogo (tokens.css). */
export const PALETTE = [
  '#120827', '#0f0824', '#170d36', '#1e1244', '#261752', '#34206e', '#4a2f96', '#6a45d0',
  '#8b64ff', '#b89cff', '#d9caff', '#ffffff', '#ff4fd8', '#ffb3f0', '#ff4fa8', '#ff9ad2',
  '#2ee6ff', '#1a8fe0', '#ffc43d', '#e0861c', '#ffe58f', '#ff4747', '#c4213a', '#ff9a3c',
  '#3fe07c', '#ff8a6a', '#f6ead2', '#d9c6a3',
];

export function emptyDesign() {
  return {
    version: 1,
    savedAt: Date.now(),
    autoDeco: true,
    palette: [...PALETTE],
    layers: { base: null, neon: null, front: null }, // data:image/png ou null
    layout: structuredClone(DEFAULT_LAYOUT),
  };
}

/** Valida/normaliza um desenho vindo de qualquer lugar. */
export function normalize(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return null;
  const d = emptyDesign();
  d.savedAt = Number(raw.savedAt) || 0;
  d.autoDeco = raw.autoDeco !== false;
  if (Array.isArray(raw.palette)) d.palette = raw.palette.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 64);
  for (const k of Object.keys(d.layers)) {
    const v = raw.layers?.[k];
    if (typeof v === 'string' && v.startsWith('data:image/png;base64,')) d.layers[k] = v;
  }
  for (const [k, def] of Object.entries(DEFAULT_LAYOUT)) {
    const v = raw.layout?.[k];
    if (!v) continue;
    d.layout[k] = {
      ...def,
      x: Number.isFinite(v.x) ? v.x : def.x,
      y: Number.isFinite(v.y) ? v.y : def.y,
      ...(def.scale ? { scale: Math.min(1.6, Math.max(0.4, Number(v.scale) || 1)) } : {}),
    };
  }
  return d;
}

export function saveLocal(design) {
  try {
    localStorage.setItem(KEY, JSON.stringify(design));
    return true;
  } catch {
    return false;
  }
}

export function loadLocal() {
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return null;
  }
}

export function clearLocal() {
  try { localStorage.removeItem(KEY); } catch { /* ignora */ }
}

/** Arquivo do projeto (public/cabinet/cabinet.json), servido pelo servidor. */
export async function loadRemote(base = '') {
  try {
    const res = await fetch(`${base}cabinet/cabinet.json`, { cache: 'no-store' });
    return res.ok ? normalize(await res.json()) : null;
  } catch {
    return null;
  }
}

/** Salva no projeto (só funciona com `npm start`, acessando pelo próprio PC). */
export async function saveRemote(design, base = '') {
  try {
    const res = await fetch(`${base}api/cabinet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(design),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** O desenho mais recente entre o do navegador e o do projeto. */
export async function loadBest(base = '') {
  const [local, remote] = await Promise.all([loadLocal(), loadRemote(base)]);
  if (local && remote) return local.savedAt >= remote.savedAt ? local : remote;
  return local ?? remote;
}
