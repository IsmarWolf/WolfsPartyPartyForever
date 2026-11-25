/**
 * Ponto de entrada: só conecta os módulos. Nenhuma regra mora aqui.
 */
import { CharacterModel } from './character/model.js';
import { Input } from './core/input.js';
import { Viewport } from './core/viewport.js';
import { sfx } from './core/audio.js';
import { loadProfile, saveProfile } from './core/storage.js';
import { Cabinet } from './ui/cabinet.js';
import { Lever } from './ui/lever.js';
import { CreatorScreen } from './ui/creatorScreen.js';
import { runRandomizer } from './ui/randomizer.js';
import { mountRoom } from './ui/room.js';
import { mountMarquee } from './ui/marquee.js';
import { mountShell } from './ui/shell.js';
import { mountLounge } from './views/lounge.js';

const $ = (id) => document.getElementById(id);

const rig = $('rig');
const viewport = new Viewport(rig, { width: 1280, height: 1000, margin: 1 });
const getScale = () => viewport.scale;
const input = new Input();
const model = new CharacterModel(loadProfile());

// áudio só pode começar após um gesto do usuário
['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, () => sfx.unlock(), { capture: true }));

mountShell($('shell'));
mountRoom({ root: $('room-layers'), toggle: $('time-toggle') });
mountMarquee({ title: $('title'), deco: $('marquee-deco') });

const cabinet = new Cabinet({ deck: $('deck'), soundToggle: $('sound-toggle'), input, sfx, getScale });
const lever = new Lever({ root: $('lever'), sfx, getScale });
const screen = new CreatorScreen({ root: $('screen'), model, input, sfx });

// salva a cada mudança: recarregar a página não perde o personagem
let saveTimer = 0;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => saveProfile(model.toJSON()), 150); };
['change', 'name', 'mode', 'custom'].forEach((ev) => model.on(ev, save));

// alavanca chegou no fim → sacode a máquina e sorteia
lever.on('pull', () => {
  rig.classList.remove('is-shaking');
  void rig.offsetWidth;
  rig.classList.add('is-shaking');
  runRandomizer({ model, screen, input, sfx });
});
screen.on('random', () => lever.autoPull());

screen.on('done', async (profile) => {
  input.locked = true;
  saveProfile(profile);
  await new Promise((r) => setTimeout(r, 250));
  sfx.whoosh();
  const zoom = viewport.zoomTo(rectInRig($('screen')), { duration: 1000 });
  setTimeout(() => $('flash').classList.add('is-on'), 700);
  await zoom;
  $('room').hidden = true;
  await mountLounge($('lounge'), profile);
});

/** Retângulo de um elemento em coordenadas do palco (sem escala). */
function rectInRig(el) {
  let x = 0;
  let y = 0;
  for (let n = el; n && n !== rig; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, width: el.offsetWidth, height: el.offsetHeight };
}
