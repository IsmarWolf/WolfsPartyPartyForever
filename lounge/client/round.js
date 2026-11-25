/**
 * Rodada no lounge (lado do cliente): faixa com o relógio, aviso de
 * "FULANO COMEÇOU A VOTAÇÃO", roleta do sorteio e o jogo aberto em tela cheia.
 * Quem manda nas fases é o servidor (lounge/voting.js); aqui só se mostra.
 * Enquanto o jogo está aberto, este módulo é a ponte entre a página do jogo
 * (iframe, via postMessage — ver game-api.js) e o servidor ('game:msg').
 * Não tem botão de voltar: o lounge volta quando o jogo termina.
 */
import { sfx } from '/js/core/audio.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ROLL_MS = 3800; // cabe dentro de TIMES.rolling do servidor

export function createRound({ root, getSocket, getGames, openVote, closeVote }) {
  root.insertAdjacentHTML('beforeend', `
    <div class="lg-banner" hidden></div>
    <div class="lg-announce" hidden></div>
    <div class="lg-roll" hidden><h2></h2><ul class="lg-roll__list"></ul></div>
    <div class="lg-game" hidden>
      <iframe title="jogo" allow="autoplay; fullscreen"></iframe>
    </div>`);
  const $ = (s) => root.querySelector(s);
  let state = { phase: 'idle', endsAt: 0 };
  let rollTimer = 0;
  let announceTimer = 0;
  let selfId = null;
  let frameReady = false;
  let queue = []; // mensagens que chegaram antes da página do jogo carregar

  const name = (id) => getGames().find((g) => g.id === id)?.name ?? id;

  // ── faixa do topo com contagem
  setInterval(renderBanner, 250);
  function renderBanner() {
    const left = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
    const clock = `0:${String(left).padStart(2, '0')}`;
    const text = {
      idle: state.endsAt ? `VOTAÇÃO COMEÇA EM ${clock} · OU VÁ ATÉ A PORTA` : '',
      voting: `${state.by ? `${esc(state.by)} COMEÇOU A VOTAÇÃO` : 'VOTAÇÃO ABERTA'} · ${clock}`,
      rolling: 'SORTEANDO...',
      playing: state.game ? `JOGANDO: ${esc(state.game.name)}` : '',
    }[state.phase] ?? '';
    const el = $('.lg-banner');
    el.hidden = !text;
    el.innerHTML = text;
    el.classList.toggle('is-urgent', state.phase !== 'playing' && left <= 5 && Boolean(state.endsAt));
  }

  function announce(text) {
    const el = $('.lg-announce');
    el.textContent = text;
    el.hidden = false;
    el.classList.remove('is-on');
    void el.offsetWidth;
    el.classList.add('is-on');
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // ── roleta: o servidor já escolheu; aqui só a animação até cair no vencedor
  function showRoll({ candidates, weights, winner }) {
    const total = weights.reduce((a, b) => a + b, 0);
    const box = $('.lg-roll');
    box.querySelector('h2').textContent = candidates.length > 1 ? 'SORTEANDO O JOGO...' : 'JOGO ESCOLHIDO!';
    const list = box.querySelector('.lg-roll__list');
    list.innerHTML = candidates.map((id, i) => `
      <li><strong>${esc(name(id))}</strong><em>${Math.round((weights[i] / total) * 100)}%</em></li>`).join('');
    box.hidden = false;
    const items = [...list.children];
    const target = candidates.indexOf(winner);

    clearTimeout(rollTimer);
    if (candidates.length === 1) return land(items, target);

    // vai desacelerando: passos rápidos no começo, lentos no fim, somando ROLL_MS
    const n = candidates.length;
    const steps = n * Math.max(3, Math.ceil(14 / n)) + target;
    const raw = Array.from({ length: steps }, (_, i) => 1 + 7 * (i / steps) ** 2.2);
    const unit = ROLL_MS / raw.reduce((a, b) => a + b, 0);
    let i = 0;
    const tick = () => {
      items.forEach((li, k) => li.classList.toggle('is-on', k === i % n));
      if (i === steps) return land(items, target);
      sfx.tick();
      sfx.tone({ freq: 500 + (i % n) * 90, dur: 0.04, vol: 0.08 });
      rollTimer = setTimeout(tick, raw[i] * unit);
      i++;
    };
    tick();
  }

  function land(items, target) {
    items.forEach((li, k) => li.classList.toggle('is-on', k === target));
    items[target]?.classList.add('is-winner');
    sfx.fanfare();
  }

  // ── jogo em tela cheia
  function openGame(game) {
    const box = $('.lg-game');
    const frame = box.querySelector('iframe');
    if (box.hidden || frame.dataset.game !== game.id) {
      frameReady = false;
      queue = [];
      frame.src = game.url;
      frame.dataset.game = game.id;
    }
    box.hidden = false;
    frame.focus();
  }

  function closeGame() {
    const box = $('.lg-game');
    if (box.hidden) return;
    box.hidden = true;
    const frame = box.querySelector('iframe');
    frame.src = 'about:blank';
    delete frame.dataset.game;
  }

  const post = (msg) => $('.lg-game iframe').contentWindow?.postMessage(msg, location.origin);

  // página do jogo → lounge
  window.addEventListener('message', (e) => {
    const frame = $('.lg-game iframe');
    if (e.source !== frame.contentWindow || e.origin !== location.origin) return;
    const m = e.data;
    if (m?.lg === 'ready') {
      frameReady = true;
      post({ lg: 'init', me: selfId, game: state.game });
      queue.forEach((q) => post(q));
      queue = [];
    } else if (m?.lg === 'send' && typeof m.type === 'string') {
      getSocket()?.emit('game:msg', { type: m.type, data: m.data });
    } else if (m?.lg === 'end') {
      getSocket()?.emit('lounge:endGame');
    }
  });

  return {
    get phase() { return state.phase; },
    get inGame() { return !$('.lg-game').hidden; },

    /** servidor → página do jogo */
    relay({ type, data }) {
      const msg = { lg: 'msg', type, data };
      if (frameReady) post(msg);
      else queue.push(msg);
    },

    set(next, me) {
      selfId = me;
      const prev = state.phase;
      state = { ...next, endsAt: next.left ? Date.now() + next.left : 0 };
      if (next.phase === 'voting' && prev !== 'voting') {
        announce(next.by ? `${next.by} COMEÇOU A VOTAÇÃO!` : 'A VOTAÇÃO COMEÇOU!');
        sfx.confirm();
        openVote();
      }
      if (next.phase !== 'voting') closeVote(true);
      $('.lg-roll').hidden = next.phase !== 'rolling';
      if (next.phase === 'rolling') showRoll(next.roll);
      if (next.phase === 'playing' && next.inGame?.includes(selfId)) openGame(next.game);
      if (next.phase !== 'playing') closeGame();
      renderBanner();
    },

    /** Texto do aviso na porta. */
    doorLabel() {
      return {
        idle: 'COMEÇAR VOTAÇÃO',
        voting: 'VOTAR NO JOGO',
        rolling: 'SORTEANDO...',
        playing: 'ASSISTIR AO JOGO',
      }[state.phase];
    },

    /** E na porta. */
    door() {
      const socket = getSocket();
      if (state.phase === 'idle') socket?.emit('lounge:startVote');
      else if (state.phase === 'voting') openVote();
      else if (state.phase === 'playing') socket?.emit('lounge:joinGame');
    },
  };
}
