import { mountGame } from './game-shell.js';
import { CONFIG } from './config.mjs';
import {
  createGame,
  updateGame,
  slideCenter,
  slideWidth,
  SHORTCUTS,
  SKINS,
  rankList,
  placeOf,
} from './game.mjs';

const W = CONFIG.width;
const H = CONFIG.height;
const P = CONFIG.palette;

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

function worldToScreen(progress, lane, cameraProgress) {
  const rel = progress - cameraProgress;
  const y = H * 0.62 - rel * 0.92;
  const scale = clamp(1.05 - Math.max(0, rel) * 0.00125, 0.45, 1.1);
  const trackProgress = Math.max(0, progress);
  const half = Math.min(W * 0.5 - 20, slideWidth(trackProgress) * 0.5 * scale);
  const bend = (slideCenter(trackProgress) - slideCenter(cameraProgress)) * W * 0.32;
  const cx = clamp(W * 0.5 + bend, half + 16, W - half - 16);
  return { x: cx + lane * half, y, scale, half, cx };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Background and track are drawn independently from race state, so artwork can
// replace these layers later without changing movement or collision rules.
function drawSky(ctx, cameraProgress) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#65c9ef');
  sky.addColorStop(0.38, '#b5ecf0');
  sky.addColorStop(0.39, '#52c4d4');
  sky.addColorStop(1, '#0784aa');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(315, 67, 12, 315, 67, 75);
  glow.addColorStop(0, 'rgba(255,249,194,.9)');
  glow.addColorStop(1, 'rgba(255,249,194,0)');
  ctx.fillStyle = glow; ctx.fillRect(235, 0, 155, 145);
  ctx.fillStyle = '#fff2b1'; ctx.beginPath(); ctx.arc(315, 67, 22, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,.67)';
  for (const [x, y, size] of [[32, 73, 1], [155, 43, .8], [235, 120, .65]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 30 * size, 10 * size, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 15 * size, y - 8 * size, 16 * size, 12 * size, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 14 * size, y - 4 * size, 14 * size, 9 * size, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Distant islands and water move more slowly than the track.
  const drift = (cameraProgress * .025) % 150;
  ctx.fillStyle = '#60bfae';
  for (let i = -1; i < 4; i++) {
    const x = i * 150 - drift;
    ctx.beginPath(); ctx.ellipse(x, 273, 76, 17, 0, Math.PI, 0); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(225,255,250,.3)'; ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const y = 300 + i * 26;
    const offset = (i * 67 + cameraProgress * .12) % 130;
    for (let x = offset - 130; x < W; x += 130) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 30 + i % 3 * 8, y); ctx.stroke();
    }
  }
}

