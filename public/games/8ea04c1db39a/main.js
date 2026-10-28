import { mountGame } from './game-shell.js';
import { CONFIG, VEHICLES, DECALS, WHEELS, BOOSTS, PASS_REWARDS } from './config.mjs';
import {
  createGame,
  updateGame,
  MODES,
  passLevel,
  nextPassReward,
  hoopRects,
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

function pushUi(state, x, y, w, h, action, value) {
  state.ui.push({ x, y, w, h, action, value });
  return { x, y, w, h };
}

function drawBtn(ctx, box, label, { fill = '#243447', text = P.text, active = false, muted = false } = {}) {
  ctx.save();
  ctx.fillStyle = muted ? '#1a2430' : active ? P.primary : fill;
  roundRect(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fill();
  if (active) {
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = muted ? '#6b7a8a' : active ? '#06241c' : text;
  ctx.font = '700 14px "Malgun Gothic", "Apple SD Gothic Neo", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2 + 1);
  ctx.restore();
}

function findById(list, id) {
  return list.find((x) => x.id === id) || list[0];
}

function drawCarBody(ctx, car, previewScale = 1) {
  const v = car.vehicle || findById(VEHICLES, car.cosmetics?.vehicle || 'octane');
  const wheel = findById(WHEELS, car.cosmetics?.wheel || 'oem');
  const decal = findById(DECALS, car.cosmetics?.decal || 'none');
  const color = car.cosmetics?.primary || v.color;
  const hw = v.halfW * previewScale;
  const hh = v.halfH * previewScale;

  ctx.save();
  if (!previewScale || previewScale === 1) {
    ctx.translate(car.x || 0, car.y || 0);
    ctx.rotate(car.angle || 0);
  }

  // wheels
  ctx.fillStyle = wheel.tire;
  ctx.beginPath();
  ctx.arc(-hw * 0.55, hh * 0.55, 9 * previewScale, 0, Math.PI * 2);
  ctx.arc(hw * 0.55, hh * 0.55, 9 * previewScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = wheel.rim;
  ctx.beginPath();
  ctx.arc(-hw * 0.55, hh * 0.55, 4.5 * previewScale, 0, Math.PI * 2);
  ctx.arc(hw * 0.55, hh * 0.55, 4.5 * previewScale, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = color;
  roundRect(ctx, -hw, -hh, hw * 2, hh * 2, 8 * previewScale);
  ctx.fill();

  // cabin
  ctx.fillStyle = '#ffffff55';
  roundRect(ctx, -hw * 0.15, -hh * 0.85, hw * 0.7, hh * 1.1, 5 * previewScale);
  ctx.fill();

  // decal
  ctx.strokeStyle = '#ffffffaa';
  ctx.lineWidth = 2 * previewScale;
  if (decal.pattern === 'stripe') {
    ctx.beginPath();
    ctx.moveTo(-hw, 0);
    ctx.lineTo(hw, 0);
    ctx.stroke();
  } else if (decal.pattern === 'flame') {
    ctx.strokeStyle = '#ffd27a';
    ctx.beginPath();
    ctx.moveTo(-hw * 0.7, hh * 0.3);
    ctx.quadraticCurveTo(-hw * 0.2, -hh, hw * 0.2, hh * 0.1);
    ctx.stroke();
  } else if (decal.pattern === 'circuit') {
    ctx.strokeStyle = '#46f0ff';
    ctx.strokeRect(-hw * 0.55, -hh * 0.45, hw * 1.1, hh * 0.9);
  } else if (decal.pattern === 'star') {
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(0, 0, 4 * previewScale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawArena(ctx, mode) {
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#10263a');
  g.addColorStop(0.55, '#17324a');
  g.addColorStop(1, '#1c3a2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // crowd lights
  ctx.fillStyle = '#ffffff10';
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.arc(80 + i * 110, 28, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // floor
  ctx.fillStyle = '#2f6b45';
  ctx.fillRect(0, CONFIG.floorY, W, H - CONFIG.floorY);
  ctx.fillStyle = '#3f8656';
  for (let x = 0; x < W; x += 48) ctx.fillRect(x, CONFIG.floorY, 24, 8);
  ctx.strokeStyle = '#d7ffe288';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2, CONFIG.floorY);
  ctx.lineTo(W / 2, CONFIG.ceilingY + 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, CONFIG.floorY, 70, Math.PI, 0);
  ctx.stroke();

  if (mode.kind === 'soccer') {
    const gh = CONFIG.goalHalfH * 2;
    const gy = CONFIG.floorY - gh;
    // Each goal uses the defending team's color.
    ctx.fillStyle = '#ff8a3d33';
    ctx.fillRect(CONFIG.fieldRight - 8, gy, 28, gh);
    ctx.strokeStyle = '#ffc29a';
    ctx.lineWidth = 4;
    ctx.strokeRect(CONFIG.fieldRight - 8, gy, 28, gh);
    // Blue team defends the left goal.
    ctx.fillStyle = '#3aa0ff33';
    ctx.fillRect(CONFIG.fieldLeft - 20, gy, 28, gh);
    ctx.strokeStyle = '#9fd0ff';
    ctx.strokeRect(CONFIG.fieldLeft - 20, gy, 28, gh);
    ctx.font = '700 12px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'left'; ctx.fillStyle = '#9fd0ff';
    ctx.fillText('내 골대', CONFIG.fieldLeft - 12, gy - 12);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffc29a';
    ctx.fillText('공격 →', CONFIG.fieldRight + 16, gy - 12);
  } else {
    const hoop = hoopRects();
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(hoop.cx, hoop.cy, hoop.rimR, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff22';
    ctx.beginPath();
    ctx.ellipse(hoop.cx, hoop.cy, hoop.rimR - 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c1121f';
    roundRect(ctx, hoop.back.x, hoop.back.y, hoop.back.w, hoop.back.h, 4);
    ctx.fill();
    // net hint
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(hoop.cx + i * 10, hoop.cy);
      ctx.lineTo(hoop.cx + i * 6, hoop.cy + 36);
      ctx.stroke();
    }
  }
}

function drawHub(ctx, state) {
  state.ui = [];
  const save = state.save;
  ctx.fillStyle = P.background;
  ctx.fillRect(0, 0, W, H);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d1b2a');
  bg.addColorStop(1, '#163528');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = P.text;
  ctx.font = '800 34px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('로켓 리그 사이드와이프', 36, 58);
  ctx.font = '600 15px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = '#a9c0d4';
  ctx.fillText('2D 사이드뷰 · 약 2분 한 판 · 축구 & 후프스', 38, 86);

  ctx.fillStyle = '#0006';
  roundRect(ctx, W - 250, 28, 214, 64, 14);
  ctx.fill();
  ctx.fillStyle = P.primary;
  ctx.font = '700 14px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText(`크레딧 ${save.credits}`, W - 236, 52);
  ctx.fillStyle = P.text;
  ctx.fillText(`패스 Lv.${passLevel(save.xp)} · XP ${save.xp}`, W - 236, 74);

  // preview car
  ctx.save();
  ctx.translate(180, 250);
  drawCarBody(ctx, {
    vehicle: findById(VEHICLES, save.loadout.vehicle),
    cosmetics: save.loadout,
    angle: -0.12,
  });
  ctx.restore();

  ctx.fillStyle = '#a9c0d4';
  ctx.font = '600 13px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText('모드를 고르면 바로 경기 시작', 420, 140);

  MODES.forEach((mode, i) => {
    const y = 160 + i * 78;
    const box = pushUi(state, 420, y, 500, 66, 'mode', mode.id);
    ctx.fillStyle = '#1c2e42';
    roundRect(ctx, box.x, box.y, box.w, box.h, 14);
    ctx.fill();
    ctx.fillStyle = P.primary;
    ctx.font = '800 18px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(mode.name, box.x + 18, box.y + 28);
    ctx.fillStyle = '#b7c9da';
    ctx.font = '600 13px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(mode.desc, box.x + 18, box.y + 50);
  });

  const garage = pushUi(state, 36, H - 86, 180, 52, 'goto', 'garage');
  const pass = pushUi(state, 232, H - 86, 180, 52, 'goto', 'pass');
  drawBtn(ctx, garage, '차고 · 꾸미기', { fill: '#244056' });
  drawBtn(ctx, pass, '시즌 패스', { fill: '#3a2a55' });

  if (state.toastT > 0) {
    ctx.fillStyle = '#0009';
    roundRect(ctx, W / 2 - 180, H - 150, 360, 40, 10);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '700 14px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, W / 2, H - 128);
  }
}

function drawGarage(ctx, state) {
  state.ui = [];
  const save = state.save;
  ctx.fillStyle = '#101c28';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = P.text;
  ctx.font = '800 26px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('차고 · 커스터마이징', 28, 42);
  ctx.font = '600 14px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = P.primary;
  ctx.fillText(`크레딧 ${save.credits}`, 28, 68);

  const tabs = [
    { id: 'vehicle', name: '차량' },
    { id: 'decal', name: '데칼' },
    { id: 'wheel', name: '바퀴' },
    { id: 'boost', name: '부스터' },
  ];
  tabs.forEach((tab, i) => {
    const box = pushUi(state, 28 + i * 120, 88, 110, 40, 'goto', `garage:${tab.id}`);
    // reuse goto with special — handle below via tab click hack
    box.action = 'tab';
    box.value = tab.id;
    drawBtn(ctx, box, tab.name, { active: state.garageTab === tab.id, fill: '#243447' });
  });

  // intercept tab actions
  state.ui.forEach((u) => {
    if (u.action === 'tab') {
      /* kept for hit test; handled in update via custom */
    }
  });

  ctx.save();
  ctx.translate(200, 250);
  ctx.scale(1.35, 1.35);
  drawCarBody(ctx, {
    vehicle: findById(VEHICLES, save.loadout.vehicle),
    cosmetics: save.loadout,
    angle: -0.08,
  });
  // boost preview
  const boost = findById(BOOSTS, save.loadout.boost);
  ctx.fillStyle = boost.color;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(-50, 0);
  ctx.lineTo(-80, -10);
  ctx.lineTo(-80, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const catalogs = {
    vehicle: VEHICLES,
    decal: DECALS,
    wheel: WHEELS,
    boost: BOOSTS,
  };
  const ownedKey = {
    vehicle: 'vehicles',
    decal: 'decals',
    wheel: 'wheels',
    boost: 'boosts',
  };
  const list = catalogs[state.garageTab] || VEHICLES;
  const owned = save.owned[ownedKey[state.garageTab]] || [];

  list.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 420 + col * 250;
    const y = 150 + row * 70;
    const have = owned.includes(item.id);
    const equipped = save.loadout[state.garageTab] === item.id;
    const box = pushUi(state, x, y, 230, 58, 'buy', `${state.garageTab}:${item.id}`);
    ctx.fillStyle = equipped ? '#1f4d3d' : '#1c2b3c';
    roundRect(ctx, box.x, box.y, box.w, box.h, 12);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '700 15px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.name, box.x + 14, box.y + 24);
    ctx.fillStyle = '#9db0c3';
    ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
    const label = have ? (equipped ? '장착 중 · 탭하여 유지' : '보유 · 탭하여 장착') : `${item.price} 크레딧`;
    ctx.fillText(label, box.x + 14, box.y + 44);
  });

  // color presets
  const colors = ['#3aa0ff', '#00e5a8', '#ff6b3d', '#f0c14b', '#ff4d6d', '#e8eef5'];
  colors.forEach((c, i) => {
    const box = pushUi(state, 36 + i * 44, 360, 36, 36, 'color', c);
    ctx.fillStyle = c;
    roundRect(ctx, box.x, box.y, box.w, box.h, 8);
    ctx.fill();
  });
  ctx.fillStyle = '#9db0c3';
  ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('차체 색', 36, 350);

  const back = pushUi(state, 28, H - 70, 140, 46, 'goto', 'hub');
  drawBtn(ctx, back, '로비로', { fill: '#314556' });

  if (state.toastT > 0) {
    ctx.fillStyle = '#000a';
    roundRect(ctx, W / 2 - 160, 20, 320, 36, 10);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.textAlign = 'center';
    ctx.font = '700 14px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(state.toast, W / 2, 42);
  }
}

function drawPass(ctx, state) {
  state.ui = [];
  const save = state.save;
  const level = passLevel(save.xp);
  const next = nextPassReward(save.xp);

  ctx.fillStyle = '#141022';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = P.text;
  ctx.font = '800 26px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('시즌 패스', 28, 42);
  ctx.font = '600 14px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = '#cbb8ff';
  ctx.fillText(`현재 Lv.${level} · XP ${save.xp}` + (next ? ` · 다음 ${next.xp} XP` : ' · 시즌 완료'), 28, 68);

  const barX = 28;
  const barW = W - 56;
  const progress = next
    ? (save.xp - (PASS_REWARDS.find((r) => r.level === level)?.xp || 0)) /
      Math.max(1, next.xp - (PASS_REWARDS.find((r) => r.level === level)?.xp || 0))
    : 1;
  ctx.fillStyle = '#2a2440';
  roundRect(ctx, barX, 88, barW, 18, 9);
  ctx.fill();
  ctx.fillStyle = '#9b7bff';
  roundRect(ctx, barX, 88, barW * clamp01(progress), 18, 9);
  ctx.fill();

  PASS_REWARDS.forEach((r, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 28 + col * 230;
    const y = 130 + row * 78;
    const unlocked = save.xp >= r.xp;
    const claimed = !!save.claimedPass[r.level];
    ctx.fillStyle = unlocked ? '#2a2150' : '#1a1828';
    roundRect(ctx, x, y, 214, 66, 12);
    ctx.fill();
    ctx.fillStyle = unlocked ? '#e8ddff' : '#6d6780';
    ctx.font = '800 13px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(`Lv.${r.level}`, x + 12, y + 24);
    ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(r.label, x + 12, y + 46);
    ctx.fillStyle = claimed ? P.primary : unlocked ? '#ffd27a' : '#555';
    ctx.fillText(claimed ? '수령' : unlocked ? '해금됨' : `${r.xp} XP`, x + 140, y + 24);
  });

  const claim = pushUi(state, W - 220, H - 70, 180, 46, 'claim-pass', '1');
  drawBtn(ctx, claim, '보상 받기', { fill: '#5b3fa6' });
  const back = pushUi(state, 28, H - 70, 140, 46, 'goto', 'hub');
  drawBtn(ctx, back, '로비로', { fill: '#314556' });
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function drawMatch(ctx, state) {
  const m = state.match;
  state.ui = [];
  state.controlZones = [];
  drawArena(ctx, m.mode);

  for (const t of m.trails) {
    ctx.globalAlpha = Math.max(0, t.life * 2);
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const car of m.cars) drawCarBody(ctx, car);

  // ball
  const ball = m.ball;
  ctx.fillStyle = '#0b0d10';
  ctx.beginPath();
  ctx.arc(ball.x + 3, ball.y + 4, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P.ball;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2f38';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ball.x - ball.r * 0.7, ball.y);
  ctx.lineTo(ball.x + ball.r * 0.7, ball.y);
  ctx.moveTo(ball.x, ball.y - ball.r * 0.7);
  ctx.lineTo(ball.x, ball.y + ball.r * 0.7);
  ctx.stroke();

  for (const p of m.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 5, 5);
    ctx.globalAlpha = 1;
  }

  // HUD
  ctx.fillStyle = '#0007';
  roundRect(ctx, W / 2 - 120, 12, 240, 48, 14);
  ctx.fill();
  ctx.fillStyle = P.blue;
  ctx.font = '800 24px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(m.score[0]), W / 2 - 70, 44);
  ctx.fillStyle = P.text;
  ctx.fillText(`${Math.ceil(m.timeLeft)}`, W / 2, 44);
  ctx.fillStyle = P.orange;
  ctx.fillText(String(m.score[1]), W / 2 + 70, 44);

  ctx.fillStyle = '#9db0c3';
  ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText(m.mode.name, W / 2, 66);
  ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText(m.mode.kind === 'hoops' ? '후프 쪽으로 공을 밀어 띄우세요 · 위에서 아래로 통과하면 골' : '파랑 = 우리 팀 · 오른쪽 주황 골대를 공격하세요 →', W / 2, 84);

  const player = m.cars.find((c) => c.isPlayer);
  if (player) {
    ctx.fillStyle = '#0007';
    roundRect(ctx, 16, 12, 150, 28, 10);
    ctx.fill();
    ctx.fillStyle = '#1a3344';
    roundRect(ctx, 22, 18, 138, 16, 6);
    ctx.fill();
    ctx.fillStyle = P.boost;
    roundRect(ctx, 22, 18, (138 * player.boost) / CONFIG.boostMax, 16, 6);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '700 11px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('부스트', 91, 30);
  }

  if (m.kickoff > 0) {
    ctx.fillStyle = '#0008';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = P.text;
    ctx.font = '800 48px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.kickoff > 0.4 ? String(Math.ceil(m.kickoff)) : 'GO!', W / 2, H / 2);
  }

  if (m.toastT > 0) {
    ctx.fillStyle = '#000a';
    roundRect(ctx, W / 2 - 120, 90, 240, 40, 12);
    ctx.fill();
    ctx.fillStyle = P.primary;
    ctx.font = '800 18px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.toast, W / 2, 116);
  }

  // controls
  const zones = [
    { x: 24, y: H - 100, w: 96, h: 78, action: 'left', label: '◀' },
    { x: 132, y: H - 100, w: 96, h: 78, action: 'right', label: '▶' },
    { x: W - 236, y: H - 100, w: 96, h: 78, action: 'jump', label: '점프' },
    { x: W - 124, y: H - 100, w: 100, h: 78, action: 'boost', label: '부스트' },
  ];
  state.controlZones = zones;
  for (const z of zones) {
    const on =
      (z.action === 'left' && (state._padLeft || false)) ||
      (z.action === 'right' && state._padRight) ||
      (z.action === 'jump' && state._padJump) ||
      (z.action === 'boost' && state._padBoost);
    ctx.fillStyle = on ? '#00e5a855' : '#0007';
    roundRect(ctx, z.x, z.y, z.w, z.h, 16);
    ctx.fill();
    ctx.fillStyle = P.text;
    ctx.font = '800 16px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(z.label, z.x + z.w / 2, z.y + z.h / 2);
  }
}

function render(ctx, state) {
  if (state.screen === 'hub') drawHub(ctx, state);
  else if (state.screen === 'garage' || String(state.screen).startsWith('garage')) drawGarage(ctx, state);
  else if (state.screen === 'pass') drawPass(ctx, state);
  else if (state.screen === 'match' && state.match) drawMatch(ctx, state);
  else drawHub(ctx, state);
}

// Extend update to handle garage tabs before shared update
const baseUpdate = updateGame;
function update(state, dt, input) {
  // tab hit handling injected via pending action rewrite
  if (input.pointer.pressed) {
    for (let i = (state.ui || []).length - 1; i >= 0; i -= 1) {
      const b = state.ui[i];
      const p = input.pointer;
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        if (b.action === 'tab') {
          state.garageTab = b.value;
          state.screen = 'garage';
          input.pointer.pressed = false;
          break;
        }
      }
    }
  }
  // visual pad feedback
  state._padLeft = false;
  state._padRight = false;
  state._padJump = false;
  state._padBoost = false;
  if (state.screen === 'match') {
    const keys = input.keys;
    if (keys.has('arrowleft') || keys.has('a')) state._padLeft = true;
    if (keys.has('arrowright') || keys.has('d')) state._padRight = true;
    if (keys.has(' ') || keys.has('w') || keys.has('arrowup')) state._padJump = true;
    if (keys.has('shift') || keys.has('e') || keys.has('f')) state._padBoost = true;
    for (const p of input.pointers) {
      for (const z of state.controlZones || []) {
        if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
          if (z.action === 'left') state._padLeft = true;
          if (z.action === 'right') state._padRight = true;
          if (z.action === 'jump') state._padJump = true;
          if (z.action === 'boost') state._padBoost = true;
        }
      }
    }
  }
  baseUpdate(state, dt, input);
}

mountGame({
  title: CONFIG.title,
  description:
    '2D 로켓카 축구! 파란 차를 조종해 오른쪽 주황 골대를 공격하세요. 후프스에서는 중앙 후프 쪽으로 공을 밀면 슛 궤적으로 떠오릅니다. 한 판 약 2분.',
  controls:
    '터치: ◀▶ 이동 · 점프 · 부스트 / 키보드: A·D 이동, W·Space 점프, Shift·E 부스트. 로비에서 모드·차고·시즌 패스를 고르세요.',
  width: W,
  height: H,
  theme: {
    background: P.background,
    primary: P.primary,
    text: P.text,
  },
  create: createGame,
  update,
  render,
});
