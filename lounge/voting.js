/**
 * Ciclo da rodada no lounge (lado do servidor):
 *
 *   idle ──(alguém começa na porta, ou 30 s)──▶ voting ──(20 s, ou todos votaram)──▶
 *   rolling (sorteio animado) ──▶ playing (jogo aberto para todos) ──(o jogo termina)──▶ idle
 *
 * Jogo com "server" no game.json: o módulo é carregado aqui e recebe uma API
 * (ver games/README.md). Ele termina a partida chamando end(resultado).
 * Jogo sem servidor termina quando a página dele chama end() (lounge/client/game-api.js).
 *
 * Sorteio: cada voto vale uma chance para o jogo votado — mais votos, mais chance,
 * mas jogo com um voto só também pode sair. Ninguém votou → todos os jogos com a mesma chance.
 *
 * Envia 'lounge:phase' { phase, left (ms até a próxima fase, 0 = sem relógio), by?, roll?, game?, inGame? } e 'lounge:votes' { [gameId]: [playerId…] }.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const TIMES = { idle: 30_000, voting: 20_000, rolling: 5_000 };
const GAME_ROOM = 'game';
const PRIZE = [10, 5, 3]; // pontos por colocação; do 4º em diante, 1

/** Escolhe o jogo. `votes` = Map(playerId → gameId). Devolve { candidates, weights, winner }. */
export function pickWinner(votes, games, rand = Math.random) {
  const count = new Map();
  for (const g of votes.values()) count.set(g, (count.get(g) ?? 0) + 1);
  const pool = count.size ? games.filter((g) => count.has(g.id)) : games;
  const weights = pool.map((g) => count.get(g.id) ?? 1);
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  let i = 0;
  while (i < pool.length - 1 && (r -= weights[i]) >= 0) i++;
  return { candidates: pool.map((g) => g.id), weights, winner: pool[i]?.id ?? null };
}

