// 화면 그리기: 뒤에서 따라가는 카메라로 3레인 선로를 원근감 있게 그린다.
import { VIEW, RULES, POWERUPS, CITIES, TOUR } from './config.mjs';
import { laneX, trainHeightAt } from './game.mjs';
import { GATE_BOTTOM, GATE_TOP } from './level.mjs';
import { drawHero, drawGuard, drawDog, drawBoard, artImage, findBoard } from './characters.mjs';

export const LAYOUT = { width: VIEW.width, height: VIEW.height, boardButton: { x: 60, y: 736, r: 46 } };

const W = VIEW.width, H = VIEW.height, CX = W / 2;
const HORIZON = 300, FOCAL = 400, CAM_BACK = 6.4, CAM_UP = 4.2, NEAR = 0.5, FAR = 170;
let ctx, cam = { x: 0, y: CAM_UP, z: -CAM_BACK };

// ---------- 색 ----------
const rgbCache = new Map();
function rgb(hex) {
  if (!rgbCache.has(hex)) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6);
    rgbCache.set(hex, [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)));
  }
  return rgbCache.get(hex);
}
const css = ([r, g, b]) => `rgb(${r | 0},${g | 0},${b | 0})`;
const mix = (a, b, t) => css(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const shade = (color, amount) => mix(color, amount > 0 ? '#ffffff' : '#000000', Math.abs(amount));
const toHex = color => {
  if (color.startsWith('#')) return color;
  const [r, g, b] = color.match(/\d+/g).map(Number);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
};

/** 월드 투어 도시 색. 새 도시에 들어서면 40m 동안 천천히 바뀐다. */
function cityPalette(distance) {
  const index = Math.floor(distance / TOUR.tourLength);
  const now = CITIES[index % CITIES.length];
  const t = index === 0 ? 1 : Math.min(1, (distance - index * TOUR.tourLength) / 40);
  if (t >= 1) return { ...now, blend: 1, prev: now };
  const prev = CITIES[(index - 1) % CITIES.length];
  const lerp = (a, b) => toHex(mix(a, b, t));
  const out = { blend: t, prev, landmark: now.landmark, name: now.name };
  for (const key of Object.keys(now)) {
    if (typeof now[key] === 'string' && now[key].startsWith('#')) out[key] = lerp(prev[key], now[key]);
    else if (Array.isArray(now[key])) out[key] = now[key].map((c, i) => lerp(prev[key][i], c));
  }
  return out;
}

// ---------- 원근 투영 ----------
function P(x, y, z) {
  const s = FOCAL / Math.max(z - cam.z, NEAR);
  return { x: CX + (x - cam.x) * s, y: HORIZON + (cam.y - y) * s, s };
}
function fillPoly(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}
const quad = (a, b, c, d, color) => fillPoly([P(...a), P(...b), P(...c), P(...d)], color);
const fade = z => Math.max(0, Math.min(1, (FAR - (z - cam.z)) / 35));
const nearZ = () => cam.z + NEAR;

function box(x0, x1, y0, y1, z0, z1, colors) {
  const clipped = z0 < nearZ();
  z0 = Math.max(z0, nearZ());
  if (z1 <= z0) return true;
  if (cam.x < x0) quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], colors.side);
  if (cam.x > x1) quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], colors.side);
  if (cam.y > y1) quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], colors.top);
  if (!clipped && colors.front) quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], colors.front);
  return clipped;
}

// ---------- 배경 ----------
const skyline = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const layers = [];
  for (const [layer, parallax, minH, maxH] of [[0, 3, 40, 120], [1, 7, 30, 95]]) {
    const list = [];
    for (let x = -160; x < W + 160;) {
      const w = 34 + rnd() * 46, h = minH + rnd() * (maxH - minH);
      const lit = Array.from({ length: 24 }, () => rnd() < 0.42);
      list.push({ x, w, h, lit, roof: rnd() });
      x += w + 2 + rnd() * 8;
    }
    layers.push({ layer, parallax, list });
  }
  return layers;
})();

