import { RULES, STAGES } from './config.mjs';
import { needsTurn } from './game.mjs';
import { findHero, findPet, heroSprite, petSprite, imageFor } from './characters.mjs';

// 화면 크기와 배치. anchorY는 주인공 발이 놓이는 높이, panelY는 아래 버튼 칸의 시작.
export const LAYOUT = { width: 480, height: 680, stepW: 50, stepH: 34, stepSize: 56, anchorY: 430, panelY: 590 };
const W = LAYOUT.width, H = LAYOUT.height;
const FONT = '"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
const INK = '#16121f';

export const stageFor = state => STAGES[state.stage % STAGES.length];
const sx = (state, col) => W / 2 + (col - state.view.x) * LAYOUT.stepW;
const sy = (state, level) => LAYOUT.anchorY - (level - state.view.y) * LAYOUT.stepH;

export function renderGame(ctx, state, view) {
  const stage = stageFor(state), clock = performance.now() / 1000;
  ctx.imageSmoothingEnabled = false;
  drawSky(ctx, state, stage, clock);
  drawStairs(ctx, state, stage, clock);
  drawPet(ctx, state, clock);
  drawHero(ctx, state);
  drawEffects(ctx, state);
  drawDanger(ctx, state, clock);
  drawHud(ctx, state, stage, clock, view.mode);
  drawPanel(ctx, state, clock, view.mode);
  if (state.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
}

function drawSky(ctx, state, stage, clock) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, stage.skyTop);
  gradient.addColorStop(1, stage.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  const climb = state.view.y * LAYOUT.stepH;

  if (stage.stars) for (let i = 0; i < 46; i++) {
    const x = (i * 97 + 13) % W, y = ((i * 61 + climb * 0.12) % (H + 20)) - 10;
    const twinkle = (Math.sin(clock * 2 + i) + 1) / 2, size = i % 5 === 0 ? 3 : 2;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * twinkle})`;
    ctx.fillRect(x, y, size, size);
  }
  if (stage.planet) {
    const y = 140 + (climb * 0.04) % 260;
    ctx.fillStyle = '#ff7ad9'; ctx.beginPath(); ctx.arc(370, y, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb3ec'; ctx.fillRect(352, y - 18, 12, 8);
    ctx.strokeStyle = '#ffe1f7'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(370, y, 58, 12, -0.3, 0, Math.PI * 2); ctx.stroke();
  }
  if (stage.clouds) for (let i = 0; i < 6; i++) {
    const x = ((i * 151 + clock * (10 + i * 3)) % (W + 160)) - 80;
    const y = ((i * 113 + climb * 0.3) % (H + 120)) - 60;
    drawCloud(ctx, x, y, 1 + (i % 3) * 0.3);
  }
  const base = LAYOUT.panelY + climb * 0.45;
  if (base - 170 < H) for (let i = 0; i < 11; i++) {
    const height = 70 + ((i * 37) % 90), x = i * 46 - 12;
    ctx.fillStyle = stage.city;
    ctx.fillRect(x, base - height, 42, height + 30);
    ctx.fillStyle = stage.windows;
    for (let wy = base - height + 10; wy < base - 8; wy += 16) for (let wx = x + 7; wx < x + 36; wx += 12) {
      if ((wx + wy + i) % 3) ctx.fillRect(wx, wy, 5, 6);
    }
  }
}

function drawCloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillRect(x, y + 8 * s, 60 * s, 14 * s);
  ctx.fillRect(x + 10 * s, y, 26 * s, 12 * s);
  ctx.fillRect(x + 30 * s, y + 4 * s, 20 * s, 10 * s);
}

function drawStairs(ctx, state, stage, clock) {
  const first = Math.max(0, state.stepIndex - 8), last = Math.min(state.steps.length - 1, state.stepIndex + 16);
  for (let i = last; i >= first; i--) {
    const step = state.steps[i], x = sx(state, step.col), y = sy(state, i);
    if (y < -40 || y > LAYOUT.panelY + 30) continue;
    drawStep(ctx, x, y, stage, i);
    if (i > 0 && i % RULES.stageSteps === 0) drawFlag(ctx, x, y, i);
    if (step.coin) drawCoin(ctx, x, y - 26, clock * 3 + i);
  }
}

function drawStep(ctx, x, y, stage, i) {
  const w = LAYOUT.stepSize, left = x - w / 2;
  ctx.fillStyle = stage.edge; ctx.fillRect(left - 3, y - 3, w + 6, 28);
  ctx.fillStyle = stage.top; ctx.fillRect(left, y, w, 9);
  ctx.fillStyle = stage.front; ctx.fillRect(left, y + 9, w, 13);
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(left, y, w, 3);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  const offset = (i % 2) * 14;
  ctx.fillRect(x - 14 + offset, y + 9, 3, 13);
  ctx.fillRect(x + 12 - offset, y + 9, 3, 13);
}

function drawFlag(ctx, x, y, number) {
  ctx.fillStyle = INK; ctx.fillRect(x + 20, y - 46, 4, 46);
  ctx.fillStyle = '#ff4d6d'; ctx.fillRect(x + 24, y - 46, 34, 20);
  ctx.fillStyle = '#fff'; ctx.font = `900 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(number), x + 41, y - 36);
}

