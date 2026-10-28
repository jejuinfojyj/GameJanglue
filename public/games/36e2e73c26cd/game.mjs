import { CONFIG, BRAWLERS, MODES } from './config.mjs';
import { updateCamera, screenToWorld, turnToward } from './camera2d.mjs';

const TAU = Math.PI * 2;
const STICK_R = 58;
const LEFT_STICK = { x: 96, y: CONFIG.height - 86 };
const RIGHT_STICK = { x: CONFIG.width - 96, y: CONFIG.height - 86 };
const SUPER_BTN = { x: CONFIG.width - 96, y: CONFIG.height - 178, r: 28 };
const GADGET_BTN = { x: CONFIG.width - 178, y: CONFIG.height - 178, r: 26 };

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function len(x, y) {
  return Math.hypot(x, y);
}
function norm(x, y) {
  const d = len(x, y) || 1;
  return { x: x / d, y: y / d };
}
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}
function pointInBush(x, y, bushes) {
  return bushes.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}
function inStick(px, py, stick) {
  return len(px - stick.x, py - stick.y) <= STICK_R + 30;
}
function stickVec(px, py, stick) {
  const dx = px - stick.x;
  const dy = py - stick.y;
  const d = len(dx, dy);
  if (d < 6) return { x: 0, y: 0, mag: 0 };
  const m = Math.min(1, d / STICK_R);
  return { x: (dx / d) * m, y: (dy / d) * m, mag: m };
}
function hitTest(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function buildMap() {
  const { w, h } = CONFIG.world;
  return {
    walls: [
      { x: 60, y: 220, w: 70, h: 28 },
      { x: 790, y: 220, w: 70, h: 28 },
      { x: 60, y: 930, w: 70, h: 28 },
      { x: 790, y: 930, w: 70, h: 28 },
      { x: 200, y: 360, w: 28, h: 110 },
      { x: 692, y: 360, w: 28, h: 110 },
      { x: 200, y: 710, w: 28, h: 110 },
      { x: 692, y: 710, w: 28, h: 110 },
      { x: 360, y: 500, w: 90, h: 28 },
      { x: 470, y: 650, w: 90, h: 28 },
      { x: 140, y: 560, w: 60, h: 24 },
      { x: 720, y: 560, w: 60, h: 24 },
    ],
    bushes: [
      { x: 110, y: 280, w: 120, h: 90 },
      { x: 690, y: 280, w: 120, h: 90 },
      { x: 110, y: 820, w: 120, h: 90 },
      { x: 690, y: 820, w: 120, h: 90 },
      { x: 300, y: 180, w: 140, h: 70 },
      { x: 480, y: 930, w: 140, h: 70 },
      { x: 390, y: 430, w: 140, h: 55 },
      { x: 390, y: 700, w: 140, h: 55 },
    ],
    mine: { x: w / 2, y: h / 2, r: 36 },
    allyGoal: { x: w / 2 - 55, y: h - 36, w: 110, h: 28 },
    enemyGoal: { x: w / 2 - 55, y: 8, w: 110, h: 28 },
    allySafe: { x: w / 2 - 40, y: h - 70, w: 80, h: 50, hp: CONFIG.rules.heistSafeHp, maxHp: CONFIG.rules.heistSafeHp },
    enemySafe: { x: w / 2 - 40, y: 20, w: 80, h: 50, hp: CONFIG.rules.heistSafeHp, maxHp: CONFIG.rules.heistSafeHp },
    hotzone: { x: w / 2 - 70, y: h / 2 - 70, w: 140, h: 140 },
    allySpawn: [
      { x: w / 2 - 70, y: h - 90 },
      { x: w / 2, y: h - 70 },
      { x: w / 2 + 70, y: h - 90 },
    ],
    enemySpawn: [
      { x: w / 2 - 70, y: 90 },
      { x: w / 2, y: 70 },
      { x: w / 2 + 70, y: 90 },
    ],
  };
}

function makeUnit(id, team, brawlerIndex, spawn, extras = {}) {
  const b = BRAWLERS[brawlerIndex];
  const power = extras.power || 1;
  return {
    id,
    team,
    brawlerIndex,
    name: b.name,
    role: b.role,
    color: b.color,
    x: spawn.x,
    y: spawn.y,
    hp: b.hp * power,
    maxHp: b.hp * power,
    aimX: team === 'ally' ? 0 : 0,
    aimY: team === 'ally' ? -1 : 1,
    cooldown: 0,
    burstLeft: 0,
    superCharge: 0,
    gadgetLeft: b.gadget?.uses || 3,
    gadgetBuff: 0,
    shield: 0,
    stealth: 0,
    speedMul: 1,
    damageMul: power,
    gems: 0,
    stars: 0,
    cubes: 0,
    alive: true,
    respawn: 0,
    hidden: false,
    flash: 0,
    think: Math.random(),
    dashT: 0,
    dashDx: 0,
    dashDy: 0,
    _dashDamage: 0,
    _dashHeal: 0,
    ai: id !== 'player',
    ...extras,
  };
}

function resolveMove(unit, dx, dy, dt, map, speedScale = 1) {
  const b = BRAWLERS[unit.brawlerIndex];
  const spd = b.speed * (unit.speedMul || 1) * speedScale;
  let nx = unit.x + dx * spd * dt;
  let ny = unit.y + dy * spd * dt;
  const r = b.radius;
  const { w, h } = CONFIG.world;
  nx = clamp(nx, r + 8, w - r - 8);
  ny = clamp(ny, r + 8, h - r - 8);
  for (const wall of map.walls) {
    if (circleHitsRect(nx, unit.y, r, wall)) nx = unit.x;
    if (circleHitsRect(unit.x, ny, r, wall)) ny = unit.y;
    if (circleHitsRect(nx, ny, r, wall)) {
      nx = unit.x;
      ny = unit.y;
    }
  }
  unit.x = nx;
  unit.y = ny;
}

function spawnBullet(state, owner, angle, damage, speed, life, color, opts = {}) {
  state.bullets.push({
    x: owner.x + Math.cos(angle) * 20,
    y: owner.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage: damage * (owner.damageMul || 1),
    heal: opts.heal || 0,
    life,
    team: owner.team,
    ownerId: owner.id,
    color,
    r: opts.r || 6,
    lob: !!opts.lob,
    arc: opts.lob ? 0 : 0,
    ignoreWall: !!opts.lob,
    splash: opts.splash || 0,
  });
}

function fireNormal(state, unit) {
  const b = BRAWLERS[unit.brawlerIndex];
  if (unit.cooldown > 0 || !unit.alive) return;
  const ang = Math.atan2(unit.aimY, unit.aimX);
  if (b.melee) {
    for (const other of state.units) {
      if (!other.alive || other.team === unit.team) continue;
      if (dist(unit, other) <= b.range + BRAWLERS[other.brawlerIndex].radius) {
        const d = norm(other.x - unit.x, other.y - unit.y);
        if (d.x * unit.aimX + d.y * unit.aimY > 0.3) hurt(state, other, b.damage, unit);
      }
    }
    unit.cooldown = b.fireRate;
    unit.flash = 0.12;
    state.fx.push({ kind: 'slash', x: unit.x, y: unit.y, ang, t: 0.18, color: unit.color });
    return;
  }
  const pellets = b.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const t = pellets === 1 ? 0 : (i / (pellets - 1) - 0.5) * b.spread;
    let dmg = b.damage;
    if (b.sniperFalloff) {
      // 멀리서 더  Sem게 (저격수 맛)
      dmg = b.damage * 0.75;
    }
    spawnBullet(state, unit, ang + t, dmg, b.bulletSpeed, b.range / Math.max(b.bulletSpeed, 1) + 0.08, unit.color, {
      heal: b.healShot || 0,
      lob: b.lob,
      splash: b.cactus ? 42 : b.lob ? 36 : 0,
      r: b.lob ? 8 : 6,
    });
  }
  unit.cooldown = b.burst ? 0.08 : b.fireRate;
  if (b.burst) {
    unit.burstLeft = (unit.burstLeft || b.burst) - 1;
    if (unit.burstLeft <= 0) {
      unit.burstLeft = 0;
      unit.cooldown = b.fireRate * 2.1;
    }
  }
  unit.flash = 0.08;
}

