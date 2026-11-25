/**
 * API para a página de um jogo (ela roda dentro do lounge, num iframe).
 *
 *   import { joinGame } from '/lounge/game-api.js';
 *   const game = joinGame();
 *   game.on('state', (data) => …);        // mensagens do server.js do jogo
 *   game.send('input', { left: true });   // mensagens para o server.js
 *   const { me } = await game.ready;      // meu id (o mesmo que o server.js vê)
 *   game.end();                           // só para jogo SEM server.js
 *
 * Registre os on(...) logo depois de joinGame(): o lounge guarda as mensagens
 * até a página dizer que está pronta.
 */
export function joinGame() {
  const handlers = new Map();
  let resolveReady;
  const ready = new Promise((r) => { resolveReady = r; });
  const post = (msg) => window.parent.postMessage(msg, location.origin);

  window.addEventListener('message', (e) => {
    if (e.source !== window.parent || e.origin !== location.origin) return;
    const m = e.data;
    if (m?.lg === 'init') resolveReady({ me: m.me, game: m.game });
    else if (m?.lg === 'msg') handlers.get(m.type)?.(m.data);
  });
  // espera o script do jogo registrar os on(...) antes de pedir as mensagens
  queueMicrotask(() => post({ lg: 'ready' }));

  return {
    ready,
    standalone: window.parent === window, // aberto direto, fora do lounge
    on(type, fn) { handlers.set(type, fn); },
    send(type, data) { post({ lg: 'send', type, data }); },
    end() { post({ lg: 'end' }); },
  };
}