export function createVoting(io, registry, players, { givePoints = () => {} } = {}) {
  const votes = new Map(); // socket.id → gameId
  const inGame = new Set(); // quem está com o jogo aberto (jogadores e quem chegou depois para assistir)
  let state = { phase: 'idle', endsAt: 0 };
  let timer = 0;
  let session = null; // { handlers, game } da partida atual

  const emitVotes = () => {
    const tally = {};
    for (const [id, game] of votes) (tally[game] ??= []).push(id);
    io.emit('lounge:votes', tally);
  };

  // manda quanto falta (não a hora): relógios dos amigos pelo túnel não batem
  const view = () => ({ ...state, endsAt: undefined, left: state.endsAt ? Math.max(0, state.endsAt - Date.now()) : 0 });

  function go(next) {
    clearTimeout(timer);
    state = next;
    if (state.endsAt) timer = setTimeout(onTimeout, state.endsAt - Date.now());
    io.emit('lounge:phase', view());
  }

  function toIdle() {
    votes.clear();
    inGame.clear();
    session = null;
    io.socketsLeave(GAME_ROOM);
    emitVotes();
    // sem ninguém na sala o relógio fica parado
    go({ phase: 'idle', endsAt: players.size ? Date.now() + TIMES.idle : 0 });
  }

  function startVoting(by = null) {
    if (state.phase !== 'idle' || !registry.list.length) return;
    votes.clear();
    emitVotes();
    go({ phase: 'voting', by, endsAt: Date.now() + TIMES.voting });
  }

  function roll() {
    if (!registry.list.length) return toIdle();
    // só concorre jogo que aceita esse número de jogadores (se nenhum aceita, todos concorrem)
    const n = players.size;
    const fits = registry.list.filter((g) => g.minPlayers <= n && n <= g.maxPlayers);
    const games = fits.length ? fits : registry.list;
    const valid = new Map([...votes].filter(([, g]) => games.some((x) => x.id === g)));
    const roll = pickWinner(valid, games);
    go({ phase: 'rolling', roll, endsAt: Date.now() + TIMES.rolling });
  }

  async function play() {
    const game = registry.list.find((g) => g.id === state.roll.winner);
    if (!game) return toIdle();
    for (const id of players.keys()) {
      inGame.add(id);
      io.sockets.sockets.get(id)?.join(GAME_ROOM);
    }
    const handlers = {};
    session = { handlers, game };
    go({ phase: 'playing', game, inGame: [...inGame], endsAt: 0 });
    if (!game.server) return;

    const mine = session;
    const api = {
      players: [...inGame].map((id) => ({ id, name: players.get(id)?.name ?? 'JOGADOR' })),
      /** Mensagem para um jogador (to = id) ou para todos na partida (to = null). */
      send: (to, type, data) => mine === session && io.to(to ?? GAME_ROOM).emit('game:msg', { type, data }),
      /** Mensagens dos jogadores: fn(playerId, data). 'leave' = jogador saiu (fn(playerId)). */
      on: (type, fn) => { handlers[type] = fn; },
      /** Fim da partida: ranking = [playerId…] do 1º ao último. */
      end: (ranking = []) => mine === session && endGame(ranking),
    };
    try {
      const file = pathToFileURL(path.join(registry.dir, game.id, game.server));
      const mod = await import(`${file.href}?v=${Date.now()}`); // recarrega se o arquivo mudou
      if (mine === session) mod.default(api);
    } catch (err) {
      console.error(`[jogos] erro ao iniciar "${game.id}":`, err);
      if (mine === session) endGame([]);
    }
  }

  function endGame(ranking) {
    ranking.forEach((id, i) => givePoints(id, PRIZE[i] ?? 1));
    toIdle();
  }

  function onTimeout() {
    if (state.phase === 'idle') startVoting(null);
    else if (state.phase === 'voting') roll();
    else if (state.phase === 'rolling') play();
  }

  function maybeEndVoting() {
    if (state.phase === 'voting' && players.size && [...players.keys()].every((id) => votes.has(id))) roll();
  }

  function leaveGame(id) {
    if (!inGame.delete(id)) return;
    session?.handlers.leave?.(id);
    if (state.phase === 'playing' && !inGame.size) toIdle();
  }

  // jogo removido da pasta → votos nele somem
  registry.on('change', (games) => {
    const ids = new Set(games.map((g) => g.id));
    for (const [pid, g] of votes) if (!ids.has(g)) votes.delete(pid);
    emitVotes();
  });

  return {
    /** Jogador entrou no lounge (já está em `players`). */
    enter(socket) {
      if (state.phase === 'idle' && !state.endsAt) toIdle(); // primeiro a chegar liga o relógio
      else socket.emit('lounge:phase', view());
      emitVotes();
    },

    leave(id) {
      if (votes.delete(id)) emitVotes();
      leaveGame(id);
      if (!players.size) toIdle();
      else maybeEndVoting();
    },

    bind(socket) {
      const name = () => players.get(socket.id)?.name ?? 'ALGUÉM';

      socket.on('lounge:startVote', () => {
        if (players.has(socket.id)) startVoting(name());
      });

      socket.on('lounge:vote', (gameId) => {
        if (state.phase !== 'voting' || !players.has(socket.id)) return;
        if (gameId === null || votes.get(socket.id) === gameId) votes.delete(socket.id);
        else if (registry.list.some((g) => g.id === gameId)) votes.set(socket.id, gameId);
        else return;
        emitVotes();
        maybeEndVoting();
      });

      // entrou no lounge com um jogo rolando: pode assistir pela porta
      socket.on('lounge:joinGame', () => {
        if (state.phase === 'playing' && players.has(socket.id)) {
          inGame.add(socket.id);
          socket.join(GAME_ROOM);
          state.inGame = [...inGame];
          socket.emit('lounge:phase', view());
        }
      });

      // mensagens da página do jogo para o módulo do servidor
      socket.on('game:msg', (msg) => {
        if (!session || !inGame.has(socket.id) || typeof msg?.type !== 'string' || msg.type === 'leave') return;
        session.handlers[msg.type]?.(socket.id, msg.data);
      });

      // jogo sem servidor: a própria página avisa que acabou
      socket.on('lounge:endGame', () => {
        if (session && !session.game.server && inGame.has(socket.id)) endGame([]);
      });
    },
  };
}
