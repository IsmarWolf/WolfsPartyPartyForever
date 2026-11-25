/**
 * Servidor do Wolf's Party.
 *   - serve o cliente (/public) e os jogos (/games)
 *   - expõe GET /api/games
 *   - tempo real via socket.io
 * Pensado para ficar atrás de um túnel da Cloudflare (ver README).
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { GameRegistry } from './gameRegistry.js';
import { attachPartyHub } from './partyHub.js';
import { attachLounge } from '../lounge/server.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;

const registry = new GameRegistry(path.join(ROOT, 'games'));
registry.scan();
registry.watch();

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));
app.use('/lounge', express.static(path.join(ROOT, 'lounge', 'client')));
app.use('/games', express.static(path.join(ROOT, 'games'), { dotfiles: 'deny' }));
app.get('/api/games', (_req, res) => res.json(registry.list));

// Estúdio do gabinete: salva o desenho no projeto. Só aceita do próprio PC —
// quem entra pelo túnel da Cloudflare (header cf-connecting-ip) não pode alterar.
const CABINET_FILE = path.join(ROOT, 'public', 'cabinet', 'cabinet.json');
const isLocal = (req) =>
  !req.headers['cf-connecting-ip'] && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

app.post('/api/cabinet', express.json({ limit: '4mb' }), (req, res) => {
  if (!isLocal(req)) return res.status(403).json({ error: 'só dá para salvar pelo próprio computador' });
  const d = req.body;
  const pngOrNull = (v) => v === null || (typeof v === 'string' && v.startsWith('data:image/png;base64,'));
  if (d?.version !== 1 || !d.layers || !Object.values(d.layers).every(pngOrNull)) {
    return res.status(400).json({ error: 'desenho inválido' });
  }
  fs.mkdirSync(path.dirname(CABINET_FILE), { recursive: true });
  fs.writeFileSync(CABINET_FILE, JSON.stringify(d));
  console.log('[gabinete] desenho salvo em public/cabinet/cabinet.json');
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server);
attachPartyHub(io, registry);
attachLounge(io, registry);

server.listen(PORT, () => {
  console.log(`\n  🐺 Wolf's Party rodando em http://localhost:${PORT}`);
  console.log(`  🎮 ${registry.list.length} jogo(s) na pasta /games`);
  console.log(`  🌐 para abrir para os amigos: npm run tunnel\n`);
});