function fireSuper(state, unit) {
  const b = BRAWLERS[unit.brawlerIndex];
  const s = b.super;
  if (!unit.alive || unit.superCharge < s.cost) return false;
  unit.superCharge = 0;
  const ang = Math.atan2(unit.aimY, unit.aimX);
  if (s.type === 'shotgun' || s.type === 'beam') {
    const pellets = s.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const t = pellets === 1 ? 0 : (i / (pellets - 1) - 0.5) * (s.spread || 0);
      spawnBullet(state, unit, ang + t, s.damage, 560, (s.range || 240) / 560 + 0.05, '#ffe28a');
    }
  } else if (s.type === 'dash') {
    unit.dashT = 0.28;
    unit.dashDx = Math.cos(ang);
    unit.dashDy = Math.sin(ang);
    unit._dashDamage = s.damage;
    unit._dashHeal = s.heal || 0;
  } else if (s.type === 'healwave') {
    for (const other of state.units) {
      if (!other.alive || other.team !== unit.team) continue;
      if (dist(unit, other) <= s.range) {
        other.hp = Math.min(other.maxHp, other.hp + s.heal);
        state.fx.push({ kind: 'heal', x: other.x, y: other.y, t: 0.4, color: '#7dff9a' });
      }
    }
  } else if (s.type === 'stealth') {
    unit.stealth = s.duration;
  } else if (s.type === 'artillery') {
    const tx = unit.x + Math.cos(ang) * (s.range || 260);
    const ty = unit.y + Math.sin(ang) * (s.range || 260);
    state.fx.push({ kind: 'boom', x: tx, y: ty, t: 0.5, color: '#ffb347' });
    for (const other of state.units) {
      if (!other.alive || other.team === unit.team) continue;
      if (dist({ x: tx, y: ty }, other) < 70) hurt(state, other, s.damage, unit);
    }
  }
  state.fx.push({ kind: 'super', x: unit.x, y: unit.y, t: 0.45, color: CONFIG.palette.primary });
  return true;
}

function useGadget(state, unit) {
  const b = BRAWLERS[unit.brawlerIndex];
  const g = b.gadget;
  if (!g || unit.gadgetLeft <= 0 || !unit.alive) return false;
  unit.gadgetLeft -= 1;
  const ang = Math.atan2(unit.aimY, unit.aimX);
  if (g.type === 'speed') {
    unit.speedMul = 1.45;
    unit.gadgetBuff = g.duration;
  } else if (g.type === 'shield') {
    unit.shield = g.duration;
  } else if (g.type === 'heal') {
    unit.hp = Math.min(unit.maxHp, unit.hp + g.amount);
    state.fx.push({ kind: 'heal', x: unit.x, y: unit.y, t: 0.4, color: '#7dff9a' });
  } else if (g.type === 'dash') {
    unit.dashT = 0.2;
    unit.dashDx = Math.cos(ang);
    unit.dashDy = Math.sin(ang);
    unit._dashDamage = 0;
  } else if (g.type === 'knock') {
    for (const other of state.units) {
      if (!other.alive || other.team === unit.team) continue;
      if (dist(unit, other) < g.range) {
        const n = norm(other.x - unit.x, other.y - unit.y);
        other.x += n.x * 70;
        other.y += n.y * 70;
        hurt(state, other, 200, unit);
      }
    }
  } else if (g.type === 'zone') {
    state.zones.push({
      x: unit.x,
      y: unit.y,
      r: 70,
      t: g.duration,
      team: unit.team,
      dps: 280,
      ownerId: unit.id,
    });
  }
  state.fx.push({ kind: 'gadget', x: unit.x, y: unit.y, t: 0.35, color: '#9ad7ff' });
  return true;
}

