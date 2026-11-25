/**
 * Carcaça do fliperama em pixel art pura (canvas 320×250; cada pixel = 4×4 no palco 1280×1000).
 * Todas as bordas, chanfros, filetes neon, sombras projetadas e rebites usam o mesmo grão de pixel.
 */

function fillRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Moldura CRT escalonada com cantos arredondados em pixel. */
function drawCrtRim(ctx, x1, y1, x2, y2, pad, color) {
  const l = x1 - pad;
  const r = x2 + pad;
  const t = y1 - pad;
  const b = y2 + pad;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(l + 6, t);
  ctx.lineTo(r - 6, t);
  ctx.lineTo(r - 6, t + 1); ctx.lineTo(r - 3, t + 1);
  ctx.lineTo(r - 3, t + 3); ctx.lineTo(r - 1, t + 3);
  ctx.lineTo(r - 1, t + 6); ctx.lineTo(r, t + 6);
  ctx.lineTo(r, b - 6);
  ctx.lineTo(r - 1, b - 6); ctx.lineTo(r - 1, b - 3);
  ctx.lineTo(r - 3, b - 3); ctx.lineTo(r - 3, b - 1);
  ctx.lineTo(r - 6, b - 1); ctx.lineTo(r - 6, b);
  ctx.lineTo(l + 6, b);
  ctx.lineTo(l + 6, b - 1); ctx.lineTo(l + 3, b - 1);
  ctx.lineTo(l + 3, b - 3); ctx.lineTo(l + 1, b - 3);
  ctx.lineTo(l + 1, b - 6); ctx.lineTo(l, b - 6);
  ctx.lineTo(l, t + 6);
  ctx.lineTo(l + 1, t + 6); ctx.lineTo(l + 1, t + 3);
  ctx.lineTo(l + 3, t + 3); ctx.lineTo(l + 3, t + 1);
  ctx.lineTo(l + 6, t + 1);
  ctx.closePath();
  ctx.fill();
}

function drawRivet(ctx, x, y) {
  fillRect(ctx, x, y, 3, 3, '#120827');
  fillRect(ctx, x + 1, y + 1, 1, 1, '#9b78ff');
}

