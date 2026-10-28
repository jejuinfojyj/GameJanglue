// 블록·돼지·날아가는 새의 움직임과 충돌. 블록은 회전하지 않는 상자로 계산하고,
// 받침이 사라지면 떨어지고, 받침 밖으로 무게중심이 나가면 미끄러져 무너진다.
import { WORLD, MATERIALS, PIGS, PHYSICS } from './config.mjs';

let nextId = 1;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function makeBlock(mat, x, b, w, h) {
  const m = MATERIALS[mat];
  return { id: nextId++, kind: 'block', mat, x, y: WORLD.ground - b - h / 2, w, h, vx: 0, vy: 0,
    hp: m.hp, maxHp: m.hp, mass: Math.max(0.35, w * h / 1600 * m.density), dead: false, flash: 0 };
}

export function makePig(x, b, r) {
  const big = r >= 20, hp = big ? PIGS.bigHp : PIGS.smallHp;
  return { id: nextId++, kind: 'pig', big, x, y: WORLD.ground - b - r, w: r * 2, h: r * 2, r, vx: 0, vy: 0,
    hp, maxHp: hp, mass: r * r / 300, dead: false, flash: 0 };
}

export function makeShot(type, def, x, y, vx, vy) {
  return { type, x, y, vx, vy, r: def.r, mass: def.mass, strong: def.strong || {}, rot: 0, age: 0, still: 0,
    touched: false, used: false, done: false, fuse: -1, power: 1 };
}

export function hurt(world, body, amount) {
  if (body.dead || !(amount > 0.5)) return;
  body.hp -= amount;
  body.flash = 0.15;
  if (body.hp <= 0) {
    body.dead = true;
    world.events.push({ type: body.kind === 'pig' ? 'pop' : 'break', x: body.x, y: body.y, body });
  }
}

const EPS = 0.001;
const overlapX = (a, b) => Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
const overlapY = (a, b) => Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2);

function landing(world, b, other, impact) {
  if (impact < PHYSICS.landSpeed) return;
  const d = (impact - PHYSICS.landSpeed) * PHYSICS.landDamage;
  hurt(world, b, d * (b.kind === 'pig' ? 1 : 0.35));
  if (other) hurt(world, other, d * b.mass * (other.kind === 'pig' ? 2.5 : 0.5));
  if (impact > 260) world.events.push({ type: 'thud', power: impact * b.mass });
}

export function stepBodies(world, dt) {
  const G = WORLD.ground;
  const list = world.bodies.filter(b => !b.dead).sort((a, b) => (b.y + b.h / 2) - (a.y + a.h / 2));
  for (const b of list) {
    if (b.dead) continue;
    b.flash = Math.max(0, b.flash - dt);
    b.vy += WORLD.gravity * dt;

    // 옆으로 움직이고 옆 물체와 부딪히기
    b.x += b.vx * dt;
    for (const o of list) {
      if (o === b || o.dead) continue;
      const dx = overlapX(b, o), dy = overlapY(b, o);
      if (dx <= EPS || dy <= EPS || dx > Math.abs(b.vx * dt) + 1) continue;
      b.x += b.x < o.x ? -dx : dx;
      const rel = Math.abs(b.vx - o.vx);
      if (rel > PHYSICS.crashSpeed) {
        const d = (rel - PHYSICS.crashSpeed) * PHYSICS.crashDamage;
        hurt(world, o, d * b.mass * (o.kind === 'pig' ? 2 : 1));
        hurt(world, b, d * o.mass * (b.kind === 'pig' ? 2 : 1));
      }
      const v = (b.mass * b.vx + o.mass * o.vx) / (b.mass + o.mass);
      b.vx = v; o.vx = v;
    }

    // 위아래로 움직이고 땅이나 아래 물체 위에 올라앉기
    b.y += b.vy * dt;
    let landed = false, onGround = false, minL = Infinity, maxR = -Infinity;
    if (b.y + b.h / 2 >= G) {
      b.y = G - b.h / 2;
      if (b.vy > 0) landing(world, b, null, b.vy);
      b.vy = 0; landed = onGround = true;
    }
    for (const o of list) {
      if (o === b || o.dead) continue;
      const dx = overlapX(b, o), dy = overlapY(b, o);
      if (dx <= EPS || dy <= EPS) continue;
      if (b.y < o.y) {
        b.y = o.y - o.h / 2 - b.h / 2;
        const impact = b.vy - o.vy;
        if (impact > 0) landing(world, b, o, impact);
        if (b.vy > o.vy) b.vy = o.vy;
        landed = true;
        minL = Math.min(minL, Math.max(b.x - b.w / 2, o.x - o.w / 2));
        maxR = Math.max(maxR, Math.min(b.x + b.w / 2, o.x + o.w / 2));
      } else {
        o.y = b.y - b.h / 2 - o.h / 2;
        if (b.vy < o.vy) { const v = (b.mass * b.vy + o.mass * o.vy) / (b.mass + o.mass); b.vy = v; o.vy = v; }
      }
    }
    if (landed) {
      const tip = onGround || minL > maxR ? 0 : b.x < minL - 1 ? -1 : b.x > maxR + 1 ? 1 : 0;
      if (tip) b.vx += tip * PHYSICS.tipAccel * dt;
      else b.vx *= Math.pow(PHYSICS.friction, dt);
      if (Math.abs(b.vx) < 2) b.vx = 0;
    }
    if (b.x < -150 || b.x > WORLD.width + 150 || b.y > WORLD.height + 200) {
      if (b.kind === 'pig') hurt(world, b, 1e9); else b.dead = true;
    }
  }
}

