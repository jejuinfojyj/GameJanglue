// 한 판의 규칙: 달리기, 레인 바꾸기, 점프·구르기, 충돌, 코인과 아이템, 끝나는 조건.
import { RULES, POWERUPS, TOUR, CITIES } from './config.mjs';
import { makeRng, fillTrack, skyCoins, GATE_BOTTOM, GATE_TOP } from './level.mjs';

export const laneX = lane => (lane - 1) * RULES.laneWidth;
export const JET_HEIGHT = 6.5;
const PLAYER_HALF = 0.32;
const STAND_HEIGHT = 1.75, ROLL_HEIGHT = 0.8;
const STEP_UP = 0.6;
const CRASH_TIME = 1.2;

export function createGame({ hero = 'rio', board = 'flame', seed = Date.now() } = {}) {
  const state = {
    rng: makeRng(seed), hero, boardStyle: board,
    time: 0, z: 0, x: 0, y: 0, vy: 0, grounded: true,
    targetLane: 1, fromLane: 1,
    rolling: 0, rollQueued: false, jumpBuffer: 0, runPhase: 0,
    speed: RULES.startSpeed, distance: 0, score: 0, coins: 0,
    obstacles: [], coinItems: [], pickups: [],
    nextZ: 34, nextPowerZ: 170,
    power: { magnet: 0, sneakers: 0, jetpack: 0, double: 0 },
    boards: RULES.startBoards, boardTime: 0, safe: 0,
    stumble: 0, guardGap: 2.4, shake: 0,
    city: 0, banner: { text: '월드 투어 · ' + CITIES[0].name, t: 2.6 },
    particles: [], popups: [], events: [],
    crash: null, result: null, hintTime: 6,
  };
  for (let i = 0; i < 6; i++) state.coinItems.push({ lane: 1, z: 10 + i * 2.4, y: 0.9, taken: false });
  fillTrack(state);
  return state;
}

/** 기차는 경사로 구간에서 높이가 점점 올라간다. */
export function trainHeightAt(train, z) {
  if (train.ramp && z < train.z + train.ramp) return Math.max(0, (z - train.z) / train.ramp) * train.h;
  return train.h;
}

const halfWidth = o => (o.kind === 'train' ? 1.0 : 1.05);
const sideOverlap = (o, x) => Math.abs(x - laneX(o.lane)) < halfWidth(o) + PLAYER_HALF;
const depthOverlap = (o, oz, z) => z + 0.3 > oz && z - 0.3 < oz + o.len;

function surfaceUnder(state, x, z, y) {
  let ground = 0;
  for (const o of state.obstacles) {
    if (o.kind !== 'train' || o.dead || !sideOverlap(o, x) || z < o.z || z > o.z + o.len) continue;
    const h = trainHeightAt(o, z);
    if (y >= h - STEP_UP && h > ground) ground = h;
  }
  return ground;
}

const jumpSpeed = state => Math.sqrt(2 * RULES.gravity * (state.power.sneakers > 0 ? RULES.superJumpHeight : RULES.jumpHeight));

function jump(state) {
  state.vy = jumpSpeed(state);
  state.grounded = false;
  state.rolling = 0;
  state.rollQueued = false;
  state.jumpBuffer = 0;
  state.events.push(state.power.sneakers > 0 ? 'superJump' : 'jump');
}

function popup(state, text, color = '#fff7e6') { state.popups.push({ text, color, t: 0 }); }

function burst(state, x, y, z, color, count = 10, spread = 4) {
  for (let i = 0; i < count; i++) {
    const a = state.rng() * Math.PI * 2, s = spread * (0.4 + state.rng() * 0.6);
    state.particles.push({ x, y, z, vx: Math.cos(a) * s, vy: 2 + state.rng() * spread, vz: Math.sin(a) * s * 0.6, life: 0, max: 0.5 + state.rng() * 0.4, color, size: 0.12 + state.rng() * 0.12 });
  }
}

function handleAction(state, action) {
  const air = !state.grounded;
  if (action === 'left' || action === 'right') {
    const next = Math.max(0, Math.min(2, state.targetLane + (action === 'left' ? -1 : 1)));
    if (next === state.targetLane) { state.shake = Math.max(state.shake, 0.08); return; }
    state.fromLane = state.targetLane;
    state.targetLane = next;
    state.events.push('swipe');
  } else if (action === 'up') {
    if (state.power.jetpack > 0) return;
    if (state.grounded) jump(state);
    else state.jumpBuffer = 0.18;
  } else if (action === 'down') {
    if (state.power.jetpack > 0) return;
    state.jumpBuffer = 0;
    if (air) { state.vy = Math.min(state.vy, -26); state.rollQueued = true; }
    else state.rolling = RULES.rollTime;
    state.events.push('roll');
  } else if (action === 'board') {
    if (state.boardTime > 0 || state.boards <= 0) return;
    state.boards--;
    state.boardTime = RULES.boardTime;
    state.events.push('boardOn');
    popup(state, '호버보드!', '#c77dff');
  }
}

