import { mountGame } from './game-shell.js';
import {
  CONFIG,
  CHAINS,
  DECORATIONS,
  STORY,
  boardPixelSize,
  cellRect,
} from './config.mjs';
import {
  createGame,
  updateGame,
  orderRects,
  generatorRects,
  tabRects,
  eventRect,
  decorationHitAreas,
  stylePickAreas,
  storyIndex,
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

function drawPanel(ctx, x, y, w, h, fill) {
  drawRounded(ctx, x, y, w, h, 16);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawItemTile(ctx, item, x, y, size, selected = false, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  drawRounded(ctx, x, y, size, size, 12);
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, lighten(item.color, 0.25));
  g.addColorStop(0.5, item.color);
  g.addColorStop(1, darken(item.color, 0.25));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = '#ffffff44';
  drawRounded(ctx, x + 5, y + 5, size * 0.42, size * 0.2, 6);
  ctx.fill();

  ctx.fillStyle = '#1a2030';
  ctx.font = `700 ${Math.floor(size * 0.34)}px "Segoe UI Emoji","Apple Color Emoji","Malgun Gothic",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.mark, x + size / 2, y + size * 0.42);

  ctx.fillStyle = '#fff8ef';
  ctx.font = `700 ${Math.max(10, Math.floor(size * 0.2))}px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`;
  ctx.fillText(item.name, x + size / 2, y + size * 0.78);

  ctx.fillStyle = '#1a2030aa';
  ctx.beginPath();
  ctx.arc(x + size - 12, y + 12, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6e8';
  ctx.font = '700 11px "Malgun Gothic",sans-serif';
  ctx.fillText(String(item.level), x + size - 12, y + 13);

  if (selected) {
    ctx.strokeStyle = CONFIG.palette.primary;
    ctx.lineWidth = 3;
    drawRounded(ctx, x + 1.5, y + 1.5, size - 3, size - 3, 11);
    ctx.stroke();
  }
  ctx.restore();
}

function lighten(hex, amount) {
  return mix(hex, '#ffffff', amount);
}

function darken(hex, amount) {
  return mix(hex, '#000000', amount);
}

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

function drawHud(ctx, state, view) {
  drawPanel(ctx, 16, 12, view.width - 32, 68, '#ffffff14');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 15px "Malgun Gothic","Apple SD Gothic Neo",sans-serif';
  ctx.fillText(`⚡ ${state.energy}/${CONFIG.maxEnergy}`, 28, 34);
  if (state.energy < CONFIG.maxEnergy && state.regenAt > 0) {
    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '600 11px "Malgun Gothic",sans-serif';
    ctx.fillText(`${Math.ceil(state.regenAt)}초 후 +1`, 28, 54);
  }

  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '700 15px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`🪙 ${state.coins}`, view.width / 2 - 50, 34);
  ctx.fillText(`★ ${state.stars}`, view.width / 2 + 50, 34);

  const story = STORY[storyIndex(state.stars)];
  ctx.fillStyle = CONFIG.palette.muted;
  ctx.font = '600 12px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(story.title, view.width - 28, 34);
  ctx.fillText(`정리 ${state.owned.length}/${DECORATIONS.length}`, view.width - 28, 54);

  if (state.eventReady) {
    const er = eventRect();
    drawRounded(ctx, er.x, er.y, er.w, er.h, 12);
    ctx.fillStyle = CONFIG.palette.accent;
    ctx.fill();
    ctx.fillStyle = '#143028';
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('항구 이벤트 받기', er.x + er.w / 2, er.y + er.h / 2);
  }
}

function drawOrders(ctx, state) {
  const areas = orderRects();
  areas.forEach((area) => {
    const order = state.orders[area.index];
    drawPanel(ctx, area.x, area.y, area.w, area.h, CONFIG.palette.surface);
    if (!order) return;
    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '600 12px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('손님 주문', area.x + 14, area.y + 12);

    drawRounded(ctx, area.x + 12, area.y + 30, 42, 42, 10);
    ctx.fillStyle = order.color;
    ctx.fill();
    ctx.fillStyle = '#1a2030';
    ctx.font = '700 20px "Segoe UI Emoji","Apple Color Emoji",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(order.mark, area.x + 33, area.y + 51);

    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '700 15px "Malgun Gothic",sans-serif';
    ctx.fillText(order.name, area.x + 66, area.y + 38);
    ctx.fillStyle = CONFIG.palette.primary;
    ctx.font = '600 12px "Malgun Gothic",sans-serif';
    ctx.fillText(`🪙${order.coins}  ★${order.stars}`, area.x + 66, area.y + 60);
  });
}

function drawBoard(ctx, state) {
  const origin = { x: CONFIG.boardX, y: CONFIG.boardY };
  const size = boardPixelSize();
  drawPanel(ctx, origin.x - 10, origin.y - 10, size.w + 20, size.h + 20, CONFIG.palette.surface);
  drawRounded(ctx, origin.x - 4, origin.y - 4, size.w + 8, size.h + 8, 14);
  ctx.fillStyle = CONFIG.palette.board;
  ctx.fill();

  const dragFrom = state.drag?.from;
  for (let r = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.cols; c++) {
      const rect = cellRect(r, c);
      drawRounded(ctx, rect.x, rect.y, rect.w, rect.h, 10);
      ctx.fillStyle = '#ffffff10';
      ctx.fill();
      const item = state.grid[r][c];
      if (!item) continue;
      if (dragFrom && dragFrom.r === r && dragFrom.c === c) {
        drawItemTile(ctx, item, rect.x, rect.y, rect.w, false, 0.28);
        continue;
      }
      const selected =
        state.selected && state.selected.r === r && state.selected.c === c && !state.drag;
      drawItemTile(ctx, item, rect.x, rect.y, rect.w, selected);
    }
  }

  if (state.drag?.item) {
    drawItemTile(
      ctx,
      state.drag.item,
      state.drag.x - CONFIG.cell / 2,
      state.drag.y - CONFIG.cell / 2,
      CONFIG.cell,
      true,
      0.92,
    );
  }
}

function drawGenerators(ctx) {
  for (const gen of generatorRects()) {
    const chain = CHAINS[gen.chain];
    drawRounded(ctx, gen.x, gen.y, gen.w, gen.h, 14);
    ctx.fillStyle = darken(chain.color, 0.15);
    ctx.fill();
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chain.generatorName, gen.x + gen.w / 2, gen.y + 24);
    ctx.fillStyle = CONFIG.palette.primary;
    ctx.font = '600 12px "Malgun Gothic",sans-serif';
    ctx.fillText(`생성 ⚡${CONFIG.spawnCost}`, gen.x + gen.w / 2, gen.y + 48);
  }
}

function drawTabs(ctx, state) {
  const tabs = tabRects();
  for (const [key, rect] of Object.entries(tabs)) {
    const active =
      (key === 'kitchen' && state.view === 'kitchen') ||
      (key === 'restaurant' && state.view === 'restaurant');
    drawRounded(ctx, rect.x, rect.y, rect.w, rect.h, 14);
    ctx.fillStyle = active ? CONFIG.palette.primary : '#ffffff18';
    ctx.fill();
    ctx.fillStyle = active ? '#2a1a08' : CONFIG.palette.text;
    ctx.font = '700 15px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(key === 'kitchen' ? '주방' : '식당 꾸미기', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
}

function drawToast(ctx, state, view) {
  if (!state.toast) return;
  const alpha = Math.min(1, state.toastLife / 0.35);
  ctx.save();
  ctx.globalAlpha = alpha;
  const w = 400;
  const x = (view.width - w) / 2;
  const y = 612;
  drawRounded(ctx, x, y, w, 40, 12);
  ctx.fillStyle = state.toast.kind === 'warn' ? '#5a2a2aee' : '#1d4a3aee';
  ctx.fill();
  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '600 12px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.toast.text, view.width / 2, y + 20);
  ctx.restore();
}

function drawFx(ctx, state) {
  for (const f of state.fx) {
    const t = f.life / f.max;
    ctx.save();
    ctx.globalAlpha = t;
    ctx.fillStyle = f.color || CONFIG.palette.primary;
    const r = 10 + (1 - t) * 28;
    ctx.beginPath();
    ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRestaurantPreview(ctx, state, view) {
  drawPanel(ctx, 28, 88, view.width - 56, 190, '#ffffff12');

  const cx = view.width / 2;
  const floorY = 250;

  // walls
  ctx.fillStyle = state.owned.includes('floor') ? '#3d6a7a' : '#2a3d48';
  ctx.fillRect(60, 110, 360, 140);

  // debris if not cleaned
  if (!state.owned.includes('debris')) {
    ctx.fillStyle = '#6b4a3a';
    ctx.fillRect(90, 200, 40, 22);
    ctx.fillRect(300, 180, 50, 18);
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(200, 210, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  // floor shine
  if (state.owned.includes('floor')) {
    ctx.fillStyle = '#5a8fa044';
    ctx.fillRect(70, 220, 340, 20);
  }

  // tables by style
  if (state.owned.includes('tables')) {
    const style = state.styles.tables || 'traditional';
    const colors = {
      traditional: '#c9a06a',
      modern: '#8b7355',
      harbor: '#6ec8c8',
    };
    ctx.fillStyle = colors[style] || colors.traditional;
    ctx.fillRect(120, 190, 70, 36);
    ctx.fillRect(290, 190, 70, 36);
    ctx.fillStyle = '#fff6e8aa';
    ctx.fillRect(130, 198, 20, 8);
    ctx.fillRect(300, 198, 20, 8);
  }

  // lights
  if (state.owned.includes('lights')) {
    const style = state.styles.lights || 'lantern';
    const color = style === 'neon' ? '#66d9e8' : style === 'warm' ? '#ffd43b' : '#ffa94d';
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(110 + i * 80, 130, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // sign
  if (state.owned.includes('sign')) {
    const style = state.styles.sign || 'wood';
    ctx.fillStyle = style === 'glow' ? '#f0b45a' : style === 'cloth' ? '#ff8787' : '#b08968';
    drawRounded(ctx, cx - 70, 118, 140, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#1a2030';
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('가십하버', cx, 132);
  }

  // plants
  if (state.owned.includes('plants')) {
    const style = state.styles.plants || 'bamboo';
    const color = style === 'flower' ? '#f783ac' : style === 'sea' ? '#74c0fc' : '#69db7c';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(85, floorY - 10, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(395, floorY - 10, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 18px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('나의 항구 식당', cx, 100);
  ctx.font = '600 12px "Malgun Gothic",sans-serif';
  ctx.fillStyle = CONFIG.palette.muted;
  ctx.fillText(STORY[storyIndex(state.stars)].text, cx, 268);
}

function drawDecorList(ctx, state) {
  if (state.stylePick) {
    drawPanel(ctx, 40, 200, 400, 340, CONFIG.palette.surface);
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '700 18px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('원하는 스타일을 고르세요', 240, 230);
    for (const area of stylePickAreas(state.stylePick.styles)) {
      drawRounded(ctx, area.x, area.y, area.w, area.h, 14);
      ctx.fillStyle = '#ffffff18';
      ctx.fill();
      ctx.strokeStyle = CONFIG.palette.primary;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = CONFIG.palette.text;
      ctx.font = '700 16px "Malgun Gothic",sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(area.name, area.x + area.w / 2, area.y + area.h / 2);
    }
    drawRounded(ctx, 160, 480, 160, 44, 12);
    ctx.fillStyle = '#ffffff22';
    ctx.fill();
    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '600 14px "Malgun Gothic",sans-serif';
    ctx.fillText('취소', 240, 502);
    return;
  }

  for (const area of decorationHitAreas()) {
    const dec = DECORATIONS.find((d) => d.id === area.id);
    const owned = state.owned.includes(area.id);
    const canBuy = !owned && state.stars >= dec.cost;
    drawRounded(ctx, area.x, area.y, area.w, area.h, 12);
    ctx.fillStyle = owned ? '#6ec8a033' : canBuy ? '#ffffff18' : '#ffffff0c';
    ctx.fill();
    ctx.strokeStyle = owned ? CONFIG.palette.accent : canBuy ? CONFIG.palette.primary : '#ffffff22';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '700 15px "Malgun Gothic",sans-serif';
    ctx.fillText(dec.name, area.x + 14, area.y + 18);
    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '600 11px "Malgun Gothic",sans-serif';
    const styleName = owned && state.styles[dec.id]
      ? dec.styles?.find((s) => s.id === state.styles[dec.id])?.name
      : null;
    ctx.fillText(styleName || dec.blurb || (dec.styles ? '스타일 선택' : ''), area.x + 14, area.y + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = owned ? CONFIG.palette.accent : CONFIG.palette.primary;
    ctx.font = '700 14px "Malgun Gothic",sans-serif';
    ctx.fillText(owned ? '완료' : `★ ${dec.cost}`, area.x + area.w - 14, area.y + 26);
  }
}

function drawKitchen(ctx, state, view) {
  drawHud(ctx, state, view);
  drawOrders(ctx, state);
  drawBoard(ctx, state);
  drawGenerators(ctx);
  drawTabs(ctx, state);
  drawFx(ctx, state);
  drawToast(ctx, state, view);
}

function drawRestaurant(ctx, state, view) {
  drawHud(ctx, state, view);
  drawRestaurantPreview(ctx, state, view);
  drawDecorList(ctx, state);
  drawTabs(ctx, state);
  drawToast(ctx, state, view);
}

mountGame({
  title: CONFIG.title,
  description:
    '같은 재료를 합쳐 손님 주문을 완성하고, 코인과 별로 항구 식당을 꾸미세요. 에너지는 최대 30, 10초마다 1씩 회복돼요. 게임을 닫아 둔 시간도 다음 접속 때 회복에 반영됩니다.',
  controls:
    '같은 재료를 끌어 합치고, 주문 음식은 손님에게 끌어 주세요.\nPC: 1/2/3 생성 · 방향키 합치기 · Enter 선택 음식 전달 · J 식당 · K 주방',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render(ctx, state, view) {
    const bg = ctx.createLinearGradient(0, 0, 0, view.height);
    bg.addColorStop(0, '#24586a');
    bg.addColorStop(0.45, CONFIG.palette.background);
    bg.addColorStop(1, '#0f2430');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, view.width, view.height);

    // soft harbor glow
    const glow = ctx.createRadialGradient(80, 40, 10, 80, 80, 200);
    glow.addColorStop(0, '#6ec8a033');
    glow.addColorStop(1, '#00000000');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, view.width, view.height);

    if (state.view === 'restaurant') drawRestaurant(ctx, state, view);
    else drawKitchen(ctx, state, view);
  },
});
