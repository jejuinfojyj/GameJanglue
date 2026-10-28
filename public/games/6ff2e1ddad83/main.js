import { mountGame } from './game-shell.js';
import { CONFIG, boardPixelSize, traySlotX } from './config.mjs';
import { createGame, updateGame, boardOrigin, pieceTrayScale } from './game.mjs';

function colorOf(index) {
  const colors = CONFIG.blockColors;
  return colors[(Math.max(1, index) - 1) % colors.length];
}

function drawRounded(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCell(ctx, x, y, size, colorIndex, alpha = 1) {
  const c = colorOf(colorIndex);
  ctx.save();
  ctx.globalAlpha = alpha;
  drawRounded(ctx, x, y, size, size, 8);
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, c.edge);
  g.addColorStop(0.45, c.fill);
  g.addColorStop(1, c.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#ffffff55';
  drawRounded(ctx, x + 4, y + 4, size * 0.42, size * 0.22, 5);
  ctx.fill();
  ctx.restore();
}

function drawPiece(ctx, piece, originX, originY, scale, alpha = 1) {
  const step = (CONFIG.cell + CONFIG.boardGap) * scale;
  const size = CONFIG.cell * scale;
  for (const [r, c] of piece.cells) {
    drawCell(ctx, originX + c * step, originY + r * step, size, piece.color, alpha);
  }
}

function drawBoard(ctx, state) {
  const origin = boardOrigin();
  const size = boardPixelSize();
  const step = CONFIG.cell + CONFIG.boardGap;

  drawRounded(ctx, origin.x - 10, origin.y - 10, size + 20, size + 20, 18);
  ctx.fillStyle = CONFIG.palette.surface;
  ctx.fill();

  drawRounded(ctx, origin.x - 4, origin.y - 4, size + 8, size + 8, 14);
  ctx.fillStyle = CONFIG.palette.board;
  ctx.fill();

  for (let r = 0; r < CONFIG.gridSize; r++) {
    for (let c = 0; c < CONFIG.gridSize; c++) {
      const x = origin.x + c * step;
      const y = origin.y + r * step;
      drawRounded(ctx, x, y, CONFIG.cell, CONFIG.cell, 8);
      ctx.fillStyle = '#ffffff10';
      ctx.fill();
      if (state.grid[r][c]) {
        drawCell(ctx, x, y, CONFIG.cell, state.grid[r][c]);
      }
    }
  }

  for (const burst of state.bursts) {
    const t = burst.life / 0.35;
    ctx.save();
    ctx.globalAlpha = Math.max(0, t);
    ctx.fillStyle = CONFIG.palette.primary;
    for (const r of burst.rows) {
      ctx.fillRect(origin.x, origin.y + r * step, size, CONFIG.cell);
    }
    for (const c of burst.cols) {
      ctx.fillRect(origin.x + c * step, origin.y, CONFIG.cell, size);
    }
    ctx.restore();
  }

  if (state.drag && state.drag.row >= 0) {
    const piece = state.tray[state.drag.index];
    if (piece) {
      const alpha = state.drag.valid ? 0.55 : 0.28;
      for (const [dr, dc] of piece.cells) {
        const r = state.drag.row + dr;
        const c = state.drag.col + dc;
        if (r < 0 || c < 0 || r >= CONFIG.gridSize || c >= CONFIG.gridSize) continue;
        const x = origin.x + c * step;
        const y = origin.y + r * step;
        drawRounded(ctx, x, y, CONFIG.cell, CONFIG.cell, 8);
        ctx.fillStyle = state.drag.valid ? CONFIG.palette.ghostOk : CONFIG.palette.ghostBad;
        ctx.fill();
        if (state.drag.valid) drawCell(ctx, x, y, CONFIG.cell, piece.color, alpha);
      }
    }
  } else if (state.selected != null && state.tray[state.selected] && state.cursor) {
    const piece = state.tray[state.selected];
    const ok = (() => {
      for (const [dr, dc] of piece.cells) {
        const r = state.cursor.row + dr;
        const c = state.cursor.col + dc;
        if (r < 0 || c < 0 || r >= CONFIG.gridSize || c >= CONFIG.gridSize) return false;
        if (state.grid[r][c]) return false;
      }
      return true;
    })();
    for (const [dr, dc] of piece.cells) {
      const r = state.cursor.row + dr;
      const c = state.cursor.col + dc;
      if (r < 0 || c < 0 || r >= CONFIG.gridSize || c >= CONFIG.gridSize) continue;
      const x = origin.x + c * step;
      const y = origin.y + r * step;
      drawRounded(ctx, x, y, CONFIG.cell, CONFIG.cell, 8);
      ctx.fillStyle = ok ? CONFIG.palette.ghostOk : CONFIG.palette.ghostBad;
      ctx.fill();
    }
  }
}

function drawHud(ctx, state, view) {
  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '800 28px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(state.score), 24, 42);

  ctx.font = '700 13px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = CONFIG.palette.muted;
  ctx.fillText('점수', 24, 58);

  ctx.textAlign = 'right';
  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '800 20px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText(`최고 ${state.best}`, view.width - 24, 38);

  if (state.combo > 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.palette.primary;
    ctx.font = '800 18px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(`COMBO x${state.combo}`, view.width / 2, 42);
  }
}

function drawTray(ctx, state) {
  for (let i = 0; i < 3; i++) {
    const x = traySlotX(i);
    const y = CONFIG.trayY;
    drawRounded(ctx, x + 4, y, CONFIG.traySlotW - 8, CONFIG.traySlotH, 16);
    ctx.fillStyle = state.selected === i ? '#ffffff22' : '#ffffff12';
    ctx.fill();

    const piece = state.tray[i];
    if (!piece) continue;
    if (state.drag && state.drag.index === i) continue;

    const scale = pieceTrayScale(piece);
    const step = (CONFIG.cell + CONFIG.boardGap) * scale;
    const w = piece.cols * step - CONFIG.boardGap * scale;
    const h = piece.rows * step - CONFIG.boardGap * scale;
    const ox = x + (CONFIG.traySlotW - w) / 2;
    const oy = y + (CONFIG.traySlotH - h) / 2;
    drawPiece(ctx, piece, ox, oy, scale, 1);

    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '700 11px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + CONFIG.traySlotW / 2, y + CONFIG.traySlotH - 8);
  }

  if (state.drag) {
    const piece = state.tray[state.drag.index];
    if (piece) {
      const scale = 0.92;
      const step = (CONFIG.cell + CONFIG.boardGap) * scale;
      const w = piece.cols * step - CONFIG.boardGap * scale;
      const h = piece.rows * step - CONFIG.boardGap * scale;
      drawPiece(ctx, piece, state.drag.x - w / 2, state.drag.y - h / 2, scale, 0.95);
    }
  }
}

function drawFloats(ctx, state) {
  for (const f of state.floats) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, f.life / 0.9);
    ctx.fillStyle = f.color;
    ctx.font = '800 20px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

function render(ctx, state, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, '#11566a');
  g.addColorStop(0.55, CONFIG.palette.background);
  g.addColorStop(1, '#08242e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);

  // soft orbs for atmosphere
  ctx.fillStyle = '#20c99722';
  ctx.beginPath();
  ctx.arc(60, 120, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff9f4320';
  ctx.beginPath();
  ctx.arc(420, 560, 110, 0, Math.PI * 2);
  ctx.fill();

  drawHud(ctx, state, view);
  drawBoard(ctx, state);
  drawTray(ctx, state);
  drawFloats(ctx, state);

  ctx.fillStyle = CONFIG.palette.muted;
  ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('조각을 끌어 판에 놓아요 · 가로·세로 줄을 가득 채우면 터져요', view.width / 2, 500);
}

mountGame({
  title: CONFIG.title,
  description: '아래 조각 3개를 판에 놓아 가로·세로 줄을 완성하세요. 회전은 없고, 여러 줄을 한 번에 또는 연속으로 지우면 콤보 점수가 커집니다.',
  controls: '휴대폰: 아래 조각을 드래그해 판에 놓기\nPC: 드래그 또는 1·2·3으로 선택 후 클릭/방향키+Enter',
  width: 480,
  height: 680,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});
