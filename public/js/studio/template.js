/**
 * Modelo inicial: o gabinete atual do jogo, redesenhado pixel a pixel
 * (320×250). Serve de ponto de partida no Estúdio.
 */
import { SIZE } from '../cabinet/design.js';

const C = {
  ink: '#120827', p950: '#0f0824', p900: '#170d36', p800: '#261752', p700: '#34206e',
  p600: '#4a2f96', p500: '#6a45d0', p400: '#8b64ff', neon: '#ff4fd8',
};

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

class Px {
  constructor() { this.data = new Uint8ClampedArray(SIZE.w * SIZE.h * 4); }
  set(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= SIZE.w || y >= SIZE.h) return;
    this.data.set(hex(color), (y * SIZE.w + x) * 4);
  }
  rect(x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
  }
  /** Preenche polígono (centro do pixel dentro = pinta). */
  poly(pts, color) {
    for (let y = 0; y < SIZE.h; y++) {
      for (let x = 0; x < SIZE.w; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i];
          const [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, color);
      }
    }
  }
  line(x0, y0, x1, y1, color, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (let t = 0; t < thick; t++) this.set(x0 + (dx > -dy ? 0 : t), y0 + (dx > -dy ? t : 0), color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** Retângulo de cantos arredondados em degraus. */
  roundRect(x, y, w, h, r, fill, stroke) {
    const steps = r === 0 ? [] : r <= 3 ? [2, 1] : [4, 2, 1, 1];
    const inside = (i, j) => {
      if (i < 0 || j < 0 || i >= w || j >= h) return false;
      const k = Math.min(j, h - 1 - j);
      const inset = k < steps.length ? steps[k] : 0;
      return i >= inset && i < w - inset;
    };
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!inside(i, j)) continue;
        const edge = !inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1);
        const color = edge && stroke ? stroke : fill;
        if (color) this.set(x + i, y + j, color);
      }
    }
  }
}

const q = (pts) => pts.map(([x, y]) => [x / 4, y / 4]);
const mirror = (pts) => pts.map(([x, y]) => [SIZE.w - x, y]);

export function defaultTemplate() {
  const base = new Px();
  const neon = new Px();
  const front = new Px();

  // laterais (com contorno)
  const sideL = q([[118, -20], [180, -20], [180, 780], [150, 780], [96, 1020], [-40, 1020]]);
  for (const side of [sideL, mirror(sideL)]) {
    base.poly(side, C.p700);
    for (let i = 0; i < side.length; i++) {
      const [a, b] = [side[i], side[(i + 1) % side.length]];
      base.line(a[0], a[1], b[0], b[1], C.ink);
    }
  }
  // frente, letreiro, prateleira
  base.rect(45, 0, 230, 195, C.p800);
  base.rect(49, 0, 222, 48, C.p900);
  base.line(49, 47, 270, 47, C.p600);
  base.line(48, 0, 48, 47, C.p600); base.line(271, 0, 271, 47, C.p600);
  base.rect(45, 48, 230, 4, C.p600);
  base.line(45, 52, 274, 52, C.ink);
  // moldura da tela
  base.roundRect(49, 53, 222, 140, 3, C.p950, C.ink);
  neon.roundRect(54, 57, 213, 132, 6, null, C.p500);
  // painel
  const deck = q([[150, 780], [1130, 780], [1160, 912], [120, 912]]);
  base.poly(deck, C.p800);
  base.rect(24, 228, 272, 22, C.p900);
  base.line(24, 228, 295, 228, C.ink);
  // filetes neon
  neon.line(29.5, -5, -10, 255, C.neon, 2);
  neon.line(SIZE.w - 29.5, -5, SIZE.w + 10, 255, C.neon, 2);
  neon.line(37, 195, 282, 195, C.neon, 1);
  neon.line(45, 0, 45, 195, C.p400); neon.line(274, 0, 274, 195, C.p400);
  neon.line(30, 228, 289, 228, C.p400);
  // a camada da frente começa vazia
  return { base: base.data, neon: neon.data, front: front.data };
}