function drawPool(ctx, cameraProgress) {
  const finish = CONFIG.track.length;
  const s = worldToScreen(finish, 0, cameraProgress);
  if (s.y < -40 || s.y > H + 80) return;
  const rw = 160 * s.scale;
  const rh = 70 * s.scale;
  ctx.fillStyle = '#1ec8ff';
  ctx.beginPath();
  ctx.ellipse(s.cx, s.y + 20 * s.scale, rw, rh, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(s.cx - 30 * s.scale, s.y + 8 * s.scale, rw * 0.35, rh * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.text;
  ctx.font = `800 ${Math.round(16 * s.scale)}px "Pretendard","Malgun Gothic",sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('수영장 골인', s.cx, s.y - 28 * s.scale);
}

function drawSlideRibbon(ctx, cameraProgress, time) {
  const steps = 96;
  const span = 930;
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = cameraProgress - 320 + (span * i) / steps;
    if (t > CONFIG.track.length + 40) continue;
    const p = worldToScreen(t, 0, cameraProgress);
    left.push({ x: p.cx - p.half, y: p.y, t });
    right.push({ x: p.cx + p.half, y: p.y, t });
  }
  if (left.length < 2) return;

  // 슬라이드 몸통
  const body = ctx.createLinearGradient(0, 0, W, 0);
  body.addColorStop(0, '#f08172');
  body.addColorStop(0.13, '#ffc49f');
  body.addColorStop(0.5, '#e5fbf3');
  body.addColorStop(0.87, '#ffc49f');
  body.addColorStop(1, '#f08172');
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();

  // 안쪽 물길
  ctx.beginPath();
  for (let i = 0; i < left.length; i++) {
    const mid = worldToScreen(left[i].t, 0, cameraProgress);
    const x = mid.cx - mid.half * 0.72;
    if (i === 0) ctx.moveTo(x, mid.y);
    else ctx.lineTo(x, mid.y);
  }
  for (let i = right.length - 1; i >= 0; i--) {
    const mid = worldToScreen(right[i].t, 0, cameraProgress);
    ctx.lineTo(mid.cx + mid.half * 0.72, mid.y);
  }
  ctx.closePath();
  const water = ctx.createLinearGradient(0, 0, W, 0);
  water.addColorStop(0, '#19a9c3'); water.addColorStop(.28, '#61dce4');
  water.addColorStop(.55, '#b4f4ed'); water.addColorStop(1, '#25b4cf');
  ctx.fillStyle = water;
  ctx.fill();

  // Raised rails and moving water stay tied to track coordinates.
  for (const edge of [left, right]) {
    ctx.beginPath();
    edge.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = '#075b7588'; ctx.lineWidth = 16; ctx.stroke();
    ctx.strokeStyle = '#ed8174'; ctx.lineWidth = 11; ctx.stroke();
    ctx.strokeStyle = '#ffe4cc'; ctx.lineWidth = 4; ctx.stroke();
  }
  for (let i = 0; i < left.length; i += 2) {
    const point = worldToScreen(left[i].t, 0, cameraProgress);
    const wave = Math.sin(left[i].t * 0.08 - time * 3) * 4;
    ctx.strokeStyle = '#e4fcff70'; ctx.lineWidth = 1.8 * point.scale;
    for (const lane of [-0.5, 0.45]) {
      ctx.beginPath(); ctx.moveTo(point.cx + point.half * lane - 8, point.y + wave);
      ctx.quadraticCurveTo(point.cx + point.half * lane, point.y + wave + 4, point.cx + point.half * lane + 9, point.y + wave);
      ctx.stroke();
    }
  }

  // 레인 가이드
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  for (let i = 0; i < left.length; i++) {
    const mid = worldToScreen(left[i].t, 0, cameraProgress);
    if (i === 0) ctx.moveTo(mid.cx, mid.y);
    else ctx.lineTo(mid.cx, mid.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawShortcuts(ctx, cameraProgress) {
  for (const z of SHORTCUTS) {
    const a = worldToScreen(z.from, 0, cameraProgress);
    const b = worldToScreen(z.to, 0, cameraProgress);
    if (b.y < -20 || a.y > H + 20) continue;
    ctx.fillStyle = 'rgba(255, 255, 120, 0.28)';
    roundRect(ctx, a.cx - a.half * 0.9, Math.min(a.y, b.y), a.half * 1.8, Math.abs(a.y - b.y) + 8, 10);
    ctx.fill();
    ctx.fillStyle = '#fff7a0';
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↗ 지금 점프! 약 2초 단축', (a.x + b.x) / 2 || a.cx, (a.y + b.y) / 2);
    const landing = worldToScreen(z.land, z.landLane, cameraProgress);
    if (landing.y > 75 && landing.y < H - 40) {
      ctx.strokeStyle = '#fff7a0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(landing.x, landing.y, 22 * landing.scale, 10 * landing.scale, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

function drawPickups(ctx, state, cameraProgress) {
  for (const b of state.pickups.boosts) {
    if (b.taken) continue;
    const p = worldToScreen(b.t, b.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    ctx.fillStyle = 'rgba(0,62,85,.25)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 6 * p.scale, 19 * p.scale, 9 * p.scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.boost;
    roundRect(ctx, p.x - 16 * p.scale, p.y - 10 * p.scale, 32 * p.scale, 20 * p.scale, 6);
    ctx.fill();
    ctx.fillStyle = '#0a4';
    ctx.font = `800 ${Math.round(12 * p.scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('≫', p.x, p.y + 5 * p.scale);
  }
  for (const o of state.pickups.obstacles) {
    const p = worldToScreen(o.t, o.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    ctx.fillStyle = 'rgba(0,62,85,.28)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 8 * p.scale, 16 * p.scale, 6 * p.scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = o.hit ? '#a3b7b5' : '#ff6a63';
    ctx.beginPath(); ctx.arc(p.x, p.y, 13 * p.scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff5e5'; ctx.lineWidth = 4 * p.scale; ctx.stroke();
    ctx.fillStyle = '#fff5e5';
    ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.scale, 0, Math.PI * 2); ctx.fill();
  }
  for (const c of state.pickups.coins) {
    if (c.taken) continue;
    const p = worldToScreen(c.t, c.lane, cameraProgress);
    if (p.y < -20 || p.y > H + 20) continue;
    ctx.fillStyle = P.coin;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7 * p.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c90';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawRacer(ctx, racer, cameraProgress, time) {
  if (racer.fallen && racer.splash <= 0) return;
  const p = worldToScreen(racer.progress, racer.lane, cameraProgress);
  if (p.y < -40 || p.y > H + 50) return;

  const s = p.scale * (racer.airborne ? 1.15 : 1);
  const bob = racer.airborne ? -28 * Math.sin(Math.min(1, racer.airTimer / 0.72) * Math.PI) * s : 0;
  const x = p.x;
  const y = p.y + bob;

  if (racer.fallen) {
    ctx.fillStyle = `rgba(120,200,255,${racer.splash})`;
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (!racer.airborne) {
    ctx.strokeStyle = '#efffffaa'; ctx.lineWidth = 2 * s;
    for (let side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 15 * s, y + 6 * s);
      ctx.quadraticCurveTo(x + side * 26 * s, y + 20 * s, x + side * 30 * s, y + (30 + Math.sin(time * 10) * 3) * s);
      ctx.stroke();
    }
    if (racer.boostTimer > 0) {
      for (let i = 0; i < 5; i++) {
        const dx = (i - 2) * 9 * s;
        ctx.beginPath(); ctx.moveTo(x + dx, y + 30 * s); ctx.lineTo(x + dx, y + (55 + i % 2 * 12) * s); ctx.stroke();
      }
    }
  }

  // 그림자
  ctx.fillStyle = 'rgba(0,40,70,0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 8 * s, 18 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // 튜브
  ctx.fillStyle = racer.bumpFlash > 0 ? '#fff' : racer.tube;
  ctx.beginPath();
  ctx.ellipse(x, y + 6 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,63,80,0.3)';
  ctx.lineWidth = 2 * s;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2 * s;
  ctx.beginPath(); ctx.ellipse(x, y + 3 * s, 17 * s, 7 * s, 0, Math.PI, Math.PI * 1.8); ctx.stroke();
  ctx.fillStyle = P.slide;
  ctx.beginPath();
  ctx.ellipse(x, y + 6 * s, 10 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Character silhouette stays separate from its tube for future sprites.
  ctx.strokeStyle = racer.body; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 7 * s, y - 2 * s); ctx.lineTo(x - 17 * s, y + 2 * s);
  ctx.moveTo(x + 7 * s, y - 2 * s); ctx.lineTo(x + 17 * s, y + 2 * s); ctx.stroke();
  ctx.fillStyle = racer.body;
  ctx.beginPath();
  ctx.arc(x, y - 10 * s, 11 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - 3.5 * s, y - 11 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.arc(x + 3.5 * s, y - 11 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#164253';
  ctx.beginPath(); ctx.arc(x - 3.5 * s, y - 11 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.arc(x + 3.5 * s, y - 11 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#164253'; ctx.lineWidth = 1.3 * s;
  ctx.beginPath(); ctx.arc(x, y - 7 * s, 3 * s, .15, Math.PI - .15); ctx.stroke();

  if (racer.boostTimer > 0) {
    ctx.strokeStyle = `rgba(125,255,154,${0.4 + Math.sin(time * 20) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 28 * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (racer.isPlayer) {
    ctx.fillStyle = P.primary;
    ctx.font = '800 12px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▼', x, y - 26 * s);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 11px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(racer.name, x, y - 24 * s);
  }

  if (racer.ceremony > 0) {
    const arms = Math.sin(racer.ceremony * 10) * 8 * s;
    ctx.strokeStyle = racer.body;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y - 4 * s);
    ctx.lineTo(x - 22 * s, y - 18 * s - arms);
    ctx.moveTo(x + 14 * s, y - 4 * s);
    ctx.lineTo(x + 22 * s, y - 18 * s + arms);
    ctx.stroke();
  }
}

function drawHud(ctx, state, viewTime) {
  const player = state.racers.find((r) => r.isPlayer);
  const place = player ? placeOf(state, player) : '-';
  const ranks = rankList(state);

  // 상단 보드
  ctx.fillStyle = 'rgba(6,50,80,0.55)';
  roundRect(ctx, 12, 12, W - 24, 54, 14);
  ctx.fill();
  ctx.fillStyle = P.text;
  ctx.font = '800 18px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${place}위`, 26, 46);
  ctx.font = '700 14px "Malgun Gothic",sans-serif';
  ctx.fillText(`코인 ${state.raceCoins}`, 90, 46);
  const pct = player ? Math.round((player.progress / CONFIG.track.length) * 100) : 0;
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(state.raceTime)}초 · ${pct}%`, W - 26, 46);

  // 미니 순위
  ctx.textAlign = 'left';
  ctx.font = '600 12px "Malgun Gothic",sans-serif';
  ranks.slice(0, 4).forEach((r, i) => {
    ctx.fillStyle = r.isPlayer ? P.primary : 'rgba(255,255,255,0.75)';
    ctx.fillText(`${i + 1}. ${r.name}`, 26, 86 + i * 16);
  });

  // 진행 바
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 12, H - 18, W - 24, 8, 4);
  ctx.fill();
  const nextShortcut = player && SHORTCUTS.find((z) => player.progress <= z.to);
  const inShortcut = nextShortcut && player.progress >= nextShortcut.from;
  const jumpReady = player && !player.airborne && player.jumpCooldown <= 0;
  ctx.fillStyle = P.primary;
  roundRect(ctx, 12, H - 18, (W - 24) * clamp(pct / 100, 0, 1), 8, 4);
  ctx.fill();

  // 점프 버튼
  const jx = W - 58;
  const jy = H - 78;
  ctx.fillStyle = 'rgba(6,50,80,0.55)';
  ctx.beginPath();
  ctx.arc(jx, jy, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = jumpReady ? (inShortcut ? '#a6ff83' : P.primary) : '#a1b9c4';
  ctx.beginPath();
  ctx.arc(jx, jy, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a00';
  ctx.font = '800 13px "Malgun Gothic",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(jumpReady ? (inShortcut ? '숏컷!' : '점프') : '착지 중', jx, jy + 5);
  ctx.fillStyle = 'rgba(4,40,70,0.82)';
  roundRect(ctx, 16, H - 136, W - 32, 34, 10); ctx.fill();
  ctx.fillStyle = '#fff7a0'; ctx.font = '700 12px "Malgun Gothic",sans-serif';
  const jumpHint = inShortcut ? '노란 구간! 지금 점프하면 지름길로 착지' : nextShortcut ?
    `장애물은 점프 · 다음 숏컷 ${Math.ceil(Math.max(0, nextShortcut.from - player.progress) / CONFIG.rules.baseSpeed)}초 뒤` : '장애물은 점프로 넘고 수영장까지 달려요!';
  ctx.fillText(jumpHint, W / 2, H - 114);

  if (state.toast) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, 40, H * 0.28, W - 80, 40, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 15px "Malgun Gothic",sans-serif';
    ctx.fillText(state.toast, W / 2, H * 0.28 + 26);
  }

  if (state.countdown > 0) {
    ctx.fillStyle = 'rgba(0,30,50,0.28)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.primary;
    ctx.font = '800 64px "Malgun Gothic",sans-serif';
    ctx.textAlign = 'center';
    const n = Math.ceil(state.countdown);
    ctx.fillText(n > 0 ? String(n) : 'GO!', W / 2, H * 0.38);
    // 스킨 상점
    ctx.fillStyle = 'rgba(4,40,70,0.72)';
    roundRect(ctx, 16, H - 168, W - 32, 140, 16);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.fillText(`약 1분 레이스 · 보유 ${state.save.coins}코인 · 스킨 선택`, W / 2, H - 146);
    ctx.font = '700 13px "Malgun Gothic",sans-serif';
    ctx.fillText('장애물은 점프! 노란 구간에서는 지름길!', W / 2, H * 0.46);
    SKINS.forEach((skin, i) => {
      const bx = 28 + i * 68;
      const by = H - 130;
      const owned = state.save.unlocked.includes(skin.id);
      const selected = state.save.selected === skin.id;
      ctx.fillStyle = selected ? P.primary : owned ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.38)';
      roundRect(ctx, bx, by, 58, 70, 10);
      ctx.fill();
      ctx.fillStyle = skin.body;
      ctx.beginPath();
      ctx.arc(bx + 29, by + 24, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin.tube;
      ctx.beginPath();
      ctx.ellipse(bx + 29, by + 40, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#223';
      ctx.font = '700 10px "Malgun Gothic",sans-serif';
      ctx.fillText(owned ? skin.name : `${skin.cost}¢`, bx + 29, by + 62);
    });
  }
}

function render(ctx, state, view) {
  drawSky(ctx, state.cameraProgress);
  drawSlideRibbon(ctx, state.cameraProgress, view.time);
  drawPool(ctx, state.cameraProgress);
  drawShortcuts(ctx, state.cameraProgress);
  drawPickups(ctx, state, state.cameraProgress);

  const sorted = [...state.racers].sort((a, b) => a.progress - b.progress);
  for (const r of sorted) drawRacer(ctx, r, state.cameraProgress, view.time);

  for (const f of state.fx) {
    const a = f.life / f.max;
    ctx.globalAlpha = a;
    if (f.kind === 'boost') {
      ctx.strokeStyle = P.boost;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.62, 40 * (1 - a), 0, Math.PI * 2);
      ctx.stroke();
    } else if (f.kind === 'coin') {
      ctx.fillStyle = P.coin;
      ctx.beginPath();
      ctx.arc(W / 2 + 40, H * 0.5, 10 * a, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.kind === 'land') {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(W / 2, H * 0.62, 50 * (1 - a), 14 * (1 - a), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, state, view.time);
}

mountGame({
  title: CONFIG.title,
  description:
    '약 1분 동안 워터슬라이드를 달려 수영장으로 골인하세요! 점프로 장애물을 넘고, 노란 점프 구간 6곳에서는 지름길로 약 2초씩 단축할 수 있어요.',
  controls:
    '터치: 좌우 드래그로 이동, 오른쪽 아래 점프 버튼 · PC: ←→ 또는 A/D 이동, 스페이스/↑ 점프 · 빨간 장애물은 점프로 회피, 노란 구간은 점프 지름길, 초록 패드는 가속! 가장자리를 조심하세요.',
  width: W,
  height: H,
  theme: {
    background: P.background,
    primary: P.primary,
    text: P.text,
    surface: P.surface,
  },
  create: createGame,
  update: updateGame,
  render,
});