function hurt(state, unit, amount, attacker) {
  if (!unit.alive) return;
  let dmg = amount;
  if (unit.shield > 0) dmg *= 0.45;
  unit.hp -= dmg;
  unit.flash = 0.15;
  if (unit.stealth > 0) unit.stealth = 0;
  if (attacker && attacker.alive) {
    attacker.superCharge = Math.min(1, attacker.superCharge + dmg / 2000);
  }
  state.fx.push({ kind: 'hit', x: unit.x, y: unit.y, t: 0.2, color: '#fff' });
  if (unit.hp <= 0) {
    unit.hp = 0;
    unit.alive = false;
    if (state.mode === 'knockout') unit.respawn = 999;
    else if (state.mode === 'showdown') unit.respawn = 999;
    else unit.respawn = CONFIG.rules.respawnSeconds;
    dropGems(state, unit);
    if (state.mode === 'bounty' || state.mode === 'gem' || state.mode === 'ball' || state.mode === 'heist' || state.mode === 'hotzone') {
      /* stars for flavor on kills in team modes optional */
    }
    if (attacker && attacker.alive && state.mode === 'knockout') {
      /* round may end */
    }
    if (attacker && attacker.alive) {
      attacker.stars = (attacker.stars || 0) + 1;
      if (state.mode === 'showdown') {
        attacker.cubes = (attacker.cubes || 0) + Math.max(1, unit.cubes || 0);
        applyCubes(attacker);
      }
    }
    state.fx.push({ kind: 'ko', x: unit.x, y: unit.y, t: 0.6, color: unit.color });
  }
}

function applyCubes(unit) {
  const base = BRAWLERS[unit.brawlerIndex];
  const mul = 1 + (unit.cubes || 0) * 0.12;
  const ratio = unit.hp / unit.maxHp;
  unit.maxHp = base.hp * mul;
  unit.hp = unit.maxHp * ratio;
  unit.damageMul = mul;
}

function dropGems(state, unit) {
  const n = unit.gems || 0;
  unit.gems = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const d = 18 + Math.random() * 40;
    state.gems.push({ x: unit.x + Math.cos(a) * d, y: unit.y + Math.sin(a) * d });
  }
}

function teamGems(state, team) {
  return state.units.filter((u) => u.team === team).reduce((s, u) => s + (u.gems || 0), 0);
}

function pickNearest(unit, list, pred) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    if (pred && !pred(item)) continue;
    const d = dist(unit, item);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

function findAutoAimTarget(state, unit) {
  const b = BRAWLERS[unit.brawlerIndex];
  const foes = state.units.filter((u) => u.alive && u.team !== unit.team && !(u.stealth > 0));
  let best = null;
  let score = Infinity;
  for (const f of foes) {
    const d = dist(unit, f);
    if (d > b.range * 1.15) continue;
    // 가까운 적 + 다가오는 적 우선
    const closing = (unit.x - f.x) * (f.x - unit.x) + (unit.y - f.y) * (f.y - unit.y);
    const s = d - (closing > 0 ? 40 : 0);
    if (s < score) {
      score = s;
      best = f;
    }
  }
  return best;
}

function aiControl(state, unit) {
  unit.think -= 0.016;
  if (unit.think > 0 && unit._aiMove) return unit._aiMove;
  unit.think = 0.2 + Math.random() * 0.3;
  const b = BRAWLERS[unit.brawlerIndex];
  const enemies = state.units.filter((u) => u.alive && u.team !== unit.team);
  const threat = pickNearest(unit, enemies);
  let target = null;
  let shoot = false;
  let useSuper = false;
  let useGadgetBtn = false;

  if (state.mode === 'gem') {
    const myG = teamGems(state, unit.team);
    if (unit.hp < unit.maxHp * 0.35) target = pickNearest(unit, state.map.bushes.map((bush) => ({ x: bush.x + bush.w / 2, y: bush.y + bush.h / 2 })));
    else if (myG < CONFIG.rules.gemWinCount) target = pickNearest(unit, state.gems) || state.map.mine;
    else target = pickNearest(unit, enemies) || state.map.mine;
  } else if (state.mode === 'showdown') {
    target = pickNearest(unit, state.crates) || pickNearest(unit, enemies) || { x: CONFIG.world.w / 2, y: CONFIG.world.h / 2 };
  } else if (state.mode === 'ball') {
    target = state.ball;
  } else if (state.mode === 'heist') {
    target = unit.team === 'ally' ? state.map.enemySafe : state.map.allySafe;
  } else if (state.mode === 'hotzone') {
    target = { x: state.map.hotzone.x + 70, y: state.map.hotzone.y + 70 };
  } else {
    target = threat;
  }

  if (threat && dist(unit, threat) < b.range * 0.95) {
    shoot = true;
    unit.aimX = threat.x - unit.x;
    unit.aimY = threat.y - unit.y;
    if (unit.superCharge >= 1) useSuper = true;
    if (unit.hp < unit.maxHp * 0.4 && unit.gadgetLeft > 0) useGadgetBtn = true;
  } else if (target) {
    unit.aimX = (target.x || target.x === 0 ? target.x : target.x) - unit.x;
    unit.aimY = (target.y || 0) - unit.y;
  }

  let mx = 0;
  let my = 0;
  if (target) {
    const v = norm((target.x || 0) - unit.x, (target.y || 0) - unit.y);
    mx = v.x;
    my = v.y;
  }
  if (threat && dist(unit, threat) < 85) {
    mx -= (threat.x - unit.x) * 0.02;
    my -= (threat.y - unit.y) * 0.02;
  }
  // 쇼다운 독가스 회피
  if (state.mode === 'showdown' && state.gasR) {
    const cx = CONFIG.world.w / 2;
    const cy = CONFIG.world.h / 2;
    if (dist(unit, { x: cx, y: cy }) > state.gasR - 40) {
      const v = norm(cx - unit.x, cy - unit.y);
      mx = v.x;
      my = v.y;
    }
  }
  unit._aiMove = { move: norm(mx, my), shoot, useSuper, useGadget: useGadgetBtn };
  return unit._aiMove;
}

