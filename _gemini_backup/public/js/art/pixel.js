/**
 * Pixel art em código: mapas de texto → SVG nítido.
 * Todo desenho decorativo (sol, lua, nuvem, dado, bola da alavanca…)
 * sai daqui, para manter o mesmo "grão" de pixel em tudo.
 */

/** Converte um mapa (array de strings) em SVG. `colors` mapeia letra → cor. */
export function pixelSVG(map, colors, { className = '', title = '' } = {}) {
  const h = map.length;
  const w = Math.max(...map.map((r) => r.length));
  let rects = '';
  map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (row[x + run] === ch) run++;
      if (ch !== '.' && colors[ch]) rects += `<rect x="${x}" y="${y}" width="${run}" height="1" style="fill:${colors[ch]}"/>`;
      x += run;
    }
  });
  const label = title ? `role="img" aria-label="${title}"` : 'aria-hidden="true"';
  return `<svg class="${className}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" ${label}>${rects}</svg>`;
}

/**
 * Bola com contorno, sombra e brilho (sol, botões, alavanca).
 * Gera o mapa a partir do raio — qualquer tamanho fica redondo em pixel.
 */
export function ballMap(r, { crescent = false } = {}) {
  const size = r * 2;
  const c = r - 0.5;
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > r - 0.2) { row += '.'; continue; }
      if (crescent && Math.hypot(x - c - r * 0.55, y - c + r * 0.35) < r * 0.78) { row += '.'; continue; }
      if (d > r - 1.2) row += 'K';                                   // contorno
      else if (!crescent && Math.hypot(x - c + r * 0.42, y - c + r * 0.42) < Math.max(1.1, r * 0.14)) row += 'W'; // brilho especular
      else if (Math.hypot(x - c + r * 0.35, y - c + r * 0.35) < r * 0.32) row += 'L'; // área iluminada
      else if (x + y > size * 1.15 || d > r - 2.1 && x + y > size * 0.9) row += 'S';  // sombra
      else row += 'B';
    }
    rows.push(row);
  }
  return rows;
}

/** Elipse vista de cima (botões e base do joystick no painel inclinado). */
export function ellipseMap(w, h) {
  const rows = [];
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const d = ((x - cx) / (w / 2)) ** 2 + ((y - cy) / (h / 2)) ** 2;
      if (d > 1) { row += '.'; continue; }
      const edge = ((x - cx) / (w / 2 - 1)) ** 2 + ((y - cy) / (h / 2 - 1)) ** 2 > 1;
      if (edge) row += 'K';
      else if (y > cy + h * 0.14) row += 'S';
      else if (y < cy - h * 0.18 && x < cx && d < 0.45) row += 'W';
      else if (y < cy - h * 0.12 && x < cx + 1) row += 'L';
      else row += 'B';
    }
    rows.push(row);
  }
  return rows;
}

/** Tampa 3D de botão arcade em pixel art (domo brilhante + borda lateral). */
export function buttonCapMap(w = 24, h = 13) {
  const rows = [];
  const cx = (w - 1) / 2;
  const topCy = 4.2;
  const rx = w / 2 - 0.5;
  const ry = 4.2;
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const topD = ((x - cx) / rx) ** 2 + ((y - topCy) / ry) ** 2;
      const botD = ((x - cx) / rx) ** 2 + ((y - (h - 5)) / ry) ** 2;
      const inSkirt = Math.abs(x - cx) <= rx && y >= topCy && y <= h - 5;
      if (topD > 1 && botD > 1 && !inSkirt) { row += '.'; continue; }

      const isOuter =
        (y < topCy && topD > 0.72) ||
        (y > h - 5 && botD > 0.72) ||
        (inSkirt && Math.abs(x - cx) >= rx - 1.1);
      if (isOuter) { row += 'K'; continue; }

      if (topD <= 1) {
        if (Math.hypot((x - (cx - rx * 0.35)) / 1.5, y - (topCy - ry * 0.35)) < 1.3) row += 'W';
        else if (y < topCy && x < cx + 2) row += 'L';
        else if (y > topCy + 1.6) row += 'S';
        else row += 'B';
      } else {
        row += Math.abs(x - cx) > rx * 0.55 || y > h - 3.5 ? 'D' : 'S';
      }
    }
    rows.push(row);
  }
  return rows;
}

