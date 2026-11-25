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
      else if (Math.hypot(x - c + r * 0.38, y - c + r * 0.38) < r * 0.22) row += 'L'; // brilho
      else if (x + y > size * 1.15) row += 'S';                       // sombra
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
      else if (y > cy + h * 0.12) row += 'S';
      else if (y < cy - h * 0.15 && x < cx) row += 'L';
      else row += 'B';
    }
    rows.push(row);
  }
  return rows;
}

export const MAPS = {
  cat: [
    'K.............K',
    'KK...........KK',
    'K.K.........K.K',
    'K..KKKKKKKKK..K',
    'K.............K',
    'K.............K',
    'K...K.....K...K',
    'K...K.....K...K',
    'K.P.........P.K',
    'K.....K.K.....K',
    '.K.....K.....K.',
    '..KK.......KK..',
    '....KKKKKKK....',
  ],
  starGold: [
    '....Y....',
    '...YYY...',
    '...YLY...',
    'YYYYLYYYY',
    '.YYYYYYY.',
    '..YYYYY..',
    '..YYOYY..',
    '.YYO.OYY.',
    '.YO...OY.',
  ],
  sparkle: ['..W..', '..W..', 'WWWWW', '..W..', '..W..'],
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
