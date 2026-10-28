import { mountGame } from './game-shell.js';
import { CONFIG, VEHICLES, STAGES, UPGRADES } from './config.mjs';
import {
  createGame,
  updateGame,
  stageUnlocked,
  upgradesFor,
  upgradeCost,
  groundAt,
} from './game.mjs';

const W = CONFIG.width;
const H = CONFIG.height;

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

function btn(ui, x, y, w, h, action, value, opts = {}) {
  ui.push({ x, y, w, h, action, value, ...opts });
  return { x, y, w, h };
}

function drawButton(ctx, box, label, { fill = '#2f4a3a', text = '#f4f1e6', active = false, muted = false } = {}) {
  ctx.save();
  ctx.fillStyle = muted ? '#243028' : active ? CONFIG.palette.primary : fill;
  roundRect(ctx, box.x, box.y, box.w, box.h, 12);
  ctx.fill();
  if (active) {
    ctx.strokeStyle = '#fff6';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = muted ? '#8a958c' : active ? '#1a2418' : text;
  ctx.font = '700 13px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, box.x + box.w / 2, box.y + box.h / 2 + 1);
  ctx.restore();
}

function drawVehicleIcon(ctx, vehicle, x, y, scale = 1) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // 바퀴
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-vehicle.wheelBase / 2, 8, vehicle.wheelR * 0.55, 0, Math.PI * 2);
  ctx.arc(vehicle.wheelBase / 2, 8, vehicle.wheelR * 0.55, 0, Math.PI * 2);
  ctx.fill();
  // 차체
  ctx.fillStyle = vehicle.color;
  roundRect(ctx, -vehicle.bodyW / 2, -vehicle.bodyH, vehicle.bodyW, vehicle.bodyH + 6, vehicle.bike ? 8 : 6);
  ctx.fill();
  if (vehicle.tank) {
    ctx.fillStyle = '#0004';
    roundRect(ctx, -8, -vehicle.bodyH - 10, 28, 12, 4);
    ctx.fill();
  }
  if (vehicle.bike) {
    ctx.strokeStyle = '#1118';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.lineTo(8, -vehicle.bodyH);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGarage(ctx, state) {
  const ui = [];
  const { save } = state;
  // 배경
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1e3a2f');
  g.addColorStop(1, '#122018');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '800 22px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('차고', 24, 36);
  ctx.font = '700 14px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = CONFIG.palette.coin;
  ctx.fillText(`코인 ${save.coins}`, W - 140, 34);

  const tabV = btn(ui, 24, 52, 110, 36, 'tab', 'vehicles');
  const tabU = btn(ui, 142, 52, 110, 36, 'tab', 'upgrades');
  drawButton(ctx, tabV, '탈것', { active: state.garageTab === 'vehicles' });
  drawButton(ctx, tabU, '업그레이드', { active: state.garageTab === 'upgrades' });

  if (state.garageTab === 'vehicles') {
    const cols = 4;
    const cardW = 198;
    const cardH = 68;
    VEHICLES.forEach((v, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 24 + col * (cardW + 12);
      const y = 98 + row * (cardH + 8);
      const owned = save.owned.includes(v.id);
      const selected = state.vehicleId === v.id;
      const box = btn(ui, x, y, cardW, cardH, 'select-vehicle', v.id);
      ctx.fillStyle = selected ? '#3a5a45' : '#24362c';
      roundRect(ctx, box.x, box.y, box.w, box.h, 12);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = CONFIG.palette.primary;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      drawVehicleIcon(ctx, v, x + 36, y + 38, 0.72);
      ctx.fillStyle = CONFIG.palette.text;
      ctx.font = '700 12px "Malgun Gothic", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(v.name, x + 70, y + 24);
      ctx.font = '600 11px "Malgun Gothic", system-ui, sans-serif';
      ctx.fillStyle = owned ? CONFIG.palette.accent : CONFIG.palette.coin;
      ctx.fillText(owned ? (selected ? '선택됨' : '보유 · 선택') : `${v.price} 코인`, x + 70, y + 42);
      ctx.fillStyle = '#9aab9e';
      ctx.fillText(v.category, x + 70, y + 58);
    });
  } else {
    const vehicle = VEHICLES.find((v) => v.id === state.vehicleId) || VEHICLES[0];
    const levels = upgradesFor(save, vehicle.id);
    ctx.fillStyle = '#24362c';
    roundRect(ctx, 24, 104, W - 48, 220, 14);
    ctx.fill();
    drawVehicleIcon(ctx, vehicle, 90, 200, 1.4);
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '800 16px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(vehicle.name, 150, 140);
    ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
    ctx.fillStyle = '#a8b8ac';
    ctx.fillText(save.owned.includes(vehicle.id) ? '부품을 업그레이드하세요' : '구매 후 업그레이드할 수 있어요', 150, 162);

    UPGRADES.forEach((u, i) => {
      const lv = levels[u.id] || 0;
      const cost = upgradeCost(lv);
      const y = 186 + i * 34;
      ctx.fillStyle = CONFIG.palette.text;
      ctx.font = '700 13px "Malgun Gothic", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${u.name}  Lv.${lv}/${CONFIG.upgradeMax}`, 150, y + 14);
      ctx.fillStyle = '#7f9184';
      ctx.font = '600 11px "Malgun Gothic", system-ui, sans-serif';
      ctx.fillText(u.desc, 320, y + 14);
      const maxed = lv >= CONFIG.upgradeMax;
      const box = btn(ui, W - 168, y, 120, 28, 'upgrade', u.id);
      drawButton(ctx, box, maxed ? 'MAX' : `${cost} 코인`, {
        fill: '#355844',
        muted: maxed || !save.owned.includes(vehicle.id),
      });
    });
  }

  const stageBtn = btn(ui, W - 280, H - 56, 120, 40, 'open-stage', null);
  const goBtn = btn(ui, W - 148, H - 56, 124, 40, 'start-race', null);
  drawButton(ctx, stageBtn, '스테이지', { fill: '#355844' });
  drawButton(ctx, goBtn, '출발!', { fill: CONFIG.palette.primary, text: '#1a2418', active: true });

  if (state.messageT > 0 && state.message) {
    ctx.fillStyle = '#000a';
    roundRect(ctx, W / 2 - 160, H - 100, 320, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, W / 2, H - 80);
  }

  state.ui = ui;
}

function drawStageSelect(ctx, state) {
  const ui = [];
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1a2830');
  g.addColorStop(1, '#101820');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '800 22px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('스테이지 선택', 24, 36);

  STAGES.forEach((st, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 24 + col * 268;
    const y = 64 + row * 140;
    const unlocked = stageUnlocked(state.save, st);
    const selected = state.stageId === st.id;
    const box = btn(ui, x, y, 252, 120, 'pick-stage', st.id);
    const sky = ctx.createLinearGradient(x, y, x, y + 120);
    sky.addColorStop(0, st.sky[0]);
    sky.addColorStop(1, st.sky[1]);
    ctx.fillStyle = sky;
    roundRect(ctx, box.x, box.y, box.w, box.h, 14);
    ctx.fill();
    ctx.fillStyle = st.ground;
    ctx.beginPath();
    ctx.moveTo(x, y + 90);
    ctx.quadraticCurveTo(x + 60, y + 70, x + 120, y + 88);
    ctx.quadraticCurveTo(x + 180, y + 108, x + 252, y + 80);
    ctx.lineTo(x + 252, y + 120);
    ctx.lineTo(x, y + 120);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = CONFIG.palette.primary;
      ctx.lineWidth = 3;
      roundRect(ctx, box.x, box.y, box.w, box.h, 14);
      ctx.stroke();
    }
    ctx.fillStyle = unlocked ? '#fff' : '#fffc';
    ctx.font = '800 16px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(st.name, x + 14, y + 28);
    ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
    if (unlocked) {
      const best = state.save.best[st.id] || 0;
      ctx.fillText(`최고 ${best}m`, x + 14, y + 50);
      ctx.fillText(`중력 ${(st.gravity / 980).toFixed(2)}g`, x + 14, y + 70);
    } else {
      ctx.fillStyle = '#1a1a1acc';
      roundRect(ctx, box.x, box.y, box.w, box.h, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(`잠김 · ${st.unlockAt}m 달성 시 해금`, x + 14, y + 60);
    }
  });

  const back = btn(ui, 24, H - 56, 120, 40, 'open-garage', null);
  const go = btn(ui, W - 148, H - 56, 124, 40, 'start-race', null);
  drawButton(ctx, back, '차고로', { fill: '#355844' });
  drawButton(ctx, go, '출발!', { fill: CONFIG.palette.primary, text: '#1a2418', active: true });

  if (state.messageT > 0 && state.message) {
    ctx.fillStyle = '#000a';
    roundRect(ctx, W / 2 - 180, H - 100, 360, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, W / 2, H - 80);
  }

  state.ui = ui;
}

function drawStars(ctx, camX, count, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const sx = ((i * 137 + 40) * 19 - camX * 0.15) % W;
    const sy = (i * 47) % (H * 0.55);
    const x = ((sx % W) + W) % W;
    ctx.beginPath();
    ctx.arc(x, 20 + sy, i % 3 === 0 ? 1.6 : 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRace(ctx, state) {
  const race = state.race;
  if (!race) return;
  const { stage, car, stats, terrain } = race;
  const cam = race.camX;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, stage.sky[0]);
  sky.addColorStop(1, stage.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  if (stage.id === 'moon' || stage.id === 'mars' || stage.id === 'cave') {
    drawStars(ctx, cam, stage.id === 'cave' ? 20 : 55, stage.id === 'mars' ? '#ffc8a8' : '#fff');
  }

  ctx.save();
  ctx.translate(0, -(race.camY || 0));
  // 먼 언덕 실루엣
  ctx.fillStyle = stage.dirt + '99';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 24) {
    const wx = cam * 0.4 + x;
    const gy = groundAt(terrain, wx) * 0.35 + 180;
    ctx.lineTo(x, gy);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // 지형
  ctx.beginPath();
  ctx.moveTo(-2, H + 2);
  for (let x = -20; x <= W + 20; x += 10) {
    const wx = cam + x;
    ctx.lineTo(x, groundAt(terrain, wx));
  }
  ctx.lineTo(W + 2, H + 2);
  ctx.closePath();
  ctx.fillStyle = stage.ground;
  ctx.fill();
  ctx.fillStyle = stage.dirt;
  ctx.beginPath();
  ctx.moveTo(-2, H + 2);
  for (let x = -20; x <= W + 20; x += 10) {
    const wx = cam + x;
    ctx.lineTo(x, groundAt(terrain, wx) + 18);
  }
  ctx.lineTo(W + 2, H + 2);
  ctx.closePath();
  ctx.fill();

  // 픽업
  for (const f of race.fuels) {
    if (f.taken) continue;
    const sx = f.x - cam;
    if (sx < -40 || sx > W + 40) continue;
    ctx.fillStyle = CONFIG.palette.fuel;
    ctx.strokeStyle = '#dff8ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx - 6, f.y - 20, 10, 7);
    roundRect(ctx, sx - 10, f.y - 14, 20, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#0a3040';
    ctx.font = '800 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('F', sx, f.y + 2);
  }
  for (const coin of race.coins) {
    if (coin.taken) continue;
    const sx = coin.x - cam;
    if (sx < -40 || sx > W + 40) continue;
    ctx.fillStyle = CONFIG.palette.coin;
    ctx.beginPath();
    ctx.arc(sx, coin.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5a00';
    ctx.font = '800 10px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', sx, coin.y + 1);
  }

  // 차량
  const sx = car.x - cam;
  const sy = car.y;
  const groundY = groundAt(terrain, car.x);
  ctx.fillStyle = '#0003';
  ctx.beginPath();
  ctx.ellipse(sx, groundY - 2, Math.max(12, 28 - (groundY - sy) * 0.04), 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(car.angle);
  // 바퀴
  for (const w of car.wheels) {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(w.lx, w.ly + Math.min(w.spring, 8) * 0.15, stats.wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w.lx - 4, w.ly);
    ctx.lineTo(w.lx + 4, w.ly);
    ctx.stroke();
  }
  ctx.fillStyle = race.vehicle.color;
  roundRect(ctx, -stats.bodyW / 2, -stats.bodyH * 0.85, stats.bodyW, stats.bodyH, race.vehicle.bike ? 8 : 7);
  ctx.fill();
  if (race.vehicle.tank) {
    ctx.fillStyle = '#0005';
    roundRect(ctx, -6, -stats.bodyH - 8, 30, 12, 4);
    ctx.fill();
  }
  // 캐빈
  ctx.fillStyle = '#ffffff55';
  roundRect(ctx, -6, -stats.bodyH * 0.85, stats.bodyW * 0.28, stats.bodyH * 0.55, 4);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // HUD
  const meters = Math.floor(race.maxDistance / 10);
  ctx.fillStyle = '#0007';
  roundRect(ctx, 12, 10, 200, 58, 12);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 18px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${meters} m`, 24, 36);
  ctx.font = '600 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = CONFIG.palette.coin;
  ctx.fillText(`코인 +${race.earned}`, 24, 56);

  // 연료
  ctx.fillStyle = '#0007';
  roundRect(ctx, W - 168, 10, 156, 28, 10);
  ctx.fill();
  ctx.fillStyle = '#234';
  roundRect(ctx, W - 160, 16, 140, 16, 6);
  ctx.fill();
  const fw = (140 * race.fuel) / CONFIG.fuelMax;
  ctx.fillStyle = race.fuel < 25 ? CONFIG.palette.danger : CONFIG.palette.fuel;
  roundRect(ctx, W - 160, 16, fw, 16, 6);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 11px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`연료 ${Math.ceil(race.fuel)}%`, W - 90, 28);
  if (race.pickupT > 0) {
    ctx.fillStyle = CONFIG.palette.fuel;
    ctx.fillText(`+${CONFIG.fuelPickup} 연료`, W - 90, 78);
  } else if (race.fuel < 25 && Math.sin(race.time * 7) > -0.2) {
    ctx.fillStyle = CONFIG.palette.danger;
    ctx.fillText('연료통을 찾아보세요!', W - 90, 78);
  }

  ctx.fillStyle = '#fff9';
  ctx.font = '600 11px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(stage.name + ' · ' + race.vehicle.name, W - 16, 56);

  // 페달
  const brakeOn = state.pedals.brake;
  const gasOn = state.pedals.gas;
  ctx.fillStyle = brakeOn ? '#e85d4ccc' : '#0006';
  roundRect(ctx, 18, H - 92, 120, 74, 16);
  ctx.fill();
  ctx.fillStyle = gasOn ? '#3ecf8ecc' : '#0006';
  roundRect(ctx, W - 138, H - 92, 120, 74, 16);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 15px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('브레이크', 78, H - 58);
  ctx.font = '600 11px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText('후진 · 균형', 78, H - 38);
  ctx.font = '800 15px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText('가속', W - 78, H - 58);
  ctx.font = '600 11px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText('전진 · 균형', W - 78, H - 38);

  state.ui = [];
}

function render(ctx, state) {
  if (state.screen === 'garage') drawGarage(ctx, state);
  else if (state.screen === 'stage') drawStageSelect(ctx, state);
  else drawRace(ctx, state);
}

mountGame({
  title: CONFIG.title,
  description:
    '가속·브레이크로 균형을 잡으며 언덕길을 달려 보세요.\n연료를 주워 더 멀리 가고, 코인으로 탈것과 부품을 키울 수 있어요.',
  controls:
    '오른쪽 페달(→/D/W): 가속 · 왼쪽 페달(←/A/S): 브레이크·후진\n공중: 오른쪽 앞회전 · 왼쪽 뒤회전 · 손을 떼면 회전 감속. 언덕 정상에서 속도를 내어 점프하세요.',
  width: W,
  height: H,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});
