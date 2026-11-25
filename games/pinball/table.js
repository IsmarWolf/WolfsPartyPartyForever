/**
 * Mesa do Pinball Duelo — usada pelo servidor (física) e pela página (desenho).
 *
 * Mesa quadrada de 800×800. Cada jogador defende um lado: dois flippers, dois
 * estilingues logo acima deles e um buraco no meio. Lado sem jogador (ou de
 * quem já perdeu) vira parede. Tudo é descrito para o lado de BAIXO e girado
 * para os outros lados.
 *
 * Peças que dão ponto (para quem bateu por último na bola):
 *   bumper 100 · pino 10 · estilingue 10 · alvo 500 · derrubar os 3 alvos +2000
 */
export const SIZE = 800;
export const C = SIZE / 2;
export const BALL_R = 11;
export const FLIPPER = { len: 105, thick: 9, rest: 0.49, up: -0.52 }; // ângulos (rad) do flipper esquerdo
export const LIVES = 3;
export const POINTS = { bumper: 100, post: 10, sling: 10, target: 500, bank: 2000 };

/** Ordem dos lados por jogador: 1º embaixo, 2º em cima, 3º esquerda, 4º direita. */
export const SIDE_ANGLE = [0, Math.PI, Math.PI / 2, -Math.PI / 2];

/** Gira um ponto em volta do centro (sentido horário na tela). */
export function rot([x, y], a) {
  const dx = x - C;
  const dy = y - C;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [C + dx * c - dy * s, C + dx * s + dy * c];
}

const PIVOT_L = [250, 740];
const PIVOT_R = [550, 740];
const mirror = ([x, y]) => [SIZE - x, y];

const seg = (a, b, ang) => {
  const p = rot(a, ang);
  const q = rot(b, ang);
  return [p[0], p[1], q[0], q[1]];
};

/**
 * Paredes para quais lados estão abertos (com jogador vivo).
 * Cada parede: { s: [x1,y1,x2,y2], side, kind: 'corner'|'guide'|'wall'|'sling'|'slingKick' }
 */
export function buildWalls(open) {
  const walls = [];
  for (let side = 0; side < 4; side++) {
    const ang = SIDE_ANGLE[side];
    walls.push({ s: seg([0, 700], [100, 800], ang), side, kind: 'corner' });
    if (!open[side]) {
      walls.push({ s: seg([100, 800], [700, 800], ang), side, kind: 'wall' });
      continue;
    }
    walls.push({ s: seg([100, 800], PIVOT_L, ang), side, kind: 'guide' });
    walls.push({ s: seg(PIVOT_R, [700, 800], ang), side, kind: 'guide' });
    // estilingues: triângulos acima dos flippers; a face que olha para o meio chuta a bola
    for (const tri of [SLING, SLING.map(mirror)]) {
      walls.push({ s: seg(tri[0], tri[2], ang), side, kind: 'slingKick' });
      walls.push({ s: seg(tri[0], tri[1], ang), side, kind: 'sling' });
      walls.push({ s: seg(tri[1], tri[2], ang), side, kind: 'sling' });
    }
  }
  return walls;
}
const SLING = [[150, 610], [150, 690], [222, 712]];

/** Flippers de um lado: [{ pivot, base, dir }] — dir = 1 esquerdo, -1 direito (espelhado). */
export function sideFlippers(side) {
  const ang = SIDE_ANGLE[side];
  return [
    { pivot: rot(PIVOT_L, ang), base: ang, dir: 1 },
    { pivot: rot(PIVOT_R, ang), base: ang, dir: -1 },
  ];
}

/** Ângulo absoluto de um flipper com abertura t (0 = parado, 1 = levantado). */
export function flipperAngle(f, t) {
  const a = FLIPPER.rest + (FLIPPER.up - FLIPPER.rest) * t;
  return f.dir === 1 ? f.base + a : f.base + Math.PI - a;
}

/** Bumpers grandes (100) nas diagonais e pinos (10) em volta do centro. */
export const BUMPERS = [
  ...[[270, 270], [530, 270], [270, 530], [530, 530]].map(([x, y]) => ({ x, y, r: 30, kind: 'bumper' })),
  ...[[330, 330], [470, 330], [330, 470], [470, 470]].map(([x, y]) => ({ x, y, r: 10, kind: 'post' })),
];

/** Alvos (3 por lado, em todos os lados), em frente a cada buraco. */
export const TARGETS = [0, 1, 2, 3].flatMap((side) =>
  [360, 400, 440].map((x) => ({ side, s: seg([x - 15, 590], [x + 15, 590], SIDE_ANGLE[side]) })));
export const TARGET_THICK = 5;

/** Em qual lado (0–3) a bola caiu, ou -1. */
export function drainedSide([x, y]) {
  for (let side = 0; side < 4; side++) {
    const [, ly] = rot([x, y], -SIDE_ANGLE[side]);
    if (ly > SIZE + BALL_R) return side;
  }
  return -1;
}
