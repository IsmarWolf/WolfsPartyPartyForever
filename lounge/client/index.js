/**
 * Lounge — a sala onde a festa espera: andar, socar os amigos, sentar no
 * sofá, votar no próximo jogo e (com pontos) usar os itens da sala.
 * Tudo do lounge mora na pasta /lounge (servida em /lounge/).
 *
 * Controles: SETAS/WASD andam · ESPAÇO soca · E interage · ESC fecha
 */
import { Viewport } from '/js/core/viewport.js';
import { avatarDataURL } from '/js/character/renderer.js';
import { connectParty, fetchGames } from '/js/net/party.js';
import { ROOM, SEATS, DOOR_ICON, TV_LIGHT, blocked, hotspotAt } from './room.js';
import { ITEM_ACTIONS } from './items.js';
import { sounds } from './sounds.js';
import { createRound } from './round.js';

const SPEED = 330; // px/s
const SPRITE_SCALE = 5;
const SEND_MS = 50;
const STEP_PX = 62; // distância entre passos (som)
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function mountLounge(root, profile) {
  const img = `/lounge/${ROOM.image}`;
  const d = DOOR_ICON;
  root.hidden = false;
  root.innerHTML = `
    <div class="lg-stage">
      <img class="lg-bg" src="${img}" alt="" draggable="false" />
      <div class="lg-door" style="left:${d.x}px;top:${d.y}px;width:${d.w}px;height:${d.h}px">
        <div class="lg-door__icon" style="background-image:url(${img});background-position:-${d.x}px -${d.y}px"></div>
      </div>
      <svg class="lg-tvlight" viewBox="0 0 ${ROOM.w} ${ROOM.h}" aria-hidden="true">
        <defs>
          <linearGradient id="lg-beam" gradientUnits="userSpaceOnUse"
            x1="${TV_LIGHT[0][0]}" y1="${TV_LIGHT[0][1]}" x2="${(TV_LIGHT[2][0] + TV_LIGHT[3][0]) / 2}" y2="${(TV_LIGHT[2][1] + TV_LIGHT[3][1]) / 2}">
            <stop offset="0" stop-color="#7fd8ff" stop-opacity=".75" />
            <stop offset="1" stop-color="#2e9bff" stop-opacity="0" />
          </linearGradient>
          <filter id="lg-soft"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <polygon points="${TV_LIGHT.map((p) => p.join(',')).join(' ')}" fill="url(#lg-beam)" filter="url(#lg-soft)" />
      </svg>
      <div class="lg-actors"></div>
      <div class="lg-prompt" hidden></div>
    </div>
    <aside class="lg-vote" hidden>
      <h2>VOTE NO PRÓXIMO JOGO</h2>
      <ul class="lg-vote__list"></ul>
      <p class="lg-vote__hint">▲▼ ESCOLHER · ENTER VOTAR · ESC FECHAR</p>
    </aside>
    <button class="lg-back" type="button">◀ EDITAR PERSONAGEM</button>
    <p class="lg-points">★ <b>0</b> PTS</p>
    <p class="lg-help">SETAS/WASD ANDAR · ESPAÇO SOCO · E INTERAGIR</p>`;

  const $ = (s) => root.querySelector(s);
  const stage = $('.lg-stage');
  stage.style.width = `${ROOM.w}px`;
  stage.style.height = `${ROOM.h}px`;
  new Viewport(stage, { width: ROOM.w, height: ROOM.h, margin: 1 });
  $('.lg-back').addEventListener('click', () => location.reload());

  // ── estado
  const me = { x: 820, y: 760, face: 1, kx: 0, sit: false };
  const actors = new Map(); // id → { el, x, y, tx, ty, face, sit }  ('me' = eu)
  const profiles = new Map(); // id → perfil
  let socket = null;
  let points = 0;
  let games = [];
  let votes = {};
  let voteOpen = false;
  let voteIndex = 0;
  let lastSpot = null;
  let walked = 0;
  const held = new Set();
  const round = createRound({ root, getSocket: () => socket, getGames: () => games, openVote, closeVote });

  // ── atores
  function actor(id, prof) {
    let a = actors.get(id);
    if (!a) {
      const el = document.createElement('div');
      el.className = `lg-actor${id === 'me' ? ' is-me' : ''}`;
      el.innerHTML = '<span class="lg-actor__name"></span><img class="lg-actor__sprite" alt="" draggable="false" />';
      $('.lg-actors').append(el);
      a = { el, x: me.x, y: me.y, tx: me.x, ty: me.y, face: 1, sit: false, look: '' };
      actors.set(id, a);
    }
    const key = prof && JSON.stringify([prof.name, prof.look, prof.mode, prof.custom]);
    if (prof && key !== a.look) {
      a.look = key;
      a.el.querySelector('.lg-actor__name').textContent = prof.name;
      a.el.querySelector('img').src = avatarDataURL(prof, SPRITE_SCALE);
    }
    return a;
  }

  function place(a) {
    a.el.style.transform = `translate(${a.x}px, ${a.y}px)`;
    a.el.style.zIndex = Math.round(a.y);
    a.el.classList.toggle('is-left', a.face < 0);
    a.el.classList.toggle('is-sitting', a.sit);
  }

  function replay(a, cls) {
    a.el.classList.remove(cls);
    void a.el.offsetWidth;
    a.el.classList.add(cls);
  }

  function popup(a, text, cls = '') {
    const p = document.createElement('div');
    p.className = `lg-pow ${cls}`;
    p.textContent = text;
    p.style.left = `${a.x}px`;
    p.style.top = `${a.y - 110}px`;
    $('.lg-actors').append(p);
    setTimeout(() => p.remove(), 900);
  }

  actor('me', profile);

  // ── teclado (só enquanto o lounge está na tela)
  const onKey = (e) => {
    const down = e.type === 'keydown';
    if (round.inGame) return; // o jogo aberto cuida do teclado
    if (voteOpen) {
      if (down) voteKey(e);
      return;
    }
    if (KEYS[e.code]) {
      e.preventDefault();
      if (down) { held.add(KEYS[e.code]); if (me.sit) standUp(); }
      else held.delete(KEYS[e.code]);
      return;
    }
    if (!down || e.repeat) return;
    if (e.code === 'Space') {
      e.preventDefault();
      punch();
    } else if (e.code === 'KeyE' || e.code === 'Enter') {
      interact();
    }
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKey);
  window.addEventListener('blur', () => held.clear());

  let lastPunch = 0;
  function punch() {
    const now = performance.now();
    if (me.sit || now - lastPunch < 350) return;
    lastPunch = now;
    replay(actors.get('me'), 'is-punch');
    sounds.punch();
    socket?.emit('lounge:punch');
  }

  // ── sofá
  function sitDown() {
    const taken = (s) => [...actors].some(([id, a]) => id !== 'me' && a.sit && Math.hypot(a.tx - s.x, a.ty - s.y) < 20);
    const free = SEATS.filter((s) => !taken(s)).sort((a, b) => Math.abs(a.x - me.x) - Math.abs(b.x - me.x))[0];
    if (!free) return popup(actors.get('me'), 'SOFÁ CHEIO', 'is-info');
    me.standX = me.x;
    me.standY = me.y;
    Object.assign(me, { x: free.x, y: free.y, sit: true, kx: 0 });
    sounds.sit();
  }

  function standUp() {
    me.sit = false;
    me.x = me.standX ?? me.x;
    me.y = me.standY ?? SEATS[0].y + 30;
    sounds.stand();
  }

  // ── interagir com o que estiver perto
  function interact() {
    if (me.sit) return standUp();
    const spot = hotspotAt(me.x, me.y);
    if (!spot) return;
    if (spot.kind === 'vote') return round.door();
    if (spot.kind === 'sit') return sitDown();
    if (spot.kind === 'item') {
      if (points < spot.cost) {
        sounds.locked();
        replay($('.lg-prompt'), 'is-shake');
        return;
      }
      socket?.emit('lounge:use', spot.id);
    }
  }

  // ── votação
  function renderVote() {
    const list = $('.lg-vote__list');
    const mine = socket && Object.entries(votes).find(([, ids]) => ids.includes(socket.id))?.[0];
    if (!games.length) {
      list.innerHTML = '<li class="lg-vote__empty">nenhum jogo na pasta /games ainda</li>';
      return;
    }
    list.innerHTML = games.map((g, i) => {
      const voters = votes[g.id] ?? [];
      const faces = voters.map((id) => {
        const prof = id === socket?.id ? profile : profiles.get(id);
        return prof ? `<img class="pixel" src="${avatarDataURL(prof, 2)}" alt="${esc(prof.name)}" title="${esc(prof.name)}" />` : '';
      }).join('');
      return `
        <li class="lg-vote__item${i === voteIndex ? ' is-sel' : ''}${g.id === mine ? ' is-mine' : ''}" data-i="${i}">
          <div><strong>${esc(g.name)}</strong><em>${g.minPlayers}–${g.maxPlayers} JOGADORES</em></div>
          <span class="lg-vote__faces">${faces}</span>
          <b class="lg-vote__count">${voters.length}</b>
        </li>`;
    }).join('');
  }

  function openVote() {
    voteOpen = true;
    held.clear();
    $('.lg-vote').hidden = false;
    sounds.open();
    renderVote();
  }

  function closeVote(silent = false) {
    if (!voteOpen) return;
    voteOpen = false;
    $('.lg-vote').hidden = true;
    if (!silent) sounds.close();
  }

  function castVote(i) {
    const g = games[i];
    if (!g || round.phase !== 'voting') return;
    socket?.emit('lounge:vote', g.id);
    sounds.vote();
  }

  function voteKey(e) {
    if (e.code === 'Escape' || e.code === 'KeyE') return closeVote();
    const n = games.length;
    if (!n) return;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') voteIndex = (voteIndex + n - 1) % n;
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') voteIndex = (voteIndex + 1) % n;
    else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); return castVote(voteIndex); }
    else return;
    e.preventDefault();
    sounds.nav();
    renderVote();
  }

  $('.lg-vote__list').addEventListener('click', (e) => {
    const li = e.target.closest('[data-i]');
    if (!li) return;
    voteIndex = Number(li.dataset.i);
    castVote(voteIndex);
    renderVote();
  });

  // ── aviso "E · …" acima da cabeça
  function updatePrompt() {
    const spot = me.sit ? { id: 'stand', label: 'LEVANTAR' } : hotspotAt(me.x, me.y);
    const prompt = $('.lg-prompt');
    prompt.hidden = !spot || voteOpen;
    if (!spot) { lastSpot = null; return; }
    const locked = spot.kind === 'item' && points < spot.cost;
    prompt.classList.toggle('is-locked', locked);
    const label = spot.kind === 'vote' ? round.doorLabel() : spot.label;
    prompt.textContent = locked ? `🔒 ${label} · ${spot.cost} PTS` : `E · ${label}`;
    prompt.style.left = `${me.x}px`;
    prompt.style.top = `${me.y - 150}px`;
    if (spot.id !== lastSpot) sounds.prompt();
    lastSpot = spot.id;
  }

  // ── laço principal
  let last = performance.now();
  let lastSent = 0;
  let sentKey = '';
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    let vx = 0;
    let vy = 0;
    if (!me.sit) {
      vx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      vy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      if (vx && vy) { vx *= Math.SQRT1_2; vy *= Math.SQRT1_2; }
      if (vx) me.face = Math.sign(vx);
      const ox = me.x;
      const oy = me.y;
      const nx = me.x + (vx * SPEED + me.kx) * dt;
      const ny = me.y + vy * SPEED * 0.8 * dt; // vista de cima: anda um pouco menos na vertical
      if (!blocked(nx, me.y)) me.x = nx;
      else me.kx = 0;
      if (!blocked(me.x, ny)) me.y = ny;
      me.kx *= Math.pow(0.002, dt); // empurrão do soco perde força rápido

      if (vx || vy) {
        walked += Math.hypot(me.x - ox, me.y - oy);
        if (walked > STEP_PX) { walked = 0; sounds.step(); }
      } else walked = STEP_PX * 0.7; // o primeiro passo soa logo
    }

    const mine = actors.get('me');
    Object.assign(mine, { x: me.x, y: me.y, face: me.face, sit: me.sit });
    mine.el.classList.toggle('is-walking', Boolean(vx || vy));
    place(mine);

    for (const [id, a] of actors) {
      if (id === 'me') continue;
      const moving = !a.sit && Math.abs(a.tx - a.x) + Math.abs(a.ty - a.y) > 2;
      const k = a.sit ? 1 : Math.min(1, dt * 14);
      a.x += (a.tx - a.x) * k;
      a.y += (a.ty - a.y) * k;
      a.el.classList.toggle('is-walking', moving);
      place(a);
    }

    updatePrompt();

    const key = `${Math.round(me.x)},${Math.round(me.y)},${me.face},${me.sit}`;
    if (socket && key !== sentKey && now - lastSent > SEND_MS) {
      socket.emit('lounge:move', { x: me.x, y: me.y, face: me.face, sit: me.sit });
      sentKey = key;
      lastSent = now;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ── rede
  fetchGames().then((list) => { games = list ?? []; if (voteOpen) renderVote(); });
  socket = await connectParty(profile);
  if (!socket) return; // sem servidor (prévia estática): dá para andar sozinho

  const enter = () => socket.emit('lounge:enter', { x: me.x, y: me.y, name: profile.name });
  socket.on('connect', enter);
  if (socket.connected) enter();
  socket.on('lounge:phase', (s) => round.set(s, socket.id));
  socket.on('game:msg', (m) => round.relay(m));

  socket.on('party:players', (list) => {
    profiles.clear();
    for (const p of list) {
      profiles.set(p.id, p);
      if (p.id !== socket.id && actors.has(p.id)) actor(p.id, p);
    }
  });

  socket.on('lounge:state', (list) => {
    const seen = new Set(['me']);
    for (const s of list) {
      if (s.id === socket.id) continue;
      seen.add(s.id);
      const fresh = !actors.has(s.id);
      const a = actor(s.id, profiles.get(s.id));
      if (fresh) { a.x = s.x; a.y = s.y; }
      Object.assign(a, { tx: s.x, ty: s.y, face: s.face, sit: s.sit });
    }
    for (const [id, a] of actors) if (!seen.has(id)) { a.el.remove(); actors.delete(id); }
  });

  socket.on('lounge:punch', ({ id }) => {
    if (id === socket.id) return;
    const a = actors.get(id);
    if (!a) return;
    replay(a, 'is-punch');
    sounds.punch(true);
  });

  socket.on('lounge:hit', ({ id, x, y }) => {
    const self = id === socket.id;
    const a = actors.get(self ? 'me' : id);
    if (!a) return;
    replay(a, 'is-hit');
    popup(a, 'POW!');
    sounds.hit();
    if (self) me.kx = (x - me.x) * 6; // desliza até onde o servidor empurrou
  });

  socket.on('lounge:points', (n) => {
    points = n;
    $('.lg-points b').textContent = n;
  });

  socket.on('lounge:used', ({ id }) => {
    sounds.use();
    ITEM_ACTIONS[id]?.({ me, sfx: sounds, say: (t) => popup(actors.get('me'), t, 'is-info') });
  });

  socket.on('games:list', (list) => { games = list; if (voteOpen) renderVote(); });
  socket.on('lounge:votes', (tally) => { votes = tally; if (voteOpen) renderVote(); });
}
