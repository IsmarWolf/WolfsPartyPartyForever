/**
 * Pinball Duelo — página (desenho, sons e controles).
 * A física roda no servidor (server.js); aqui só desenha o estado que chega.
 * A mesa gira para que o SEU lado fique sempre embaixo.
 * Pixel art de verdade (games/_shared/pixel.js) com a paleta illu32.
 */
import { joinGame } from '/lounge/game-api.js';
import { sfx } from '/js/core/audio.js';
import { PAL, RAMPS, PLAYER_RAMPS } from '/games/_shared/palette.js';
import { createPixels } from '/games/_shared/pixel.js';
import {
  SIZE, C, BALL_R, FLIPPER, SIDE_ANGLE, BUMPERS, TARGETS, TARGET_THICK,
  rot, buildWalls, sideFlippers,
} from './table.js';

const game = joinGame();
const canvas = document.querySelector('canvas');
const px = createPixels(canvas);
const K = canvas.width / SIZE;
const $tags = document.querySelector('.tags');
const $msg = document.querySelector('.msg');

let me = null;
let state = null;
let view = 0; // giro da mesa (meu lado embaixo)
const flash = new Map(); // chave da peça → até quando brilha
let msgUntil = 0;

if (game.standalone) $msg.innerHTML = 'ABRA PELO LOUNGE<small>o jogo começa pela votação</small>';
game.ready.then((init) => { me = init.me; });

