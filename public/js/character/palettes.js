/**
 * Paletas do personagem. Cada cor tem 3 tons: `base`, `shade` (sombra)
 * e `light` (brilho) — é isso que tira o aspecto "chapado" do sprite.
 * Para adicionar uma cor, inclua um objeto: menu e aleatório pegam sozinhos.
 */

/** Contorno e olhos — o mesmo azul-tinta para todo mundo. */
export const INK = '#1f2340';
export const WHITE = '#fffaf0';
export const BLUSH = '#f19aa0';
export const SHOE = { base: '#4a3b5c', shade: '#352a45' };

export const SKIN_TONES = [
  { id: 'porcelana', label: 'PORCELANA', base: '#ffe0c7', shade: '#f0b89a', light: '#fff0e2' },
  { id: 'pessego',   label: 'PÊSSEGO',   base: '#f7c49b', shade: '#dc9a6e', light: '#ffd9b8' },
  { id: 'mel',       label: 'MEL',       base: '#dca473', shade: '#b97c4e', light: '#ecbd90' },
  { id: 'canela',    label: 'CANELA',    base: '#b27548', shade: '#8c5533', light: '#c98d5f' },
  { id: 'cacau',     label: 'CACAU',     base: '#855236', shade: '#663b25', light: '#9e6745' },
  { id: 'ebano',     label: 'ÉBANO',     base: '#5c3a28', shade: '#452a1c', light: '#74503a' },
  { id: 'alien',     label: 'ALIEN',     base: '#9fd6a8', shade: '#6fae80', light: '#c2ead0' },
  { id: 'gelo',      label: 'GELO',      base: '#a9c7ef', shade: '#7b9bd0', light: '#cde0fa' },
];

export const HAIR_COLORS = [
  { id: 'carvao',   label: 'CARVÃO',   base: '#3a3350', shade: '#27223a', light: '#5a4f78' },
  { id: 'castanho', label: 'CASTANHO', base: '#7b4b30', shade: '#5a3421', light: '#a06a45' },
  { id: 'ruivo',    label: 'RUIVO',    base: '#d9733f', shade: '#a9522b', light: '#f09a62' },
  { id: 'loiro',    label: 'LOIRO',    base: '#f2c862', shade: '#c99a3a', light: '#fbe39a' },
  { id: 'platina',  label: 'PLATINA',  base: '#ece3d0', shade: '#c5b89c', light: '#fffaf0' },
  { id: 'chiclete', label: 'CHICLETE', base: '#ef8fb3', shade: '#c46389', light: '#f9b9d1' },
  { id: 'oceano',   label: 'OCEANO',   base: '#5ba3dc', shade: '#3d75b0', light: '#8cc6f0' },
  { id: 'menta',    label: 'MENTA',    base: '#67c09a', shade: '#448e6d', light: '#9adcbc' },
  { id: 'uva',      label: 'UVA',      base: '#9877d1', shade: '#6e52a8', light: '#bca4ea' },
  { id: 'cereja',   label: 'CEREJA',   base: '#d95a5f', shade: '#a83d4a', light: '#f08a8a' },
];

/** Usada tanto pela parte de cima quanto pela de baixo. */
export const CLOTH_COLORS = [
  { id: 'coral',   label: 'CORAL',   base: '#ef7b63', shade: '#c4573f', light: '#f8a48f' },
  { id: 'laranja', label: 'LARANJA', base: '#f39b4a', shade: '#c8742b', light: '#f9bd7f' },
  { id: 'sol',     label: 'SOL',     base: '#f4c95b', shade: '#cfa03a', light: '#fbe08f' },
  { id: 'menta',   label: 'MENTA',   base: '#67c4a7', shade: '#449a80', light: '#98dcc6' },
  { id: 'agua',    label: 'ÁGUA',    base: '#4fa9b8', shade: '#357e8e', light: '#80c9d4' },
  { id: 'ceu',     label: 'CÉU',     base: '#7cb4e8', shade: '#548bc4', light: '#a9d0f3' },
  { id: 'anil',    label: 'ANIL',    base: '#6670c9', shade: '#4950a0', light: '#9198e0' },
  { id: 'lavanda', label: 'LAVANDA', base: '#a985d6', shade: '#8262b0', light: '#c7abe8' },
  { id: 'rosa',    label: 'ROSA',    base: '#ef93b8', shade: '#c96a91', light: '#f7b9d2' },
  { id: 'creme',   label: 'CREME',   base: '#f2e6cf', shade: '#d1bf9f', light: '#fffaf0' },
  { id: 'grafite', label: 'GRAFITE', base: '#4f5370', shade: '#393c55', light: '#6c7194' },
  { id: 'jeans',   label: 'JEANS',   base: '#4d6fae', shade: '#38528a', light: '#7391cc' },
];

/** Paleta do modo "desenhar" — harmoniza com as cores acima. */
export const DRAW_PALETTE = [
  INK, WHITE, '#8b90a8', '#4f5370',
  '#ffe0c7', '#f7c49b', '#dca473', '#b27548', '#855236', '#5c3a28',
  '#3a3350', '#7b4b30', '#d9733f', '#f2c862',
  '#ef7b63', '#c4573f', '#f39b4a', '#f4c95b',
  '#67c4a7', '#449a80', '#4fa9b8', '#7cb4e8',
  '#6670c9', '#a985d6', '#ef93b8', '#f19aa0',
];
