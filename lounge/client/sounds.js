/** Sons do lounge, feitos com o sintetizador do jogo (core/audio.js). */
import { sfx } from '/js/core/audio.js';

let foot = 0;

export const sounds = {
  step() {
    foot ^= 1; // alterna pé esquerdo/direito
    sfx.noise({ dur: 0.035, vol: 0.07, freq: foot ? 700 : 560 });
    sfx.tone({ freq: foot ? 150 : 130, dur: 0.03, vol: 0.05, type: 'triangle' });
  },
  punch(remote = false) {
    sfx.noise({ dur: 0.06, vol: remote ? 0.05 : 0.12, freq: 2200 });
    sfx.tone({ freq: 260, to: 120, dur: 0.07, vol: remote ? 0.04 : 0.1, type: 'triangle' });
  },
  hit() {
    sfx.noise({ dur: 0.09, vol: 0.3, freq: 500 });
    sfx.tone({ freq: 160, to: 60, dur: 0.12, vol: 0.2 });
  },
  sit() {
    sfx.noise({ dur: 0.12, vol: 0.12, freq: 300 });
    sfx.tone({ freq: 330, to: 220, dur: 0.1, vol: 0.08, type: 'triangle' });
  },
  stand() {
    sfx.tone({ freq: 220, to: 360, dur: 0.08, vol: 0.08, type: 'triangle' });
  },
  prompt() { sfx.tone({ freq: 1200, dur: 0.03, vol: 0.05 }); },
  open() { sfx.confirm(); },
  close() { sfx.tone({ freq: 600, to: 400, dur: 0.06, vol: 0.08 }); },
  nav() { sfx.nav(); },
  vote() { sfx.change(1); },
  locked() { sfx.error(); },
  use() { sfx.fanfare(); },
};
