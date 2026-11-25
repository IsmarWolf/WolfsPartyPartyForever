/**
 * Aplica no jogo um gabinete desenhado no Estúdio:
 * troca a carcaça vetorial pelas camadas em pixel e reposiciona as peças.
 * Sem desenho salvo, nada muda (fica o gabinete padrão).
 * `?gabinete=padrao` na URL ignora o desenho salvo.
 */
import { SIZE, PIECES, loadBest } from './design.js';

function layerCanvas(className, dataURL) {
  const c = document.createElement('canvas');
  c.width = SIZE.w;
  c.height = SIZE.h;
  c.className = `cshell ${className} pixel`;
  c.setAttribute('aria-hidden', 'true');
  if (dataURL) {
    const img = new Image();
    img.onload = () => c.getContext('2d').drawImage(img, 0, 0);
    img.src = dataURL;
  }
  return c;
}

const place = (el, x, y) => {
  if (!el) return;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
};

export function applyLayout(rig, layout) {
  const $ = (s) => rig.querySelector(s);
  const { screen, marquee, joystick, keyboard, buttons, lever, sound } = layout;

  for (const sel of ['.screen', '.screen__glass']) {
    const el = $(sel);
    place(el, screen.x, screen.y);
    el.style.transformOrigin = '0 0';
    el.style.transform = `scale(${screen.scale})`;
  }
  const m = $('.marquee');
  place(m, marquee.x, marquee.y);
  m.style.transformOrigin = '0 0';
  m.style.transform = `scale(${marquee.scale})`;

  place($('.joy'), joystick.x, joystick.y);
  place($('.keyboard'), keyboard.x, keyboard.y);
  place($('.abtn--b'), buttons.x, buttons.y + 22);
  place($('.abtn--a'), buttons.x + 90, buttons.y);
  place($('#lever'), lever.x, lever.y);
  place($('.sound-toggle'), sound.x, sound.y);
}

export async function applyCabinetDesign(rig, { base = '' } = {}) {
  if (new URLSearchParams(location.search).get('gabinete') === 'padrao') return null;
  const design = await loadBest(base);
  if (!design) return null;
  const hasArt = Object.values(design.layers).some(Boolean);

  if (hasArt) {
    rig.classList.add('rig--custom');
    const svg = rig.querySelector('.shell');
    svg.after(
      layerCanvas('cshell--base', design.layers.base),
      layerCanvas('cshell--glow', design.layers.neon),
      layerCanvas('cshell--neon', design.layers.neon),
    );
    rig.querySelector('#lever').before(layerCanvas('cshell--front', design.layers.front));
  }
  if (!design.autoDeco) rig.classList.add('rig--no-deco');
  applyLayout(rig, design.layout);
  return design;
}

export { PIECES };
