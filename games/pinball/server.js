/**
 * Pinball Duelo — lógica no servidor (física e regras).
 * O lounge chama default(api) quando o jogo começa (ver games/README.md).
 *
 * Regras: cada jogador defende um lado com dois flippers. Bola que cai no seu
 * buraco = perde uma vida. Sem vidas, seu lado vira parede. Último vivo vence.
 * Sozinho: aguente o máximo que der e faça pontos.
 * Pontos (bumpers, alvos, estilingues) vão para quem bateu na bola por último.
 * Uma bola no começo; a cada 20 s entra mais uma (até jogadores + 1).
 */
import {
  SIZE, C, BALL_R, FLIPPER, LIVES, SIDE_ANGLE, BUMPERS, TARGETS, TARGET_THICK, POINTS,
  buildWalls, sideFlippers, flipperAngle, drainedSide,
} from './table.js';

const STEP = 1 / 240; // física em passos pequenos: bola rápida não atravessa parede
const STEPS_PER_TICK = 4; // 60 ticks/s
const SEND_EVERY = 2; // estado para os clientes a 30/s
const SPEED = { serve: 520, min: 440, max: 1250, bumper: 200, sling: 320 };
const BANK_RESET_S = 6;
const FLIP_SPEED = { up: 20, down: 11 }; // abertura por segundo (0..1)
const COUNTDOWN = 3;
const EXTRA_BALL_S = 20;
const OVER_S = 5;

