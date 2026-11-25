/**
 * Lounge — lado do servidor.
 * Guarda onde cada um está, resolve os socos, conta os votos e os pontos.
 * Posição vem do próprio jogador (festa entre amigos); o servidor só
 * limita os valores e decide quem foi atingido.
 *
 * Recebe:  'lounge:enter' {x,y,name}  'lounge:move' {x,y,face,sit}  'lounge:punch'  'lounge:use' itemId
 *          (votação e início do jogo: ver voting.js)
 * Envia:   'lounge:state' [{id,x,y,face,sit}]  'lounge:punch' {id}  'lounge:hit' {id,by,x,y}
 *          'lounge:points' n (só para o dono)
 *          'lounge:used' {id}  (só para quem usou)
 *
 * Devolve { givePoints(socketId, n) } — é por aí que os jogos vão dar pontos.
 */
import { ROOM, HOTSPOTS, blocked } from './client/room.js';
import { createVoting } from './voting.js';

const TICK_MS = 66;
const PUNCH = { reach: 95, height: 45, cooldown: 350, knock: 140 };
const ITEMS = new Map(HOTSPOTS.filter((h) => h.kind === 'item').map((h) => [h.id, h]));

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));

export function attachLounge(io, registry) {
  const players = new Map(); // socket.id → { name, x, y, face, sit, lastPunch }
  const voting = createVoting(io, registry, players, { givePoints: (id, n) => givePoints(id, n) });
  // shortcut: pontos ficam na memória por conexão; recarregar a página zera. Quando os jogos derem pontos, guardar por jogador.
  const points = new Map(); // socket.id → n
  let dirty = false;

  setInterval(() => {
    if (!dirty) return;
    dirty = false;
    io.emit('lounge:state', [...players].map(([id, p]) => ({ id, x: p.x, y: p.y, face: p.face, sit: p.sit })));
  }, TICK_MS);

  io.on('connection', (socket) => {
    voting.bind(socket);

    const setPos = (p, pos) => {
      p.x = clamp(pos?.x, 0, ROOM.w);
      p.y = clamp(pos?.y, 0, ROOM.h);
      if (pos?.face === -1 || pos?.face === 1) p.face = pos.face;
      p.sit = pos?.sit === true;
      dirty = true;
    };

    socket.on('lounge:enter', (pos) => {
      const name = String(pos?.name ?? '').toUpperCase().replace(/[^A-Z0-9 ÇÃÕÁÉÍÓÚÂÊÔ]/g, '').trim().slice(0, 12);
      const p = { name: name || 'JOGADOR', x: 0, y: 0, face: 1, sit: false, lastPunch: 0 };
      setPos(p, pos);
      players.set(socket.id, p);
      if (!points.has(socket.id)) points.set(socket.id, 0);
      socket.emit('lounge:points', points.get(socket.id));
      voting.enter(socket);
    });

    socket.on('lounge:move', (pos) => {
      const p = players.get(socket.id);
      if (p) setPos(p, pos);
    });

    socket.on('lounge:punch', () => {
      const p = players.get(socket.id);
      const now = Date.now();
      if (!p || p.sit || now - p.lastPunch < PUNCH.cooldown) return;
      p.lastPunch = now;
      io.emit('lounge:punch', { id: socket.id });
      for (const [id, q] of players) {
        if (id === socket.id) continue;
        const dx = (q.x - p.x) * p.face; // distância para a frente de quem bateu
        if (!q.sit && dx > -10 && dx < PUNCH.reach && Math.abs(q.y - p.y) < PUNCH.height) {
          // o servidor empurra: funciona mesmo com a aba de quem apanhou em segundo plano
          for (let i = 0; i < PUNCH.knock && !blocked(q.x + p.face * 4, q.y); i += 4) q.x += p.face * 4;
          dirty = true;
          io.emit('lounge:hit', { id, by: socket.id, x: q.x, y: q.y });
        }
      }
    });

    socket.on('lounge:use', (itemId) => {
      const item = ITEMS.get(itemId);
      if (!item || !players.has(socket.id) || (points.get(socket.id) ?? 0) < item.cost) return;
      socket.emit('lounge:used', { id: item.id });
    });

    socket.on('disconnect', () => {
      const had = players.delete(socket.id);
      points.delete(socket.id);
      if (had) voting.leave(socket.id);
      dirty ||= had;
    });
  });

  function givePoints(id, n) {
    if (!points.has(id)) return;
    points.set(id, Math.max(0, points.get(id) + n));
    io.to(id).emit('lounge:points', points.get(id));
  }

  return { givePoints };
}