function drawCoin(ctx, x, y, t) {
  const w = 14 * Math.max(0.25, Math.abs(Math.cos(t)));
  y += Math.sin(t * 1.3) * 3;
  ctx.fillStyle = '#7a4a00'; ctx.fillRect(x - w / 2 - 2, y - 9, w + 4, 18);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - w / 2, y - 7, w, 14);
  ctx.fillStyle = '#fff3a0'; ctx.fillRect(x - w / 2 + 1, y - 6, Math.max(2, w * 0.3), 5);
}

function drawSprite(ctx, image, x, y, facing, rotation = 0, height = image.height) {
  const width = (image.naturalWidth || image.width) * height / (image.naturalHeight || image.height);
  ctx.save();
  ctx.translate(x, y);
  if (rotation) { ctx.translate(0, -height / 2); ctx.rotate(rotation); ctx.translate(0, height / 2); }
  ctx.scale(facing, 1);
  ctx.drawImage(image, -width / 2, -height, width, height);
  ctx.restore();
}

function drawHero(ctx, state) {
  const hero = findHero(state.hero);
  let x = W / 2, y = LAYOUT.anchorY, rotation = 0;
  if (state.phase === 'play') y -= Math.sin(state.hop * Math.PI) * 12;
  else {
    const t = state.fallTimer;
    x = sx(state, state.fallCol);
    y = sy(state, state.fallLevel) + t * t * 1400 - Math.sin(Math.min(1, t * 5) * Math.PI) * 14;
    rotation = t * 7 * state.facing;
  }
  const custom = imageFor(hero.image);
  if (custom) drawSprite(ctx, custom, x, y + 2, state.facing, rotation, 52);
  else drawSprite(ctx, heroSprite(hero, state.hop > 0.35 ? 'step' : 'stand'), x, y + 2, state.facing, rotation);
}

function drawPet(ctx, state, clock) {
  const pet = findPet(state.pet);
  const art = imageFor(pet.image) || petSprite(pet);
  if (!art) return;
  const x = sx(state, state.petView.x) - state.facing * 16;
  const y = sy(state, state.petView.y) + 2 - Math.abs(Math.sin(clock * 6)) * 3;
  drawSprite(ctx, art, x, y, state.facing, 0, pet.image ? 28 : art.height);
}

