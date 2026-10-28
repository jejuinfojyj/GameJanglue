import { mountGame } from './game-shell.js';
import { CONFIG, DECORATIONS } from './config.mjs';
import {
  createGame,
  updateGame,
  boardOrigin,
  boardPixelSize,
  uiRects,
  decorationHitAreas,
  tileVisuals,
} from './game.mjs';

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

function gemStyle(colorIndex) {
  return CONFIG.gemColors[colorIndex % CONFIG.gemColors.length];
}

function drawGem(ctx, x, y, size, tile, selected = false) {
  const style = gemStyle(tile.color);
  ctx.save();
  drawRounded(ctx, x, y, size, size, 12);
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, style.edge);
  g.addColorStop(0.45, style.fill);
  g.addColorStop(1, style.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#ffffff55';
  drawRounded(ctx, x + 5, y + 5, size * 0.4, size * 0.2, 6);
  ctx.fill();

  if (tile.special) drawSpecialBadge(ctx, x, y, size, tile.special);

  if (selected) {
    ctx.strokeStyle = CONFIG.palette.primary;
    ctx.lineWidth = 3;
    drawRounded(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 11);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpecialBadge(ctx, x, y, size, special) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#fff8e8';
  ctx.strokeStyle = '#1a2030';
  ctx.lineWidth = 1.5;

  if (special === 'rocket-h' || special === 'rocket-v') {
    ctx.rotate(special === 'rocket-v' ? -Math.PI / 2 : 0);
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(8, -7);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff8c42';
    ctx.fillRect(8, -4, 6, 8);
  } else if (special === 'bomb') {
    ctx.beginPath();
    ctx.arc(0, 2, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#2f3640';
    ctx.fill();
    ctx.strokeStyle = '#f5f6fa';
    ctx.stroke();
    ctx.strokeStyle = '#f0c14b';
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.quadraticCurveTo(10, -14, 8, -18);
    ctx.stroke();
  } else if (special === 'propeller') {
    ctx.fillStyle = '#dff9fb';
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      drawRounded(ctx, -4, -16, 8, 18, 4);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c14b';
    ctx.fill();
  } else if (special === 'disco') {
    const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
    rg.addColorStop(0, '#fff');
    rg.addColorStop(0.4, '#7bed9f');
    rg.addColorStop(0.7, '#70a1ff');
    rg.addColorStop(1, '#ff6b81');
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.strokeStyle = '#ffffffaa';
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, state, view) {
  const { width } = view;
  drawRounded(ctx, 20, 16, width - 40, 86, 18);
  ctx.fillStyle = '#ffffff14';
  ctx.fill();

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 22px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`레벨 ${state.level.id}`, 36, 48);

  ctx.font = '600 16px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = CONFIG.palette.muted;
  ctx.fillText(`이동 ${state.moves}`, 36, 78);

  ctx.textAlign = 'right';
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '700 20px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(`★ ${state.stars}`, width - 36, 48);

  ctx.font = '600 14px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = CONFIG.palette.text;
  const goalText = state.goals.map((g) => {
    if (g.type === 'collect') {
      const name = CONFIG.gemColors[g.color].label;
      return `${name} ${g.have}/${g.need}`;
    }
    const labels = { rocket: '로켓', bomb: '폭탄', propeller: '프로펠러', disco: '디스코' };
    return `${labels[g.special] || g.special} ${g.have}/${g.need}`;
  }).join(' · ');
  ctx.fillText(goalText, width - 36, 78);
}

function drawBoard(ctx, state) {
  const origin = boardOrigin();
  const size = boardPixelSize();
  const step = CONFIG.cell + CONFIG.boardGap;

  drawRounded(ctx, origin.x - 12, origin.y - 12, size + 24, size + 24, 22);
  ctx.fillStyle = CONFIG.palette.surface;
  ctx.fill();
  drawRounded(ctx, origin.x - 4, origin.y - 4, size + 8, size + 8, 16);
  ctx.fillStyle = CONFIG.palette.board;
  ctx.fill();

  for (let r = 0; r < CONFIG.gridSize; r++) {
    for (let c = 0; c < CONFIG.gridSize; c++) {
      const x = origin.x + c * step;
      const y = origin.y + r * step;
      drawRounded(ctx, x, y, CONFIG.cell, CONFIG.cell, 12);
      ctx.fillStyle = '#ffffff10';
      ctx.fill();
    }
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(origin.x - 2, origin.y - 2, size + 4, size + 4);
  ctx.clip();
  for (const visual of tileVisuals(state)) {
    const x = origin.x + visual.c * step;
    const y = origin.y + visual.r * step;
    ctx.save();
    ctx.globalAlpha = visual.alpha ?? 1;
    const scale = visual.scale ?? 1;
    ctx.translate(x + CONFIG.cell / 2, y + CONFIG.cell / 2);
    ctx.scale(scale, scale);
    if (visual.moving) {
      ctx.shadowColor = '#00000080';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    }
    drawGem(ctx, -CONFIG.cell / 2, -CONFIG.cell / 2, CONFIG.cell, visual.tile, visual.selected);
    ctx.restore();
  }
  ctx.restore();
}

function drawFx(ctx, state) {
  const origin = boardOrigin();
  const step = CONFIG.cell + CONFIG.boardGap;
  for (const fx of state.fx) {
    const t = Math.max(0, fx.life);
    ctx.save();
    if (fx.kind === 'pop' || fx.kind === 'blast') {
      const x = origin.x + fx.c * step + CONFIG.cell / 2;
      const y = origin.y + fx.r * step + CONFIG.cell / 2;
      ctx.globalAlpha = Math.min(1, t * 3);
      ctx.fillStyle = CONFIG.palette.primary;
      ctx.beginPath();
      ctx.arc(x, y, 10 + (0.4 - Math.min(0.4, t)) * 40, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.kind === 'fly') {
      const p = 1 - Math.min(1, t / 0.45);
      const x1 = origin.x + fx.fromC * step + CONFIG.cell / 2;
      const y1 = origin.y + fx.fromR * step + CONFIG.cell / 2;
      const x2 = origin.x + fx.toC * step + CONFIG.cell / 2;
      const y2 = origin.y + fx.toR * step + CONFIG.cell / 2;
      ctx.strokeStyle = '#dff9fb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p);
      ctx.stroke();
    } else if (fx.kind === 'shake') {
      /* visual handled lightly via outline flash */
      const x = origin.x + fx.c * step;
      const y = origin.y + fx.r * step;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = CONFIG.palette.danger;
      ctx.lineWidth = 2;
      drawRounded(ctx, x, y, CONFIG.cell, CONFIG.cell, 12);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawButton(ctx, rect, label, active = true) {
  drawRounded(ctx, rect.x, rect.y, rect.w, rect.h, 14);
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  if (active) {
    g.addColorStop(0, '#ffe8a3');
    g.addColorStop(1, CONFIG.palette.primary);
  } else {
    g.addColorStop(0, '#3a5570');
    g.addColorStop(1, '#2a4058');
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = active ? '#1a2a38' : CONFIG.palette.muted;
  ctx.font = '700 18px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawPuzzleChrome(ctx, state, view) {
  drawHud(ctx, state, view);
  drawBoard(ctx, state);
  drawFx(ctx, state);

  ctx.fillStyle = CONFIG.palette.muted;
  ctx.font = '500 13px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'center';
  const phaseText = { clear: '맞춘 보석을 지우는 중', fall: '보석이 내려오는 중', refill: '새 보석을 채우는 중', shuffle: '가능한 이동을 찾고 있어요' };
  ctx.fillText(state.busy ? (phaseText[state.resolution?.phase] || '보석을 바꾸는 중') : '보석을 끌거나 이웃을 누르세요 · 특수 보석은 다시 눌러 발동', view.width / 2, 620);

  const rects = uiRects();
  drawButton(ctx, rects.kingdom, '왕국 꾸미기', !state.busy);
}

function drawCastle(ctx, state, view) {
  const cx = view.width / 2;
  const baseY = 168;
  ctx.save();
  // sky ribbon
  drawRounded(ctx, 24, 16, view.width - 48, 170, 20);
  const sky = ctx.createLinearGradient(0, 16, 0, 186);
  sky.addColorStop(0, '#5b8db8');
  sky.addColorStop(1, '#23486d');
  ctx.fillStyle = sky;
  ctx.fill();

  // hill
  ctx.fillStyle = '#3f7d5a';
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 48, 180, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  const owned = new Set(state.owned);

  // castle body
  ctx.fillStyle = '#d9e2ec';
  ctx.fillRect(cx - 70, baseY - 50, 140, 90);
  ctx.fillStyle = '#bcc8d4';
  ctx.fillRect(cx - 100, baseY - 20, 40, 60);
  ctx.fillRect(cx + 60, baseY - 20, 40, 60);
  ctx.fillStyle = '#f0c14b';
  // roofs
  ctx.beginPath();
  ctx.moveTo(cx - 80, baseY - 50);
  ctx.lineTo(cx, baseY - 100);
  ctx.lineTo(cx + 80, baseY - 50);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 105, baseY - 20);
  ctx.lineTo(cx - 80, baseY - 55);
  ctx.lineTo(cx - 55, baseY - 20);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + 55, baseY - 20);
  ctx.lineTo(cx + 80, baseY - 55);
  ctx.lineTo(cx + 105, baseY - 20);
  ctx.closePath();
  ctx.fill();

  if (owned.has('banner')) {
    ctx.fillStyle = '#ff6b81';
    ctx.fillRect(cx + 86, baseY - 88, 4, 40);
    ctx.beginPath();
    ctx.moveTo(cx + 90, baseY - 88);
    ctx.lineTo(cx + 118, baseY - 78);
    ctx.lineTo(cx + 90, baseY - 68);
    ctx.closePath();
    ctx.fill();
  }
  if (owned.has('garden')) {
    ctx.fillStyle = '#7ed6a5';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(cx - 120 + i * 28, baseY + 40, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (owned.has('fountain')) {
    ctx.fillStyle = '#74c0fc';
    ctx.beginPath();
    ctx.arc(cx - 130, baseY + 10, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(cx - 134, baseY - 8, 8, 18);
  }
  if (owned.has('gate')) {
    ctx.fillStyle = '#f0c14b';
    drawRounded(ctx, cx - 22, baseY + 10, 44, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#1a2a38';
    ctx.beginPath();
    ctx.arc(cx, baseY + 40, 18, Math.PI, 0);
    ctx.fill();
  }
  if (owned.has('tower')) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx + 110, baseY - 70, 28, 100);
    ctx.fillStyle = '#e03131';
    ctx.beginPath();
    ctx.moveTo(cx + 105, baseY - 70);
    ctx.lineTo(cx + 124, baseY - 100);
    ctx.lineTo(cx + 143, baseY - 70);
    ctx.closePath();
    ctx.fill();
  }
  if (owned.has('throne')) {
    ctx.fillStyle = '#f0c14b';
    ctx.fillRect(cx - 16, baseY - 30, 32, 24);
    ctx.fillStyle = '#ff6b81';
    ctx.fillRect(cx - 10, baseY - 24, 20, 12);
  }

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 20px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('나의 왕국', cx, 44);
  ctx.font = '600 14px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.fillText(`보유 별 ★ ${state.stars}`, cx, 68);
  ctx.restore();
}

function drawKingdom(ctx, state, view) {
  drawCastle(ctx, state, view);

  const areas = decorationHitAreas();
  DECORATIONS.forEach((dec, i) => {
    const area = areas[i];
    const owned = state.owned.includes(dec.id);
    const canBuy = !owned && state.stars >= dec.cost;
    drawRounded(ctx, area.x, area.y, area.w, area.h, 14);
    ctx.fillStyle = owned ? '#7ed6a533' : canBuy ? '#ffffff18' : '#ffffff0c';
    ctx.fill();
    ctx.strokeStyle = owned ? CONFIG.palette.accent : canBuy ? CONFIG.palette.primary : '#ffffff22';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '700 16px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    ctx.fillText(dec.name, area.x + 16, area.y + 34);
    ctx.textAlign = 'right';
    ctx.fillStyle = owned ? CONFIG.palette.accent : CONFIG.palette.primary;
    ctx.font = '600 15px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
    ctx.fillText(owned ? '배치 완료' : `★ ${dec.cost}`, area.x + area.w - 16, area.y + 34);
  });

  const rects = uiRects();
  drawButton(ctx, rects.puzzle, '퍼즐로 돌아가기');
}

mountGame({
  title: CONFIG.title,
  description: '같은 보석 3개 이상을 맞춰 레벨을 깨고, 별으로 왕국과 성을 꾸며 보세요. 로켓·폭탄·프로펠러·디스코 볼을 조합하면 한 번에 많이 지울 수 있어요.',
  controls: '보석을 이웃으로 끌어 바꾸기 · 특수 보석을 다시 눌러 발동 · 왕국 꾸미기 버튼 · PC는 클릭·드래그 또는 방향키',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render(ctx, state, view) {
    ctx.fillStyle = CONFIG.palette.background;
    ctx.fillRect(0, 0, view.width, view.height);
    const glow = ctx.createRadialGradient(view.width * 0.2, 40, 10, view.width * 0.2, 80, 220);
    glow.addColorStop(0, '#2f6ea055');
    glow.addColorStop(1, '#00000000');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, view.width, view.height);

    if (state.view === 'kingdom') drawKingdom(ctx, state, view);
    else drawPuzzleChrome(ctx, state, view);
  },
});
