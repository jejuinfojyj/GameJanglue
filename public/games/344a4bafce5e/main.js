import { mountGame } from './game-shell.js';
import { CONFIG, SKILLS } from './config.mjs';
import { createGame, updateGame, choiceLabel, skillStats } from './game.mjs';

const W = CONFIG.width;
const H = CONFIG.height;
const palette = CONFIG.palette;

function layoutChoices(state) {
  const ids = state.choices || [];
  const cardW = 128;
  const cardH = 148;
  const gap = 10;
  const total = ids.length * cardW + (ids.length - 1) * gap;
  let x = (W - total) / 2;
  const y = H * 0.34;
  state.choiceLayout = ids.map((id) => {
    const card = { id, x, y, w: cardW, h: cardH };
    x += cardW + gap;
    return card;
  });
}

function drawRounded(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function render(ctx, state, view) {
  const p = state.player;
  const camX = p.x - view.width / 2;
  const camY = p.y - view.height / 2;

  // 배경
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.save();
  ctx.translate(-camX, -camY);

  const tile = 64;
  const x0 = Math.floor(camX / tile) * tile;
  const y0 = Math.floor(camY / tile) * tile;
  for (let y = y0; y < camY + view.height + tile; y += tile) {
    for (let x = x0; x < camX + view.width + tile; x += tile) {
      const odd = ((x / tile) + (y / tile)) & 1;
      ctx.fillStyle = odd ? palette.groundA : palette.groundB;
      ctx.fillRect(x, y, tile, tile);
    }
  }

  // 월드 경계
  ctx.strokeStyle = '#ffd16655';
  ctx.lineWidth = 4;
  ctx.strokeRect(-state.half, -state.half, CONFIG.worldSize, CONFIG.worldSize);

  // 보석
  for (const g of state.gems) {
    ctx.fillStyle = '#7bed9f';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - 7);
    ctx.lineTo(g.x + 6, g.y);
    ctx.lineTo(g.x, g.y + 7);
    ctx.lineTo(g.x - 6, g.y);
    ctx.closePath();
    ctx.fill();
  }

  // 화염 존
  for (const z of state.zones) {
    const a = Math.max(0.15, Math.min(0.45, z.life / 2));
    ctx.fillStyle = `rgba(255,110,60,${a})`;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffb36b88';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd16688';
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2 + state.time * 0.8;
      const radius = z.r * (0.35 + (i % 2) * 0.25);
      ctx.beginPath();
      ctx.ellipse(z.x + Math.cos(angle) * radius, z.y + Math.sin(angle) * radius,
        3, 6 + Math.sin(state.time * 9 + i) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 적
  for (const e of state.enemies) {
    const colors = {
      basic: '#6c8cff',
      fast: '#ffd166',
      elite: '#ef476f',
      boss: '#c77dff',
    };
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : colors[e.kind] || '#6c8cff';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b121c88';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0b121c';
    ctx.beginPath();
    ctx.arc(e.x - e.r * 0.3, e.y - e.r * 0.12, Math.max(2, e.r * 0.13), 0, Math.PI * 2);
    ctx.arc(e.x + e.r * 0.3, e.y - e.r * 0.12, Math.max(2, e.r * 0.13), 0, Math.PI * 2);
    ctx.fill();
    if (e.kind === 'boss' || e.kind === 'elite') {
      ctx.fillStyle = '#00000055';
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2, 5);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(e.x - e.r, e.y - e.r - 10, e.r * 2 * (e.hp / e.maxHp), 5);
    }
  }

  // 번개 FX
  for (const f of state.fx) {
    if (f.kind === 'damage') {
      ctx.globalAlpha = Math.min(1, f.life * 5);
      ctx.fillStyle = '#fff3b0';
      ctx.font = '800 12px Malgun Gothic, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      continue;
    }
    if (f.kind === 'burst') {
      ctx.strokeStyle = `rgba(255,220,140,${f.life * 2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r + (0.3 - f.life) * 55, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (f.kind !== 'lightning') continue;
    ctx.strokeStyle = `rgba(255,230,100,${Math.min(1, f.life * 6)})`;
    ctx.lineWidth = 3;
    for (const b of f.bolts) {
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo((b.x1 + b.x2) / 2 + 7, (b.y1 + b.y2) / 2 - 7);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
  }

  // 투사체
  for (const b of state.projectiles) {
    ctx.strokeStyle = b.kind === 'ghost' ? '#d0bfff88' : '#9ad0ff66';
    ctx.lineWidth = b.r;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.035, b.y - b.vy * 0.035);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = b.kind === 'ghost' ? '#d0bfff' : b.kind === 'bolt' ? '#70e0ff' : '#9ad0ff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 회전톱
  if (state.saws > 0) {
    const radius = skillStats(state, 'saw').radius;
    for (let i = 0; i < state.saws; i++) {
      const ang = state.sawAngle + (i / state.saws) * Math.PI * 2;
      const sx = p.x + Math.cos(ang) * radius;
      const sy = p.y + Math.sin(ang) * radius;
      ctx.fillStyle = '#c7f0ff';
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy);
      ctx.lineTo(sx + 7, sy);
      ctx.moveTo(sx, sy - 7);
      ctx.lineTo(sx, sy + 7);
      ctx.stroke();
    }
  }

  // 드론
  if (state.drones > 0) {
    for (let i = 0; i < state.drones; i++) {
      const ang = state.time * 1.6 + (i / state.drones) * Math.PI * 2;
      const ox = p.x + Math.cos(ang) * 48;
      const oy = p.y + Math.sin(ang) * 48;
      ctx.fillStyle = '#70e0ff';
      ctx.fillRect(ox - 7, oy - 5, 14, 10);
      ctx.fillStyle = '#1a2430';
      ctx.fillRect(ox - 3, oy - 2, 6, 4);
    }
  }

  // 플레이어
  const blink = p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0;
  if (!blink) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.facing || 0);
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, 12);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a2430';
    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // HUD
  const remain = Math.max(0, CONFIG.duration - state.time);
  const mm = String(Math.floor(remain / 60)).padStart(1, '0');
  const ss = String(Math.floor(remain % 60)).padStart(2, '0');

  ctx.fillStyle = '#00000066';
  drawRounded(ctx, 12, 10, view.width - 24, 54, 12);
  ctx.fill();

  // HP
  ctx.fillStyle = '#ffffff22';
  drawRounded(ctx, 22, 18, 160, 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  drawRounded(ctx, 22, 18, 160 * (p.hp / p.maxHp), 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.text;
  ctx.font = '700 11px Malgun Gothic, sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.hp)}`, 26, 48);

  ctx.textAlign = 'center';
  ctx.font = '800 18px Malgun Gothic, sans-serif';
  ctx.fillStyle = palette.primary;
  ctx.fillText(`${mm}:${ss}`, view.width / 2, 34);
  ctx.font = '700 11px Malgun Gothic, sans-serif';
  ctx.fillStyle = palette.text;
  ctx.fillText(`Lv.${state.level}  처치 ${state.kills}`, view.width / 2, 50);
  ctx.textAlign = 'left';

  // XP bar
  ctx.fillStyle = '#ffffff22';
  drawRounded(ctx, view.width - 170, 18, 148, 12, 6);
  ctx.fill();
  ctx.fillStyle = palette.cool;
  drawRounded(ctx, view.width - 170, 18, 148 * (state.xp / state.xpToNext), 12, 6);
  ctx.fill();

  // 보유 스킬 아이콘
  const ids = Object.keys(state.skills).filter((id) => state.skills[id] > 0);
  let ix = 16;
  for (const id of ids) {
    const s = SKILLS[id];
    ctx.fillStyle = s.color;
    drawRounded(ctx, ix, 72, 36, 28, 8);
    ctx.fill();
    ctx.fillStyle = '#1a2430';
    ctx.font = '800 9px Malgun Gothic, sans-serif';
    const short = { kunai: '쿠', molotov: '화', drone: '드', lightning: '번', saw: '톱',
      drink: '속', vit: '체', power: '공', magnet: '자', cooldown: '쿨' };
    ctx.fillText(`${short[id]} ${state.evolved[id] ? '★' : state.skills[id] + '/5'}`, ix + 3, 88);
    for (let n = 0; n < s.max; n++) {
      ctx.fillStyle = n < state.skills[id] ? '#1a2430' : '#1a243044';
      ctx.fillRect(ix + 4 + n * 6, 93, 4, 3);
    }
    ix += 40;
  }

  // 가상 조이스틱
  const stickR = 52;
  const baseX = state.stick.active ? state.stick.ox : 78;
  const baseY = state.stick.active ? state.stick.oy : view.height - 88;
  ctx.fillStyle = '#ffffff22';
  ctx.beginPath();
  ctx.arc(baseX, baseY, stickR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff44';
  ctx.lineWidth = 2;
  ctx.stroke();
  const knobX = baseX + (state.stick.nx || 0) * 28;
  const knobY = baseY + (state.stick.ny || 0) * 28;
  ctx.fillStyle = '#ffd166cc';
  ctx.beginPath();
  ctx.arc(knobX, knobY, 22, 0, Math.PI * 2);
  ctx.fill();

  if (state.banner) {
    ctx.fillStyle = '#00000088';
    drawRounded(ctx, view.width / 2 - 110, 110, 220, 36, 12);
    ctx.fill();
    ctx.fillStyle = palette.primary;
    ctx.font = '800 15px Malgun Gothic, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.banner.text, view.width / 2, 133);
    ctx.textAlign = 'left';
  }

  // 레벨업 선택
  if (state.choices) {
    layoutChoices(state);
    ctx.fillStyle = '#0b121ccc';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.fillStyle = palette.primary;
    ctx.font = '800 22px Malgun Gothic, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('레벨 업! 스킬을 고르세요', view.width / 2, 120);
    ctx.font = '600 12px Malgun Gothic, sans-serif';
    ctx.fillStyle = palette.text;
    ctx.fillText('카드를 터치·클릭하거나 숫자 1·2·3', view.width / 2, 144);

    for (const card of state.choiceLayout) {
      const info = choiceLabel(card.id, state);
      ctx.fillStyle = '#243445';
      drawRounded(ctx, card.x, card.y, card.w, card.h, 14);
      ctx.fill();
      ctx.strokeStyle = info.color;
      ctx.lineWidth = 3;
      drawRounded(ctx, card.x, card.y, card.w, card.h, 14);
      ctx.stroke();

      ctx.fillStyle = info.color;
      drawRounded(ctx, card.x + 14, card.y + 14, card.w - 28, 36, 10);
      ctx.fill();

      ctx.fillStyle = '#1a2430';
      ctx.font = '800 10px Malgun Gothic, sans-serif';
      ctx.fillText(`${info.tag} · ${info.level}`, card.x + card.w / 2, card.y + 37);

      ctx.fillStyle = palette.text;
      ctx.font = '800 14px Malgun Gothic, sans-serif';
      ctx.fillText(info.name, card.x + card.w / 2, card.y + 72);

      ctx.font = '600 11px Malgun Gothic, sans-serif';
      ctx.fillStyle = '#ffffffcc';
      wrapText(ctx, info.desc, card.x + card.w / 2, card.y + 94, card.w - 16, 14);
    }
    ctx.textAlign = 'left';
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = [...text];
  let line = '';
  let yy = y;
  for (const ch of chars) {
    if (ch === '\n') {
      ctx.fillText(line, x, yy);
      line = '';
      yy += lineHeight;
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

mountGame({
  title: CONFIG.title,
  description:
    '좀비 웨이브 속에서 자동으로 쏘며 버텨 보세요.\n경험치 보석을 모아 레벨 업하면 스킬 3개 중 하나를 고르고, 조건이 맞으면 돌파 진화도 됩니다.',
  controls:
    '이동만 조작합니다. 휴대폰: 화면을 밀거나 왼쪽 조이스틱. PC: WASD·방향키.\n공격은 자동입니다. ESC로 쉬었다가 이어서 할 수 있어요.',
  width: W,
  height: H,
  theme: palette,
  create: createGame,
  update(state, dt, input) {
    // 선택 중에도 포인터 pressed를 받기 위해 update는 항상 호출
    updateGame(state, dt, input);
  },
  render,
});
