// 화면 그리기: 배경, 새총, 새, 돼지, 블록, 효과, 점수판.
import { WORLD, SLING, MATERIALS, PIGS, IMAGES } from './config.mjs';
import { BIRDS, EGG } from './birds.mjs';
import { LEVELS } from './levels.mjs';
import { pullVelocity, queueSpot, pigsLeft, canUseAbility, formatScore } from './game.mjs';
import { loadImage, drawImageCover } from './game-tools.js';

const FONT = 'system-ui,-apple-system,"Malgun Gothic",sans-serif';
const G = WORLD.ground;
const art = {};

export function loadArt() {
  const list = [['background', IMAGES.background], ['pig', IMAGES.pig],
    ...Object.entries(IMAGES.birds).map(([type, src]) => ['bird:' + type, src])];
  for (const [key, src] of list) if (src) loadImage(src).then(img => { art[key] = img; }).catch(() => {});
}

const rand = seed => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function label(ctx, str, x, y, size, { align = 'left', color = '#fffaf0', stroke = '#1b2a3a', weight = 800, base = 'alphabetic' } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size / 4.5);
  ctx.strokeStyle = stroke;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- 배경 ----------
function hills(ctx, baseY, amp, freq, phase, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, G);
  for (let x = 0; x <= WORLD.width; x += 16)
    ctx.lineTo(x, baseY - Math.sin(x * freq + phase) * amp - Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35);
  ctx.lineTo(WORLD.width, G);
  ctx.fill();
}

function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 22 * s, y - 10 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 48 * s, y, 18 * s, 0, Math.PI * 2);
  ctx.rect(x, y, 48 * s, 18 * s);
  ctx.fill();
}

function drawBackground(ctx, t) {
  const { width: W, height: H } = WORLD;
  if (art.background) {
    drawImageCover(ctx, art.background, 0, 0, W, H);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, G);
    sky.addColorStop(0, '#6cc6f2');
    sky.addColorStop(1, '#dff5ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, G);
    ctx.fillStyle = '#fff6c4';
    ctx.beginPath(); ctx.arc(820, 80, 34, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const x = ((i * 290 + t * (8 + i * 3)) % (W + 200)) - 120;
      cloud(ctx, x, 70 + (i % 2) * 50, 0.8 + (i % 3) * 0.25);
    }
    hills(ctx, 400, 30, 0.006, 1, '#a9dc8f');
    hills(ctx, 440, 22, 0.011, 3, '#83c96c');
  }
  // 땅
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, G, W, H - G);
  ctx.fillStyle = '#7a4d24';
  for (let i = 0; i < 40; i++) ctx.fillRect(rand(i) * W, G + 14 + rand(i + 50) * (H - G - 18), 6, 3);
  ctx.fillStyle = '#5cb83e';
  ctx.fillRect(0, G - 2, W, 10);
  ctx.fillStyle = '#4a9e31';
  for (let x = 0; x < W; x += 12) { ctx.beginPath(); ctx.arc(x + 6, G + 8, 6, 0, Math.PI); ctx.fill(); }
}

// ---------- 새총 ----------
const BACK = { x: SLING.x + 13, y: SLING.y - 6 }, FRONT = { x: SLING.x - 13, y: SLING.y - 4 };