function crash(state, reason) {
  if (state.crash) return;
  state.crash = { t: 0, reason };
  state.shake = 0.5;
  state.events.push('crash');
  burst(state, state.x, state.y + 1.2, state.z + 0.4, '#ffffff', 14, 5);
}

function bump(state) {
  if (state.stumble > 0) { crash(state, 'caught'); return; }
  state.stumble = RULES.stumbleWindow;
  state.targetLane = state.fromLane;
  state.shake = 0.25;
  state.events.push('bump');
  popup(state, '조심! 한 번 더 부딪히면 잡혀!', '#ff8a8a');
}

function frontHit(state, o) {
  if (state.boardTime > 0) {
    state.boardTime = 0;
    state.safe = RULES.safeTimeAfterBoard;
    o.dead = true;
    state.shake = 0.3;
    state.events.push('boardBreak');
    burst(state, state.x, state.y + 0.4, state.z + 1, '#c77dff', 18, 6);
    popup(state, '보드가 막아 줬어!', '#e2b8ff');
    return;
  }
  crash(state, o.kind);
}

function collide(state, prevX, prevZ, prevZs) {
  if (state.power.jetpack > 0 || state.safe > 0) return;
  for (let i = 0; i < state.obstacles.length; i++) {
    const o = state.obstacles[i];
    if (o.dead || !sideOverlap(o, state.x) || !depthOverlap(o, o.z, state.z)) continue;
    if (o.kind === 'hurdle') {
      if (state.y < o.h - 0.1) return frontHit(state, o);
    } else if (o.kind === 'gate') {
      const top = state.y + (state.rolling > 0 ? ROLL_HEIGHT : STAND_HEIGHT);
      if (top > GATE_BOTTOM && state.y < GATE_TOP) return frontHit(state, o);
    } else {
      if (state.y >= trainHeightAt(o, state.z) - STEP_UP) continue;
      const wasBeside = depthOverlap(o, prevZs[i], prevZ) && !sideOverlap(o, prevX);
      return wasBeside ? bump(state) : frontHit(state, o);
    }
  }
}

function step(state, h) {
  const prevX = state.x, prevZ = state.z, prevZs = state.obstacles.map(o => o.z);
  state.z += state.speed * h;
  for (const o of state.obstacles) {
    if (!o.speed) continue;
    if (!o.moving && o.z - state.z < 75) { o.moving = true; state.events.push('horn'); }
    if (o.moving) o.z -= o.speed * h;
  }

  const targetX = (state.targetLane - 1) * RULES.laneWidth;
  const move = RULES.laneWidth / RULES.laneChangeTime * h;
  state.x = Math.abs(targetX - state.x) <= move ? targetX : state.x + Math.sign(targetX - state.x) * move;

  if (state.power.jetpack > 0) {
    state.y += (JET_HEIGHT - state.y) * Math.min(1, h * 3);
    state.vy = 0;
    state.grounded = false;
  } else {
    state.vy -= RULES.gravity * h;
    state.y += state.vy * h;
    const ground = surfaceUnder(state, state.x, state.z, state.y);
    if (state.y <= ground) {
      if (!state.grounded && state.vy < -9) { state.events.push('land'); burst(state, state.x, ground + 0.05, state.z, '#ffffffaa', 6, 2); }
      state.y = ground;
      state.vy = 0;
      state.grounded = true;
      if (state.rollQueued) { state.rolling = RULES.rollTime; state.rollQueued = false; }
      if (state.jumpBuffer > 0) jump(state);
    } else if (state.y > ground + 0.08) {
      state.grounded = false;
    }
  }
  collide(state, prevX, prevZ, prevZs);
}

