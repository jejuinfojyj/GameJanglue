// 캐릭터 그리기. 모두 뒤에서 본 모습이며 (sx, sy)는 발 위치, s는 1m의 화면 크기(px)다.
import { HEROES, BOARDS, ART } from './config.mjs';

export const findHero = id => HEROES.find(h => h.id === id) || HEROES[0];
export const findBoard = id => BOARDS.find(b => b.id === id) || BOARDS[0];

const images = {};
for (const [key, src] of Object.entries(ART)) {
  if (!src) continue;
  const image = new Image();
  image.onload = () => { images[key] = image; };
  image.src = src;
}
export const artImage = key => images[key] || null;

function rect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  ctx.fill();
}

function limb(ctx, x1, y1, x2, y2, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

export function drawBoard(ctx, sx, sy, s, boardId, time) {
  const b = findBoard(boardId);
  ctx.save();
  ctx.shadowColor = b.glow; ctx.shadowBlur = 0.5 * s;
  ctx.fillStyle = b.glow;
  ctx.globalAlpha *= 0.55 + 0.25 * Math.sin(time * 12);
  ctx.beginPath(); ctx.ellipse(sx, sy + 0.1 * s, 0.5 * s, 0.14 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  rect(ctx, sx - 0.42 * s, sy - 0.1 * s, 0.84 * s, 0.14 * s, 0.07 * s, b.deck);
  rect(ctx, sx - 0.3 * s, sy - 0.08 * s, 0.6 * s, 0.04 * s, 0.02 * s, '#ffffff88');
}

function drawJetpack(ctx, sx, sy, s, time) {
  for (const side of [-1, 1]) {
    const x = sx + side * 0.13 * s;
    rect(ctx, x - 0.09 * s, sy - 1.45 * s, 0.18 * s, 0.5 * s, 0.08 * s, '#b8c0cc');
    rect(ctx, x - 0.09 * s, sy - 1.45 * s, 0.18 * s, 0.1 * s, 0.05 * s, '#ff5d6c');
    const flame = 0.35 + 0.15 * Math.sin(time * 40 + side);
    const g = ctx.createLinearGradient(0, sy - 0.95 * s, 0, sy - (0.95 - flame) * s);
    g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ff9a3d'); g.addColorStop(1, '#ff3d3d00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 0.08 * s, sy - 0.95 * s); ctx.lineTo(x + 0.08 * s, sy - 0.95 * s); ctx.lineTo(x, sy - (0.95 - flame) * s);
    ctx.fill();
  }
}

/**
 * pose: { phase, rolling, air, jet, onBoard, boardId, time }
 */
export function drawHero(ctx, sx, sy, s, heroId, pose) {
  const h = findHero(heroId);
  const lift = pose.onBoard ? 0.18 * s : 0;
  if (pose.onBoard) drawBoard(ctx, sx, sy, s, pose.boardId, pose.time);
  const fy = sy - lift;

  const image = artImage('hero');
  if (image) {
    const height = (pose.rolling ? 0.9 : 1.8) * s, width = image.width / image.height * 1.8 * s;
    ctx.drawImage(image, sx - width / 2, fy - height, width, height);
    if (pose.jet) drawJetpack(ctx, sx, fy, s, pose.time);
    return;
  }

  if (pose.rolling) {
    const r = 0.45 * s, spin = pose.time * 14;
    ctx.fillStyle = h.hoodie;
    ctx.beginPath(); ctx.arc(sx, fy - r, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#00000033'; ctx.lineWidth = 0.06 * s;
    for (let i = 0; i < 3; i++) {
      const a = spin + i * 2.1;
      ctx.beginPath(); ctx.arc(sx, fy - r, r * 0.7, a, a + 1.2); ctx.stroke();
    }
    ctx.fillStyle = h.cap;
    ctx.beginPath(); ctx.arc(sx, fy - r * 1.55, r * 0.5, Math.PI, 0); ctx.fill();
    return;
  }

  const swing = pose.air ? 0 : Math.sin(pose.phase);
  const tuck = pose.air && !pose.jet ? 0.22 : 0;
  // 다리
  const hipY = fy - 0.86 * s;
  for (const side of [-1, 1]) {
    const raise = Math.max(0, swing * side) * 0.3 + tuck;
    const footY = fy - raise * s;
    limb(ctx, sx + side * 0.1 * s, hipY, sx + side * 0.12 * s, footY - 0.08 * s, 0.17 * s, h.pants);
    rect(ctx, sx + side * 0.12 * s - 0.1 * s, footY - 0.12 * s, 0.2 * s, 0.13 * s, 0.05 * s, '#f4f4f4');
    rect(ctx, sx + side * 0.12 * s - 0.1 * s, footY - 0.03 * s, 0.2 * s, 0.04 * s, 0.02 * s, '#ff5d6c');
  }
  // 팔
  const shoulderY = fy - 1.38 * s;
  for (const side of [-1, 1]) {
    const reach = pose.air ? -0.45 : swing * -side * 0.28;
    limb(ctx, sx + side * 0.27 * s, shoulderY, sx + side * 0.36 * s, shoulderY + (0.42 + reach * 0.5) * s, 0.13 * s, h.hoodie);
    ctx.fillStyle = h.skin;
    ctx.beginPath(); ctx.arc(sx + side * 0.36 * s, shoulderY + (0.45 + reach * 0.5) * s, 0.065 * s, 0, Math.PI * 2); ctx.fill();
  }
  // 몸통과 가방
  rect(ctx, sx - 0.29 * s, fy - 1.5 * s, 0.58 * s, 0.7 * s, 0.14 * s, h.hoodie);
  rect(ctx, sx - 0.29 * s, fy - 0.9 * s, 0.58 * s, 0.1 * s, 0.04 * s, '#00000022');
  if (pose.jet) drawJetpack(ctx, sx, fy, s, pose.time);
  else {
    rect(ctx, sx - 0.19 * s, fy - 1.42 * s, 0.38 * s, 0.44 * s, 0.09 * s, h.bag);
    rect(ctx, sx - 0.12 * s, fy - 1.2 * s, 0.24 * s, 0.14 * s, 0.05 * s, '#00000026');
  }
  // 머리와 모자 (뒤에서 본 모습)
  ctx.fillStyle = h.skin;
  ctx.beginPath(); ctx.arc(sx - 0.17 * s, fy - 1.66 * s, 0.05 * s, 0, Math.PI * 2); ctx.arc(sx + 0.17 * s, fy - 1.66 * s, 0.05 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = h.hair;
  ctx.beginPath(); ctx.arc(sx, fy - 1.68 * s, 0.18 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = h.cap;
  ctx.beginPath(); ctx.arc(sx, fy - 1.72 * s, 0.19 * s, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  rect(ctx, sx - 0.1 * s, fy - 1.64 * s, 0.2 * s, 0.07 * s, 0.03 * s, h.cap);
}

export function drawGuard(ctx, sx, sy, s, phase, caught) {
  const swing = Math.sin(phase);
  for (const side of [-1, 1]) {
    const raise = Math.max(0, swing * side) * 0.3;
    limb(ctx, sx + side * 0.12 * s, sy - 0.9 * s, sx + side * 0.13 * s, sy - (raise + 0.08) * s, 0.2 * s, '#1f2f5c');
    rect(ctx, sx + side * 0.13 * s - 0.11 * s, sy - (raise + 0.12) * s, 0.22 * s, 0.12 * s, 0.04 * s, '#111');
  }
  for (const side of [-1, 1]) {
    const reach = caught ? -0.6 : swing * -side * 0.3;
    limb(ctx, sx + side * 0.32 * s, sy - 1.45 * s, sx + side * 0.42 * s, sy - (1.0 - reach * 0.6) * s, 0.15 * s, '#2c4a8c');
  }
  rect(ctx, sx - 0.34 * s, sy - 1.6 * s, 0.68 * s, 0.76 * s, 0.14 * s, '#2c4a8c');
  rect(ctx, sx - 0.34 * s, sy - 0.98 * s, 0.68 * s, 0.09 * s, 0.03 * s, '#1a1a1a');
  ctx.fillStyle = '#e8b48c';
  ctx.beginPath(); ctx.arc(sx, sy - 1.78 * s, 0.19 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1f2f5c';
  ctx.beginPath(); ctx.arc(sx, sy - 1.84 * s, 0.21 * s, Math.PI, 0); ctx.fill();
  rect(ctx, sx - 0.26 * s, sy - 1.86 * s, 0.52 * s, 0.07 * s, 0.03 * s, '#1f2f5c');
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.arc(sx, sy - 1.95 * s, 0.05 * s, 0, Math.PI * 2); ctx.fill();
}

export function drawDog(ctx, sx, sy, s, phase) {
  const hop = Math.abs(Math.sin(phase * 1.3)) * 0.12 * s;
  const y = sy - hop;
  ctx.fillStyle = '#b5773b';
  ctx.beginPath(); ctx.ellipse(sx, y - 0.32 * s, 0.2 * s, 0.24 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx, y - 0.62 * s, 0.15 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a4a1f';
  ctx.beginPath(); ctx.ellipse(sx - 0.13 * s, y - 0.66 * s, 0.05 * s, 0.11 * s, -0.4, 0, Math.PI * 2); ctx.ellipse(sx + 0.13 * s, y - 0.66 * s, 0.05 * s, 0.11 * s, 0.4, 0, Math.PI * 2); ctx.fill();
  limb(ctx, sx, y - 0.45 * s, sx + Math.sin(phase * 3) * 0.12 * s, y - 0.72 * s, 0.05 * s, '#b5773b');
}

/** 시작 화면 고르기 칸에 쓰는 작은 그림 */
export function heroPortrait(heroId, width = 44, height = 52) {
  const canvas = document.createElement('canvas');
  canvas.width = width * 2; canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  drawHero(ctx, width / 2, height - 2, height / 2.05, heroId, { phase: 0.6, time: 0 });
  return canvas;
}
export function boardPortrait(boardId, width = 44, height = 52) {
  const canvas = document.createElement('canvas');
  canvas.width = width * 2; canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-0.5);
  drawBoard(ctx, 0, 6, 44, boardId, 0.4);
  return canvas;
}
