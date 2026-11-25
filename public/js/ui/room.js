/**
 * A sala ao redor do fliperama: janela com céu (dia → entardecer → noite),
 * varal de lâmpadas e pôster. Começa pela hora do relógio; o interruptor
 * no canto troca na mão. Cores em tokens.css por [data-time].
 */
import { pixelSVG, ballMap, MAPS } from '../art/pixel.js';

const TIMES = ['day', 'dusk', 'night'];
const LABEL = { day: 'Dia', dusk: 'Entardecer', night: 'Noite' };
const KEY = 'wolfsparty:time';

const SUN = { K: '#e0861c', B: '#ffc43d', S: '#f0a52c', L: '#ffe58f' };
const DUSK_SUN = { K: '#c4213a', B: '#ff8a6a', S: '#ff6a5a', L: '#ffc2a8' };
const MOON = { K: '#8b64ff', B: '#ece4ff', S: '#c7b6f2', L: '#ffffff' };
const BULB_COLORS = ['var(--red)', 'var(--cyan-dark)', 'var(--gold)', 'var(--pink)', 'var(--green)'];



function roofsMask() {
  const heights = [10, 14, 14, 8, 8, 18, 18, 18, 11, 11, 6, 13, 13, 9, 9];
  const rects = heights.map((h, x) => `<rect x="${x * 8}" y="${20 - h}" width="8" height="${h}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 20" preserveAspectRatio="none" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function buildLights(root) {
  const swags = 3;
  const perSwag = 7;
  let bulbs = '';
  let path = '';
  for (let s = 0; s < swags; s++) {
    const x0 = (s / swags) * 100;
    const x1 = ((s + 1) / swags) * 100;
    path += `M${x0} 10 Q${(x0 + x1) / 2} 70 ${x1} 10 `;
    for (let i = 1; i < perSwag; i++) {
      const t = i / perSwag;
      const x = x0 + (x1 - x0) * t;
      const y = 10 + 60 * 2 * t * (1 - t) * 1; // curva quadrática da fiação
      const color = BULB_COLORS[(s * perSwag + i) % BULB_COLORS.length];
      bulbs += `<i class="bulb" style="left:${x}%;top:calc(${y}% + 6px);--c:${color};--d:${1.4 + ((s + i) % 4) * 0.5}s"></i>`;
    }
  }
  root.innerHTML = `<svg class="wire" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="${path}" fill="none" stroke="#120827" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>${bulbs}`;
}

export function mountRoom({ root, toggle }) {
  const $ = (sel) => root.querySelector(sel);

  $('.sky__stars').innerHTML = Array.from({ length: 18 }, () =>
    `<i style="left:${Math.random() * 96}%;top:${Math.random() * 70}%;--d:${1.5 + Math.random() * 3}s;--delay:${-Math.random() * 3}s"></i>`).join('');

  $('.sky__clouds').innerHTML = Array.from({ length: 3 }, (_, i) =>
    `<div class="cloud" style="top:${8 + i * 22}%;--w:${44 + i * 10}%;--dur:${40 + i * 15}s;--delay:${-i * 17}s">
      ${pixelSVG(MAPS.cloud, { W: 'var(--cloud)', S: 'var(--cloud-shade)' })}</div>`).join('');

  $('.sky__orb').innerHTML = `
    <div class="orb orb--day">${pixelSVG(ballMap(8), SUN)}</div>
    <div class="orb orb--dusk">${pixelSVG(ballMap(8), DUSK_SUN)}</div>
    <div class="orb orb--night">${pixelSVG(ballMap(7, { crescent: true }), MOON)}</div>`;

  root.style.setProperty('--roofs', roofsMask());
  $('.room__poster').innerHTML = pixelSVG(MAPS.starGold, { Y: '#ffc43d', L: '#ffe58f', O: '#e0861c' });
  buildLights($('.room__lights'));

  const icons = {
    day: pixelSVG(ballMap(6), SUN),
    dusk: pixelSVG(ballMap(6), DUSK_SUN),
    night: pixelSVG(ballMap(6, { crescent: true }), MOON),
  };

  let current;
  const set = (time) => {
    current = time;
    document.documentElement.dataset.time = time;
    toggle.innerHTML = icons[time];
    toggle.setAttribute('aria-label', `Hora do dia: ${LABEL[time]} (clique para mudar)`);
    toggle.title = LABEL[time];
  };

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* sem armazenamento */ }
  set(TIMES.includes(saved) ? saved : 'night');

  toggle.addEventListener('click', () => {
    const next = TIMES[(TIMES.indexOf(current) + 1) % TIMES.length];
    set(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignora */ }
  });
}