function drawLandmark(kind, alpha, color) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.strokeStyle = color;
  const x = 350 - cam.x * 2, base = HORIZON + 2;
  if (kind === 'namsan') {
    ctx.beginPath(); ctx.ellipse(x, base, 120, 46, 0, Math.PI, 0); ctx.fill();
    ctx.fillRect(x - 4, base - 150, 8, 110);
    ctx.beginPath(); ctx.ellipse(x, base - 120, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 1.5, base - 190, 3, 45);
  } else if (kind === 'tokyo') {
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 34, base); ctx.lineTo(x, base - 190); ctx.lineTo(x + 34, base); ctx.stroke();
    for (let i = 1; i < 7; i++) {
      const y = base - i * 26, half = 34 * (1 - (i * 26) / 190);
      ctx.beginPath(); ctx.moveTo(x - half, y); ctx.lineTo(x + half, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - half, y); ctx.lineTo(x + half * 0.85, y - 26); ctx.stroke();
    }
    ctx.fillRect(x - 14, base - 110, 28, 9);
    ctx.fillRect(x - 9, base - 160, 18, 7);
  } else if (kind === 'eiffel') {
    ctx.beginPath();
    ctx.moveTo(x - 46, base); ctx.quadraticCurveTo(x - 12, base - 70, x - 5, base - 200);
    ctx.lineTo(x + 5, base - 200); ctx.quadraticCurveTo(x + 12, base - 70, x + 46, base);
    ctx.lineTo(x + 26, base); ctx.quadraticCurveTo(x, base - 42, x - 26, base); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 30, base - 66, 60, 6);
    ctx.fillRect(x - 17, base - 128, 34, 5);
    ctx.fillRect(x - 1, base - 222, 2, 26);
  }
  ctx.restore();
}

function drawSky(pal, time) {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, pal.sky[0]); g.addColorStop(0.6, pal.sky[1]); g.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 2);
  // 해 또는 달
  const glow = ctx.createRadialGradient(110, HORIZON - 120, 6, 110, HORIZON - 120, 70);
  glow.addColorStop(0, '#fff8e0'); glow.addColorStop(0.35, toHex(mix(pal.sky[2], '#ffffff', 0.5)) + 'aa'); glow.addColorStop(1, '#ffffff00');
  ctx.fillStyle = glow;
  ctx.fillRect(30, HORIZON - 200, 160, 160);
  // 별 (어두운 하늘에서만 보인다)
  const dark = 1 - rgb(pal.sky[0]).reduce((a, b) => a + b, 0) / 765;
  if (dark > 0.6) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 26; i++) {
      ctx.globalAlpha = (dark - 0.6) * 2 * (0.5 + 0.5 * Math.sin(time * 2 + i));
      ctx.fillRect((i * 97) % W, (i * 53) % (HORIZON - 120), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  const [far, near] = skyline;
  for (const b of far.list) {
    const x = b.x - cam.x * far.parallax;
    ctx.fillStyle = pal.building[2];
    ctx.fillRect(x, HORIZON + 2 - b.h, b.w, b.h);
  }
  drawLandmark(pal.prev.landmark, 1 - pal.blend, shade(pal.prev.building[1], -0.25));
  drawLandmark(pal.landmark, pal.blend, shade(pal.building[1], -0.25));
  for (const b of near.list) {
    const x = b.x - cam.x * near.parallax;
    ctx.fillStyle = b.roof > 0.5 ? pal.building[0] : pal.building[1];
    ctx.fillRect(x, HORIZON + 2 - b.h, b.w, b.h);
    ctx.fillStyle = pal.window;
    let k = 0;
    for (let wy = HORIZON - b.h + 10; wy < HORIZON - 6; wy += 14) {
      for (let wx = x + 6; wx < x + b.w - 8; wx += 11) {
        if (b.lit[k++ % b.lit.length]) ctx.fillRect(wx, wy, 5, 7);
      }
    }
  }
  const haze = ctx.createLinearGradient(0, HORIZON - 70, 0, HORIZON + 2);
  haze.addColorStop(0, pal.fog + '00'); haze.addColorStop(1, pal.fog + 'cc');
  ctx.fillStyle = haze;
  ctx.fillRect(0, HORIZON - 70, W, 72);
}

const GRAFFITI = ['#ff5d8f', '#3ec1ff', '#ffd23f', '#58d68d', '#c77dff', '#ff8a3d'];

function drawTrackBed(pal) {
  const zn = nearZ(), zf = cam.z + FAR, wallX = 1.5 * RULES.laneWidth + 1.6;
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);
  // 벽
  for (const side of [-1, 1]) {
    const x = side * wallX;
    quad([x, 0, zn], [x, 2.6, zn], [x, 2.6, zf], [x, 0, zf], pal.wall);
    quad([x, 2.6, zn], [x + side * 0.6, 2.6, zn], [x + side * 0.6, 2.6, zf], [x, 2.6, zf], shade(pal.wall, 0.15));
    // 벽 낙서
    const first = Math.ceil(zn / 23);
    for (let i = first; i * 23 < cam.z + 110; i++) {
      if ((i * 7 + (side > 0 ? 3 : 0)) % 3 === 0) continue;
      const z = i * 23;
      ctx.globalAlpha = fade(z) * 0.85;
      const c = GRAFFITI[(i * 5 + (side > 0 ? 2 : 0)) % GRAFFITI.length];
      quad([x, 0.5, z], [x, 2.0, z + 0.6], [x, 1.8, z + 5], [x, 0.4, z + 4.4], c);
      quad([x, 0.9, z + 1], [x, 1.6, z + 1.3], [x, 1.5, z + 3.6], [x, 0.8, z + 3.3], shade(c, 0.45));
    }
    ctx.globalAlpha = 1;
  }
  // 자갈과 침목, 레일
  for (let lane = 0; lane < 3; lane++) {
    const lx = laneX(lane);
    quad([lx - 1.2, 0, zn], [lx + 1.2, 0, zn], [lx + 1.2, 0, zf], [lx - 1.2, 0, zf], pal.gravel);
    const stepZ = 1.4;
    for (let z = Math.ceil(zn / stepZ) * stepZ; z < cam.z + 75; z += stepZ) {
      ctx.globalAlpha = Math.min(1, (cam.z + 75 - z) / 20);
      quad([lx - 1.0, 0, z], [lx + 1.0, 0, z], [lx + 1.0, 0, z + 0.35], [lx - 1.0, 0, z + 0.35], pal.sleeper);
    }
    ctx.globalAlpha = 1;
    for (const r of [-0.62, 0.62]) quad([lx + r - 0.06, 0.02, zn], [lx + r + 0.06, 0.02, zn], [lx + r + 0.06, 0.02, zf], [lx + r - 0.06, 0.02, zf], pal.rail);
  }
  const fog = ctx.createLinearGradient(0, HORIZON, 0, HORIZON + 46);
  fog.addColorStop(0, pal.fog); fog.addColorStop(1, pal.fog + '00');
  ctx.fillStyle = fog;
  ctx.fillRect(0, HORIZON, W, 46);
}