function readPlayerInput(state, input, dt) {
  const feel = CONFIG.feel || {};
  const keys = input.keys;
  let ix = 0;
  let iy = 0;
  if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
  if (keys.has('d') || keys.has('arrowright')) ix += 1;
  if (keys.has('w') || keys.has('arrowup')) iy -= 1; // fixed north-up
  if (keys.has('s') || keys.has('arrowdown')) iy += 1;

  let wantAimX = state.playerAim.x;
  let wantAimY = state.playerAim.y;
  let shoot = false;
  let useSuper = keys.has('e') || keys.has('shift');
  let useGadgetBtn = keys.has('q') || input.pressed.has('q');
  let aimMode = 'none';
  let turnSpeed = feel.aimTurn || 2.4;
  let mouseAim = false;

  let left = null;
  let right = null;
  for (const p of input.pointers) {
    if (!p.down) continue;
    if (len(p.x - SUPER_BTN.x, p.y - SUPER_BTN.y) <= SUPER_BTN.r + 12) {
      useSuper = true;
      continue;
    }
    if (len(p.x - GADGET_BTN.x, p.y - GADGET_BTN.y) <= GADGET_BTN.r + 12) {
      useGadgetBtn = true;
      continue;
    }
    if (p.y > CONFIG.height * 0.58) {
      if (p.x < CONFIG.width * 0.48 && !left) left = p;
      else if (p.x >= CONFIG.width * 0.48 && !right) right = p;
    } else if (inStick(p.x, p.y, LEFT_STICK) && !left) left = p;
    else if (inStick(p.x, p.y, RIGHT_STICK) && !right) right = p;
  }

  // 스틱 이동(화면 기준 → 카메라 기준으로 아래에서 변환)
  if (left) {
    const v = stickVec(left.x, left.y, LEFT_STICK);
    if (v.mag > 0.1) {
      ix = v.x;
      iy = v.y;
    }
  }

  const movement = norm(ix, iy);
  const mx = movement.x;
  const my = movement.y;

  if (right) {
    const v = stickVec(right.x, right.y, RIGHT_STICK);
    shoot = true;
    turnSpeed = feel.stickAimTurn || 2.8;
    if (v.mag < 0.42) {
      aimMode = 'auto';
      const player = state.units.find((u) => u.id === 'player');
      const t = player && findAutoAimTarget(state, player);
      if (t) {
        wantAimX = t.x - player.x;
        wantAimY = t.y - player.y;
      } else if (v.mag > 0.08) {
        // 스틱 방향도 카메라 기준으로
        wantAimX = v.x;
        wantAimY = v.y;
      }
    } else {
      aimMode = 'manual';
      wantAimX = v.x;
      wantAimY = v.y;
    }
  }

  if (keys.has(' ')) {
    shoot = true;
    if (!right) {
      aimMode = 'auto';
      turnSpeed = feel.stickAimTurn || 2.8;
      const player = state.units.find((u) => u.id === 'player');
      const t = player && findAutoAimTarget(state, player);
      if (t) {
        wantAimX = t.x - player.x;
        wantAimY = t.y - player.y;
      }
    }
  }

  if (input.pointer.down && input.pointer.y < CONFIG.height * 0.62 && !left && !right) {
    const player = state.units.find((u) => u.id === 'player');
    if (player && state.camera.scale) {
      const hit = screenToWorld(input.pointer.x, input.pointer.y, state.camera);
      if (hit) {
        wantAimX = hit.x - player.x;
        wantAimY = hit.y - player.y;
        shoot = true;
        aimMode = 'manual';
        mouseAim = true;
        turnSpeed = feel.mouseAimTurn || 1.6;
      }
    }
  }

  // 조준 천천히 회전
  const aim = turnToward(state.playerAim.x, state.playerAim.y, wantAimX, wantAimY, turnSpeed, dt);
  state.playerAim = aim;

  // 이동 가속 보간 + 속도 배율
  if (!state.moveVel) state.moveVel = { x: 0, y: 0 };
  const accel = feel.moveAccel || 4.5;
  const t = 1 - Math.exp(-accel * dt);
  const scale = feel.moveScale || 0.82;
  state.moveVel.x += (mx * scale - state.moveVel.x) * t;
  state.moveVel.y += (my * scale - state.moveVel.y) * t;

  state.aimMode = aimMode;
  state.sticks = {
    left: { x: ix, y: iy, mag: len(ix, iy) },
    right: right ? stickVec(right.x, right.y, RIGHT_STICK) : { x: aim.x, y: aim.y, mag: shoot ? 1 : 0 },
  };
  return {
    move: { x: state.moveVel.x, y: state.moveVel.y },
    shoot,
    useSuper,
    useGadget: useGadgetBtn,
  };
}