function slingArm(ctx, tip) {
  ctx.strokeStyle = '#6b3d1c';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(SLING.x, SLING.y + 42);
  ctx.quadraticCurveTo(tip.x, SLING.y + 30, tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = '#9a6332';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawSlingBack(ctx) {
  ctx.strokeStyle = '#6b3d1c';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(SLING.x, G + 2);
  ctx.lineTo(SLING.x, SLING.y + 40);
  ctx.stroke();
  ctx.strokeStyle = '#9a6332';
  ctx.lineWidth = 5;
  ctx.stroke();
  slingArm(ctx, BACK);
}

function band(ctx, from, to) {
  ctx.strokeStyle = '#3d1f0e';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

// ---------- 새 ----------
export function drawBird(ctx, type, x, y, r, rot = 0, { blink = false } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const image = art['bird:' + type];
  if (image) { ctx.drawImage(image, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2); ctx.restore(); return; }
  if (type === 'egg') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#b9b2a2';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 1.1, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
    return;
  }
  const d = BIRDS[type];
  // 꼬리 깃털
  ctx.fillStyle = '#222';
  for (const a of [-0.35, 0, 0.35]) {
    ctx.save(); ctx.rotate(Math.PI + a);
    ctx.fillRect(r * 0.75, -r * 0.08, r * 0.55, r * 0.16);
    ctx.restore();
  }
  // 몸
  ctx.fillStyle = d.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (d.shape === 'triangle') {
    ctx.moveTo(-r * 1.05, r * 0.85);
    ctx.lineTo(r * 1.15, r * 0.85);
    ctx.lineTo(-r * 0.1, -r * 1.15);
    ctx.closePath();
  } else if (d.shape === 'egg') {
    ctx.ellipse(0, 0, r * 0.95, r * 1.1, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  // 배
  ctx.fillStyle = d.belly;
  ctx.beginPath();
  ctx.ellipse(r * 0.1, r * 0.5, r * 0.55, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // 머리 깃
  ctx.fillStyle = d.color;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  if (type === 'black') {
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.95); ctx.quadraticCurveTo(r * 0.2, -r * 1.35, r * 0.05, -r * 1.5); ctx.stroke();
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath(); ctx.arc(r * 0.05, -r * 1.55, 3 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
  } else {
    const top = d.shape === 'triangle' ? -r * 1.1 : -r * 0.95;
    for (const [dx, h] of [[-r * 0.15, r * 0.45], [r * 0.12, r * 0.35]]) {
      ctx.beginPath(); ctx.ellipse(dx, top - h * 0.4, r * 0.12, h * 0.5, dx * 0.03, 0, Math.PI * 2); ctx.fill();
    }
  }
  // 눈
  const eyeY = d.shape === 'triangle' ? 0 : -r * 0.15;
  for (const ex of [r * 0.18, r * 0.55]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex, eyeY, r * 0.22, 0, Math.PI * 2); ctx.fill();
    if (blink) { ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex - r * 0.18, eyeY); ctx.lineTo(ex + r * 0.18, eyeY); ctx.stroke(); }
    else { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + r * 0.07, eyeY + r * 0.02, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
  }
  // 화난 눈썹
  ctx.strokeStyle = type === 'black' ? '#c9c9d4' : '#1a1a1a';
  ctx.lineWidth = Math.max(2.5, r * 0.17);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (type === 'big') { ctx.moveTo(r * 0.0, eyeY - r * 0.4); ctx.lineTo(r * 0.36, eyeY - r * 0.22); ctx.lineTo(r * 0.75, eyeY - r * 0.4); }
  else { ctx.moveTo(r * 0.0, eyeY - r * 0.42); ctx.lineTo(r * 0.34, eyeY - r * 0.24); ctx.moveTo(r * 0.75, eyeY - r * 0.42); ctx.lineTo(r * 0.42, eyeY - r * 0.24); }
  ctx.stroke();
  // 부리
  ctx.fillStyle = '#ffa21f';
  ctx.strokeStyle = '#b8650b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.45, eyeY + r * 0.2);
  ctx.lineTo(r * 1.1, eyeY + r * 0.36);
  ctx.lineTo(r * 0.45, eyeY + r * 0.52);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ---------- 돼지 ----------
function drawPig(ctx, p, t) {
  const r = p.r;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (art.pig) ctx.drawImage(art.pig, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
  else {
    ctx.fillStyle = '#6cc24a';
    for (const ex of [-r * 0.55, r * 0.55]) { ctx.beginPath(); ctx.arc(ex, -r * 0.8, r * 0.28, 0, Math.PI * 2); ctx.fill(); }
    const body = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r);
    body.addColorStop(0, '#a8ec7c');
    body.addColorStop(1, PIGS.color);
    ctx.fillStyle = body;
    ctx.strokeStyle = PIGS.dark;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (p.big) {
      ctx.fillStyle = '#9aa3ad'; ctx.strokeStyle = '#59616a';
      ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.95, Math.PI * 1.08, Math.PI * 1.92); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    const hurt = p.hp / p.maxHp < 0.5;
    const blink = Math.sin(t * 1.7 + p.id * 2.1) > 0.97;
    for (const [i, ex] of [[0, -r * 0.42], [1, r * 0.42]]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex, -r * 0.18, r * 0.2, 0, Math.PI * 2); ctx.fill();
      if (blink || (hurt && i === 0)) {
        ctx.strokeStyle = '#2b4d1c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ex - r * 0.16, -r * 0.18); ctx.lineTo(ex + r * 0.16, -r * 0.18); ctx.stroke();
      } else {
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(ex - r * 0.05, -r * 0.16, r * 0.09, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.fillStyle = '#b5ef8c'; ctx.strokeStyle = PIGS.dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.36, r * 0.26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b4d1c';
    for (const nx of [-r * 0.13, r * 0.13]) { ctx.beginPath(); ctx.ellipse(nx, r * 0.18, r * 0.06, r * 0.1, 0, 0, Math.PI * 2); ctx.fill(); }
    if (hurt) { ctx.fillStyle = 'rgba(120,70,160,0.55)'; ctx.beginPath(); ctx.arc(r * 0.45, r * 0.45, r * 0.18, 0, Math.PI * 2); ctx.fill(); }
  }
  if (p.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${p.flash * 4})`; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// ---------- 블록 ----------
function drawBlock(ctx, b) {
  const m = MATERIALS[b.mat], x = b.x - b.w / 2, y = b.y - b.h / 2;
  ctx.fillStyle = m.fill;
  ctx.fillRect(x, y, b.w, b.h);
  ctx.strokeStyle = m.detail;
  ctx.lineWidth = 1.5;
  if (b.mat === 'wood') {
    const vertical = b.h > b.w;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      if (vertical) { const gx = x + b.w * i / 3; ctx.moveTo(gx, y + 3); ctx.lineTo(gx, y + b.h - 3); }
      else { const gy = y + b.h * i / 3; ctx.moveTo(x + 3, gy); ctx.lineTo(x + b.w - 3, gy); }
      ctx.stroke();
    }
  } else if (b.mat === 'ice') {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + Math.min(b.h, 14));
    ctx.lineTo(x + Math.min(b.w, 14), y + 4);
    ctx.stroke();
  } else {
    ctx.fillStyle = m.detail;
    const n = Math.max(2, Math.round(b.w * b.h / 300));
    for (let i = 0; i < n; i++) ctx.fillRect(x + 2 + rand(b.id * 9 + i) * (b.w - 6), y + 2 + rand(b.id * 7 + i + 3) * (b.h - 6), 3, 3);
  }
  const ratio = b.hp / b.maxHp;
  if (ratio < 0.7) {
    ctx.strokeStyle = 'rgba(40,25,10,0.7)';
    ctx.lineWidth = 1.5;
    const cracks = ratio < 0.4 ? 2 : 1;
    for (let c = 0; c < cracks; c++) {
      let cx = x + b.w * (0.2 + rand(b.id + c * 13) * 0.6), cy = y + b.h * (0.2 + rand(b.id + c * 17) * 0.6);
      ctx.beginPath(); ctx.moveTo(cx, cy);
      for (let k = 0; k < 3; k++) {
        cx = Math.max(x, Math.min(x + b.w, cx + (rand(b.id + c * 5 + k) - 0.5) * b.w * 0.6));
        cy = Math.max(y, Math.min(y + b.h, cy + (rand(b.id + c * 3 + k + 7) - 0.5) * b.h * 0.6));
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  }
  ctx.strokeStyle = m.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
  if (b.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${b.flash * 3})`; ctx.fillRect(x, y, b.w, b.h); }
}

// ---------- 효과 ----------
function drawParticles(ctx, s) {
  for (const p of s.particles) {
    const a = Math.max(0, 1 - p.t / p.life);
    ctx.globalAlpha = a;
    if (p.kind === 'chip') {
      const m = MATERIALS[p.mat];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color || m.fill; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.strokeStyle = m ? m.line : '#3f7d2a'; ctx.lineWidth = 1; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + p.t), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const r of s.rings) {
    ctx.globalAlpha = Math.max(0, 1 - r.t / 0.45);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawTrail(ctx, trail, alpha) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  trail.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.big ? 4 : i % 3 === 0 ? 3.5 : 2.2, 0, Math.PI * 2); ctx.fill(); });
}

function drawPreview(ctx, s) {
  if (!s.pull) return;
  const v = pullVelocity(s.pull), x0 = SLING.x + s.pull.x, y0 = SLING.y + s.pull.y;
  for (let i = 1; i <= 16; i++) {
    const t = i * 0.05, x = x0 + v.x * t, y = y0 + v.y * t + 0.5 * WORLD.gravity * t * t;
    if (y > G) break;
    ctx.fillStyle = `rgba(255,255,255,${0.9 - i * 0.045})`;
    ctx.beginPath(); ctx.arc(x, y, 4 - i * 0.15, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------- 글자와 판 ----------
function star(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffd23a' : 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.strokeStyle = filled ? '#b8860b' : 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawHud(ctx, s) {
  ctx.fillStyle = 'rgba(16,36,56,0.55)';
  roundRect(ctx, 12, 10, 250, 38, 12); ctx.fill();
  label(ctx, `${s.stageIndex + 1}단계 · ${s.level.name}`, 26, 36, 19);
  ctx.fillStyle = 'rgba(16,36,56,0.55)';
  roundRect(ctx, WORLD.width - 262, 10, 250, 38, 12); ctx.fill();
  label(ctx, `점수 ${formatScore(s.score)}`, WORLD.width - 26, 36, 19, { align: 'right', color: '#ffe066' });
  const pigs = pigsLeft(s);
  drawPig(ctx, { x: WORLD.width - 228, y: 29, r: 12, hp: 1, maxHp: 1, id: 0, flash: 0 }, 0);
  label(ctx, `×${pigs}`, WORLD.width - 210, 36, 17, { color: '#c6ff9e' });

  let hint = '';
  if (s.phase === 'aim' && s.loadT === 0) {
    const d = BIRDS[s.current];
    label(ctx, `${d.name} · ${d.about}`, SLING.x, SLING.y - 62, 15, { align: 'center' });
    hint = s.pull ? '놓으면 발사!' : '새를 뒤로 끌었다가 놓아서 쏘기!';
  } else if (s.phase === 'fly' && canUseAbility(s)) {
    hint = `지금 화면을 톡! → ${BIRDS[s.lead.type].tip}`;
  } else if (s.phase === 'fail') {
    hint = '돼지들이 낄낄 웃고 있어…';
  }
  if (hint) label(ctx, hint, WORLD.width / 2, 520, 20, { align: 'center', color: s.phase === 'fly' ? '#ffe066' : '#fffaf0' });

  const lead = s.lead;
  if (lead && !lead.done && lead.y < -lead.r) {
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.moveTo(lead.x, 54); ctx.lineTo(lead.x - 9, 70); ctx.lineTo(lead.x + 9, 70); ctx.closePath(); ctx.fill();
  }

  if (s.banner > 0) {
    ctx.globalAlpha = Math.min(1, s.banner / 0.5);
    label(ctx, `${s.stageIndex + 1}단계`, WORLD.width / 2, 200, 26, { align: 'center', color: '#ffe066' });
    label(ctx, s.level.name, WORLD.width / 2, 246, 42, { align: 'center' });
    ctx.globalAlpha = 1;
  }
}

function drawClear(ctx, s) {
  const W = WORLD.width, pw = 420, ph = 250, px = (W - pw) / 2, py = 120;
  ctx.fillStyle = 'rgba(10,24,40,0.45)';
  ctx.fillRect(0, 0, W, WORLD.height);
  ctx.fillStyle = 'rgba(22,50,74,0.95)';
  roundRect(ctx, px, py, pw, ph, 22); ctx.fill();
  ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = 4; ctx.stroke();
  label(ctx, '요새 함락!', W / 2, py + 52, 34, { align: 'center', color: '#ffe066' });
  for (let i = 0; i < 3; i++) {
    const shown = s.clearT > 0.5 + i * 0.3, earned = i < s.stars && shown;
    const pop = earned ? 1 + Math.max(0, 0.3 - (s.clearT - 0.5 - i * 0.3)) : 1;
    star(ctx, W / 2 + (i - 1) * 70, py + 112 - (i === 1 ? 10 : 0), 26 * pop, earned);
  }
  label(ctx, `점수 ${formatScore(s.score)}`, W / 2, py + 180, 24, { align: 'center' });
  if (s.clearT > 1.4) {
    const more = s.stageIndex + 1 < LEVELS.length;
    label(ctx, more ? '화면을 누르면 다음 단계 ▶' : '화면을 누르면 결과 보기 ▶', W / 2, py + 224, 18,
      { align: 'center', color: Math.sin(s.clock * 5) > 0 ? '#ffe066' : '#fffaf0' });
  }
}

// ---------- 전체 ----------
export function render(ctx, s) {
  const t = s.clock;
  ctx.save();
  if (s.shake > 0) ctx.translate((Math.random() - 0.5) * s.shake * 16, (Math.random() - 0.5) * s.shake * 16);
  drawBackground(ctx, t);
  drawTrail(ctx, s.lastTrail, 0.35);
  drawTrail(ctx, s.trail, 0.85);

  drawSlingBack(ctx);
  let slingBird = null;
  if (s.phase === 'aim' && s.current) {
    if (s.loadT > 0) {
      const from = queueSpot(0, s.current), k = 1 - s.loadT / 0.35;
      slingBird = { x: from.x + (SLING.x - from.x) * k, y: from.y + (SLING.y - from.y) * k - Math.sin(k * Math.PI) * 40, onBand: false };
    } else {
      slingBird = { x: SLING.x + (s.pull?.x || 0), y: SLING.y + (s.pull?.y || 0), onBand: true };
    }
  }
  const bandEnd = slingBird?.onBand ? slingBird : { x: SLING.x, y: SLING.y - 4 };
  band(ctx, BACK, bandEnd);

  for (const b of s.world.bodies) if (!b.dead && b.kind === 'block') drawBlock(ctx, b);
  for (const b of s.world.bodies) if (!b.dead && b.kind === 'pig') drawPig(ctx, b, t);

  s.queue.forEach((type, i) => {
    const p = queueSpot(i, type), hop = s.phase === 'clear' ? Math.abs(Math.sin(t * 6 + i)) * 12 : 0;
    drawBird(ctx, type, p.x, p.y - hop, BIRDS[type].r, 0, { blink: Math.sin(t * 1.3 + i * 2) > 0.96 });
  });

  if (slingBird) {
    if (slingBird.onBand) {
      ctx.fillStyle = '#3d1f0e';
      ctx.beginPath(); ctx.arc(slingBird.x - 4, slingBird.y, BIRDS[s.current].r * 0.75, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
    }
    const tilt = s.pull ? Math.atan2(-s.pull.y, -s.pull.x) : 0;
    drawBird(ctx, s.current, slingBird.x, slingBird.y, BIRDS[s.current].r, tilt);
  }
  band(ctx, FRONT, bandEnd);
  slingArm(ctx, FRONT);

  for (const shot of s.shots) {
    if (shot.done) continue;
    const r = shot.isEgg ? EGG.r : shot.r;
    drawBird(ctx, shot.isEgg ? 'egg' : shot.type, shot.x, shot.y, r, shot.isEgg ? 0 : shot.rot);
    if (shot.fuse >= 0 && !shot.used) {
      ctx.fillStyle = `rgba(255,80,40,${0.3 + 0.3 * Math.sin(t * 30)})`;
      ctx.beginPath(); ctx.arc(shot.x, shot.y, r + 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawParticles(ctx, s);
  drawPreview(ctx, s);
  for (const p of s.popups) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.2);
    label(ctx, p.text, p.x, p.y, p.big ? 22 : 15, { align: 'center', color: p.color });
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHud(ctx, s);
  if (s.phase === 'clear') drawClear(ctx, s);
}
