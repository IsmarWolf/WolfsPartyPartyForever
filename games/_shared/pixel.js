/**
 * Desenho em pixel art de verdade para os minijogos: tudo vai para um buffer
 * de pixels (sem anti-aliasing) e a tela amplia com image-rendering: pixelated.
 * Formas já saem com contorno escuro e sombreado de 3 tons (ver RAMPS).
 *
 *   const px = createPixels(canvas);           // usa canvas.width × canvas.height
 *   px.clear(PAL.night); px.ball(x, y, r, RAMPS.red); px.present();
 */
import { PAL } from './palette.js';

const cache = new Map();
/** '#rrggbb' → inteiro RGBA no formato do ImageData (little-endian). */
function rgba(hex) {
  let v = cache.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = (0xff << 24 | (n & 0xff) << 16 | (n & 0xff00) | (n >> 16 & 0xff)) >>> 0;
    cache.set(hex, v);
  }
  return v;
}

export function createPixels(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const buf = new Uint32Array(img.data.buffer);
  const ink = PAL.ink;

  const px = (x, y, c) => {
    x |= 0; y |= 0;
    if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = rgba(c);
  };

  /** Percorre os pixels de um retângulo envolvente chamando fn(x, y). */
  const each = (x1, y1, x2, y2, fn) => {
    for (let y = Math.max(0, Math.floor(y1)); y <= Math.min(h - 1, Math.ceil(y2)); y++) {
      for (let x = Math.max(0, Math.floor(x1)); x <= Math.min(w - 1, Math.ceil(x2)); x++) fn(x, y);
    }
  };

  return {
    w, h, buf,
    px,
    clear(c) { buf.fill(rgba(c)); },
    rect(x, y, rw, rh, c) { each(x, y, x + rw - 1, y + rh - 1, (i, j) => px(i, j, c)); },

    /** Bola/disco com contorno e 3 tons (luz vindo de cima-esquerda). */
    ball(cx, cy, r, [dark, base, light], outline = true) {
      const R = r + (outline ? 1 : 0);
      each(cx - R, cy - R, cx + R, cy + R, (x, y) => {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d = Math.hypot(dx, dy);
        if (d > R) return;
        if (d > r) return px(x, y, ink);
        const lx = dx + r * 0.35;
        const ly = dy + r * 0.35;
        if (Math.hypot(lx, ly) < r * 0.35) px(x, y, light);
        else if ((dx + dy) / r > 0.55) px(x, y, dark);
        else px(x, y, base);
      });
    },

    /** Barra arredondada (parede, flipper) com contorno e 3 tons. */
    bar(x1, y1, x2, y2, r, [dark, base, light], outline = true) {
      const R = r + (outline ? 1 : 0);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy || 1;
      const len = Math.sqrt(len2);
      // normal que aponta "para cima" na tela: o lado de cima pega luz
      let nx = -dy / len;
      let ny = dx / len;
      if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; }
      each(Math.min(x1, x2) - R, Math.min(y1, y2) - R, Math.max(x1, x2) + R, Math.max(y1, y2) + R, (x, y) => {
        const qx = x + 0.5 - x1;
        const qy = y + 0.5 - y1;
        const t = Math.max(0, Math.min(1, (qx * dx + qy * dy) / len2));
        const ox = qx - dx * t;
        const oy = qy - dy * t;
        const d = Math.hypot(ox, oy);
        if (d > R) return;
        if (d > r) return px(x, y, ink);
        const side = (ox * nx + oy * ny) / r; // +1 = borda de cima
        px(x, y, side > 0.35 ? light : side < -0.35 ? dark : base);
      });
    },

    /** Copia outro buffer do mesmo tamanho (camada estática pronta). */
    blit(src) { buf.set(src); },
    snapshot() { return buf.slice(); },
    present() { ctx.putImageData(img, 0, 0); },
  };
}
