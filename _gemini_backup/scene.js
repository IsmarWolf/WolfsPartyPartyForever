/**
 * Cenário de fundo com ciclo de dia: dia → entardecer → noite.
 * Começa pelo relógio do jogador; o botão no canto troca na mão.
 * As cores vivem em tokens.css (por [data-time]); aqui só montamos as peças.
 */
import { pixelSVG, ballMap, MAPS, hillsMask } from '../art/pixel.js';

const TIMES = ['day', 'dusk', 'night'];
const LABEL = { day: 'Dia', dusk: 'Entardecer', night: 'Noite' };
const KEY = 'wolfsparty:time';

const SUN = { K: '#f08a3c', B: '#ffc35a', S: '#f5a742', L: '#fff3c4' };
const DUSK_SUN = { K: '#c4503f', B: '#f5844a', S: '#e0663f', L: '#ffd2a0' };
const MOON = { K: '#9aa3d6', B: '#e8ecff', S: '#c2c9f0', L: '#ffffff' };

function clockTime() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'dusk';
  return 'night';
}

export function mountScene({ root, toggle }) {
  const $ = (sel) => root.querySelector(sel);

  // estrelas
  $('.scene__stars').innerHTML = Array.from({ length: 40 }, (_, i) =>
    `<i style="left:${Math.random() * 100}%;top:${Math.random() * 55}%;--d:${1.5 + Math.random() * 3}s;--delay:${-Math.random() * 3}s;--s:${i % 5 === 0 ? 3 : 1}"></i>`).join('');

  // nuvens
  $('.scene__clouds').innerHTML = Array.from({ length: 6 }, (_, i) =>
    `<div class="cloud" style="top:${6 + (i * 37) % 40}%;--w:${100 + (i % 3) * 50}px;--dur:${70 + i * 18}s;--delay:${-i * 23}s">
      ${pixelSVG(MAPS.cloud, { W: 'var(--cloud)', S: 'var(--cloud-shade)' })}</div>`).join('');

  // astros (os três ficam prontos; o CSS mostra o da hora)
  $('.scene__orb').innerHTML = `
    <div class="orb orb--day">${pixelSVG(ballMap(10), SUN)}</div>
    <div class="orb orb--dusk">${pixelSVG(ballMap(10), DUSK_SUN)}</div>
    <div class="orb orb--night">${pixelSVG(ballMap(9, { crescent: true }), MOON)}</div>`;

  // morros em degraus
  root.style.setProperty('--hills-far', hillsMask({ seed: 7, maxH: 16, minH: 6 }));
  root.style.setProperty('--hills-near', hillsMask({ seed: 3, maxH: 9, minH: 3 }));

  // ícones do botão
  const icons = {
    day: pixelSVG(ballMap(6), SUN),
    dusk: pixelSVG(ballMap(6), DUSK_SUN),
    night: pixelSVG(ballMap(6, { crescent: true }), MOON),
  };

  let current = null;
  const set = (time) => {
    current = time;
    document.documentElement.dataset.time = time;
    toggle.innerHTML = icons[time];
    toggle.setAttribute('aria-label', `Hora do dia: ${LABEL[time]} (clique para mudar)`);
    toggle.title = LABEL[time];
  };

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* sem armazenamento */ }
  set(TIMES.includes(saved) ? saved : clockTime());

  toggle.addEventListener('click', () => {
    const next = TIMES[(TIMES.indexOf(current) + 1) % TIMES.length];
    set(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignora */ }
  });

  return {
    /** Posiciona o chão (em px da janela) para o gabinete "pisar" nele. */
    setGround(y) {
      root.style.setProperty('--ground-y', `${Math.round(y)}px`);
    },
  };
}