// ── controles: teclado e toque (metade esquerda/direita da tela)
const input = { l: false, r: false };
const keys = { l: ['ArrowLeft', 'KeyA', 'KeyZ', 'ShiftLeft'], r: ['ArrowRight', 'KeyD', 'KeyM', 'ShiftRight', 'Slash'] };
let sent = '';
function push() {
  const k = `${input.l}${input.r}`;
  if (k === sent) return;
  sent = k;
  game.send('input', input);
}
function onKey(e) {
  sfx.unlock();
  for (const side of ['l', 'r']) {
    if (keys[side].includes(e.code)) {
      e.preventDefault();
      input[side] = e.type === 'keydown';
    }
  }
  push();
}
addEventListener('keydown', onKey);
addEventListener('keyup', onKey);
addEventListener('blur', () => { input.l = input.r = false; push(); });
const touches = new Map();
function onTouch(e) {
  sfx.unlock();
  if (e.type === 'pointerdown' || e.type === 'pointermove') {
    if (e.type === 'pointermove' && !touches.has(e.pointerId)) return;
    touches.set(e.pointerId, e.clientX < innerWidth / 2 ? 'l' : 'r');
  } else touches.delete(e.pointerId);
  input.l = [...touches.values()].includes('l');
  input.r = [...touches.values()].includes('r');
  push();
}
['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((t) => addEventListener(t, onTouch));

// ── mensagens do servidor
game.on('state', (s) => {
  const first = !state;
  state = s;
  const mine = s.players.find((p) => p.id === me);
  view = mine ? -SIDE_ANGLE[mine.side] : 0;
  if (first) renderTags();
  else updateTags();
});

const lit = (key, ms = 140) => flash.set(key, performance.now() + ms);

game.on('fx', ({ kind, x, y, side }) => {
  const mySide = state?.players.find((p) => p.id === me)?.side;
  if (kind === 'bump' || kind === 'post') {
    const i = BUMPERS.findIndex((b) => b.x === x && b.y === y);
    lit(`b${i}`);
    if (kind === 'bump') sfx.tone({ freq: 880 + i * 70, to: 1400, dur: 0.06, vol: 0.09 });
    else sfx.tone({ freq: 1600, dur: 0.025, vol: 0.05 });
  } else if (kind === 'sling') {
    lit(`s${side}`);
    sfx.noise({ dur: 0.03, vol: 0.12, freq: 2600 });
    sfx.tone({ freq: 700, to: 1100, dur: 0.04, vol: 0.06 });
  } else if (kind === 'target') {
    sfx.tone({ freq: 1200, to: 600, dur: 0.07, vol: 0.09, type: 'triangle' });
  } else if (kind === 'bank') {
    lit(`k${side}`, 900);
    sfx.fanfare();
    if (side === mySide) say('+2000!', 900);
  } else if (kind === 'bat') {
    sfx.noise({ dur: 0.04, vol: 0.15, freq: 1600 });
    sfx.tone({ freq: 300, to: 520, dur: 0.05, vol: 0.08, type: 'triangle' });
  } else if (kind === 'flip' && side === mySide) {
    sfx.tone({ freq: 180, dur: 0.03, vol: 0.06 });
  } else if (kind === 'drain') {
    lit(`d${side}`, 600);
    sfx.tone({ freq: 520, to: 90, dur: 0.35, vol: side === mySide ? 0.22 : 0.1 });
    if (side === mySide) say('PERDEU UMA BOLA!', 1200);
  } else if (kind === 'out') {
    const p = state?.players.find((q) => q.side === side);
    sfx.error();
    say(p?.id === me ? 'VOCÊ ESTÁ FORA!' : `${p?.name ?? ''} ESTÁ FORA!`, 1600);
  } else if (kind === 'extra') {
    sfx.tone({ freq: 660, to: 990, dur: 0.12, vol: 0.12 });
    say('+1 BOLA!', 1200);
  } else if (kind === 'go') {
    sfx.confirm();
    say('JÁ!', 700);
  } else if (kind === 'over') {
    sfx.fanfare();
  }
});

function say(text, ms) {
  $msg.innerHTML = text;
  msgUntil = performance.now() + ms;
}

// ── etiquetas com nome, vidas e pontos em volta da mesa
function tagPos(side) {
  const [x, y] = rot(rot([C, SIZE - 22], SIDE_ANGLE[side]), view);
  return [(x / SIZE) * 100, (y / SIZE) * 100];
}
function renderTags() {
  $tags.innerHTML = state.players.map((p) =>
    `<span class="tag" data-id="${p.id}" style="--c:${PLAYER_RAMPS[p.side][2]};--d:${PLAYER_RAMPS[p.side][0]}"></span>`).join('');
  updateTags();
}
function updateTags() {
  for (const p of state.players) {
    const el = $tags.querySelector(`[data-id="${CSS.escape(p.id)}"]`);
    if (!el) continue;
    const [x, y] = tagPos(p.side);
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.classList.toggle('is-out', !p.alive);
    el.classList.toggle('is-me', p.id === me);
    el.innerHTML = `${p.id === me ? 'VOCÊ' : p.name}<i>${'♥'.repeat(Math.max(0, p.lives))}</i><b>${p.score}</b>`;
  }
}

// ── desenho: mundo (800) → pixels (canvas), já girado para a minha visão
const T = (x, y) => {
  const [rx, ry] = rot([x, y], view);
  return [rx * K, ry * K];
};
const P = (v) => Math.max(1, Math.round(v * K)); // tamanho no mundo → pixels

/** Camada fixa (chão, paredes, bumpers apagados). Refeita quando um lado fecha. */
let base = null;
let baseKey = '';

function drawFloor() {
  px.clear(PAL.night);
  // ladrilhos em xadrez + pontinhos de grade
  const tile = 16;
  for (let y = 0; y < px.h; y++) {
    for (let x = 0; x < px.w; x++) {
      const checker = ((x / tile | 0) + (y / tile | 0)) % 2;
      if (checker) px.px(x, y, PAL.ink);
      if (x % tile === 0 && y % tile === 0) px.px(x, y, PAL.deep);
    }
  }
  // emblema do centro (onde a bola nasce)
  const [cx, cy] = T(C, C);
  px.ball(cx, cy, P(52), RAMPS.dark, true);
  px.ball(cx, cy, P(34), [PAL.navy, PAL.deep, PAL.slate], true);
  for (let i = 0; i < 4; i++) {
    // setas apontando para cada lado
    const a = SIDE_ANGLE[i];
    for (let k = 0; k < 3; k++) {
      const [ax, ay] = T(...rot([C, C + 140 + k * 26], a));
      const [bx, by] = T(...rot([C - 14, C + 126 + k * 26], a));
      const [dx, dy] = T(...rot([C + 14, C + 126 + k * 26], a));
      px.bar(bx, by, ax, ay, 1, RAMPS.dark, false);
      px.bar(dx, dy, ax, ay, 1, RAMPS.dark, false);
    }
  }
}

function drawSling(side, lit) {
  const r = PLAYER_RAMPS[side];
  for (const mirror of [false, true]) {
    const tri = [[150, 610], [150, 690], [222, 712]].map(([x, y]) => (mirror ? [SIZE - x, y] : [x, y]));
    const pts = tri.map((p) => T(...rot(p, SIDE_ANGLE[side])));
    // corpo: preenche o triângulo pixel a pixel
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const area = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
        const p = [x + 0.5, y + 0.5];
        const s1 = area(pts[0], pts[1], p);
        const s2 = area(pts[1], pts[2], p);
        const s3 = area(pts[2], pts[0], p);
        if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) px.px(x, y, r[0]);
      }
    }
    px.bar(...pts[0], ...pts[1], 1, RAMPS.dark);
    px.bar(...pts[1], ...pts[2], 1, RAMPS.dark);
    px.bar(...pts[0], ...pts[2], 2, lit ? RAMPS.ice : r); // face que chuta
  }
}

