/**
 * Presença dos jogadores na festa (tempo real via socket.io).
 * Uma festa só, sem código de sala: quem abre o link, entra.
 */
const NAME_MAX = 12;

function sanitizeProfile(raw) {
  const name = String(raw?.name ?? '').toUpperCase().replace(/[^A-Z0-9 ÇÃÕÁÉÍÓÚÂÊÔ]/g, '').trim().slice(0, NAME_MAX);
  const look = {};
  if (raw?.look && typeof raw.look === 'object') {
    for (const [k, v] of Object.entries(raw.look)) {
      if (/^[a-zA-Z]{1,20}$/.test(k) && typeof v === 'string' && v.length <= 24) look[k] = v;
    }
  }
  // desenho livre: paleta de até 36 cores + uma letra base36 por pixel (16×17)
  let custom = null;
  if (raw?.custom && Array.isArray(raw.custom.palette) && typeof raw.custom.data === 'string') {
    custom = {
      palette: raw.custom.palette.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 36),
      data: raw.custom.data.replace(/[^0-9a-z.]/g, '').slice(0, 272),
    };
  }
  const mode = raw?.mode === 'draw' && custom ? 'draw' : 'build';
  return { name: name || 'JOGADOR', look, mode, custom };
}

export function attachPartyHub(io, registry) {
  const players = new Map(); // socket.id → perfil

  const broadcastPlayers = () =>
    io.emit('party:players', [...players].map(([id, p]) => ({ id, ...p })));

  registry.on('change', (games) => io.emit('games:list', games));

  io.on('connection', (socket) => {
    socket.emit('games:list', registry.list);

    socket.on('player:join', (profile) => {
      players.set(socket.id, sanitizeProfile(profile));
      broadcastPlayers();
    });

    socket.on('disconnect', () => {
      if (players.delete(socket.id)) broadcastPlayers();
    });
  });
}
