/**
 * Estado do personagem + definição dos "slots" editáveis.
 * A ordem de SLOTS é a ordem do menu e da animação do aleatório.
 */
import { SKIN_TONES, HAIR_COLORS, CLOTH_COLORS } from './palettes.js';
import { EYES, HAIR, TOPS, BOTTOMS, ACCESSORIES } from './parts.js';
import { Emitter } from '../core/emitter.js';

export const SLOTS = [
  { key: 'skin',        label: 'PELE',       kind: 'color', options: SKIN_TONES },
  { key: 'eyes',        label: 'OLHOS',      kind: 'style', options: EYES },
  { key: 'hair',        label: 'CABELO',     kind: 'style', options: HAIR },
  { key: 'hairColor',   label: 'COR CABELO', kind: 'color', options: HAIR_COLORS },
  { key: 'top',         label: 'ROUPA',      kind: 'style', options: TOPS },
  { key: 'topColor',    label: 'COR ROUPA',  kind: 'color', options: CLOTH_COLORS },
  { key: 'bottom',      label: 'CALÇA',      kind: 'style', options: BOTTOMS },
  { key: 'bottomColor', label: 'COR CALÇA',  kind: 'color', options: CLOTH_COLORS },
  { key: 'accessory',   label: 'ACESSÓRIO',  kind: 'style', options: ACCESSORIES },
];

export const NAME_MAX = 12;
const NAME_ALLOWED = /[^A-Z0-9 ÇÃÕÁÉÍÓÚÂÊÔ]/g;

const slotByKey = Object.fromEntries(SLOTS.map((s) => [s.key, s]));
const rand = (n) => Math.floor(Math.random() * n);

/**
 * Eventos: 'change' ({ key, id }), 'name' (name), 'mode' (mode), 'custom' (custom)
 * mode: 'build' (montar com partes) | 'draw' (desenho livre em `custom`)
 */
export class CharacterModel extends Emitter {
  constructor(initial = {}) {
    super();
    this.name = '';
    this.mode = 'build';
    this.custom = null;
    this.look = {};
    for (const slot of SLOTS) this.look[slot.key] = slot.options[0].id;
    // valores padrão mais simpáticos que "careca + pele 0"
    Object.assign(this.look, { hair: 'curto', topColor: 'agua', bottomColor: 'jeans' });
    this.load(initial);
  }

  /** Aceita dados salvos/externos, ignorando ids que não existem mais. */
  load({ name, look, mode, custom } = {}) {
    if (typeof name === 'string') this.name = sanitizeName(name);
    if (mode === 'build' || mode === 'draw') this.mode = mode;
    this.custom = sanitizeCustom(custom);
    if (look && typeof look === 'object') {
      for (const [key, id] of Object.entries(look)) {
        const slot = slotByKey[key];
        if (slot && slot.options.some((o) => o.id === id)) this.look[key] = id;
      }
    }
  }

  indexOf(key) {
    return slotByKey[key].options.findIndex((o) => o.id === this.look[key]);
  }

  option(key) {
    return slotByKey[key].options[this.indexOf(key)];
  }

  set(key, id, { silent = false } = {}) {
    this.look[key] = id;
    if (!silent) this.emit('change', { key, id });
  }

  cycle(key, dir) {
    const { options } = slotByKey[key];
    const next = (this.indexOf(key) + dir + options.length) % options.length;
    this.set(key, options[next].id);
  }

  /** Um id aleatório diferente do atual (quando possível). */
  randomId(key) {
    const { options } = slotByKey[key];
    if (options.length < 2) return options[0].id;
    let id;
    do id = options[rand(options.length)].id; while (id === this.look[key]);
    return id;
  }

  setName(name) {
    this.name = sanitizeName(name);
    this.emit('name', this.name);
  }

  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.emit('mode', mode);
  }

  setCustom(custom) {
    this.custom = custom;
    this.emit('custom', custom);
  }

  toJSON() {
    return { name: this.name, look: { ...this.look }, mode: this.mode, custom: this.custom };
  }
}

/** Desenho livre: paleta de até 36 cores hex + uma letra base36 por pixel. */
export function sanitizeCustom(raw) {
  if (!raw || !Array.isArray(raw.palette) || typeof raw.data !== 'string') return null;
  const palette = raw.palette.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 36);
  const data = raw.data.replace(/[^0-9a-z.]/g, '').slice(0, 16 * 17).padEnd(16 * 17, '.');
  return { palette, data };
}

export function sanitizeName(raw) {
  return String(raw).toUpperCase().replace(NAME_ALLOWED, '').slice(0, NAME_MAX);
}

const SYLLABLES = ['ZI', 'BO', 'KA', 'LU', 'MI', 'TO', 'PI', 'RA', 'NE', 'JU', 'XO', 'FI', 'DU', 'BE'];
const SUFFIXES = ['', '', 'X', 'Y', 'ZIN', 'TRON', '64', 'BOT'];

export function randomName() {
  const n = 2 + rand(2);
  let s = '';
  for (let i = 0; i < n; i++) s += SYLLABLES[rand(SYLLABLES.length)];
  return sanitizeName(s + SUFFIXES[rand(SUFFIXES.length)]);
}