export function mountShell(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 320, 250);

  // ── 1. Laterais chanfradas com filete neon e aura em pixel
  const drawSideSlice = (y, xo, xi, isRight) => {
    const px = (x, w, color) => fillRect(ctx, isRight ? 320 - x - w : x, y, w, 1, color);
    const bodyW = Math.max(1, xi - (xo + 5));
    const shadeW = Math.max(1, Math.floor(bodyW * 0.45));
    const inDeck = y >= 195 && y < 228;
    const underDeck = y >= 228 && y < 234;
    const underLedge = y >= 47 && y < 56;

    const rim = inDeck ? '#8b64ff' : underLedge || underDeck ? '#4a2f96' : '#6a45d0';
    const mid = inDeck ? '#3f2685' : underDeck ? '#201247' : '#321e6b';
    const deep = underDeck ? '#140a30' : '#241452';

    px(xo - 2, 1, 'rgba(255, 79, 216, 0.22)');
    px(xo - 1, 1, 'rgba(255, 79, 216, 0.50)');
    px(xo, 1, '#120827');
    px(xo + 1, 2, '#ff4fd8');
    px(xo + 1, 1, '#ffb3f0');
    px(xo + 3, 1, '#120827');
    px(xo + 4, 1, rim);
    px(xo + 5, bodyW - shadeW, mid);
    px(xo + 5 + (bodyW - shadeW), shadeW, deep);
    px(xi - 1, 1, '#120827');
  };

  for (let y = 0; y < 250; y++) {
    let xo;
    let xi;
    if (y < 195) {
      xo = Math.round(28 - y * 0.08);
      xi = 45;
    } else if (y < 228) {
      const t = y - 195;
      xo = Math.round(12 - t * 0.16);
      xi = Math.round(35 - t * 0.25);
    } else {
      const t = y - 228;
      xo = Math.round(7 - t * 0.18);
      xi = 29;
    }
    drawSideSlice(y, xo, xi, false);
    drawSideSlice(y, xo, xi, true);
  }

  // costuras horizontais nas laterais alinhadas com a aba e a mesa
  fillRect(ctx, 25, 47, 20, 1, '#120827');
  fillRect(ctx, 25, 48, 20, 1, '#8b64ff');
  fillRect(ctx, 25, 51, 20, 1, '#120827');
  fillRect(ctx, 275, 47, 20, 1, '#120827');
  fillRect(ctx, 275, 48, 20, 1, '#8b64ff');
  fillRect(ctx, 275, 51, 20, 1, '#120827');
  fillRect(ctx, 13, 195, 22, 1, '#8b64ff');
  fillRect(ctx, 285, 195, 22, 1, '#8b64ff');
  fillRect(ctx, 8, 228, 21, 1, '#120827');
  fillRect(ctx, 291, 228, 21, 1, '#120827');

  // ── 2. Corpo frontal superior + letreiro (y = 0..194)
  fillRect(ctx, 45, 0, 230, 195, '#261752');
  // pilares verticais laterais com chanfro luminoso
  fillRect(ctx, 45, 0, 1, 195, '#7b54e8');
  fillRect(ctx, 46, 0, 2, 195, '#362170');
  fillRect(ctx, 48, 0, 1, 195, '#120827');
  fillRect(ctx, 271, 0, 1, 195, '#120827');
  fillRect(ctx, 272, 0, 2, 195, '#362170');
  fillRect(ctx, 274, 0, 1, 195, '#7b54e8');

  // caixa do letreiro
  fillRect(ctx, 49, 0, 222, 47, '#140a32');
  fillRect(ctx, 49, 0, 222, 1, '#4a2f96');
  fillRect(ctx, 49, 1, 222, 1, '#2a1a5e');
  fillRect(ctx, 49, 2, 1, 45, '#2c1b66');
  fillRect(ctx, 270, 2, 1, 45, '#2c1b66');

  // aba superior (overhang) + sombra projetada no bezel
  fillRect(ctx, 45, 47, 230, 1, '#120827');
  fillRect(ctx, 45, 48, 230, 1, '#9b78ff');
  fillRect(ctx, 45, 49, 230, 2, '#4a2f96');
  fillRect(ctx, 45, 51, 230, 1, '#120827');
  fillRect(ctx, 49, 52, 222, 2, '#0d0620');

  // ── 3. Moldura do monitor CRT (y = 54..193)
  fillRect(ctx, 49, 54, 222, 140, '#160c36');
  fillRect(ctx, 50, 54, 220, 1, '#2d1c66');
  fillRect(ctx, 50, 55, 1, 138, '#28185a');
  fillRect(ctx, 269, 55, 1, 138, '#28185a');
  fillRect(ctx, 50, 192, 220, 1, '#28185a');

  // moldura escalonada brilhante em volta da tela (tela = x:56..264, y:58..187)
  drawCrtRim(ctx, 56, 58, 264, 187, 3, '#120827');
  drawCrtRim(ctx, 56, 58, 264, 187, 2, '#5d3bc4');
  drawCrtRim(ctx, 56, 58, 264, 187, 1, '#8b64ff');
  drawCrtRim(ctx, 56, 58, 264, 187, 0, '#120827');

  // rebites nos cantos do bezel
  drawRivet(ctx, 51, 55);
  drawRivet(ctx, 266, 55);
  drawRivet(ctx, 51, 189);
  drawRivet(ctx, 266, 189);

  // ── 4. Mesa de controles (deck: y = 195..231)
  for (let y = 195; y < 228; y++) {
    const t = y - 195;
    const xL = Math.round(35 - t * 0.25);
    const xR = 320 - xL;
    const rowColor = y < 198 ? '#1c1042' : y < 201 ? '#21134b' : y > 222 ? '#2c1b60' : '#261752';
    fillRect(ctx, xL, y, xR - xL, 1, rowColor);
    fillRect(ctx, xL, y, 1, 1, '#7b54e8');
    fillRect(ctx, xR - 1, y, 1, 1, '#7b54e8');
  }
  // brilho suave no centro da mesa
  fillRect(ctx, 84, 204, 152, 16, '#2a1a5c');

  // filete neon traseiro + brilho suave na mesa
  fillRect(ctx, 35, 194, 250, 1, '#120827');
  fillRect(ctx, 35, 195, 250, 1, '#ff4fd8');
  fillRect(ctx, 58, 195, 204, 1, '#ffb3f0');
  fillRect(ctx, 35, 196, 250, 1, '#120827');
  fillRect(ctx, 40, 197, 240, 1, 'rgba(255, 79, 216, 0.22)');

  // parafusos da mesa
  drawRivet(ctx, 39, 199);
  drawRivet(ctx, 278, 199);
  drawRivet(ctx, 31, 221);
  drawRivet(ctx, 286, 221);

  // borda frontal (bullnose) com brilho e sombra
  fillRect(ctx, 27, 227, 266, 1, '#9b78ff');
  fillRect(ctx, 27, 228, 266, 2, '#4a2f96');
  fillRect(ctx, 27, 230, 266, 1, '#261752');
  fillRect(ctx, 27, 231, 266, 1, '#120827');

  // ── 5. Frente inferior do gabinete (apron: y = 232..249)
  fillRect(ctx, 29, 232, 262, 18, '#170d36');
  fillRect(ctx, 29, 232, 262, 2, '#0b051b');

  // painel rebaixado central
  fillRect(ctx, 34, 235, 252, 15, '#12092b');
  fillRect(ctx, 34, 235, 252, 1, '#2b1a5e');
  fillRect(ctx, 34, 235, 1, 15, '#2b1a5e');
  fillRect(ctx, 285, 235, 1, 15, '#2b1a5e');

  // grade central de alto-falante em pixel art
  fillRect(ctx, 122, 237, 76, 10, '#0b051b');
  fillRect(ctx, 122, 237, 76, 1, '#2b1a5e');
  fillRect(ctx, 122, 246, 76, 1, '#2b1a5e');
  fillRect(ctx, 125, 239, 70, 1, '#261752');
  fillRect(ctx, 125, 241, 70, 1, '#261752');
  fillRect(ctx, 125, 243, 70, 1, '#261752');

  // ficheiro iluminado (25¢) à direita
  fillRect(ctx, 260, 236, 21, 11, '#1c1042');
  fillRect(ctx, 260, 236, 21, 1, '#3d2582');
  fillRect(ctx, 263, 238, 3, 7, '#090416');
  fillRect(ctx, 268, 238, 10, 7, '#120827');
  fillRect(ctx, 269, 239, 8, 5, '#ff4fa8');
  fillRect(ctx, 270, 240, 4, 1, '#ffb3f0');
}
