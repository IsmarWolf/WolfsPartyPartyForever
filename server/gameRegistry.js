/**
 * Registro de jogos: cada subpasta de /games com um `game.json` válido
 * vira um jogo no menu. A pasta é observada — colocar ou remover um jogo
 * com o servidor rodando atualiza todo mundo na hora.
 */
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

const ID_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;

/** Valida e normaliza um manifesto. Retorna null (com aviso) se inválido. */
function normalizeManifest(dirName, raw, dir) {
  const fail = (msg) => {
    console.warn(`[jogos] ignorando "${dirName}": ${msg}`);
    return null;
  };
  if (!ID_PATTERN.test(dirName)) return fail('nome da pasta só pode ter letras, números, - e _');
  if (typeof raw.name !== 'string' || !raw.name.trim()) return fail('"name" é obrigatório');

  const entry = raw.entry ?? 'index.html';
  if (!fs.existsSync(path.join(dir, entry))) return fail(`arquivo de entrada "${entry}" não existe`);

  const minPlayers = Number.isInteger(raw.minPlayers) ? raw.minPlayers : 1;
  const maxPlayers = Number.isInteger(raw.maxPlayers) ? raw.maxPlayers : 8;

  // lógica no servidor (opcional): arquivo JS na pasta do jogo, roda neste PC
  const server = typeof raw.server === 'string' && /^[\w-]+\.js$/.test(raw.server) ? raw.server : null;
  if (server && !fs.existsSync(path.join(dir, server))) return fail(`arquivo do servidor "${server}" não existe`);

  return {
    id: dirName,
    name: raw.name.trim(),
    description: typeof raw.description === 'string' ? raw.description : '',
    author: typeof raw.author === 'string' ? raw.author : '',
    minPlayers: Math.max(1, minPlayers),
    maxPlayers: Math.max(minPlayers, maxPlayers),
    url: `/games/${dirName}/${entry}`,
    thumbnail: raw.thumbnail ? `/games/${dirName}/${raw.thumbnail}` : null,
    server,
  };
}

export class GameRegistry extends EventEmitter {
  #games = [];
  #timer = null;

  constructor(dir) {
    super();
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }

  get list() {
    return this.#games;
  }

  scan() {
    const games = [];
    for (const entry of fs.readdirSync(this.dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
      const gameDir = path.join(this.dir, entry.name);
      const manifestPath = path.join(gameDir, 'game.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const game = normalizeManifest(entry.name, JSON.parse(fs.readFileSync(manifestPath, 'utf8')), gameDir);
        if (game) games.push(game);
      } catch (err) {
        console.warn(`[jogos] game.json inválido em "${entry.name}": ${err.message}`);
      }
    }
    games.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    this.#games = games;
    this.emit('change', games);
    return games;
  }

  /** Observa a pasta e reescaneia (com debounce) quando algo muda. */
  watch() {
    try {
      fs.watch(this.dir, { recursive: true }, () => {
        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => {
          this.scan();
          console.log(`[jogos] pasta mudou — ${this.#games.length} jogo(s) disponíveis`);
        }, 300);
      });
    } catch {
      console.warn('[jogos] não foi possível observar a pasta; reinicie o servidor ao adicionar jogos');
    }
  }
}