export function createGame() {
  return {
    phase: 'splash',
    modeIndex: 0,
    mode: 'gem',
    pickIndex: 0,
    map: buildMap(),
    units: [],
    bullets: [],
    gems: [],
    crates: [],
    zones: [],
    fx: [],
    ball: null,
    gemTimer: 0,
    crateTimer: 0,
    holdTeam: null,
    holdTime: 0,
    matchTime: CONFIG.rules.matchSeconds,
    gasR: 620,
    allyScore: 0,
    enemyScore: 0,
    allyZone: 0,
    enemyZone: 0,
    koAlly: 0,
    koEnemy: 0,
    round: 1,
    camera: { x: 0, y: 0 },
    playerAim: { x: 0, y: -1 },
    viewDir: { x: 0, y: -1 },
    moveVel: { x: 0, y: 0 },
    aimMode: 'none',
    sticks: { left: { x: 0, y: 0, mag: 0 }, right: { x: 0, y: 0, mag: 0 } },
    message: '',
    toast: 0,
    result: null,
  };
}

function startMatch(state) {
  const map = buildMap();
  state.map = map;
  state.map.allySafe.hp = CONFIG.rules.heistSafeHp;
  state.map.enemySafe.hp = CONFIG.rules.heistSafeHp;
  state.map.allySafe.maxHp = CONFIG.rules.heistSafeHp;
  state.map.enemySafe.maxHp = CONFIG.rules.heistSafeHp;
  const pick = state.pickIndex;
  const mode = state.mode = 'gem';

  if (mode === 'showdown') {
    const spawns = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      spawns.push({
        x: CONFIG.world.w / 2 + Math.cos(a) * 380,
        y: CONFIG.world.h / 2 + Math.sin(a) * 460,
      });
    }
    state.units = [makeUnit('player', 'ally', pick, spawns[0])];
    for (let i = 1; i < 8; i++) {
      state.units.push(makeUnit('bot' + i, 'enemy', (pick + i) % BRAWLERS.length, spawns[i]));
    }
    // 쇼다운은 각자 적
    for (const u of state.units) {
      if (u.id !== 'player') u.team = 'solo' + u.id;
    }
    state.gasR = 620;
    state.crates = [];
    state.crateTimer = 1;
  } else {
    const allyPicks = [pick];
    for (let i = 0; i < BRAWLERS.length && allyPicks.length < 3; i++) if (!allyPicks.includes(i)) allyPicks.push(i);
    const enemyPicks = [];
    for (let i = BRAWLERS.length - 1; i >= 0 && enemyPicks.length < 3; i--) enemyPicks.push(i);
    state.units = [
      makeUnit('player', 'ally', allyPicks[0], map.allySpawn[1]),
      makeUnit('ally1', 'ally', allyPicks[1], map.allySpawn[0]),
      makeUnit('ally2', 'ally', allyPicks[2], map.allySpawn[2]),
      makeUnit('enemy0', 'enemy', enemyPicks[0], map.enemySpawn[0]),
      makeUnit('enemy1', 'enemy', enemyPicks[1], map.enemySpawn[1]),
      makeUnit('enemy2', 'enemy', enemyPicks[2], map.enemySpawn[2]),
    ];
  }

  state.bullets = [];
  state.gems = [];
  state.zones = [];
  state.fx = [];
  state.gemTimer = 0.5;
  state.holdTeam = null;
  state.holdTime = 0;
  state.matchTime = CONFIG.rules.matchSeconds;
  state.allyScore = state.allyScore || 0;
  state.enemyScore = state.enemyScore || 0;
  if (mode !== 'knockout' || state.round === 1) {
    state.allyScore = 0;
    state.enemyScore = 0;
    state.koAlly = 0;
    state.koEnemy = 0;
  }
  state.allyZone = 0;
  state.enemyZone = 0;
  state.ball =
    mode === 'ball'
      ? { x: CONFIG.world.w / 2, y: CONFIG.world.h / 2, vx: 0, vy: 0, owner: null }
      : null;
  state.phase = 'fight';
  state.message = MODES.find((m) => m.id === mode)?.blurb || '';
  state.toast = 2;
  const p0 = state.units.find((u) => u.id === 'player');
  if (p0) {
    state.viewDir = { x: p0.aimX, y: p0.aimY };
    state.moveVel = { x: 0, y: 0 };
    state.playerAim = { x: p0.aimX, y: p0.aimY };
    updateCamera(state, p0, 1 / 60);
  }
}

function finish(state, success, message) {
  state.result = { success, message };
  state.phase = 'result';
}

