import {
  CONFIG,
  MODES,
  VEHICLES,
  DECALS,
  WHEELS,
  BOOSTS,
  PASS_REWARDS,
} from './config.mjs';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const len = (x, y) => Math.hypot(x, y) || 1;

function defaultSave() {
  return {
    credits: 80,
    xp: 0,
    claimedPass: { 1: true },
    owned: {
      vehicles: ['octane'],
      decals: ['none'],
      wheels: ['oem'],
      boosts: ['standard'],
    },
    loadout: {
      vehicle: 'octane',
      decal: 'none',
      wheel: 'oem',
      boost: 'standard',
      primary: '#3aa0ff',
    },
    stats: { matches: 0, wins: 0, goals: 0 },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return defaultSave();
    const data = { ...defaultSave(), ...JSON.parse(raw) };
    data.owned = { ...defaultSave().owned, ...(data.owned || {}) };
    data.loadout = { ...defaultSave().loadout, ...(data.loadout || {}) };
    data.stats = { ...defaultSave().stats, ...(data.stats || {}) };
    data.claimedPass = { 1: true, ...(data.claimedPass || {}) };
    return data;
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(save));
}

export function passLevel(xp) {
  let level = 1;
  for (const r of PASS_REWARDS) {
    if (xp >= r.xp) level = r.level;
  }
  return level;
}

export function nextPassReward(xp) {
  return PASS_REWARDS.find((r) => xp < r.xp) || null;
}

function findItem(list, id) {
  return list.find((x) => x.id === id) || list[0];
}

function createCar(team, x, y, face, isPlayer, cosmetics) {
  const vehicle = findItem(VEHICLES, cosmetics.vehicle);
  return {
    team,
    isPlayer,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: face > 0 ? 0 : Math.PI,
    av: 0,
    onGround: true,
    jumpsLeft: 2,
    boost: CONFIG.boostMax,
    flipTimer: 0,
    jumpHold: 0,
    stun: 0,
    cosmetics: { ...cosmetics, vehicle: vehicle.id },
    vehicle,
  };
}

function createBall(x, y) {
  return { x, y, vx: 0, vy: 0, r: CONFIG.ballRadius };
}

function hoopRects() {
  const cx = CONFIG.width / 2;
  const cy = 150;
  const rimR = 42;
  return {
    cx,
    cy,
    rimR,
    left: { x: cx - rimR - 6, y: cy - 10, w: 12, h: 20 },
    right: { x: cx + rimR - 6, y: cy - 10, w: 12, h: 20 },
    back: { x: cx - rimR, y: cy - 28, w: rimR * 2, h: 10 },
  };
}

function resetKickoff(match, favorTeam = 0) {
  const midX = CONFIG.width / 2;
  const floor = CONFIG.floorY;
  match.ball = createBall(midX, floor - 120);
  match.kickoff = CONFIG.kickoffDelay;
  match.scorerFlash = 0;
  match.lastGoalTeam = favorTeam;

  for (const car of match.cars) {
    const side = car.team === 0 ? -1 : 1;
    const slot = car.slot || 0;
    car.x = midX + side * (160 + slot * 70);
    car.y = floor - car.vehicle.halfH;
    car.vx = 0;
    car.vy = 0;
    car.angle = side < 0 ? 0 : Math.PI;
    car.av = 0;
    car.onGround = true;
    car.jumpsLeft = 2;
    car.boost = Math.max(car.boost, 60);
    car.flipTimer = 0;
    car.jumpHold = 0;
    car.stun = 0;
  }
}