function drawEffects(ctx, state) {
  for (const item of state.effects) {
    const x = sx(state, item.col), y = sy(state, item.level), k = item.t / item.life;
    ctx.globalAlpha = 1 - k;
    if (item.kind === 'dust') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 4; i++) ctx.fillRect(x - 20 + i * 12 - (i < 2 ? k * 12 : -k * 12), y - 4 - k * 10, 5, 5);
    } else if (item.kind === 'text') {
      ctx.font = `900 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
      ctx.strokeText(item.text, x, y - k * 40);
      ctx.fillStyle = item.color; ctx.fillText(item.text, x, y - k * 40);
    }
    ctx.globalAlpha = 1;
  }
}

function drawDanger(ctx, state, clock) {
  if (state.phase !== 'play' || !state.started || state.time / RULES.timeMax > 0.25) return;
  ctx.fillStyle = `rgba(255,40,60,${0.18 + 0.12 * Math.sin(clock * 14)})`;
  ctx.fillRect(0, 0, W, 12); ctx.fillRect(0, LAYOUT.panelY - 12, W, 12);
  ctx.fillRect(0, 0, 12, LAYOUT.panelY); ctx.fillRect(W - 12, 0, 12, LAYOUT.panelY);
}

function outlinedText(ctx, text, x, y, size, color = '#ffffff', weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.lineWidth = Math.max(4, size / 6); ctx.strokeStyle = INK; ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function drawHud(ctx, state, stage, clock, mode) {
  const ratio = Math.max(0, Math.min(1, state.time / RULES.timeMax));
  const bx = 76, by = 16, bw = 334, bh = 22;
  ctx.fillStyle = INK; ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
  ctx.fillStyle = '#3a3350'; ctx.fillRect(bx, by, bw, bh);
  let color = ratio > 0.5 ? '#5be37a' : ratio > 0.25 ? '#ffd23f' : '#ff4d4d';
  if (ratio <= 0.25 && state.started && state.phase === 'play' && Math.sin(clock * 18) > 0) color = '#ff9a9a';
  ctx.fillStyle = color; ctx.fillRect(bx, by, bw * ratio, bh);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx, by, bw * ratio, 5);
  drawClock(ctx, bx - 26, by + bh / 2);

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  outlinedText(ctx, String(state.score), W / 2, 100, 52);
  drawCoin(ctx, 30, 70, 0);
  ctx.textAlign = 'left';
  outlinedText(ctx, String(state.coins), 46, 78, 20, '#ffe066', 800);
  ctx.textAlign = 'right';
  outlinedText(ctx, stage.name, W - 16, 78, 14, '#ffffff', 800);

  ctx.textAlign = 'center';
  if (mode === 'play' && state.phase === 'play' && !state.started && Math.sin(clock * 6) > -0.4) {
    outlinedText(ctx, '오른쪽 버튼으로 한 칸 오르기!', W / 2, 162, 20, '#ffe066');
    outlinedText(ctx, '왼쪽 버튼으로 방향 바꾸기', W / 2, 190, 17, '#ffffff');
  }
  if (state.flash > 0 && state.stage > 0) {
    ctx.globalAlpha = Math.min(1, state.flash * 2);
    outlinedText(ctx, `${state.stage * RULES.stageSteps}계단 돌파!`, W / 2, 200, 34, '#ffe066');
    outlinedText(ctx, stage.name, W / 2, 236, 20);
    ctx.globalAlpha = 1;
  }
}

function drawClock(ctx, x, y) {
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.fillRect(x - 1, y - 7, 3, 8); ctx.fillRect(x - 1, y - 1, 7, 3);
}

function drawPanel(ctx, state, clock, mode) {
  const top = LAYOUT.panelY;
  ctx.fillStyle = 'rgba(16,12,30,.86)'; ctx.fillRect(0, top, W, H - top);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(0, top, W, 2);
  const hint = mode === 'play' && state.phase === 'play' && state.score < 15;
  const turnNeeded = needsTurn(state);
  drawButton(ctx, 14, top + 10, 218, H - top - 22, '방향 전환', '← · A · F', '#ff8a4c', state.press.turn, 'turn', hint && turnNeeded);
  drawButton(ctx, 248, top + 10, 218, H - top - 22, '계단 오르기', '→ · D · J', '#4cc2ff', state.press.climb, 'climb', hint && !turnNeeded);
}

function drawButton(ctx, x, y, w, h, label, keys, color, press, icon, hint) {
  const down = press > 0 ? 3 : 0;
  ctx.fillStyle = '#0b0814'; ctx.fillRect(x, y + 4, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y + down, w, h - 4);
  if (press > 0) { ctx.fillStyle = `rgba(255,255,255,${press * 0.4})`; ctx.fillRect(x, y + down, w, h - 4); }
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y + down, w, 4);
  if (hint) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect(x - 3, y + down - 3, w + 6, h + 2); }
  const cx = x + 40, cy = y + down + h / 2 - 2;
  ctx.fillStyle = INK;
  if (icon === 'turn') {
    ctx.font = `900 35px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('↶', cx, cy);
  } else {
    ctx.fillRect(cx - 3, cy - 4, 6, 23);
    ctx.beginPath(); ctx.moveTo(cx, cy - 17); ctx.lineTo(cx - 14, cy - 1); ctx.lineTo(cx - 5, cy - 1); ctx.lineTo(cx - 5, cy + 4); ctx.lineTo(cx + 5, cy + 4); ctx.lineTo(cx + 5, cy - 1); ctx.lineTo(cx + 14, cy - 1); ctx.fill();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `900 20px ${FONT}`; ctx.fillText(label, x + 65, cy - 6);
  ctx.font = `700 13px ${FONT}`; ctx.fillStyle = 'rgba(22,18,31,.75)'; ctx.fillText(keys, x + 70, cy + 16);
}