function updateModeLogic(state, dt) {
  const mode = state.mode;
  if (mode === 'gem') {
    state.gemTimer -= dt;
    if (state.gemTimer <= 0 && state.gems.length < CONFIG.rules.maxGemsOnField) {
      const mine = state.map.mine;
      const a = Math.random() * TAU;
      const d = 20 + Math.random() * 50;
      state.gems.push({ x: mine.x + Math.cos(a) * d, y: mine.y + Math.sin(a) * d });
      state.gemTimer = CONFIG.rules.gemSpawnEvery * (0.7 + Math.random() * 0.5);
    }
    const allyG = teamGems(state, 'ally');
    const enemyG = teamGems(state, 'enemy');
    const leading =
      allyG >= CONFIG.rules.gemWinCount && allyG > enemyG
        ? 'ally'
        : enemyG >= CONFIG.rules.gemWinCount && enemyG > allyG
          ? 'enemy'
          : allyG >= CONFIG.rules.gemWinCount && enemyG < CONFIG.rules.gemWinCount
            ? 'ally'
            : enemyG >= CONFIG.rules.gemWinCount && allyG < CONFIG.rules.gemWinCount
              ? 'enemy'
              : null;
    if (leading) {
      if (state.holdTeam !== leading) {
        state.holdTeam = leading;
        state.holdTime = CONFIG.rules.holdSeconds;
        state.message = leading === 'ally' ? '젬 10개! 15초 버텨!' : '적 홀드 중! 젬을 뺏어!';
        state.toast = 2;
      } else {
        state.holdTime -= dt;
        if (state.holdTime <= 0) {
          finish(
            state,
            leading === 'ally',
            leading === 'ally'
              ? `젬 그래버 승리! (${allyG}:${enemyG})`
              : `젬 그래버 패배… (${allyG}:${enemyG})`
          );
        }
      }
    } else {
      if (state.holdTeam) {
        state.message = '홀드 취소!';
        state.toast = 1.2;
      }
      state.holdTeam = null;
      state.holdTime = 0;
    }
  } else if (mode === 'showdown') {
    state.gasR = Math.max(120, state.gasR - 18 * dt);
    state.crateTimer -= dt;
    if (state.crateTimer <= 0 && state.crates.length < 6) {
      state.crates.push({
        x: 80 + Math.random() * (CONFIG.world.w - 160),
        y: 80 + Math.random() * (CONFIG.world.h - 160),
        hp: 400,
      });
      state.crateTimer = 3.5;
    }
    const cx = CONFIG.world.w / 2;
    const cy = CONFIG.world.h / 2;
    for (const u of state.units) {
      if (!u.alive) continue;
      if (dist(u, { x: cx, y: cy }) > state.gasR) hurt(state, u, 220 * dt, null);
      for (let i = state.crates.length - 1; i >= 0; i--) {
        const c = state.crates[i];
        if (dist(u, c) < 28) {
          c.hp -= 500 * dt;
          if (c.hp <= 0) {
            u.cubes = (u.cubes || 0) + 1;
            applyCubes(u);
            state.crates.splice(i, 1);
            state.fx.push({ kind: 'gem', x: c.x, y: c.y, t: 0.3, color: '#ffe28a' });
          }
        }
      }
    }
    const alive = state.units.filter((u) => u.alive);
    if (alive.length <= 1) {
      const win = alive[0]?.id === 'player';
      finish(state, win, win ? '쇼다운 승리! 최후의 1인!' : '쇼다운 탈락… 다시 도전!');
    }
  } else if (mode === 'ball' && state.ball) {
    const ball = state.ball;
    if (ball.owner) {
      const o = state.units.find((u) => u.id === ball.owner);
      if (o && o.alive) {
        ball.x = o.x + o.aimX * 26;
        ball.y = o.y + o.aimY * 26;
        // 공격 키로 슛: 소유자가 사격하면 공을 밀어냄 — update에서 shoot 시 처리
      } else ball.owner = null;
    } else {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vx *= 0.985;
      ball.vy *= 0.985;
      ball.x = clamp(ball.x, 20, CONFIG.world.w - 20);
      ball.y = clamp(ball.y, 20, CONFIG.world.h - 20);
      for (const u of state.units) {
        if (!u.alive) continue;
        if (dist(u, ball) < BRAWLERS[u.brawlerIndex].radius + 14) {
          ball.owner = u.id;
          ball.vx = 0;
          ball.vy = 0;
          break;
        }
      }
    }
    const eg = state.map.enemyGoal;
    const ag = state.map.allyGoal;
    if (ball.x > eg.x && ball.x < eg.x + eg.w && ball.y < eg.y + eg.h) {
      state.allyScore += 1;
      state.message = `골! ${state.allyScore} : ${state.enemyScore}`;
      state.toast = 1.5;
      ball.x = CONFIG.world.w / 2;
      ball.y = CONFIG.world.h / 2;
      ball.owner = null;
      ball.vx = 0;
      ball.vy = 0;
    }
    if (ball.x > ag.x && ball.x < ag.x + ag.w && ball.y > ag.y) {
      state.enemyScore += 1;
      state.message = `실점… ${state.allyScore} : ${state.enemyScore}`;
      state.toast = 1.5;
      ball.x = CONFIG.world.w / 2;
      ball.y = CONFIG.world.h / 2;
      ball.owner = null;
      ball.vx = 0;
      ball.vy = 0;
    }
    if (state.allyScore >= CONFIG.rules.ballGoalsToWin) finish(state, true, `브롤 볼 승리! ${state.allyScore}:${state.enemyScore}`);
    if (state.enemyScore >= CONFIG.rules.ballGoalsToWin) finish(state, false, `브롤 볼 패배… ${state.allyScore}:${state.enemyScore}`);
  } else if (mode === 'heist') {
    // 금고는 총알 히트에서 처리. 시간 종료 비교
  } else if (mode === 'hotzone') {
    const z = state.map.hotzone;
    let allyIn = 0;
    let enemyIn = 0;
    for (const u of state.units) {
      if (!u.alive) continue;
      if (u.x > z.x && u.x < z.x + z.w && u.y > z.y && u.y < z.y + z.h) {
        if (u.team === 'ally') allyIn++;
        else if (u.team === 'enemy') enemyIn++;
      }
    }
    if (allyIn > enemyIn) state.allyZone = Math.min(100, state.allyZone + 12 * dt);
    if (enemyIn > allyIn) state.enemyZone = Math.min(100, state.enemyZone + 12 * dt);
    if (state.allyZone >= 100) finish(state, true, '핫존 점령 성공!');
    if (state.enemyZone >= 100) finish(state, false, '핫존을 빼앗겼어…');
  } else if (mode === 'knockout') {
    const allyAlive = state.units.some((u) => u.team === 'ally' && u.alive);
    const enemyAlive = state.units.some((u) => u.team === 'enemy' && u.alive);
    if (!allyAlive || !enemyAlive) {
      if (allyAlive) state.koAlly += 1;
      else state.koEnemy += 1;
      if (state.koAlly >= CONFIG.rules.knockoutRounds) finish(state, true, `녹아웃 승리! ${state.koAlly}:${state.koEnemy}`);
      else if (state.koEnemy >= CONFIG.rules.knockoutRounds) finish(state, false, `녹아웃 패배… ${state.koAlly}:${state.koEnemy}`);
      else {
        state.round += 1;
        state.message = `라운드 ${state.round}! (${state.koAlly}:${state.koEnemy})`;
        state.toast = 2;
        startMatch(state);
      }
    }
  }

  if (!state.result && mode !== 'showdown' && mode !== 'knockout' && state.matchTime <= 0) {
    if (mode === 'gem') {
      const a = teamGems(state, 'ally');
      const e = teamGems(state, 'enemy');
      finish(state, a >= e, `시간 종료 젬 ${a}:${e}`);
    } else if (mode === 'heist') {
      const a = state.map.allySafe.hp;
      const e = state.map.enemySafe.hp;
      finish(state, e < a, `하이스트 종료 금고 ${(e / 1000).toFixed(1)}k vs ${(a / 1000).toFixed(1)}k`);
    } else if (mode === 'ball') {
      finish(state, state.allyScore >= state.enemyScore, `브롤 볼 ${state.allyScore}:${state.enemyScore}`);
    } else if (mode === 'hotzone') {
      finish(state, state.allyZone >= state.enemyZone, `핫존 ${state.allyZone | 0}% : ${state.enemyZone | 0}%`);
    }
  }
}

