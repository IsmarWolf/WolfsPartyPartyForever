/**
 * Sequência do "caça-níquel" (roda depois que a alavanca bate no fim):
 * monta o personagem parte por parte — cada parte gira e trava com um som.
 */
import { SLOTS, randomName } from '../character/model.js';

const SPINS = 4;        // quantas trocas antes de travar
const SPIN_MS = 32;     // velocidade do giro
const LOCK_MS = 40;     // pausa depois de travar

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runRandomizer({ model, screen, input, sfx }) {
  if (input.locked) return;
  input.locked = true;
  try {
    screen.showBuild();
    await wait(120);
    screen.setRolling(true);

    for (const [step, slot] of SLOTS.entries()) {
      const row = screen.rowEl(slot.key);
      row.classList.add('is-rolling');

      for (let i = 0; i < SPINS; i++) {
        model.set(slot.key, model.randomId(slot.key));
        sfx.tick();
        await wait(SPIN_MS);
      }
      model.set(slot.key, model.randomId(slot.key));
      row.classList.remove('is-rolling', 'is-locked');
      void row.offsetWidth;
      row.classList.add('is-locked');
      screen.pop();
      sfx.lock(step);
      await wait(LOCK_MS);
    }

    if (!model.name) model.setName(randomName());
    screen.setRolling(false);
    screen.burst();
    sfx.fanfare();
  } finally {
    input.locked = false;
  }
}
