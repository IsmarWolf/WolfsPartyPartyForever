/**
 * Catálogo de partes do personagem (vista 3/4, olhando para a direita).
 *
 * Grade: 16 colunas × 17 linhas; o renderizador adiciona 1px de borda
 * para o contorno automático. Cada caractere é um pixel:
 *
 *   .  transparente
 *   S s L  pele (base / sombra / luz)       H h I  cabelo (base / sombra / luz)
 *   T t U  roupa de cima                    B b    roupa de baixo
 *   A a    acessório (cores próprias)       F f    sapato
 *   E      olho (cor do contorno)           K      contorno interno
 *   W      branco                           C      bochecha
 *
 * A luz vem da direita (para onde o personagem olha): sombra à esquerda.
 * Para criar uma parte: copie uma existente, edite e confira em /tools/sprites.html.
 */

export const GRID = { w: 16, h: 17 };

function rows(startRow, lines) {
  const map = Array.from({ length: GRID.h }, () => '.'.repeat(GRID.w));
  lines.forEach((line, i) => { map[startRow + i] = line; });
  return map;
}

// ─────────────────────────────────────────────────────────── corpo base
export const BODY = rows(2, [
  '...SSSSSSSSSS...', // 2  topo da cabeça
  '..sSSSSSSSSSSL..',
  '..sSSSSSSSSSSL..',
  '..sSSSSSSSSSSL..',
  '..sSSSSSSSSSSS..',
  '..sSSSSSSSSSSS..',
  '..ssSSSSSSSSSS..',
  '...ssSSSSSSSS...',
  '...KKKKKKKKKK...', // 10 linha do queixo
  '...sSSSSSSSSs...', // 11 tronco
  '..sSSSSSSSSSSS..', // 12 mãos nas laterais
  '...SSSSSSSSSS...', // 13 quadril
  '....SS....SS....', // 14 pernas
  '....FFf...FFf...', // 15 sapatos (bico para a direita)
]);

// ─────────────────────────────────────────────────────────── olhos
export const EYES = [
  { id: 'normal', label: 'NORMAL', map: rows(6, [
    '........E..E....',
    '........E..E....',
    '............C...',
  ]) },
  { id: 'feliz', label: 'FELIZ', map: rows(6, [
    '........E..E....',
    '.......E.EE.E...',
    '.............C..',
  ]) },
  { id: 'brilho', label: 'BRILHO', map: rows(6, [
    '........WE.WE...',
    '........EE.EE...',
    '.............C..',
  ]) },
  { id: 'sono', label: 'SONO', map: rows(7, [
    '.......EE..EE...',
    '............C...',
  ]) },
  { id: 'piscada', label: 'PISCADA', map: rows(6, [
    '........E.......',
    '........E.EEE...',
    '............C...',
  ]) },
];

// ─────────────────────────────────────────────────────────── cabelos
export const HAIR = [
  { id: 'careca', label: 'CARECA', front: null },
  { id: 'curto', label: 'CURTO', front: rows(0, [
    '........hH......',
    '....hhHHHHHH....',
    '..hhHHHHIIHHH...',
    '.hhHHHHHHHHHHH..',
    '.hHHHHHhhhhhh...',
    '.hhHH...........',
    '.hhH............',
    '.hh.............',
  ]) },
  { id: 'espetado', label: 'ESPETADO', front: rows(0, [
    '....h..H..H.....',
    '...hH.HH.HH.H...',
    '..hhHHHHHHHHHH..',
    '.hhHHHIIHHHHHHH.',
    '.hHHHHHHhHhHhh..',
    '.hhH............',
    '.hh.............',
  ]) },
  { id: 'franja', label: 'FRANJA', front: rows(1, [
    '....hhHHHHH.....',
    '..hhHHHHIIHHH...',
    '.hhHHHHHHHHHHH..',
    '.hHHHHHHHHHHHH..',
    '.hHHhhhhhhhhhh..',
    '.hHH.........H..',
    '.hHH.........h..',
    '.hh.............',
  ]) },
  { id: 'longo', label: 'LONGO', front: rows(1, [
    '....hhHHHHH.....',
    '..hhHHHHIIHHH...',
    '.hhHHHHHHHHHHH..',
    '.hHHHHHHhhhhhH..',
    'hhHHH........H..',
    'hhHH.........h..',
    'hhHH............',
    'hhHH............',
    'hhHh............',
    'hhH.............',
    'hhH.............',
    '.hh.............',
  ]) },
  { id: 'coque', label: 'COQUE', front: rows(0, [
    '..hHH...........',
    '.hHIHh..........',
    '.hHHHhHHHHHH....',
    '..hHHHHHIIHHHH..',
    '.hHHHHHHHHHHHH..',
    '.hHHhhhhhhh.....',
    '.hh.............',
  ]) },
  { id: 'cacheado', label: 'CACHEADO', front: rows(0, [
    '....hHHHHHh.....',
    '..hHHIHHHIHHh...',
    '.hHHHHHHHHHHHh..',
    'hHHIHHHHHIHHHHh.',
    'hHHHHHHHHHHHHHh.',
    'hHHHhHhHhHhHhhh.',
    'hhHH..........h.',
    'hhH.............',
    '.h..............',
  ]) },
  { id: 'rabo', label: 'RABO', front: rows(1, [
    '....hhHHHHH.....',
    '..hhHHHHIIHHH...',
    'hhhHHHHHHHHHHH..',
    'hHHHHHHhhhhhh...',
    'hhhHH...........',
    '.hhH............',
    'hh..............',
    'h...............',
  ]) },
  { id: 'touca', label: 'TOUCA', front: rows(1, [
    '...hHIHIHIHI....',
    '..hHIHIHIHIHIH..',
    '.hHIHIHIHIHIHIH.',
    '.hhhhhhhhhhhhhh.',
    '.hh.............',
  ]) },
];

