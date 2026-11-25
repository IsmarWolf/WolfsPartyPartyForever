/**
 * Letreiro: título em pixel com letras em arco, estrelas e brilhos. O texto vem de TITLE — troque aqui.
 */
import { pixelSVG, MAPS } from '../art/pixel.js';

export const TITLE = {
  top: [{ text: 'PARTY', color: 'pink' }, { text: 'PARTY', color: 'cyan' }],
  bottom: [{ text: 'FOREVER', color: 'lilac' }],
};

const STAR = { Y: '#ffc43d', L: '#ffe58f', O: '#e0861c' };

/** Letras de uma linha, curvadas num arco (∩). */
function row(words, { lift, tilt }) {
  const letters = [];
  words.forEach((w, wi) => {
    if (wi > 0) letters.push(null);
    [...w.text].forEach((ch) => letters.push({ ch, color: w.color }));
  });
  const mid = (letters.length - 1) / 2;
  return letters.map((l, i) => {
    if (!l) return '<span class="title__gap"></span>';
    const t = (i - mid) / mid;
    return `<span class="letter letter--${l.color}" style="--y:${(t * t * lift).toFixed(1)}px;--r:${(t * tilt).toFixed(1)}deg">${l.ch}</span>`;
  }).join('');
}

export function mountMarquee({ title, deco }) {
  title.innerHTML = `
    <span class="title__row title__row--top">${row(TITLE.top, { lift: 14, tilt: 7 })}</span>
    <span class="title__row title__row--bottom">${row(TITLE.bottom, { lift: 8, tilt: 5 })}</span>
    <svg class="title__arc" viewBox="0 0 560 40" shape-rendering="crispEdges" aria-hidden="true">
      <path d="M8 6 Q40 18 86 16" stroke="#8b64ff" stroke-width="7"/>
      <path d="M552 6 Q520 18 474 16" stroke="#8b64ff" stroke-width="7"/>
      <path d="M110 18 Q280 46 450 18" stroke="#ff4fa8" stroke-width="9"/>
    </svg>`;
  title.setAttribute('aria-label', [...TITLE.top, ...TITLE.bottom].map((w) => w.text).join(' '));

  const sparkles = [[150, 18], [250, 160], [640, 10], [810, 70], [62, 150], [700, 165], [540, 175], [330, 4], [870, 150]];
  deco.innerHTML = `
    <div class="deco-star" style="left:122px;top:100px">${pixelSVG(MAPS.starGold, STAR)}</div>
    <div class="deco-star" style="right:122px;top:100px;animation-delay:-.8s">${pixelSVG(MAPS.starGold, STAR)}</div>
    ${sparkles.map(([x, y], i) => `<div class="deco-sparkle" style="left:${x}px;top:${y}px;--d:${1.6 + (i % 3) * .6}s;--delay:${-i * .4}s">${pixelSVG(MAPS.sparkle, { W: i % 2 ? '#b89cff' : '#ff9ad2' })}</div>`).join('')}`;
}