function startMatch(state, modeId) {
  const mode = MODES.find((m) => m.id === modeId) || MODES[0];
  const loadout = state.save.loadout;
  const cars = [];

  cars.push(
    Object.assign(
      createCar(0, 0, 0, 1, true, loadout),
      { slot: 0, name: '나' },
    ),
  );

  for (let i = 0; i < mode.allies; i += 1) {
    cars.push(
      Object.assign(
        createCar(0, 0, 0, 1, false, {
          vehicle: 'octane',
          decal: 'stripe',
          wheel: 'oem',
          boost: 'standard',
          primary: '#5ec8ff',
        }),
        { slot: i + 1, name: `아군${i + 1}`, ai: true },
      ),
    );
  }

  for (let i = 0; i < mode.enemies; i += 1) {
    cars.push(
      Object.assign(
        createCar(1, 0, 0, -1, false, {
          vehicle: i === 0 ? 'dominus' : 'fennec',
          decal: 'flame',
          wheel: 'chrome',
          boost: 'thermal',
          primary: '#ff8a3d',
        }),
        { slot: i, name: `상대${i + 1}`, ai: true },
      ),
    );
  }

  state.screen = 'match';
  state.match = {
    mode,
    cars,
    ball: createBall(CONFIG.width / 2, CONFIG.floorY - 120),
    timeLeft: CONFIG.matchSeconds,
    score: [0, 0],
    kickoff: CONFIG.kickoffDelay,
    scorerFlash: 0,
    lastGoalTeam: -1,
    particles: [],
    trails: [],
    toast: '',
    toastT: 0,
    playerGoals: 0,
    lastTouchTeam: 0,
    ended: false,
  };
  resetKickoff(state.match);
}

function claimPassRewards(save) {
  const messages = [];
  for (const reward of PASS_REWARDS) {
    if (save.xp < reward.xp || save.claimedPass[reward.level]) continue;
    save.claimedPass[reward.level] = true;
    if (reward.type === 'credits') {
      save.credits += reward.amount;
    } else if (reward.type === 'vehicle') {
      if (!save.owned.vehicles.includes(reward.id)) save.owned.vehicles.push(reward.id);
    } else if (reward.type === 'decal') {
      if (!save.owned.decals.includes(reward.id)) save.owned.decals.push(reward.id);
    } else if (reward.type === 'wheel') {
      if (!save.owned.wheels.includes(reward.id)) save.owned.wheels.push(reward.id);
    } else if (reward.type === 'boost') {
      if (!save.owned.boosts.includes(reward.id)) save.owned.boosts.push(reward.id);
    }
    messages.push(reward.label);
  }
  return messages;
}

function finishMatch(state) {
  const m = state.match;
  if (m.ended) return;
  m.ended = true;
  const win = m.score[0] > m.score[1];
  const draw = m.score[0] === m.score[1];
  const save = state.save;
  save.stats.matches += 1;
  if (win) save.stats.wins += 1;
  save.stats.goals += m.playerGoals;

  const baseXp = 40 + m.playerGoals * 25 + (win ? 40 : draw ? 20 : 8);
  const credits = 25 + m.playerGoals * 15 + (win ? 35 : draw ? 18 : 10);
  save.xp += baseXp;
  save.credits += credits;
  const unlocked = claimPassRewards(save);
  writeSave(save);

  const scoreLine = `${m.score[0]} : ${m.score[1]}`;
  let message = draw
    ? `무승부 ${scoreLine}. XP +${baseXp}, 크레딧 +${credits}`
    : win
      ? `승리 ${scoreLine}! XP +${baseXp}, 크레딧 +${credits}`
      : `패배 ${scoreLine}. XP +${baseXp}, 크레딧 +${credits}`;
  if (unlocked.length) message += `\n패스 해금: ${unlocked.join(', ')}`;

  state.result = {
    success: win || draw,
    message,
  };
}