export function stepShot(world, s, dt) {
  const G = WORLD.ground;
  s.age += dt;
  s.vy += WORLD.gravity * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  s.rot += s.vx * dt / s.r * 0.6;
  if (s.y + s.r > G) {
    s.y = G - s.r;
    if (s.vy > 0) {
      if (s.vy > 150) world.events.push({ type: 'thud', power: s.vy * s.mass });
      s.vy = -s.vy * 0.3;
      if (Math.abs(s.vy) < 40) s.vy = 0;
    }
    s.vx *= Math.pow(0.25, dt);
    s.touched = true;
  }
  for (const b of world.bodies) {
    if (b.dead) continue;
    let nx, ny, pen;
    if (b.kind === 'pig') {
      const dx = s.x - b.x, dy = s.y - b.y, dist = Math.hypot(dx, dy);
      if (dist >= s.r + b.r) continue;
      nx = dist ? dx / dist : -1; ny = dist ? dy / dist : 0; pen = s.r + b.r - dist;
    } else {
      const cx = clamp(s.x, b.x - b.w / 2, b.x + b.w / 2), cy = clamp(s.y, b.y - b.h / 2, b.y + b.h / 2);
      const dx = s.x - cx, dy = s.y - cy, dist = Math.hypot(dx, dy);
      if (dist >= s.r) continue;
      if (dist === 0) {
        const sp = Math.hypot(s.vx, s.vy) || 1;
        nx = -s.vx / sp; ny = -s.vy / sp; pen = s.r;
      } else { nx = dx / dist; ny = dy / dist; pen = s.r - dist; }
    }
    const vn = (s.vx - b.vx) * nx + (s.vy - b.vy) * ny;
    if (vn < 0) {
      const impact = -vn;
      s.touched = true;
      if (impact > 40) {
        const mult = b.kind === 'pig' ? 1 : (s.strong[b.mat] || 1);
        hurt(world, b, impact * s.mass * PHYSICS.hitDamage * mult * s.power);
        world.events.push({ type: 'hit', power: impact * s.mass });
      }
      if (b.dead) { s.vx *= 0.75; s.vy *= 0.75; continue; }
      const j = (1 + PHYSICS.bounce) * impact / (1 / s.mass + 1 / b.mass);
      s.vx += j / s.mass * nx; s.vy += j / s.mass * ny;
      b.vx -= j / b.mass * nx * PHYSICS.knock;
      b.vy = Math.max(b.vy - j / b.mass * ny * PHYSICS.knock, -250);
    }
    s.x += nx * pen; s.y += ny * pen;
  }
  const speed = Math.hypot(s.vx, s.vy);
  s.still = speed < 30 ? s.still + dt : 0;
  const waiting = s.fuse >= 0 && !s.used;
  const outside = s.x > WORLD.width + 80 || s.x < -80 || s.y > WORLD.height + 80;
  if (outside || (!waiting && (s.still > 0.8 || s.age > 9))) s.done = true;
}

// 폭발과 함성: 반경 안의 블록·돼지에 피해를 주고 바깥으로 밀어낸다.
export function explode(world, x, y, radius, { damage = 0, push = 0, strong = {} } = {}) {
  for (const b of world.bodies) {
    if (b.dead) continue;
    const dx = b.x - x, dy = b.y - y, len = Math.hypot(dx, dy) || 1;
    const d = Math.max(0, len - Math.min(b.w, b.h) / 2);
    if (d >= radius) continue;
    const f = 1 - d / radius;
    if (damage) hurt(world, b, damage * f * (b.kind === 'pig' ? 1.4 : (strong[b.mat] || 1)));
    if (!b.dead && push) {
      const k = push * f / Math.max(0.6, b.mass);
      b.vx += dx / len * k;
      b.vy += dy / len * k - k * 0.25;
    }
  }
}