// ─────────────────────────────────────────────────────────── roupa de cima
export const TOPS = [
  { id: 'camiseta', label: 'CAMISETA', map: rows(11, [
    '...tTTTTTTTTU...',
    '..stTTTTTTTTUS..',
  ]) },
  { id: 'regata', label: 'REGATA', map: rows(11, [
    '...sTSSSSSSTs...',
    '..stTTTTTTTTUS..',
  ]) },
  { id: 'moletom', label: 'MOLETOM', map: rows(11, [
    '...tTTWTTWTTU...',
    '..ttTTTTTTTTUU..',
  ]) },
  { id: 'listrada', label: 'LISTRADA', map: rows(11, [
    '...tTWTWTWTWU...',
    '..stWTWTWTWTUS..',
  ]) },
  { id: 'jaqueta', label: 'JAQUETA', map: rows(11, [
    '...tTTWWWWTTU...',
    '..stTTWWWWTTUS..',
  ]) },
];

// ─────────────────────────────────────────────────────────── roupa de baixo
export const BOTTOMS = [
  { id: 'calca', label: 'CALÇA', map: rows(13, [
    '...bBBBBBBBBB...',
    '....bB....bB....',
  ]) },
  { id: 'bermuda', label: 'BERMUDA', map: rows(13, [
    '...bBBBBBBBBB...',
  ]) },
  { id: 'saia', label: 'SAIA', map: rows(13, [
    '..bBBBBBBBBBBB..',
  ]) },
];

// ─────────────────────────────────────────────────────────── acessórios
// `colors` define A/a. `clipHairAbove` apaga o cabelo acima da linha (chapéus).
export const ACCESSORIES = [
  { id: 'nenhum', label: 'NENHUM', map: null },
  { id: 'oculos', label: 'ÓCULOS', colors: { A: '#c4573f' }, map: rows(5, [
    '.......AAAAAA...',
    '...AAAAA.AA.A...',
    '.......A.AA.A...',
    '.......AAAAAA...',
  ]) },
  { id: 'escuros', label: 'ESCUROS', colors: { A: '#1f2340', a: '#7cb4e8' }, map: rows(6, [
    '...AAAAAAAAAAA..',
    '.......AaAAaA...',
  ]) },
  { id: 'fone', label: 'FONE', colors: { A: '#4fa9b8', a: '#98dcc6' }, map: rows(0, [
    '....AAAAA.......',
    '...A.....A......',
    '..A.............',
    '..A.............',
    '.AAA............',
    '.AaA............',
    '.AaA............',
    '.AAA............',
  ]) },
  { id: 'laco', label: 'LAÇO', colors: { A: '#ef93b8', a: '#c96a91' }, map: rows(0, [
    '..AA.AA.........',
    '..AAaAA.........',
    '..AA.AA.........',
  ]) },
  { id: 'bone', label: 'BONÉ', clipHairAbove: 4, colors: { A: '#ef7b63', a: '#c4573f' }, map: rows(1, [
    '....AAAAAA......',
    '..AAAAAaAAA.....',
    '.AAAAAAAAAAA....',
    '.aaaaaaaaaaaaaaa',
  ]) },
  { id: 'chapeu', label: 'CHAPÉU', clipHairAbove: 4, colors: { A: '#d6c3a0', a: '#b39c78' }, map: rows(1, [
    '.....AAAAA......',
    '....AAAaAAA.....',
    '...AAAAAAAAA....',
    'aaaaaaaaaaaaaaaa',
  ]) },
];