export const MAPS = {
  cat: [
    '..KK...........KK..',
    '.KEEK.........KEEK.',
    '.KEEEK.......KEEEK.',
    '.KEEKKKKKKKKKKKEEK.',
    '.KBBBBBBBBBBBBBBBK.',
    'KBBBBBBBBBBBBBBBBBK',
    'KBBBBLKBBBBBLKBBBBK',
    'KBBBBKKBBBBBKKBBBBK',
    'KBBPPBBBBKBBBBPPBBK',
    '.KBBBBBBKBKBBBBBBK.',
    '..KBBBBBBBBBBBBBK..',
    '...KKBBBBBBBBBKK...',
    '.....KKKKKKKKK.....',
  ],
  starGold: [
    '.....K.....',
    '....KYK....',
    '....KYK....',
    '.KKKYLYKKK.',
    'KYYYYLYYYYK',
    '.KYYYYYYYK.',
    '..KYYOYYK..',
    '..KYOKOYK..',
    '.KYOK.KOYK.',
    '.KKK...KKK.',
  ],
  bulb: [
    '..KKK..',
    '.KSSSK.',
    'KLLBBBK',
    'KLWBBBK',
    'KBBBBBK',
    'KBBSSSK',
    '.KSSSK.',
    '..KKK..',
  ],
  leverBase: [
    '..KKKKKKKKKKKKKK..',
    '.KLLBBBBBBBBBBSSK.',
    'KLRBKKKKKKKKKKBRSK',
    'KLBBKDDDDDDDDKBBSK',
    'KBBBKDDDDDDDDKBBBK',
    'KBBBKDDDDDDDDKBBBK',
    'KBBBKDDDDDDDDKBBBK',
    'KBRBKDDDDDDDDKBRSK',
    'KSSSKKKKKKKKKKSSSK',
    '.KKKKKKKKKKKKKKKK.',
  ],
  joyBase: [
    '...KKKKKKKKKKKKKKKKKK...',
    '.KKLLBBBBBBBBBBBBBBSSKK.',
    'KLRBKKKKKKKKKKKKKKKKBRSK',
    'KLBKSSSSSSSSSSSSSSSSKBSK',
    'KBBKSSKKKKKKKKKKKKSSKBBK',
    'KSSSKKKKKKKKKKKKKKKKSSSK',
    '.KKKKKKKKKKKKKKKKKKKKKK.',
  ],
  sparkle: ['..W..', '..W..', 'WWWWW', '..W..', '..W..'],
  sparkleSm: ['.W.', 'WWW', '.W.'],
  cloud: [
    '......WWWW..........',
    '....WWWWWWWW..WWW...',
    '..WWWWWWWWWWWWWWWWW.',
    'WWWWWWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWWWWWW',
    '.SSSSSSSSSSSSSSSSSS.',
  ],
  star: ['.W.', 'WWW', '.W.'],
  die: [
    '.KKKKKKKKK.',
    'KWWWWWWWWWK',
    'KWKKWWWKKWK',
    'KWKKWWWKKWK',
    'KWWWWKWWWWK',
    'KWWWKKKWWWK',
    'KWWWWKWWWWK',
    'KWKKWWWKKWK',
    'KWKKWWWKKWK',
    'KSSSSSSSSSK',
    '.KKKKKKKKK.',
  ],
};

/** Silhueta de morros em degraus (para usar como máscara CSS). */
export function hillsMask({ cells = 48, maxH = 14, minH = 4, seed = 1 } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let h = Math.round((maxH + minH) / 2);
  let rects = '';
  for (let x = 0; x < cells; ) {
    const run = 3 + Math.floor(rnd() * 6);
    h = Math.max(minH, Math.min(maxH, h + Math.round((rnd() - 0.5) * 6)));
    rects += `<rect x="${x}" y="${maxH - h}" width="${run}" height="${h}"/>`;
    x += run;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cells} ${maxH}" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