export function updateGame(state, dt, input) {
  if (state.phase === 'splash') {
    state.phase = 'mode';
    return;
  }

  if (state.phase === 'mode') {
    if (input.pressed.has('a') || input.pressed.has('arrowleft')) state.modeIndex = (state.modeIndex + MODES.length - 1) % MODES.length;
    if (input.pressed.has('d') || input.pressed.has('arrowright')) state.modeIndex = (state.modeIndex + 1) % MODES.length;
    if (input.pointer.pressed) {
      const cardW = 200;
      const cardH = 70;
      const cols = Math.min(3, MODES.length);
      const gap = 14;
      const startX = (CONFIG.width - (cardW * cols + gap * (cols - 1))) / 2;
      const startY = 150;
      for (let i = 0; i < MODES.length; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + 12);
        if (hitTest(input.pointer.x, input.pointer.y, x, y, cardW, cardH)) state.modeIndex = i;
      }
      if (hitTest(input.pointer.x, input.pointer.y, CONFIG.width / 2 - 110, 420, 220, 56)) {
        state.mode = MODES[state.modeIndex].id;
        state.phase = 'pick';
      }
    }
    if (input.pressed.has(' ') || input.pressed.has('enter')) {
      state.mode = MODES[state.modeIndex].id;
      state.phase = 'pick';
    }
    return;
  }

  if (state.phase === 'pick') {
    if (input.pressed.has('a') || input.pressed.has('arrowleft')) state.pickIndex = (state.pickIndex + BRAWLERS.length - 1) % BRAWLERS.length;
    if (input.pressed.has('d') || input.pressed.has('arrowright')) state.pickIndex = (state.pickIndex + 1) % BRAWLERS.length;
    if (input.pointer.pressed) {
      const cardW = 84;
      const gap = 10;
      const cols = 5;
      const startX = (CONFIG.width - (cardW * cols + gap * (cols - 1))) / 2;
      const y0 = 140;
      for (let i = 0; i < BRAWLERS.length; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        const x = startX + col * (cardW + gap);
        const y = y0 + row * 110;
        if (hitTest(input.pointer.x, input.pointer.y, x, y, cardW, 100)) state.pickIndex = i;
      }
      if (hitTest(input.pointer.x, input.pointer.y, CONFIG.width / 2 - 110, 420, 220, 56)) startMatch(state);
      if (hitTest(input.pointer.x, input.pointer.y, 20, 16, 80, 36)) state.phase = 'mode';
    }
    if (input.pressed.has(' ') || input.pressed.has('enter')) startMatch(state);
    if (input.pressed.has('backspace')) state.phase = 'mode';
    return;
  }

  if (state.phase !== 'fight' || state.result) return;

  state.matchTime -= dt;
  state.toast = Math.max(0, state.toast - dt);

  const playerInput = readPlayerInput(state, input, dt);

  for (const unit of state.units) {
    unit.cooldown = Math.max(0, unit.cooldown - dt);
    unit.flash = Math.max(0, unit.flash - dt);
    unit.gadgetBuff = Math.max(0, unit.gadgetBuff - dt);
    unit.shield = Math.max(0, unit.shield - dt);
    unit.stealth = Math.max(0, unit.stealth - dt);
    if (unit.gadgetBuff <= 0) unit.speedMul = 1;

    if (!unit.alive) {
      unit.respawn -= dt;
      if (unit.respawn <= 0 && state.mode !== 'showdown' && state.mode !== 'knockout') {
        unit.alive = true;
        unit.hp = unit.maxHp;
        const spawn = unit.team === 'ally' ? state.map.allySpawn[(Math.random() * 3) | 0] : state.map.enemySpawn[(Math.random() * 3) | 0];
        unit.x = spawn.x;
        unit.y = spawn.y;
        unit.gems = 0;
      }
      continue;
    }

    let move = { x: 0, y: 0 };
    let shoot = false;
    let useSuper = false;
    let useGad = false;
    if (unit.id === 'player') {
      move = playerInput.move;
      shoot = playerInput.shoot;
      useSuper = playerInput.useSuper;
      useGad = playerInput.useGadget;
      unit.aimX = state.playerAim.x;
      unit.aimY = state.playerAim.y;
    } else {
      const ai = aiControl(state, unit);
      move = ai.move;
      shoot = ai.shoot;
      useSuper = ai.useSuper;
      useGad = ai.useGadget;
    }

    if (unit.dashT > 0) {
      unit.dashT -= dt;
      resolveMove(unit, unit.dashDx * 3.2, unit.dashDy * 3.2, dt, state.map);
      for (const other of state.units) {
        if (!other.alive || other.team === unit.team) continue;
        if (dist(unit, other) < BRAWLERS[unit.brawlerIndex].radius + BRAWLERS[other.brawlerIndex].radius + 8) {
          if (unit._dashDamage) hurt(state, other, unit._dashDamage * dt * 4, unit);
          if (unit._dashHeal) unit.hp = Math.min(unit.maxHp, unit.hp + unit._dashHeal * dt);
        }
      }
    } else if (move.x || move.y) {
      resolveMove(unit, move.x, move.y, dt, state.map);
    }

    unit.hidden = pointInBush(unit.x, unit.y, state.map.bushes) || unit.stealth > 0;
    if (shoot || unit.dashT > 0 || unit.flash > 0) {
      if (unit.stealth <= 0) unit.hidden = pointInBush(unit.x, unit.y, state.map.bushes) && false;
      else unit.hidden = unit.stealth > 0;
      if (shoot) unit.hidden = unit.stealth > 0 ? false : false;
    }
    // simplify visibility: bush hide unless attacking; stealth always hide until attack
    unit.hidden = (pointInBush(unit.x, unit.y, state.map.bushes) && !shoot && unit.flash <= 0) || (unit.stealth > 0 && !shoot);

    if (useGad) useGadget(state, unit);
    if (useSuper) fireSuper(state, unit);
    if (shoot) {
      fireNormal(state, unit);
      // 브롤 볼 슛
      if (state.ball && state.ball.owner === unit.id) {
        state.ball.owner = null;
        state.ball.vx = unit.aimX * 420;
        state.ball.vy = unit.aimY * 420;
      }
    }

    for (let i = state.gems.length - 1; i >= 0; i--) {
      if (dist(unit, state.gems[i]) < BRAWLERS[unit.brawlerIndex].radius + 14) {
        unit.gems += 1;
        unit.superCharge = Math.min(1, unit.superCharge + 0.08);
        state.gems.splice(i, 1);
      }
    }
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!b.ignoreWall) {
      for (const wall of state.map.walls) {
        if (circleHitsRect(b.x, b.y, b.r, wall)) {
          dead = true;
          break;
        }
      }
    }
    if (!dead && state.mode === 'heist') {
      const safes = [
        { s: state.map.enemySafe, team: 'ally' },
        { s: state.map.allySafe, team: 'enemy' },
      ];
      for (const { s, team } of safes) {
        if (b.team === team && circleHitsRect(b.x, b.y, b.r, s)) {
          s.hp -= b.damage;
          dead = true;
          state.fx.push({ kind: 'hit', x: b.x, y: b.y, t: 0.15, color: '#ffd24a' });
          if (s.hp <= 0) {
            finish(state, team === 'ally', team === 'ally' ? '금고 파괴! 하이스트 승리!' : '우리 금고가 파괴됐어…');
          }
          break;
        }
      }
    }
    if (!dead) {
      for (const unit of state.units) {
        if (!unit.alive) continue;
        const same = unit.team === b.team;
        // showdown: everyone is enemy except self
        const hostile = state.mode === 'showdown' ? unit.id !== b.ownerId : !same;
        if (dist(b, unit) > BRAWLERS[unit.brawlerIndex].radius + b.r) continue;
        if (!hostile) {
          if (b.heal > 0 && unit.hp < unit.maxHp) {
            unit.hp = Math.min(unit.maxHp, unit.hp + b.heal);
            dead = true;
            break;
          }
          continue;
        }
        const attacker = state.units.find((u) => u.id === b.ownerId);
        hurt(state, unit, b.damage, attacker);
        if (b.splash) {
          for (const o of state.units) {
            if (!o.alive || o.id === unit.id) continue;
            if (state.mode === 'showdown' ? o.id === b.ownerId : o.team === b.team) continue;
            if (dist(b, o) < b.splash) hurt(state, o, b.damage * 0.45, attacker);
          }
        }
        dead = true;
        break;
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }

  for (let i = state.zones.length - 1; i >= 0; i--) {
    const z = state.zones[i];
    z.t -= dt;
    const owner = state.units.find((u) => u.id === z.ownerId);
    for (const u of state.units) {
      if (!u.alive || u.team === z.team) continue;
      if (dist(u, z) < z.r) hurt(state, u, z.dps * dt, owner);
    }
    if (z.t <= 0) state.zones.splice(i, 1);
  }

  updateModeLogic(state, dt);

  const player = state.units.find((u) => u.id === 'player');
  if (player) updateCamera(state, player, dt);

  for (let i = state.fx.length - 1; i >= 0; i--) {
    state.fx[i].t -= dt;
    if (state.fx[i].t <= 0) state.fx.splice(i, 1);
  }
}

export function teamGemCount(state, team) {
  return teamGems(state, team);
}

export const UI = { LEFT_STICK, RIGHT_STICK, SUPER_BTN, GADGET_BTN, STICK_R, BRAWLERS, MODES };
