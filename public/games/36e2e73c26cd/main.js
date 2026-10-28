import { mountGame } from './game-shell.js';
import { CONFIG, BRAWLERS, MODES } from './config.mjs';
import { createGame, updateGame, teamGemCount, UI } from './game.mjs';
import { worldToScreen } from './camera2d.mjs';

const PAD = UI;

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawStick(ctx, stick, vec, label, accent) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#06140c';
  ctx.beginPath();
  ctx.arc(stick.x, stick.y, PAD.STICK_R + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  const kx = stick.x + (vec?.x || 0) * (PAD.STICK_R - 10);
  const ky = stick.y + (vec?.y || 0) * (PAD.STICK_R - 10);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(kx, ky, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 12px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, stick.x, stick.y + PAD.STICK_R + 20);
  ctx.restore();
}

function renderSplash(ctx, view) {
  const g = ctx.createLinearGradient(0, 0, view.width, view.height);
  g.addColorStop(0, '#1a4d2e');
  g.addColorStop(1, '#0a1c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
  // 평면 전장 패턴
  ctx.strokeStyle = '#2f6b4888';
  for (let i = 0; i < 12; i++) {
    const y = 180 + i * 22;
    ctx.beginPath();
    ctx.moveTo(80 + i * 8, y);
    ctx.lineTo(view.width - 80 - i * 8, y);
    ctx.stroke();
  }
  ctx.fillStyle = CONFIG.palette.gem;
  ctx.beginPath();
  ctx.moveTo(view.width / 2, 200);
  ctx.lineTo(view.width / 2 + 36, 240);
  ctx.lineTo(view.width / 2, 280);
  ctx.lineTo(view.width / 2 - 36, 240);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '800 48px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('젬 브롤', view.width / 2, 120);
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '600 18px "Malgun Gothic", sans-serif';
  ctx.fillText('2D 젬 그래버 · 듀얼 스틱 · 3v3', view.width / 2, 160);
}

function renderMode(ctx, state, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, '#163528');
  g.addColorStop(1, '#0a1c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '800 36px "Malgun Gothic", sans-serif';
  ctx.fillText('젬 브롤', view.width / 2, 56);
  ctx.fillStyle = '#fff';
  ctx.font = '600 15px "Malgun Gothic", sans-serif';
  ctx.fillText('젬 그래버 · 가로 화면 · 한 판 약 2~3분', view.width / 2, 88);

  const cardW = 200;
  const cardH = 70;
  const cols = Math.min(3, MODES.length);
  const gap = 14;
  const startX = (view.width - (cardW * cols + gap * (cols - 1))) / 2;
  const startY = 150;
  MODES.forEach((m, i) => {
    const col = i % cols;
    const row = (i / cols) | 0;
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + 12);
    const sel = i === state.modeIndex;
    ctx.fillStyle = sel ? '#ffffff28' : '#00000055';
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();
    if (sel) {
      ctx.strokeStyle = CONFIG.palette.primary;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = '800 16px "Malgun Gothic", sans-serif';
    ctx.fillText(m.name, x + cardW / 2, y + 28);
    ctx.fillStyle = '#ffffffaa';
    ctx.font = '12px "Malgun Gothic", sans-serif';
    ctx.fillText(m.blurb, x + cardW / 2, y + 50);
  });

  ctx.fillStyle = CONFIG.palette.primary;
  roundRect(ctx, view.width / 2 - 110, 420, 220, 56, 16);
  ctx.fill();
  ctx.fillStyle = '#1a2a18';
  ctx.font = '800 18px "Malgun Gothic", sans-serif';
  ctx.fillText('브롤러 고르기', view.width / 2, 455);
}

function renderPick(ctx, state, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, '#163528');
  g.addColorStop(1, '#0a1c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.fillStyle = '#ffffff33';
  roundRect(ctx, 20, 16, 80, 36, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 13px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('← 모드', 60, 40);

  const mode = MODES.find((m) => m.id === state.mode);
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '800 30px "Malgun Gothic", sans-serif';
  ctx.fillText(mode?.name || '젬 브롤', view.width / 2, 48);
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '13px "Malgun Gothic", sans-serif';
  ctx.fillText(mode?.blurb || '', view.width / 2, 76);

  const cardW = 84;
  const gap = 10;
  const cols = 5;
  const startX = (view.width - (cardW * cols + gap * (cols - 1))) / 2;
  const y0 = 140;
  BRAWLERS.forEach((b, i) => {
    const col = i % cols;
    const row = (i / cols) | 0;
    const x = startX + col * (cardW + gap);
    const y = y0 + row * 110;
    const sel = i === state.pickIndex;
    ctx.fillStyle = sel ? '#ffffff22' : '#00000055';
    roundRect(ctx, x, y, cardW, 100, 12);
    ctx.fill();
    if (sel) {
      ctx.strokeStyle = CONFIG.palette.primary;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // 브롤러 아이콘
    ctx.fillStyle = '#0006';
    ctx.beginPath();
    ctx.ellipse(x + cardW / 2, y + 48, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y + 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8';
    ctx.beginPath();
    ctx.arc(x + cardW / 2 - 4, y + 24, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 12px "Malgun Gothic", sans-serif';
    ctx.fillText(b.name, x + cardW / 2, y + 70);
    ctx.fillStyle = '#ffd98a';
    ctx.font = '600 10px "Malgun Gothic", sans-serif';
    ctx.fillText(b.role, x + cardW / 2, y + 88);
  });

  const pick = BRAWLERS[state.pickIndex];
  ctx.fillStyle = '#fff';
  ctx.font = '14px "Malgun Gothic", sans-serif';
  ctx.fillText(`${pick.name} · ${pick.role} · 가젯 ${pick.gadget.name} · 궁극 ${pick.super.name}`, view.width / 2, 390);

  ctx.fillStyle = CONFIG.palette.primary;
  roundRect(ctx, view.width / 2 - 110, 420, 220, 56, 16);
  ctx.fill();
  ctx.fillStyle = '#1a2a18';
  ctx.font = '800 18px "Malgun Gothic", sans-serif';
  ctx.fillText('2D 전투 시작', view.width / 2, 455);
}

function canSee(viewer, target) {
  if (!target.hidden) return true;
  if (viewer && viewer.team === target.team && !String(viewer.team).startsWith('solo')) return true;
  if (viewer && Math.hypot(viewer.x - target.x, viewer.y - target.y) < 70) return true;
  return false;
}

function renderFight(ctx, state, view) {
  const camera = state.camera;
  const player = state.units.find(u => u.id === 'player');
  ctx.fillStyle = '#10291d';
  ctx.fillRect(0, 0, view.width, view.height);
  if (!camera.scale) return;
  const scale = camera.scale;
  const project = (x, y) => worldToScreen(x, y, camera);
  const corner = project(0, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 60, view.width, view.height - 160);
  ctx.clip();
  ctx.fillStyle = '#337445';
  ctx.fillRect(corner.x, corner.y, CONFIG.world.w * scale, CONFIG.world.h * scale);
  for (let y = 0; y < CONFIG.world.h; y += 64) {
    for (let x = 0; x < CONFIG.world.w; x += 64) {
      const pos = project(x, y);
      ctx.fillStyle = ((x + y) / 64) % 2 ? '#ffffff05' : '#00000007';
      ctx.fillRect(pos.x, pos.y, 64 * scale, 64 * scale);
    }
  }
  for (const [y, color] of [[0, '#ff6b5a30'], [CONFIG.world.h - 150, '#4db7ff30']]) {
    const pos = project(0, y);
    ctx.fillStyle = color;
    ctx.fillRect(pos.x, pos.y, CONFIG.world.w * scale, 150 * scale);
  }
  ctx.strokeStyle = '#b3d282'; ctx.lineWidth = 4;
  ctx.strokeRect(corner.x, corner.y, CONFIG.world.w * scale, CONFIG.world.h * scale);
  for (const bush of state.map.bushes) {
    const pos = project(bush.x, bush.y);
    ctx.fillStyle = '#175c30';
    roundRect(ctx, pos.x, pos.y, bush.w * scale, bush.h * scale, 12); ctx.fill();
    ctx.fillStyle = '#37894a';
    for (let x = 10; x < bush.w; x += 22) for (let y = 8; y < bush.h; y += 22) {
      ctx.beginPath(); ctx.arc(pos.x + x * scale, pos.y + y * scale, 8 * scale, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const wall of state.map.walls) {
    const pos = project(wall.x, wall.y);
    ctx.fillStyle = '#0005';
    roundRect(ctx, pos.x + 3, pos.y + 4, wall.w * scale, wall.h * scale, 5); ctx.fill();
    ctx.fillStyle = '#927658';
    roundRect(ctx, pos.x, pos.y, wall.w * scale, wall.h * scale, 5); ctx.fill();
    ctx.strokeStyle = '#c5a47b'; ctx.lineWidth = 2; ctx.stroke();
  }
  const mine = project(state.map.mine.x, state.map.mine.y);
  ctx.fillStyle = '#24203d'; ctx.beginPath(); ctx.arc(mine.x, mine.y, 34 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#cf8bff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#e8baff'; ctx.font = '800 23px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('◆', mine.x, mine.y + 8);
  for (const zone of state.zones) {
    const pos = project(zone.x, zone.y);
    ctx.fillStyle = '#6cff7560'; ctx.beginPath(); ctx.arc(pos.x, pos.y, zone.r * scale, 0, Math.PI * 2); ctx.fill();
  }
  for (const gem of state.gems) {
    const pos = project(gem.x, gem.y);
    ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#c06aff'; ctx.shadowColor = '#dc94ff'; ctx.shadowBlur = 10;
    ctx.fillRect(-7, -7, 14, 14); ctx.strokeStyle = '#f4d7ff'; ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14); ctx.restore();
  }
  for (const unit of state.units) {
    if (!unit.alive || (unit.id !== 'player' && !canSee(player, unit))) continue;
    const pos = project(unit.x, unit.y);
    const brawler = BRAWLERS[unit.brawlerIndex];
    const radius = brawler.radius * scale;
    const teamColor = unit.team === 'ally' ? CONFIG.palette.ally : CONFIG.palette.enemy;
    ctx.save();
    ctx.globalAlpha = unit.hidden && unit.team === 'ally' ? 0.65 : 1;
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.arc(pos.x + 2, pos.y + 3, radius + 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = teamColor; ctx.lineWidth = unit.id === 'player' ? 4 : 3;
    ctx.fillStyle = unit.flash > 0 ? '#fff' : unit.color;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#233426'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pos.x + unit.aimX * radius * 0.4, pos.y + unit.aimY * radius * 0.4);
    ctx.lineTo(pos.x + unit.aimX * (radius + 10), pos.y + unit.aimY * (radius + 10)); ctx.stroke();
    ctx.fillStyle = '#ffffff70'; ctx.beginPath(); ctx.arc(pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.28, 0, Math.PI * 2); ctx.fill();
    if (unit.shield > 0) { ctx.strokeStyle = '#b6e8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pos.x, pos.y, radius + 7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#092018'; ctx.fillRect(pos.x - 21, pos.y - radius - 13, 42, 6);
    ctx.fillStyle = unit.team === 'ally' ? '#72f5a6' : '#ff8576'; ctx.fillRect(pos.x - 20, pos.y - radius - 12, 40 * Math.max(0, unit.hp / unit.maxHp), 4);
    ctx.font = '800 11px "Malgun Gothic", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = unit.id === 'player' ? '#ffdf62' : '#fff';
    ctx.fillText(unit.id === 'player' ? 'YOU' : unit.name, pos.x, pos.y + radius + 15);
    if (unit.gems) { ctx.fillStyle = '#f3ceff'; ctx.fillText(`◆ ${unit.gems}`, pos.x, pos.y - radius - 19); }
    ctx.restore();
  }
  for (const bullet of state.bullets) {
    const pos = project(bullet.x, bullet.y);
    ctx.strokeStyle = bullet.color; ctx.lineWidth = Math.max(3, bullet.r * scale); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pos.x - bullet.vx * 0.018 * scale, pos.y - bullet.vy * 0.018 * scale); ctx.lineTo(pos.x, pos.y); ctx.stroke();
  }
  for (const effect of state.fx) {
    const pos = project(effect.x, effect.y);
    ctx.globalAlpha = Math.min(1, effect.t * 4); ctx.strokeStyle = effect.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, (10 + (0.5 - effect.t) * 35) * scale, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  if (player && !player.alive) {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 20px "Malgun Gothic", sans-serif';
    ctx.fillText(`부활까지 ${Math.ceil(player.respawn)}초`, view.width / 2, view.height / 2);
  }

  // HUD
  ctx.fillStyle = '#06140ccc';
  roundRect(ctx, 16, 10, view.width - 32, 48, 12);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 15px "Malgun Gothic", sans-serif';
  const mm = Math.floor(Math.max(0, state.matchTime) / 60);
  const ss = String(Math.floor(Math.max(0, state.matchTime) % 60)).padStart(2, '0');
  const mode = MODES.find((m) => m.id === state.mode);
  ctx.fillText(`${mode?.name || ''}  2D  ${mm}:${ss}`, view.width / 2, 30);

  if (state.mode === 'gem') {
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.palette.ally;
    ctx.font = '800 20px "Malgun Gothic", sans-serif';
    ctx.fillText(`◆ ${teamGemCount(state, 'ally')}`, 28, 48);
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.palette.enemy;
    ctx.fillText(`${teamGemCount(state, 'enemy')} ◆`, view.width - 28, 48);
    if (state.holdTeam) {
      ctx.textAlign = 'center';
      ctx.fillStyle = state.holdTeam === 'ally' ? CONFIG.palette.primary : CONFIG.palette.danger;
      ctx.fillText(`홀드 ${Math.ceil(state.holdTime)}`, view.width / 2, 48);
    }
  } else if (state.mode === 'ball' || state.mode === 'knockout') {
    ctx.fillStyle = '#fff';
    ctx.font = '800 20px "Malgun Gothic", sans-serif';
    const a = state.mode === 'knockout' ? state.koAlly : state.allyScore;
    const e = state.mode === 'knockout' ? state.koEnemy : state.enemyScore;
    ctx.fillText(`${a} : ${e}`, view.width / 2, 48);
  } else if (state.mode === 'hotzone') {
    ctx.fillStyle = '#fff';
    ctx.font = '700 14px "Malgun Gothic", sans-serif';
    ctx.fillText(`점령 ${state.allyZone | 0}% / ${state.enemyZone | 0}%`, view.width / 2, 48);
  } else if (state.mode === 'heist') {
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px "Malgun Gothic", sans-serif';
    const er = Math.max(0, state.map.enemySafe.hp / state.map.enemySafe.maxHp);
    const ar = Math.max(0, state.map.allySafe.hp / state.map.allySafe.maxHp);
    ctx.fillText(`적 금고 ${(er * 100) | 0}% · 아군 ${(ar * 100) | 0}%`, view.width / 2, 48);
  } else if (state.mode === 'showdown') {
    const alive = state.units.filter((u) => u.alive).length;
    ctx.fillStyle = '#fff';
    ctx.font = '700 14px "Malgun Gothic", sans-serif';
    ctx.fillText(`생존 ${alive} · 큐브 ${player?.cubes || 0}`, view.width / 2, 48);
  }

  if (state.toast > 0 && state.message) {
    ctx.fillStyle = '#000000aa';
    roundRect(ctx, view.width / 2 - 200, 66, 400, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, view.width / 2, 88);
  }

  if (player && player.alive) {
    const charged = player.superCharge >= 1;
    ctx.fillStyle = charged ? CONFIG.palette.primary : '#ffffff33';
    ctx.beginPath();
    ctx.arc(PAD.SUPER_BTN.x, PAD.SUPER_BTN.y, PAD.SUPER_BTN.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.arc(PAD.SUPER_BTN.x, PAD.SUPER_BTN.y, PAD.SUPER_BTN.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * player.superCharge);
    ctx.stroke();
    ctx.fillStyle = charged ? '#1a2a18' : '#fff';
    ctx.font = '800 11px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('궁극', PAD.SUPER_BTN.x, PAD.SUPER_BTN.y + 4);

    ctx.fillStyle = player.gadgetLeft > 0 ? '#9ad7ff' : '#ffffff22';
    ctx.beginPath();
    ctx.arc(PAD.GADGET_BTN.x, PAD.GADGET_BTN.y, PAD.GADGET_BTN.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#123';
    ctx.font = '800 11px "Malgun Gothic", sans-serif';
    ctx.fillText(`가젯${player.gadgetLeft}`, PAD.GADGET_BTN.x, PAD.GADGET_BTN.y + 4);

    if (state.aimMode === 'auto') {
      ctx.fillStyle = '#5dffa0';
      ctx.font = '700 11px "Malgun Gothic", sans-serif';
      ctx.fillText('AUTO', PAD.RIGHT_STICK.x, PAD.RIGHT_STICK.y - PAD.STICK_R - 8);
    } else if (state.aimMode === 'manual') {
      ctx.fillStyle = '#ffd24a';
      ctx.font = '700 11px "Malgun Gothic", sans-serif';
      ctx.fillText('AIM', PAD.RIGHT_STICK.x, PAD.RIGHT_STICK.y - PAD.STICK_R - 8);
    }
  }

  drawStick(ctx, PAD.LEFT_STICK, state.sticks.left, '이동', CONFIG.palette.ally);
  drawStick(ctx, PAD.RIGHT_STICK, state.sticks.right, '공격', CONFIG.palette.danger);
}

mountGame({
  title: CONFIG.title,
  description:
    '2D 전장에서 펼치는 3대3 젬 그래버!\n\n1) 젬 10개를 모아 15초 동안 지키면 승리\n2) 브롤러: 탱커·어쌔신·딜러·저격수·컨트롤러·서포터·투척수\n3) 듀얼 스틱: 살짝=오토에임 / 깊게=수동조준\n4) 가젯·궁극·풀숲 · 약 2~3분',
  controls:
    '가로 화면 권장 · 왼쪽 스틱 이동 · 오른쪽 살짝 AUTO / 깊게 AIM · 가젯·궁극\nPC: WASD · Space · 클릭 조준 · Q 가젯 · E 궁극 · ESC 쉬기',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render(ctx, state, view) {
    if (state.phase === 'splash') renderSplash(ctx, view);
    else if (state.phase === 'mode') renderMode(ctx, state, view);
    else if (state.phase === 'pick') renderPick(ctx, state, view);
    else renderFight(ctx, state, view);
  },
});