function collectCoins(state, dt) {
  const magnet = state.power.magnet > 0, mult = state.power.double > 0 ? 2 : 1;
  const chest = state.y + (state.rolling > 0 ? 0.45 : 0.9);
  for (const c of state.coinItems) {
    if (c.taken) continue;
    const ahead = c.z - state.z;
    if (ahead > 16 || ahead < -2) continue;
    if (c.cx === undefined) c.cx = laneX(c.lane);
    if (magnet && ahead < 14) {
      const k = Math.min(1, dt * 10);
      c.cx += (state.x - c.cx) * k; c.y += (chest - c.y) * k; c.z += (state.z + 0.3 - c.z) * k;
    }
    if (Math.abs(c.cx - state.x) < 0.95 && Math.abs(c.z - state.z) < 1.0 && Math.abs(c.y - chest) < 1.25) {
      c.taken = true;
      state.coins++;
      state.score += RULES.coinScore * mult;
      state.events.push('coin');
      burst(state, c.cx, c.y, c.z, '#ffe27a', 4, 2);
    }
  }
  for (const p of state.pickups) {
    if (p.taken) continue;
    const px = laneX(p.lane);
    if (Math.abs(px - state.x) < 1.1 && Math.abs(p.z - state.z) < 1.2 && Math.abs(p.y - (state.y + 0.9)) < 1.6) {
      p.taken = true;
      const info = POWERUPS[p.kind];
      if (p.kind === 'board') state.boards++;
      else state.power[p.kind] = info.time;
      if (p.kind === 'jetpack') { skyCoins(state, state.z + 14, state.speed * info.time - 10, JET_HEIGHT + 0.6); state.rolling = 0; }
      state.events.push('power');
      burst(state, px, p.y, p.z, info.color, 14, 4);
      popup(state, info.name + '!', info.color);
    }
  }
}

function updateEffects(state, dt) {
  for (const p of state.particles) {
    p.life += dt; p.vy -= 12 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  }
  state.particles = state.particles.filter(p => p.life < p.max);
  for (const p of state.popups) p.t += dt;
  state.popups = state.popups.filter(p => p.t < 1.4);
  state.shake = Math.max(0, state.shake - dt);
  if (state.banner) { state.banner.t -= dt; if (state.banner.t <= 0) state.banner = null; }
}

/** actions: 'left' | 'right' | 'up' | 'down' | 'board' */
export function updateGame(state, dt, actions = []) {
  state.time += dt;
  updateEffects(state, dt);
  if (state.crash) {
    state.crash.t += dt;
    state.guardGap += (0.9 - state.guardGap) * Math.min(1, dt * 3);
    if (state.crash.t >= CRASH_TIME) state.result = { success: false, reason: state.crash.reason, message: '' };
    return;
  }
  for (const action of actions) handleAction(state, action);

  state.speed = Math.min(RULES.maxSpeed, state.speed + RULES.speedUpPerSecond * dt);
  const startZ = state.z;
  const steps = Math.max(1, Math.ceil(dt * state.speed / 0.25));
  for (let i = 0; i < steps && !state.crash; i++) step(state, dt / steps);
  const moved = state.z - startZ;
  state.distance = state.z;
  state.score += moved * RULES.scorePerMeter * (state.power.double > 0 ? 2 : 1);
  state.runPhase += moved * 0.55;

  collectCoins(state, dt);

  const jetBefore = state.power.jetpack;
  for (const key of Object.keys(state.power)) state.power[key] = Math.max(0, state.power[key] - dt);
  if (jetBefore > 0 && state.power.jetpack === 0) { state.safe = Math.max(state.safe, 1.4); state.grounded = false; }
  state.boardTime = Math.max(0, state.boardTime - dt);
  state.safe = Math.max(0, state.safe - dt);
  state.rolling = Math.max(0, state.rolling - dt);
  state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  state.stumble = Math.max(0, state.stumble - dt);
  state.hintTime = Math.max(0, state.hintTime - dt);

  const wantGap = state.stumble > 0 ? 2.2 : (state.time < 2.2 ? 2.6 : 14);
  state.guardGap += (wantGap - state.guardGap) * Math.min(1, dt * (wantGap > state.guardGap ? 0.8 : 3));

  const city = Math.floor(state.distance / TOUR.tourLength) % CITIES.length;
  if (city !== state.city) {
    state.city = city;
    state.banner = { text: '월드 투어 · ' + CITIES[city].name, t: 2.6 };
    state.events.push('city');
  }

  const behind = state.z - 12;
  state.obstacles = state.obstacles.filter(o => o.z + o.len > behind);
  state.coinItems = state.coinItems.filter(c => !c.taken && c.z > behind);
  state.pickups = state.pickups.filter(p => !p.taken && p.z > behind);
  fillTrack(state);
}
