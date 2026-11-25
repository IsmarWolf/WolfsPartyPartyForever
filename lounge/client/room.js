/**
 * Mapa do lounge, em pixels da imagem room.png (1639×959).
 * Usado pelo cliente e pelo servidor. Para colocar coisa nova na sala:
 *   SOLIDS   — retângulo que não dá para atravessar (área dos pés)
 *   HOTSPOTS — ponto onde aparece "E · <label>" quando alguém chega perto
 *              kind 'vote' | 'sit' | 'item' (item = trancado até ter `cost` pontos)
 */
export const ROOM = { w: 1639, h: 959, image: 'room.png' };

/** Onde os pés podem pisar. */
export const FLOOR = { x1: 40, y1: 290, x2: 1600, y2: 930 };

export const SOLIDS = [
  { name: 'mesa', x: 710, y: 470, w: 235, h: 170 },
  { name: 'máquina de frutas', x: 60, y: 280, w: 125, h: 70 },
  { name: 'geladeira', x: 330, y: 280, w: 105, h: 70 },
  { name: 'cofre', x: 460, y: 280, w: 95, h: 45 },
  { name: 'baú', x: 570, y: 280, w: 90, h: 35 },
  { name: 'livros', x: 285, y: 690, w: 125, h: 75 },
  { name: 'lixeira', x: 215, y: 850, w: 90, h: 60 },
  { name: 'placar', x: 0, y: 830, w: 145, h: 90 },
  { name: 'tv', x: 1330, y: 800, w: 190, h: 140 },
  { name: 'caminha rosa', x: 1375, y: 440, w: 180, h: 65 },
  { name: 'tigela', x: 1155, y: 820, w: 75, h: 50 },
];

/** Lugares do sofá (onde ficam os pés de quem senta). */
export const SEATS = [{ x: 1010, y: 286 }, { x: 1080, y: 286 }, { x: 1150, y: 286 }];

/** Ícone do controle na tela da porta (anima subindo e descendo). */
export const DOOR_ICON = { x: 703, y: 65, w: 200, h: 98 };

/** Luz da TV: polígono em px da sala, da tela da TV para o chão. */
export const TV_LIGHT = [[1395, 712], [1352, 742], [1180, 520], [1300, 470]];

export const HOTSPOTS = [
  { id: 'vote', kind: 'vote', label: 'VOTAR NO JOGO', x: 795, y: 310, r: 110 },
  { id: 'sofa', kind: 'sit', label: 'SENTAR', x: 1080, y: 310, r: 120 },
  // itens: a mecânica de cada um entra em items.js quando for criada
  { id: 'frutas', kind: 'item', label: 'MÁQUINA DE FRUTAS', cost: 10, x: 122, y: 365 },
  { id: 'geladeira', kind: 'item', label: 'GELADEIRA', cost: 20, x: 382, y: 365 },
  { id: 'cofre', kind: 'item', label: 'COFRE', cost: 100, x: 507, y: 340 },
  { id: 'bau', kind: 'item', label: 'BAÚ', cost: 50, x: 615, y: 335 },
  { id: 'escrivaninha', kind: 'item', label: 'ESCRIVANINHA', cost: 40, x: 1428, y: 300 },
  { id: 'planta', kind: 'item', label: 'PLANTA', cost: 5, x: 1580, y: 330 },
  { id: 'caminha', kind: 'item', label: 'CAMINHA', cost: 25, x: 1465, y: 530 },
  { id: 'tigela', kind: 'item', label: 'TIGELA', cost: 5, x: 1192, y: 890 },
  { id: 'tv', kind: 'item', label: 'TV', cost: 60, x: 1310, y: 760 },
  { id: 'livros', kind: 'item', label: 'LIVROS', cost: 15, x: 348, y: 790 },
  { id: 'lixeira', kind: 'item', label: 'LIXEIRA', cost: 5, x: 260, y: 830 },
  { id: 'placar', kind: 'item', label: 'PLACAR', cost: 30, x: 165, y: 860 },
  { id: 'mesa', kind: 'item', label: 'MESA', cost: 20, x: 828, y: 665 },
];

const FOOT = 18; // meia-largura dos pés
const REACH = 80; // raio padrão de um hotspot

export function blocked(x, y) {
  if (x - FOOT < FLOOR.x1 || x + FOOT > FLOOR.x2 || y < FLOOR.y1 || y > FLOOR.y2) return true;
  return SOLIDS.some((s) => x + FOOT > s.x && x - FOOT < s.x + s.w && y > s.y && y < s.y + s.h);
}

/** O hotspot mais perto dentro do alcance. */
export function hotspotAt(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const h of HOTSPOTS) {
    const d = Math.hypot(h.x - x, h.y - y);
    if (d < (h.r ?? REACH) && d < bestD) { best = h; bestD = d; }
  }
  return best;
}