function drawPoles(pal) {
  const wallX = 1.5 * RULES.laneWidth + 1.2;
  const first = Math.ceil(nearZ() / 16);
  for (let i = first + 7; i >= first; i--) {
    const z = i * 16;
    ctx.globalAlpha = fade(z);
    for (const side of [-1, 1]) {
      const x = side * wallX;
      quad([x - 0.1, 0, z], [x + 0.1, 0, z], [x + 0.1, 6, z], [x - 0.1, 6, z], shade(pal.wall, -0.35));
      quad([x, 5.7, z], [x - side * 2.4, 5.7, z], [x - side * 2.4, 5.85, z], [x, 5.85, z], shade(pal.wall, -0.35));
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- 물체 ----------
function drawTrainSegment(o, seg, pal) {
  const lx = laneX(o.lane), x0 = lx - 1.0, x1 = lx + 1.0, h = o.h;
  const body = pal.train[o.color % pal.train.length], trim = pal.trainTrim;
  ctx.globalAlpha = fade(seg.z0);
  if (seg.kind === 'ramp') {
    const zc = Math.max(seg.z0, nearZ());
    if (seg.z1 <= zc) return;
    const yc = (zc - seg.z0) / (seg.z1 - seg.z0) * h;
    const metal = '#c9a14a';
    if (cam.x < x0) fillPoly([P(x0, 0, zc), P(x0, yc, zc), P(x0, h, seg.z1), P(x0, 0, seg.z1)], shade(metal, -0.35));
    if (cam.x > x1) fillPoly([P(x1, 0, zc), P(x1, yc, zc), P(x1, h, seg.z1), P(x1, 0, seg.z1)], shade(metal, -0.35));
    quad([x0, yc, zc], [x1, yc, zc], [x1, h, seg.z1], [x0, h, seg.z1], metal);
    for (let k = 1; k < 7; k++) {
      const z = seg.z0 + (seg.z1 - seg.z0) * k / 7;
      if (z < zc) continue;
      const y = (z - seg.z0) / (seg.z1 - seg.z0) * h;
      quad([x0, y, z], [x1, y, z], [x1, y + 0.03, z + 0.25], [x0, y + 0.03, z + 0.25], shade(metal, -0.25));
    }
    return;
  }
  box(lx - 0.85, lx + 0.85, 0, 0.45, seg.z0 + 0.3, seg.z1 - 0.3, { side: '#1c1c22', top: '#1c1c22', front: '#26262c' });
  const clipped = box(x0, x1, 0.4, h, seg.z0, seg.z1, { side: shade(body, -0.18), top: shade(body, 0.28), front: seg.first ? shade(body, -0.05) : null });
  const zc = Math.max(seg.z0, nearZ());
  const sideX = cam.x < x0 ? x0 : cam.x > x1 ? x1 : null;
  if (sideX !== null) {
    quad([sideX, 0.95, zc], [sideX, 1.2, zc], [sideX, 1.2, seg.z1], [sideX, 0.95, seg.z1], trim);
    for (let wz = seg.z0 + 1; wz + 1.6 < seg.z1; wz += 2.5) {
      if (wz + 1.6 < zc) continue;
      const a = Math.max(wz, zc);
      quad([sideX, 1.6, a], [sideX, 2.5, a], [sideX, 2.5, wz + 1.6], [sideX, 1.6, wz + 1.6], '#1b2a3c');
      quad([sideX, 2.3, a], [sideX, 2.5, a], [sideX, 2.5, wz + 1.6], [sideX, 2.3, wz + 1.6], '#ffffff33');
    }
  }
  if (cam.y > h) quad([lx - 0.45, h, zc], [lx + 0.45, h, zc], [lx + 0.45, h, seg.z1 - 0.6], [lx - 0.45, h, seg.z1 - 0.6], shade(body, 0.12));
  if (seg.first && !clipped) {
    const z = seg.z0;
    quad([x0, 0.95, z], [x1, 0.95, z], [x1, 1.2, z], [x0, 1.2, z], trim);
    quad([lx - 0.78, 1.65, z], [lx + 0.78, 1.65, z], [lx + 0.78, 2.75, z], [lx - 0.78, 2.75, z], '#1b2a3c');
    quad([lx - 0.7, 2.5, z], [lx - 0.1, 2.7, z], [lx - 0.1, 2.75, z], [lx - 0.7, 2.55, z], '#ffffff44');
    for (const side of [-1, 1]) {
      const p = P(lx + side * 0.6, 0.7, z);
      if (o.moving) {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 0.9 * p.s);
        g.addColorStop(0, '#fffbe0'); g.addColorStop(0.3, '#fff2a8aa'); g.addColorStop(1, '#fff2a800');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, 0.9 * p.s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = o.moving ? '#ffffff' : '#ffe7a3';
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.15 * p.s, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawHurdle(o) {
  const lx = laneX(o.lane), z = o.z;
  if (z < nearZ()) return;
  ctx.globalAlpha = fade(z);
  for (const side of [-1, 1]) quad([lx + side * 0.95 - 0.07, 0, z], [lx + side * 0.95 + 0.07, 0, z], [lx + side * 0.95 + 0.07, o.h, z], [lx + side * 0.95 - 0.07, o.h, z], '#d8d8de');
  const stripes = 6, x0 = lx - 1.05, width = 2.1;
  for (let i = 0; i < stripes; i++) {
    const a = x0 + width * i / stripes, b = x0 + width * (i + 1) / stripes;
    quad([a, 0.5, z], [b, 0.5, z], [b, o.h, z], [a, o.h, z], i % 2 ? '#ffffff' : '#e8413c');
  }
  quad([x0, o.h, z], [x0 + width, o.h, z], [x0 + width, o.h, z + 0.18], [x0, o.h, z + 0.18], '#ffd6d4');
}

function drawGate(o, time) {
  const lx = laneX(o.lane), z = o.z;
  if (z < nearZ()) return;
  ctx.globalAlpha = fade(z);
  for (const side of [-1, 1]) quad([lx + side * 1.0 - 0.08, 0, z], [lx + side * 1.0 + 0.08, 0, z], [lx + side * 1.0 + 0.08, GATE_TOP, z], [lx + side * 1.0 - 0.08, GATE_TOP, z], '#9aa0aa');
  const stripes = 8, x0 = lx - 1.0, width = 2.0, top = GATE_BOTTOM + 0.9;
  for (let i = 0; i < stripes; i++) {
    const a = x0 + width * i / stripes, b = x0 + width * (i + 1) / stripes;
    quad([a, GATE_BOTTOM, z], [b, GATE_BOTTOM, z], [b + 0.12, top, z], [a + 0.12, top, z], i % 2 ? '#222' : '#ffcf3d');
  }
  quad([x0, GATE_TOP - 0.28, z], [x0 + width, GATE_TOP - 0.28, z], [x0 + width, GATE_TOP, z], [x0, GATE_TOP, z], '#e8413c');
  const p = P(lx, GATE_TOP + 0.15, z);
  ctx.fillStyle = Math.sin(time * 8) > 0 ? '#ff4d4d' : '#7a1d1d';
  ctx.beginPath(); ctx.arc(p.x, p.y, 0.14 * p.s, 0, Math.PI * 2); ctx.fill();
}

function drawCoin(c, time) {
  const x = c.cx ?? laneX(c.lane);
  if (c.z < nearZ() + 0.3) return;
  const p = P(x, c.y, c.z), r = 0.36 * p.s;
  ctx.globalAlpha = fade(c.z);
  const image = artImage('coin');
  if (image) { ctx.drawImage(image, p.x - r, p.y - r, r * 2, r * 2); return; }
  const spin = Math.max(0.18, Math.abs(Math.cos(time * 4 + c.z * 0.35)));
  ctx.fillStyle = '#e09a14';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, r * spin, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath(); ctx.ellipse(p.x, p.y, r * spin * 0.78, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
  if (r > 4) {
    ctx.fillStyle = '#fff4b8';
    ctx.beginPath(); ctx.ellipse(p.x - r * spin * 0.25, p.y - r * 0.3, r * spin * 0.18, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawIcon(c, kind, x, y, r) {
  c.save();
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'magnet') {
    c.strokeStyle = '#ff3d4f'; c.lineWidth = r * 0.34;
    c.beginPath(); c.arc(x, y - r * 0.05, r * 0.42, 0, Math.PI); c.stroke();
    c.beginPath(); c.moveTo(x - r * 0.42, y - r * 0.05); c.lineTo(x - r * 0.42, y - r * 0.38); c.moveTo(x + r * 0.42, y - r * 0.05); c.lineTo(x + r * 0.42, y - r * 0.38); c.stroke();
    c.strokeStyle = '#eef'; c.beginPath(); c.moveTo(x - r * 0.42, y - r * 0.38); c.lineTo(x - r * 0.42, y - r * 0.52); c.moveTo(x + r * 0.42, y - r * 0.38); c.lineTo(x + r * 0.42, y - r * 0.52); c.stroke();
  } else if (kind === 'sneakers') {
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(x - r * 0.55, y + r * 0.3); c.lineTo(x - r * 0.5, y - r * 0.25); c.lineTo(x - r * 0.1, y - r * 0.2); c.lineTo(x + r * 0.15, y + r * 0.05); c.lineTo(x + r * 0.6, y + r * 0.12); c.lineTo(x + r * 0.6, y + r * 0.3); c.closePath(); c.fill();
    c.fillStyle = '#1f8f55'; c.fillRect(x - r * 0.55, y + r * 0.22, r * 1.15, r * 0.12);
    c.fillStyle = '#d9fbe6';
    c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.15); c.lineTo(x - r * 0.95, y - r * 0.5); c.lineTo(x - r * 0.4, y - r * 0.35); c.closePath(); c.fill();
  } else if (kind === 'jetpack') {
    c.fillStyle = '#e0e4ea';
    c.fillRect(x - r * 0.42, y - r * 0.5, r * 0.34, r * 0.75); c.fillRect(x + r * 0.08, y - r * 0.5, r * 0.34, r * 0.75);
    c.fillStyle = '#ffd23f';
    c.beginPath(); c.moveTo(x - r * 0.4, y + r * 0.28); c.lineTo(x - r * 0.25, y + r * 0.7); c.lineTo(x - r * 0.1, y + r * 0.28);
    c.moveTo(x + r * 0.1, y + r * 0.28); c.lineTo(x + r * 0.25, y + r * 0.7); c.lineTo(x + r * 0.4, y + r * 0.28); c.fill();
  } else if (kind === 'double') {
    c.fillStyle = '#ffffff'; c.font = `900 ${Math.round(r * 0.95)}px system-ui,sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('x2', x, y + r * 0.05);
  } else if (kind === 'board') {
    c.translate(x, y); c.rotate(-0.45);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.roundRect ? c.roundRect(-r * 0.7, -r * 0.18, r * 1.4, r * 0.36, r * 0.18) : c.rect(-r * 0.7, -r * 0.18, r * 1.4, r * 0.36); c.fill();
    c.fillStyle = '#c77dff'; c.fillRect(-r * 0.45, -r * 0.05, r * 0.9, r * 0.1);
  }
  c.restore();
}

function drawPickup(p, time) {
  if (p.z < nearZ() + 0.3) return;
  const bob = Math.sin(time * 3 + p.z) * 0.15;
  const q = P(laneX(p.lane), p.y + bob, p.z), r = 0.58 * q.s;
  const color = POWERUPS[p.kind].color;
  ctx.globalAlpha = fade(p.z);
  const g = ctx.createRadialGradient(q.x, q.y, r * 0.2, q.x, q.y, r * 1.5);
  g.addColorStop(0, color + 'cc'); g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(q.x, q.y, r * 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  drawIcon(ctx, p.kind, q.x, q.y, r);
}

function groundBelow(state) {
  let ground = 0;
  for (const o of state.obstacles) {
    if (o.kind !== 'train' || o.dead || Math.abs(state.x - laneX(o.lane)) > 1.3 || state.z < o.z || state.z > o.z + o.len) continue;
    const h = trainHeightAt(o, state.z);
    if (state.y >= h - 0.6) ground = Math.max(ground, h);
  }
  return ground;
}

function drawPlayer(state, mode) {
  const ground = groundBelow(state);
  const shadow = P(state.x, ground + 0.02, state.z);
  ctx.globalAlpha = 0.35 * Math.max(0.2, 1 - (state.y - ground) / 6);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(shadow.x, shadow.y, 0.42 * shadow.s, 0.12 * shadow.s, 0, 0, Math.PI * 2); ctx.fill();
  const blink = (state.safe > 0 && Math.floor(state.time * 12) % 2 === 0);
  ctx.globalAlpha = blink ? 0.45 : 1;
  const p = P(state.x, state.y, state.z);
  const idle = mode === 'start';
  drawHero(ctx, p.x, p.y, p.s, state.hero, {
    phase: idle ? 0 : state.runPhase, rolling: state.rolling > 0, air: !state.grounded && !idle,
    jet: state.power.jetpack > 0, onBoard: state.boardTime > 0, boardId: state.boardStyle, time: state.time,
  });
  if (state.power.magnet > 0) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(state.time * 10);
    ctx.strokeStyle = POWERUPS.magnet.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y - 0.95 * p.s, 0.95 * p.s, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawChaser(state) {
  if (state.guardGap > 11) return;
  const z = state.z - state.guardGap;
  if (z < nearZ() + 0.6) return;
  const caught = !!state.crash;
  const p = P(state.x - 1.15, 0, z);
  drawGuard(ctx, p.x, p.y, p.s, state.runPhase * 0.9 + 1, caught);
  const d = P(state.x + 1.05, 0, z + 0.4);
  drawDog(ctx, d.x, d.y, d.s, state.runPhase);
}

function drawParticle(p) {
  if (p.z < nearZ()) return;
  const q = P(p.x, p.y, p.z), size = Math.max(1.5, p.size * q.s);
  ctx.globalAlpha = 1 - p.life / p.max;
  ctx.fillStyle = p.color;
  ctx.fillRect(q.x - size / 2, q.y - size / 2, size, size);
}

function drawWorld(state, pal, mode) {
  const items = [];
  const playerKey = state.z;
  for (const o of state.obstacles) {
    if (o.dead || o.z > cam.z + FAR || o.z + o.len < nearZ()) continue;
    if (o.kind === 'train') {
      const lx = laneX(o.lane), over = Math.abs(state.x - lx) < 1.3;
      const segs = [];
      if (o.ramp) segs.push({ kind: 'ramp', z0: o.z, z1: o.z + o.ramp });
      for (let start = o.z + o.ramp, first = !o.ramp; start < o.z + o.len - 0.1; first = false) {
        const end = Math.min(start + 10.5, o.z + o.len);
        segs.push({ kind: 'car', z0: start, z1: end < o.z + o.len ? end - 0.5 : end, first });
        start = end;
      }
      for (const seg of segs) {
        if (seg.z1 < nearZ() || seg.z0 > cam.z + FAR) continue;
        const under = over && state.z >= seg.z0 - 0.4 && state.z <= seg.z1 + 0.6 && state.y >= (seg.kind === 'ramp' ? 0 : o.h - 0.8);
        items.push({ key: under ? playerKey + 0.01 : seg.z0, draw: () => drawTrainSegment(o, seg, pal) });
      }
    } else if (o.kind === 'hurdle') items.push({ key: o.z, draw: () => drawHurdle(o) });
    else items.push({ key: o.z, draw: () => drawGate(o, state.time) });
  }
  for (const c of state.coinItems) if (!c.taken && c.z < cam.z + FAR - 20) items.push({ key: c.z, draw: () => drawCoin(c, state.time) });
  for (const p of state.pickups) if (!p.taken) items.push({ key: p.z, draw: () => drawPickup(p, state.time) });
  for (const p of state.particles) items.push({ key: p.z, draw: () => drawParticle(p) });
  items.push({ key: playerKey, draw: () => drawPlayer(state, mode) });
  items.push({ key: state.z - state.guardGap, draw: () => drawChaser(state) });
  items.sort((a, b) => b.key - a.key);
  for (const item of items) { item.draw(); ctx.globalAlpha = 1; }
}

// ---------- 화면 위 정보 ----------
function panel(x, y, w, h, r = 14, color = '#0000006b') {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill();
}
function text(str, x, y, { size = 18, weight = 800, color = '#fff7e6', align = 'left', stroke = true } = {}) {
  ctx.font = `${weight} ${size}px system-ui,-apple-system,'Malgun Gothic',sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = '#00000088'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}

function drawHud(state, view) {
  const best = view.best || 0;
  panel(12, 12, 128, 46);
  ctx.fillStyle = '#e09a14'; ctx.beginPath(); ctx.arc(37, 35, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(37, 35, 10, 0, Math.PI * 2); ctx.fill();
  text(String(state.coins), 58, 36, { size: 24 });

  panel(W - 182, 12, 170, 64);
  const doubled = state.power.double > 0;
  text(String(Math.floor(state.score)).padStart(6, '0'), W - 24, 36, { size: 28, align: 'right', color: doubled ? '#b8d0ff' : '#fff7e6' });
  text(`${Math.floor(state.distance)}m · 최고 ${best}`, W - 24, 62, { size: 13, weight: 700, align: 'right', color: '#ffffffcc', stroke: false });
  if (doubled) { panel(W - 232, 20, 44, 30, 10, POWERUPS.double.color); text('x2', W - 210, 36, { size: 18, align: 'center' }); }

  let y = 84;
  for (const key of ['magnet', 'sneakers', 'jetpack', 'double']) {
    const left = state.power[key];
    if (left <= 0) continue;
    const info = POWERUPS[key];
    panel(12, y - 18, 168, 36, 12);
    ctx.fillStyle = info.color; ctx.beginPath(); ctx.arc(32, y, 14, 0, Math.PI * 2); ctx.fill();
    drawIcon(ctx, key, 32, y, 14);
    panel(54, y - 5, 114, 10, 5, '#ffffff2a');
    panel(54, y - 5, 114 * Math.min(1, left / info.time), 10, 5, info.color);
    y += 42;
  }

  const btn = LAYOUT.boardButton, board = findBoard(state.boardStyle);
  const usable = state.boards > 0 || state.boardTime > 0;
  ctx.globalAlpha = usable ? 1 : 0.45;
  ctx.fillStyle = '#00000080'; ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r - 6, 0, Math.PI * 2); ctx.fill();
  if (state.boardTime > 0) {
    ctx.strokeStyle = board.glow; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.boardTime / RULES.boardTime); ctx.stroke();
  }
  ctx.save(); ctx.translate(btn.x, btn.y - 8); ctx.rotate(-0.4); drawBoard(ctx, 0, 6, 34, state.boardStyle, state.time); ctx.restore();
  text(state.boardTime > 0 ? '타는 중' : `보드 ×${state.boards}`, btn.x, btn.y + 20, { size: 12, align: 'center' });
  ctx.globalAlpha = 1;
}

function drawMessages(state, view) {
  if (state.stumble > 0 && !state.crash) {
    const a = 0.25 + 0.15 * Math.sin(state.time * 14);
    const g = ctx.createRadialGradient(CX, H / 2, H * 0.3, CX, H / 2, H * 0.75);
    g.addColorStop(0, '#ff000000'); g.addColorStop(1, `rgba(255,30,30,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (state.banner) {
    const a = Math.min(1, state.banner.t * 2, (2.6 - state.banner.t) * 4);
    ctx.globalAlpha = Math.max(0, a);
    panel(CX - 130, 118, 260, 50, 25, '#00000088');
    text('✈ ' + state.banner.text, CX, 144, { size: 24, align: 'center', color: '#ffe27a' });
    ctx.globalAlpha = 1;
  }
  state.popups.forEach((p, i) => {
    ctx.globalAlpha = Math.max(0, 1 - p.t / 1.4);
    text(p.text, CX, 220 - p.t * 36 + i * 30, { size: 22, align: 'center', color: p.color });
  });
  ctx.globalAlpha = 1;
  if (view.mode === 'play' && state.hintTime > 0 && !state.crash) {
    ctx.globalAlpha = Math.min(1, state.hintTime);
    panel(120, 690, 348, 92, 16, '#000000a0');
    text('← → 밀기: 레인 바꾸기', 294, 716, { size: 16, align: 'center', stroke: false });
    text('↑ 밀기: 점프 · ↓ 밀기: 구르기', 294, 740, { size: 16, align: 'center', stroke: false });
    text('두 번 톡 또는 왼쪽 버튼: 호버보드', 294, 764, { size: 14, weight: 700, align: 'center', color: '#e2b8ff', stroke: false });
    ctx.globalAlpha = 1;
  }
  if (state.crash) {
    const t = state.crash.t;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.45, t * 0.6)})`;
    ctx.fillRect(0, 0, W, H);
    const scale = 1 + Math.max(0, 0.4 - t) * 2;
    ctx.save(); ctx.translate(CX, 260); ctx.scale(scale, scale);
    text(state.crash.reason === 'caught' ? '잡혔다!' : '쾅!', 0, 0, { size: 52, weight: 900, align: 'center', color: '#ffcf3d' });
    ctx.restore();
  }
}

function drawSpeedLines(state) {
  const strength = state.power.jetpack > 0 ? 1 : Math.max(0, (state.speed - 21) / 9);
  if (strength <= 0 || state.crash) return;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i++) {
    const seed = Math.floor(state.time * 20) * 13 + i * 71;
    const a = (seed % 360) * Math.PI / 180, r1 = 220 + (seed * 7) % 140, len = 40 + (seed * 3) % 60;
    ctx.globalAlpha = 0.18 * strength;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * r1, HORIZON + 40 + Math.sin(a) * r1 * 1.3);
    ctx.lineTo(CX + Math.cos(a) * (r1 + len), HORIZON + 40 + Math.sin(a) * (r1 + len) * 1.3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** view: { width, height, time, mode, best } */
export function renderGame(context, state, view) {
  ctx = context;
  const bob = view.mode === 'start' ? Math.sin(view.time * 1.5) * 0.05 : 0;
  cam = { x: state.x * 0.7, y: CAM_UP + state.y * 0.85 + bob, z: state.z - CAM_BACK };
  const pal = cityPalette(state.distance);
  ctx.save();
  if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake * 30, (Math.random() - 0.5) * state.shake * 30);
  drawSky(pal, view.time || state.time);
  drawTrackBed(pal);
  drawPoles(pal);
  drawWorld(state, pal, view.mode);
  ctx.restore();
  drawSpeedLines(state);
  drawHud(state, view);
  drawMessages(state, view);
}