function drawStatic(open) {
  drawFloor();
  for (const w of buildWalls(open)) {
    if (w.kind === 'sling' || w.kind === 'slingKick') continue;
    const [x1, y1] = T(w.s[0], w.s[1]);
    const [x2, y2] = T(w.s[2], w.s[3]);
    const ramp = w.kind === 'guide' ? PLAYER_RAMPS[w.side] : RAMPS.steel;
    px.bar(x1, y1, x2, y2, 3, ramp);
  }
  base = px.snapshot();
}

function draw(now) {
  requestAnimationFrame(draw);
  if (!state) return;
  const bySide = (s) => state.players.find((p) => p.side === s);
  const open = [0, 1, 2, 3].map((s) => Boolean(bySide(s)?.alive));
  const key = `${open.join()}|${view}`;
  if (key !== baseKey) { drawStatic(open); baseKey = key; }
  px.blit(base);
  const on = (k) => (flash.get(k) ?? 0) > now;

  // boca de cada buraco aberto: faixa piscando na cor do dono
  for (let s = 0; s < 4; s++) {
    if (!open[s]) continue;
    const ramp = PLAYER_RAMPS[s];
    const blink = on(`d${s}`) ? Math.floor(now / 80) % 2 : 0;
    for (let x = 350; x <= 450; x += 20) {
      const [ax, ay] = T(...rot([x, SIZE - 6], SIDE_ANGLE[s]));
      const [bx, by] = T(...rot([x + 10, SIZE - 6], SIDE_ANGLE[s]));
      px.bar(ax, ay, bx, by, 1, blink ? RAMPS.ice : ramp, false);
    }
    drawSling(s, on(`s${s}`));
  }

  // alvos: de pé (laranja) ou derrubados (só a marca no chão)
  TARGETS.forEach((t, i) => {
    const [x1, y1] = T(t.s[0], t.s[1]);
    const [x2, y2] = T(t.s[2], t.s[3]);
    const up = state.targets?.[i] === '1';
    if (up) px.bar(x1, y1, x2, y2, P(TARGET_THICK) + 1, on(`k${t.side}`) ? RAMPS.ice : RAMPS.orange);
    else px.bar(x1, y1, x2, y2, 1, RAMPS.dark, false);
  });

  // bumpers e pinos
  BUMPERS.forEach((b, i) => {
    const [x, y] = T(b.x, b.y);
    if (b.kind === 'bumper') {
      px.ball(x, y, P(b.r), on(`b${i}`) ? RAMPS.ice : RAMPS.pink);
      px.ball(x, y, P(b.r * 0.55), on(`b${i}`) ? RAMPS.orange : RAMPS.red);
    } else {
      px.ball(x, y, P(b.r), on(`b${i}`) ? RAMPS.ice : RAMPS.steel);
    }
  });

  // flippers
  let fi = 0;
  for (const p of state.players) {
    for (const f of sideFlippers(p.side)) {
      const a = state.flippers[fi++];
      if (!p.alive) continue;
      const [x1, y1] = T(...f.pivot);
      const [x2, y2] = T(f.pivot[0] + Math.cos(a) * FLIPPER.len, f.pivot[1] + Math.sin(a) * FLIPPER.len);
      px.bar(x1, y1, x2, y2, P(FLIPPER.thick), PLAYER_RAMPS[p.side]);
      px.ball(x1, y1, 2, RAMPS.steel);
    }
  }

  // bolas (piscando antes de sair do centro)
  for (const [bx, by, wait] of state.balls) {
    if (wait && Math.floor(now / 120) % 2) continue;
    const [x, y] = T(bx, by);
    px.ball(x + 1, y + 2, P(BALL_R), [PAL.ink, PAL.ink, PAL.ink], false); // sombra
    px.ball(x, y, P(BALL_R), [PAL.steel, PAL.mist, PAL.white]);
  }
  px.present();

  // mensagens no centro
  if (now < msgUntil) return;
  const solo = state.players.length === 1;
  if (state.phase === 'count') $msg.innerHTML = `${state.clock}<small>DEFENDA O SEU BURACO!</small>`;
  else if (state.phase === 'over') {
    const win = state.players.find((p) => p.id === state.winner);
    $msg.innerHTML = solo
      ? `FIM!<small>${state.players[0].score} PONTOS EM ${state.time} s</small>`
      : `${win?.id === me ? 'VOCÊ VENCEU!' : `${win?.name ?? '?'} VENCEU!`}<small>VOLTANDO AO LOUNGE...</small>`;
  } else $msg.innerHTML = '';
}
requestAnimationFrame(draw);
