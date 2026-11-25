/**
 * Cliente de rede da festa. Carrega o socket.io servido pelo próprio
 * servidor e devolve uma conexão — ou null se estiver offline.
 *
 * Eventos do servidor: 'party:players' (lista), 'games:list' (lista)
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.append(s);
  });
}

export async function connectParty(profile) {
  try {
    if (!window.io) await loadScript('/socket.io/socket.io.js');
    const socket = window.io({ transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('player:join', profile));
    return socket;
  } catch {
    return null;
  }
}

export async function fetchGames() {
  try {
    const res = await fetch('/api/games');
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