function hitTest(ui, x, y) {
  for (let i = ui.length - 1; i >= 0; i -= 1) {
    const b = ui[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

function readControls(state, input) {
  const pads = { left: false, right: false, jump: false, jumpPressed: false, boost: false };
  const keys = input.keys;
  if (keys.has('arrowleft') || keys.has('a')) pads.left = true;
  if (keys.has('arrowright') || keys.has('d')) pads.right = true;
  pads.jump = keys.has(' ') || keys.has('w') || keys.has('arrowup');
  if (keys.has('shift') || keys.has('e') || keys.has('f')) pads.boost = true;

  const zones = state.controlZones || [];
  let touchJump = false;
  for (const p of input.pointers) {
    if (p.down === false) continue;
    for (const z of zones) {
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
        if (z.action === 'left') pads.left = true;
        if (z.action === 'right') pads.right = true;
        if (z.action === 'jump') {
          pads.jump = true;
          touchJump = true;
        }
        if (z.action === 'boost') pads.boost = true;
      }
    }
  }
  pads.jumpPressed = pads.jump && !state._jumpHeld;
  state._jumpHeld = pads.jump;
  state._touchJump = touchJump;

  // UI clicks on hub/garage/pass
  if (input.pointer.pressed) {
    const hit = hitTest(state.ui || [], input.pointer.x, input.pointer.y);
    if (hit) state._pendingAction = hit;
  }
  return pads;
}

function applyCarInput(car, pads, dt) {
  const v = car.vehicle;
  car.stun = Math.max(0, car.stun - dt);
  car.flipTimer = Math.max(0, car.flipTimer - dt);
  if (car.stun > 0) return;

  const drive = (pads.right ? 1 : 0) - (pads.left ? 1 : 0);
  const onGround = car.onGround;

  if (onGround) {
    car.vx += drive * CONFIG.driveAccel * v.power * dt;
    car.vx *= Math.pow(0.15, dt * (0.7 + v.grip * 0.3));
    car.vx = clamp(car.vx, -CONFIG.driveMax * v.power, CONFIG.driveMax * v.power);
    const target = Math.abs(car.vx) > 20 ? (car.vx > 0 ? 0 : Math.PI) : car.angle;
    let diff = target - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.av += diff * 18 * dt;
    car.av *= Math.pow(0.02, dt);
    if (pads.jumpPressed && car.jumpsLeft > 0) {
      car.vy = -CONFIG.jumpSpeed;
      car.onGround = false;
      car.jumpsLeft -= 1;
      car.jumpHold = 0.18;
    }
  } else {
    car.av += drive * CONFIG.torque * dt;
    car.vx += drive * CONFIG.airAccel * dt;
    if (pads.jumpPressed && car.jumpsLeft > 0) {
      if (drive !== 0 && car.flipTimer <= 0) {
        car.vx += drive * CONFIG.dodgeSpeed * 0.85;
        car.vy = Math.min(car.vy, -CONFIG.jumpSpeed * 0.9);
        car.av += drive * 4;
        car.flipTimer = 0.45;
      } else {
        car.vy = Math.min(car.vy, -CONFIG.jumpSpeed * 0.85);
      }
      car.jumpsLeft -= 1;
    }
  }

  if (pads.jump && car.jumpHold > 0 && car.vy < 0) car.vy -= 700 * dt;
  car.jumpHold = Math.max(0, (car.jumpHold || 0) - dt);
  if (!pads.jump) car.jumpHold = 0;
  car.av = clamp(car.av, -5.5, 5.5);

  if (pads.boost && car.boost > 0) {
    const force = CONFIG.boostForce * v.boostMul;
    car.vx += Math.cos(car.angle) * force * dt;
    car.vy += Math.sin(car.angle) * force * dt;
    car.boost = Math.max(0, car.boost - CONFIG.boostCost * dt);
    car._boosting = true;
  } else {
    car._boosting = false;
    if (onGround) car.boost = Math.min(CONFIG.boostMax, car.boost + CONFIG.boostRegen * dt);
  }
}

function aiPads(car, match) {
  const ball = match.ball;
  const goalX = car.team === 0 ? CONFIG.fieldRight : CONFIG.fieldLeft;
  const ownGoalX = car.team === 0 ? CONFIG.fieldLeft : CONFIG.fieldRight;
  const attack = ball.x + ball.vx * 0.35;
  const behindBall = car.team === 0 ? car.x < attack - 10 : car.x > attack + 10;
  const pads = { left: false, right: false, jump: false, jumpPressed: false, boost: false };

  let targetX = attack;
  if (match.mode.kind === 'hoops') {
    targetX = ball.x;
  } else if (!behindBall && Math.abs(ball.x - ownGoalX) < 220) {
    targetX = ball.x + (car.team === 0 ? -50 : 50);
  } else {
    targetX = ball.x + (goalX > ball.x ? -28 : 28);
  }

  if (car.slot === 1 && car.team === 0) targetX = Math.min(targetX, CONFIG.width * 0.45);
  if (car.slot === 1 && car.team === 1) targetX = Math.max(targetX, CONFIG.width * 0.55);

  if (car.x < targetX - 12) pads.right = true;
  if (car.x > targetX + 12) pads.left = true;

  const dist = Math.hypot(ball.x - car.x, ball.y - car.y);
  if (dist < 110 && ball.y < car.y - 10 && car.onGround) {
    pads.jumpPressed = true;
    pads.jump = true;
  }
  if (!car.onGround && ball.y < car.y && Math.abs(ball.x - car.x) < 80) {
    pads.boost = true;
    if (ball.x > car.x) pads.right = true;
    else pads.left = true;
  }
  if (Math.abs(ball.x - car.x) > 160 && behindBall) pads.boost = Math.random() > 0.35;
  if (match.mode.kind === 'hoops' && ball.y < 260 && dist < 140) {
    pads.jumpPressed = car.onGround || car.jumpsLeft > 0;
    pads.boost = true;
  }
  return pads;
}

function resolveCarWorld(car, dt) {
  car.vy += CONFIG.gravity * dt;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  car.angle += car.av * dt;
  car.av *= Math.pow(0.2, dt);
  car.vx = clamp(car.vx, -850, 850);
  car.vy = clamp(car.vy, -1000, 1000);

  const halfW = car.vehicle.halfW;
  const halfH = car.vehicle.halfH;
  const floor = CONFIG.floorY - halfH;
  const ceil = CONFIG.ceilingY + halfH;

  if (car.y >= floor) {
    car.y = floor;
    if (car.vy > 0) car.vy = 0;
    car.onGround = true;
    car.jumpsLeft = 2;
    // flatten toward upright
    let a = ((car.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const upright = a < Math.PI / 2 || a > (Math.PI * 3) / 2 ? 0 : Math.PI;
    let diff = upright - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += diff * Math.min(1, 10 * dt);
    car.av *= 0.5;
  } else {
    car.onGround = false;
  }

  if (car.y < ceil) {
    car.y = ceil;
    car.vy = Math.abs(car.vy) * 0.4;
  }

  car.x = clamp(car.x, CONFIG.fieldLeft + halfW, CONFIG.fieldRight - halfW);
}

function resolveBall(ball, dt, mode) {
  const previous = { x: ball.x, y: ball.y };
  ball.vy += CONFIG.gravity * 0.85 * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.vx *= Math.pow(0.55, dt);
  ball.vy *= Math.pow(0.7, dt);

  const r = ball.r;
  if (ball.y > CONFIG.floorY - r) {
    ball.y = CONFIG.floorY - r;
    ball.vy *= -0.62;
    ball.vx *= 0.92;
    if (Math.abs(ball.vy) < 40) ball.vy = 0;
  }
  if (ball.y < CONFIG.ceilingY + r) {
    ball.y = CONFIG.ceilingY + r;
    ball.vy *= -0.55;
  }

  if (mode.kind === 'soccer') {
    const goalTop = CONFIG.floorY - CONFIG.goalHalfH * 2;
    const inGoalY = ball.y > goalTop;
    if (ball.x < CONFIG.fieldLeft + r) {
      if (inGoalY) return 'orange';
      ball.x = CONFIG.fieldLeft + r;
      ball.vx *= -0.7;
    }
    if (ball.x > CONFIG.fieldRight - r) {
      if (inGoalY) return 'blue';
      ball.x = CONFIG.fieldRight - r;
      ball.vx *= -0.7;
    }
  } else {
    if (ball.x < CONFIG.fieldLeft + r) {
      ball.x = CONFIG.fieldLeft + r;
      ball.vx *= -0.7;
    }
    if (ball.x > CONFIG.fieldRight - r) {
      ball.x = CONFIG.fieldRight - r;
      ball.vx *= -0.7;
    }
    const hoop = hoopRects();
    // rim collision
    for (const post of [hoop.left, hoop.right]) {
      const cx = post.x + post.w / 2;
      const cy = post.y + post.h / 2;
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const d = len(dx, dy);
      const min = r + 10;
      if (d < min) {
        const nx = dx / d;
        const ny = dy / d;
        ball.x = cx + nx * min;
        ball.y = cy + ny * min;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= 1.6 * vn * nx;
          ball.vy -= 1.6 * vn * ny;
        }
      }
    }
    // score: ball center passes through hoop downward
    if (previous.y < hoop.cy && ball.y >= hoop.cy && ball.vy > 0) {
      const t = (hoop.cy - previous.y) / (ball.y - previous.y);
      const crossX = previous.x + (ball.x - previous.x) * t;
      if (Math.abs(crossX - hoop.cx) < hoop.rimR - 10 - r) return 'hoop';
    }
  }
  return null;
}

function collideCarBall(car, ball, mode) {
  const hw = car.vehicle.halfW + 4;
  const hh = car.vehicle.halfH + 4;
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  const dx = ball.x - car.x;
  const dy = ball.y - car.y;
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;
  let cx = clamp(lx, -hw, hw);
  let cy = clamp(ly, -hh, hh);
  let ox = lx - cx;
  let oy = ly - cy;
  let d = Math.hypot(ox, oy);
  if (d > ball.r) return false;
  // Resolve a ball embedded in the body against its nearest face as well.
  let nxLocal, nyLocal;
  if (d < 0.001) {
    if (hw - Math.abs(lx) < hh - Math.abs(ly)) {
      nxLocal = lx >= 0 ? 1 : -1; nyLocal = 0; cx = nxLocal * hw;
    } else {
      nxLocal = 0; nyLocal = ly >= 0 ? 1 : -1; cy = nyLocal * hh;
    }
    d = -Math.hypot(lx - cx, ly - cy);
  } else {
    nxLocal = ox / d; nyLocal = oy / d;
  }
  const nx = nxLocal * cos - nyLocal * sin;
  const ny = nxLocal * sin + nyLocal * cos;
  const overlap = ball.r - d;
  ball.x += nx * overlap;
  ball.y += ny * overlap;
  const relVx = ball.vx - car.vx;
  const relVy = ball.vy - car.vy;
  const vn = relVx * nx + relVy * ny;
  const boostBonus = car._boosting ? 180 : 0;
  const impulse = Math.max(120, -vn * 1.35 + Math.hypot(car.vx, car.vy) * 0.35 + boostBonus);
  if (vn < 40) {
    ball.vx += nx * impulse;
    ball.vy += ny * impulse * 0.95;
  }
  // The bumper wedges under a floor ball. A purely horizontal face normal
  // otherwise pins it to the floor forever, especially in the elevated Hoops mode.
  const closing = car.vx * Math.sign(dx || 1) - ball.vx * Math.sign(dx || 1);
  const approach = Math.max(Math.abs(car.vx), Math.max(0, -vn));
  if (car.onGround && ball.y > CONFIG.floorY - ball.r - 16 && dy < 12 && Math.abs(nx) > 0.55 && (closing > 30 || -vn > 50)) {
    const loft = mode.kind === 'hoops' ? 620 + approach * 0.6 + (car._boosting ? 140 : 0) : 230 + approach * 0.28;
    ball.vy = Math.min(ball.vy, -Math.min(1050, loft));
  }
  ball.vx = clamp(ball.vx, -1150, 1150);
  ball.vy = clamp(ball.vy, -1150, 1150);
  car.vx -= nx * impulse * 0.08;
  car.vy -= ny * impulse * 0.05;
  car._touchedBall = true;
  return true;
}

function collideCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = a.vehicle.halfW + b.vehicle.halfW - 8;
  if (dist <= 0 || dist > min) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = min - dist;
  a.x -= nx * overlap * 0.5;
  a.y -= ny * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.y += ny * overlap * 0.5;
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv > 0) return;
  const j = -rv * 0.9;
  a.vx -= j * nx;
  a.vy -= j * ny;
  b.vx += j * nx;
  b.vy += j * ny;
}

function spawnBurst(match, x, y, color) {
  for (let i = 0; i < 14; i += 1) {
    const a = (Math.PI * 2 * i) / 14;
    match.particles.push({
      x,
      y,
      vx: Math.cos(a) * (80 + Math.random() * 160),
      vy: Math.sin(a) * (80 + Math.random() * 160),
      life: 0.45 + Math.random() * 0.3,
      color,
    });
  }
}

function scoreGoal(state, team) {
  const m = state.match;
  m.score[team] += 1;
  if (team === 0) m.playerGoals += 1;
  m.scorerFlash = 1.4;
  m.toast = team === 0 ? '골! 우리 팀' : '실점…';
  m.toastT = 1.4;
  spawnBurst(m, m.ball.x, m.ball.y, team === 0 ? CONFIG.palette.blue : CONFIG.palette.orange);
  resetKickoff(m, team);
}

function buyItem(state, kind, id) {
  const save = state.save;
  const map = {
    vehicle: { list: VEHICLES, owned: save.owned.vehicles, key: 'vehicle' },
    decal: { list: DECALS, owned: save.owned.decals, key: 'decal' },
    wheel: { list: WHEELS, owned: save.owned.wheels, key: 'wheel' },
    boost: { list: BOOSTS, owned: save.owned.boosts, key: 'boost' },
  };
  const slot = map[kind];
  if (!slot) return;
  const item = findItem(slot.list, id);
  if (slot.owned.includes(id)) {
    save.loadout[slot.key] = id;
    if (kind === 'vehicle') save.loadout.primary = item.color;
    writeSave(save);
    state.toast = `${item.name} 장착`;
    state.toastT = 1.2;
    return;
  }
  if (save.credits < item.price) {
    state.toast = '크레딧이 부족해요';
    state.toastT = 1.2;
    return;
  }
  save.credits -= item.price;
  slot.owned.push(id);
  save.loadout[slot.key] = id;
  if (kind === 'vehicle') save.loadout.primary = item.color;
  writeSave(save);
  state.toast = `${item.name} 구매·장착`;
  state.toastT = 1.2;
}

function handleAction(state, action) {
  if (!action) return;
  const { action: type, value } = action;
  if (type === 'goto') {
    state.screen = value;
    state.result = null;
  } else if (type === 'mode') {
    startMatch(state, value);
  } else if (type === 'buy') {
    const [kind, id] = String(value).split(':');
    buyItem(state, kind, id);
  } else if (type === 'color') {
    state.save.loadout.primary = value;
    writeSave(state.save);
  } else if (type === 'claim-pass') {
    const msgs = claimPassRewards(state.save);
    writeSave(state.save);
    state.toast = msgs.length ? `해금: ${msgs.join(', ')}` : '받을 보상이 없어요';
    state.toastT = 1.5;
  }
}

export function createGame() {
  const save = loadSave();
  claimPassRewards(save);
  writeSave(save);
  return {
    screen: 'hub',
    save,
    match: null,
    ui: [],
    controlZones: [],
    toast: '',
    toastT: 0,
    garageTab: 'vehicle',
    result: null,
    _jumpHeld: false,
    _touchJump: false,
    _pendingAction: null,
  };
}

export function updateGame(state, dt, input) {
  state.toastT = Math.max(0, state.toastT - dt);
  if (state._pendingAction) {
    handleAction(state, state._pendingAction);
    state._pendingAction = null;
  }

  if (state.screen !== 'match' || !state.match || state.result) {
    readControls(state, input);
    return;
  }

  const pads = readControls(state, input);
  const m = state.match;
  m.toastT = Math.max(0, m.toastT - dt);
  m.scorerFlash = Math.max(0, m.scorerFlash - dt);

  if (m.kickoff > 0) {
    m.kickoff -= dt;
    for (const car of m.cars) {
      car.vx = 0;
      car.vy = 0;
    }
    m.ball.vx = 0;
    m.ball.vy = 0;
    return;
  }

  m.timeLeft = Math.max(0, m.timeLeft - dt);

  for (const car of m.cars) {
    const use = car.isPlayer ? pads : aiPads(car, m);
    applyCarInput(car, use, dt);
    resolveCarWorld(car, dt);
    if (car._boosting) {
      m.trails.push({
        x: car.x - Math.cos(car.angle) * 28,
        y: car.y - Math.sin(car.angle) * 28,
        life: 0.28,
        color: findItem(BOOSTS, car.cosmetics.boost).color,
      });
    }
  }

  for (let i = 0; i < m.cars.length; i += 1) {
    for (let j = i + 1; j < m.cars.length; j += 1) collideCars(m.cars[i], m.cars[j]);
  }
  for (const car of m.cars) {
    car._touchedBall = false;
    collideCarBall(car, m.ball, m.mode);
    if (car._touchedBall) m.lastTouchTeam = car.team;
  }

  const scored = resolveBall(m.ball, dt, m.mode);
  if (scored === 'blue') scoreGoal(state, 0);
  else if (scored === 'orange') scoreGoal(state, 1);
  else if (scored === 'hoop') scoreGoal(state, m.lastTouchTeam === 1 ? 1 : 0);

  for (const p of m.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 400 * dt;
  }
  m.particles = m.particles.filter((p) => p.life > 0);
  for (const t of m.trails) t.life -= dt;
  m.trails = m.trails.filter((t) => t.life > 0);

  if (m.timeLeft <= 0) finishMatch(state);
}

export { MODES, VEHICLES, DECALS, WHEELS, BOOSTS, PASS_REWARDS, hoopRects, findItem };