export default function pinball(api) {
  const players = api.players.slice(0, 4).map((p, i) => ({
    id: p.id, name: p.name, side: i, lives: LIVES, alive: true, score: 0, input: { l: false, r: false },
  }));
  const bySide = (side) => players.find((p) => p.side === side);
  const flippers = players.flatMap((p) => sideFlippers(p.side).map((f) => ({ ...f, owner: p, t: 0, w: 0 })));
  let walls = buildWalls([0, 1, 2, 3].map((s) => Boolean(bySide(s)?.alive)));
  const balls = [];
  const targets = TARGETS.map((t) => ({ ...t, up: true }));
  const bankReset = [0, 0, 0, 0]; // quando os alvos de cada lado voltam
  let phase = 'count'; // count → play → over
  let clock = COUNTDOWN;
  let elapsed = 0;
  let nextExtra = EXTRA_BALL_S;
  let winner = null;
  let tick = 0;
  const outOrder = []; // ids na ordem em que saíram
  const solo = players.length === 1;

  const fx = (kind, x, y, side) => api.send(null, 'fx', { kind, x: Math.round(x), y: Math.round(y), side });
  const score = (b, n) => { if (b.owner?.alive) b.owner.score += n; };

  // ── entrada dos jogadores
  api.on('input', (id, data) => {
    const p = players.find((q) => q.id === id);
    if (p) p.input = { l: Boolean(data?.l), r: Boolean(data?.r) };
  });
  api.on('leave', (id) => {
    const p = players.find((q) => q.id === id);
    if (!p) return;
    p.left = true;
    if (p.alive) eliminate(p);
    if (players.every((q) => q.left)) clearInterval(loop); // todo mundo foi embora
  });

  // ── bolas
  function serve() {
    const alive = players.filter((p) => p.alive);
    if (!alive.length) return;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const a = SIDE_ANGLE[target.side] + Math.PI / 2 + (Math.random() - 0.5) * 0.9; // rumo ao lado do alvo
    balls.push({ x: C, y: C, vx: Math.cos(a) * SPEED.serve, vy: Math.sin(a) * SPEED.serve, wait: 1 });
  }

  function eliminate(p) {
    p.alive = false;
    p.lives = 0;
    outOrder.push(p.id);
    walls = buildWalls([0, 1, 2, 3].map((s) => Boolean(bySide(s)?.alive)));
    fx('out', C, C, p.side);
  }

  // ── colisões
  function hitSegment(b, x1, y1, x2, y2, thick, vsx = 0, vsy = 0, bounce = 0.92) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((b.x - x1) * dx + (b.y - y1) * dy) / len2));
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    let nx = b.x - cx;
    let ny = b.y - cy;
    const d = Math.hypot(nx, ny);
    const minD = BALL_R + thick;
    if (d >= minD || d === 0) return false;
    nx /= d;
    ny /= d;
    b.x = cx + nx * minD;
    b.y = cy + ny * minD;
    const rvx = b.vx - vsx;
    const rvy = b.vy - vsy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      b.vx -= (1 + bounce) * vn * nx;
      b.vy -= (1 + bounce) * vn * ny;
    }
    return { cx, cy, nx, ny };
  }

  function physics(dt) {
    for (const f of flippers) {
      const want = f.owner.alive && (f.dir === 1 ? f.owner.input.l : f.owner.input.r) ? 1 : 0;
      const prev = f.t;
      f.t = want ? Math.min(1, f.t + FLIP_SPEED.up * dt) : Math.max(0, f.t - FLIP_SPEED.down * dt);
      if (f.t === 1 && prev < 1) fx('flip', f.pivot[0], f.pivot[1], f.owner.side);
      const a0 = flipperAngle(f, prev);
      f.angle = flipperAngle(f, f.t);
      f.w = (f.angle - a0) / dt; // velocidade angular, para dar o "tapa" na bola
    }

    for (const b of balls) {
      if (b.wait > 0) { b.wait -= dt; continue; }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      for (const w of walls) {
        const hit = hitSegment(b, ...w.s, 2);
        if (hit && w.kind === 'slingKick') {
          b.vx += hit.nx * SPEED.sling;
          b.vy += hit.ny * SPEED.sling;
          score(b, POINTS.sling);
          fx('sling', hit.cx, hit.cy, w.side);
        }
      }

      for (const t of targets) {
        if (!t.up || !hitSegment(b, ...t.s, TARGET_THICK)) continue;
        t.up = false;
        score(b, POINTS.target);
        fx('target', (t.s[0] + t.s[2]) / 2, (t.s[1] + t.s[3]) / 2, t.side);
        if (targets.every((q) => q.side !== t.side || !q.up)) {
          score(b, POINTS.bank);
          bankReset[t.side] = elapsed + BANK_RESET_S;
          fx('bank', C, C, t.side);
        }
      }

      for (const f of flippers) {
        if (!f.owner.alive) continue;
        const [px, py] = f.pivot;
        const tx = px + Math.cos(f.angle) * FLIPPER.len;
        const ty = py + Math.sin(f.angle) * FLIPPER.len;
        // velocidade da superfície no ponto de contato: ω × r (estimada no ponto mais perto)
        const dx = tx - px;
        const dy = ty - py;
        const t = Math.max(0, Math.min(1, ((b.x - px) * dx + (b.y - py) * dy) / (dx * dx + dy * dy)));
        const rx = dx * t;
        const ry = dy * t;
        const hit = hitSegment(b, px, py, tx, ty, FLIPPER.thick, -f.w * ry, f.w * rx, 0.55);
        if (hit) b.owner = f.owner;
        if (hit && Math.abs(f.w) > 1) fx('bat', hit.cx, hit.cy, f.owner.side);
      }

      for (const k of BUMPERS) {
        const dx = b.x - k.x;
        const dy = b.y - k.y;
        const d = Math.hypot(dx, dy);
        if (d < k.r + BALL_R && d > 0) {
          const nx = dx / d;
          const ny = dy / d;
          b.x = k.x + nx * (k.r + BALL_R);
          b.y = k.y + ny * (k.r + BALL_R);
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.vx -= 2 * vn * nx; b.vy -= 2 * vn * ny; }
          const kick = k.kind === 'bumper' ? SPEED.bumper : SPEED.bumper / 3;
          b.vx += nx * kick;
          b.vy += ny * kick;
          score(b, POINTS[k.kind]);
          fx(k.kind === 'bumper' ? 'bump' : 'post', k.x, k.y);
        }
      }

      // velocidade sempre entre o mínimo e o máximo (sem gravidade, a bola não pode morrer)
      const sp = Math.hypot(b.vx, b.vy);
      const want = Math.min(SPEED.max, Math.max(SPEED.min, sp));
      if (sp > 0 && want !== sp) { b.vx *= want / sp; b.vy *= want / sp; }
    }

    // bola contra bola
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (a.wait > 0 || b.wait > 0) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= BALL_R * 2 || d === 0) continue;
        const nx = dx / d;
        const ny = dy / d;
        const push = (BALL_R * 2 - d) / 2;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          a.vx += rel * nx; a.vy += rel * ny;
          b.vx -= rel * nx; b.vy -= rel * ny;
        }
      }
    }

    // bolas que caíram
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const side = drainedSide([b.x, b.y]);
      const outside = b.x < -50 || b.y < -50 || b.x > SIZE + 50 || b.y > SIZE + 50;
      if (side < 0 && !outside) continue;
      balls.splice(i, 1);
      const p = bySide(side);
      if (p?.alive) {
        p.lives -= 1;
        fx('drain', b.x, b.y, p.side);
        if (p.lives <= 0) eliminate(p);
      }
      if (phase === 'play') serve();
    }
  }

  function checkOver() {
    const alive = players.filter((p) => p.alive);
    if (solo ? alive.length === 0 : alive.length <= 1) {
      phase = 'over';
      clock = OVER_S;
      winner = solo ? null : alive[0]?.id ?? outOrder.at(-1) ?? null;
      balls.length = 0;
      fx('over', C, C);
    }
  }

  function send() {
    api.send(null, 'state', {
      phase,
      clock: Math.ceil(clock),
      time: Math.floor(elapsed),
      winner,
      players: players.map(({ id, name, side, lives, alive, score: pts }) => ({ id, name, side, lives, alive, score: pts })),
      targets: targets.map((t) => (t.up ? 1 : 0)).join(''),
      balls: balls.map((b) => [Math.round(b.x), Math.round(b.y), b.wait > 0 ? 1 : 0]),
      flippers: flippers.map((f) => +(f.angle ?? flipperAngle(f, 0)).toFixed(3)),
    });
  }

  const loop = setInterval(() => {
    const dt = STEP * STEPS_PER_TICK;
    if (phase === 'count') {
      clock -= dt;
      for (const f of flippers) f.angle = flipperAngle(f, 0);
      if (clock <= 0) { phase = 'play'; fx('go', C, C); serve(); }
    } else if (phase === 'play') {
      elapsed += dt;
      if (elapsed >= nextExtra) {
        nextExtra += EXTRA_BALL_S;
        if (balls.length < players.filter((p) => p.alive).length + 1) { serve(); fx('extra', C, C); }
      }
      for (let s = 0; s < 4; s++) {
        if (bankReset[s] && elapsed >= bankReset[s]) {
          bankReset[s] = 0;
          for (const t of targets) if (t.side === s) t.up = true;
        }
      }
      for (let i = 0; i < STEPS_PER_TICK; i++) physics(STEP);
      checkOver();
    } else if (phase === 'over') {
      clock -= dt;
      if (clock <= 0) {
        clearInterval(loop);
        // ranking: vencedor primeiro, depois quem saiu por último
        const ranking = [...players.filter((p) => p.alive).map((p) => p.id), ...outOrder.slice().reverse()];
        api.end(ranking);
        return;
      }
    }
    if (++tick % SEND_EVERY === 0) send();
  }, 1000 * STEP * STEPS_PER_TICK);
}
