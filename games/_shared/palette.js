/**
 * Paleta de TODOS os minijogos (illu32 — 32 cores). Use só estas cores.
 * Pasta com "_" não vira jogo: aqui ficam coisas compartilhadas.
 *
 *   import { PAL, RAMPS, PLAYER_RAMPS } from '/games/_shared/palette.js';
 *
 * RAMPS: trios [escuro, base, claro] para sombrear em 3 tons (pixel art).
 */
export const PALETTE = [
  '#3c2134', '#5b2350', '#8c2864', '#bc295d', '#e62a38', '#fe757c', '#ffa49e', '#f9cca3',
  '#ff9f00', '#d16b09', '#bb4f21', '#623436', '#8d4536', '#b06b4c', '#da916e', '#ffce99',
  '#f3ff97', '#89d93c', '#1dab45', '#1e4f4b', '#302d4c', '#23417d', '#3178d0', '#3db2c6',
  '#7debd0', '#fff9fc', '#acc1d6', '#8394b0', '#474a6b', '#2a2b47', '#151328', '#11122e',
];

/** Nomes para as cores mais usadas. */
export const PAL = {
  ink: '#11122e', night: '#151328', deep: '#2a2b47', slate: '#474a6b', steel: '#8394b0',
  mist: '#acc1d6', white: '#fff9fc',
  plum: '#3c2134', wine: '#5b2350', berry: '#8c2864', rose: '#bc295d', red: '#e62a38',
  salmon: '#fe757c', blush: '#ffa49e', cream: '#f9cca3',
  orange: '#ff9f00', rust: '#d16b09', brick: '#bb4f21', cocoa: '#623436', brown: '#8d4536',
  tan: '#b06b4c', sand: '#da916e', peach: '#ffce99',
  lime: '#f3ff97', green: '#89d93c', leaf: '#1dab45', moss: '#1e4f4b',
  navy: '#302d4c', blue: '#23417d', sky: '#3178d0', cyan: '#3db2c6', mint: '#7debd0',
};

export const RAMPS = {
  red: [PAL.berry, PAL.red, PAL.salmon],
  pink: [PAL.wine, PAL.rose, PAL.blush],
  orange: [PAL.rust, PAL.orange, PAL.peach],
  brown: [PAL.cocoa, PAL.brown, PAL.tan],
  green: [PAL.leaf, PAL.green, PAL.lime],
  teal: [PAL.moss, PAL.leaf, PAL.mint],
  blue: [PAL.blue, PAL.sky, PAL.cyan],
  ice: [PAL.cyan, PAL.mint, PAL.white],
  steel: [PAL.slate, PAL.steel, PAL.mist],
  dark: [PAL.night, PAL.deep, PAL.slate],
};

/** Cores dos jogadores 1–4 (mesma ordem em todo jogo). */
export const PLAYER_RAMPS = [RAMPS.red, RAMPS.blue, RAMPS.orange, RAMPS.green];
