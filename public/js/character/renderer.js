/**
 * Transforma um perfil em pixels num <canvas>.
 * Dois modos: "montar" (partes do catálogo) e "desenhar" (pixels livres).
 * Os dois ganham o mesmo contorno automático — mesma identidade visual.
 */
import { GRID, BODY, EYES, HAIR, TOPS, BOTTOMS, ACCESSORIES } from './parts.js';
import { SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, INK, WHITE, BLUSH, SHOE } from './palettes.js';

const PAD = 1;
export const SPRITE_W = GRID.w + PAD * 2;
export const SPRITE_H = GRID.h + PAD * 2;
export const CELLS = GRID.w * GRID.h;

const find = (list, id) => list.find((o) => o.id === id) ?? list[0];

function buildPalette(look, accessory) {
  const skin = find(SKIN_TONES, look.skin);
  const hair = find(HAIR_COLORS, look.hairColor);
  const top = find(CLOTH_COLORS, look.topColor);
  const bottom = find(CLOTH_COLORS, look.bottomColor);
  const acc = accessory?.colors ?? {};
  return {
    S: skin.base, s: skin.shade, L: skin.light,
    H: hair.base, h: hair.shade, I: hair.light,
    T: top.base, t: top.shade, U: top.light,
    B: bottom.base, b: bottom.shade,
    A: acc.A ?? INK, a: acc.a ?? acc.A ?? INK,
    F: SHOE.base, f: SHOE.shade,
    E: INK, K: INK, W: WHITE, C: BLUSH,
  };
}

/** Grade GRID.w × GRID.h só com as partes (sem contorno). null = vazio. */
export function composeLook(look) {
  const hair = find(HAIR, look.hair);
  const accessory = find(ACCESSORIES, look.accessory);
  const palette = buildPalette(look, accessory);
  const clip = accessory.clipHairAbove ?? -1;
  const layers = [
    { map: BODY },
    { map: find(BOTTOMS, look.bottom).map },
    { map: find(TOPS, look.top).map },
    { map: find(EYES, look.eyes).map },
    { map: hair.front, isHair: true },
    { map: accessory.map },
  ];
  const grid = Array.from({ length: GRID.h }, () => Array(GRID.w).fill(null));
  for (const { map, isHair } of layers) {
    if (!map) continue;
    for (let y = 0; y < GRID.h; y++) {
      if (isHair && y < clip) continue;
      for (let x = 0; x < GRID.w; x++) {
        const ch = map[y][x];
        if (ch !== '.' && palette[ch]) grid[y][x] = palette[ch];
      }
    }
  }
  return grid;
}

/** Desenho livre → grade de cores. `custom` = { palette: [hex], data: 'string' }. */
export function composeCustom(custom) {
  const grid = Array.from({ length: GRID.h }, () => Array(GRID.w).fill(null));
  if (!custom?.data) return grid;
  for (let i = 0; i < CELLS; i++) {
    const ch = custom.data[i];
    if (!ch || ch === '.') continue;
    const color = custom.palette[parseInt(ch, 36)];
    if (color) grid[Math.floor(i / GRID.w)][i % GRID.w] = color;
  }
  return grid;
}

/** Adiciona a borda e o contorno automático. */
function withOutline(inner) {
  const grid = Array.from({ length: SPRITE_H }, () => Array(SPRITE_W).fill(null));
  inner.forEach((row, y) => row.forEach((c, x) => { grid[y + PAD][x + PAD] = c; }));
  const filled = grid.map((r) => r.map((c) => c !== null));
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      if (filled[y][x]) continue;
      if (filled[y - 1]?.[x] || filled[y + 1]?.[x] || filled[y][x - 1] || filled[y][x + 1]) grid[y][x] = INK;
    }
  }
  return grid;
}

/** Grade final de um perfil ({ look, mode, custom }). */
export function composeProfile(profile) {
  const useCustom = profile.mode === 'draw' && profile.custom;
  return withOutline(useCustom ? composeCustom(profile.custom) : composeLook(profile.look));
}

export function paintGrid(canvas, grid) {
  canvas.width = grid[0].length;
  canvas.height = grid.length;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }));
}

/** Desenha o avatar de um perfil no canvas (tamanho nativo; amplie via CSS). */
export function drawAvatar(canvas, profile) {
  paintGrid(canvas, composeProfile(profile));
}

/** Compatibilidade: desenhar só a partir de um look. */
export function drawCharacter(canvas, look) {
  drawAvatar(canvas, { look, mode: 'build' });
}

/** Imagem pronta (para lounge, jogos…). */
export function avatarDataURL(profile, scale = 4) {
  const src = document.createElement('canvas');
  drawAvatar(src, profile);
  const out = document.createElement('canvas');
  out.width = SPRITE_W * scale;
  out.height = SPRITE_H * scale;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out.toDataURL();
}

/** Converte um look montado em desenho editável (ponto de partida do editor). */
export function lookToCustom(look, palette) {
  const pal = [...palette];
  const grid = composeLook(look);
  let data = '';
  for (const row of grid) {
    for (const c of row) {
      if (!c) { data += '.'; continue; }
      let i = pal.indexOf(c);
      if (i < 0 && pal.length < 36) { pal.push(c); i = pal.length - 1; }
      data += i < 0 ? '.' : i.toString(36);
    }
  }
  return { palette: pal, data };
}
