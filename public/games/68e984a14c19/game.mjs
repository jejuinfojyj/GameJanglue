import { CONFIG, controlLayout } from './config.mjs';

const BEST_KEY = 'snake.io.best';
const SKIN_KEY = 'snake.io.skin';

export const playInput = {
  stick: null,
  boost: false,
  mouse: null,
  mouseDown: false,
  mouseOnStick: false,
};

const pointers = new Map();

function readStore(key) {
  try { return globalThis.localStorage?.getItem(key) ?? null; }
  catch { return null; }
}

function writeStore(key, value) {
  try { globalThis.localStorage?.setItem(key, value); }
  catch { /* 저장을 막아 둔 브라우저에서도 한 판은 이어진다. */ }
}

export function clearArenaInput() {
  pointers.clear();
  playInput.stick = null;
  playInput.boost = false;
  playInput.mouseDown = false;
  playInput.mouseOnStick = false;
}

export function bindArenaInput(canvas) {
  const pointOf = (event) => {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || CONFIG.width;
    const height = rect.height || CONFIG.height;
    return {
      x: (event.clientX - rect.left) * CONFIG.width / width,
      y: (event.clientY - rect.top) * CONFIG.height / height,
    };
  };
  const hitStick = (point) => {
    const stick = controlLayout().stick;
    return Math.hypot(point.x - stick.x, point.y - stick.y) <= stick.grab;
  };
  const hitBoost = (point) => {
    const boost = controlLayout().boost;
    return point.x >= boost.x && point.x <= boost.x + boost.w && point.y >= boost.y && point.y <= boost.y + boost.h;
  };
  const refresh = () => {
    const stick = controlLayout().stick;
    let active = null;
    let boost = false;
    for (const item of pointers.values()) {
      if (item.stick) {
        const dx = item.x - stick.x;
        const dy = item.y - stick.y;
        const dist = Math.hypot(dx, dy) || 1;
        const travel = Math.min(dist, stick.travel);
        active = { x: dx / dist * travel / stick.travel, y: dy / dist * travel / stick.travel, dx: dx / dist * travel, dy: dy / dist * travel };
      }
      if (hitBoost(item)) boost = true;
    }
    playInput.stick = active;
    playInput.boost = boost;
  };
  canvas.addEventListener('pointerdown', (event) => {
    const point = pointOf(event);
    pointers.set(event.pointerId, { ...point, stick: hitStick(point) });
    if (event.pointerType === 'mouse') {
      playInput.mouse = point;
      playInput.mouseDown = true;
      playInput.mouseOnStick = hitStick(point);
    }
    refresh();
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = pointOf(event);
    if (event.pointerType === 'mouse') playInput.mouse = point;
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    pointers.set(event.pointerId, { ...prev, ...point });
    refresh();
  });
  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !pointers.has(event.pointerId)) playInput.mouse = null;
  });
  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    if (event.pointerType === 'mouse') {
      playInput.mouseDown = false;
      playInput.mouseOnStick = false;
    }
    refresh();
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  window.addEventListener('blur', clearArenaInput);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearArenaInput(); });
  document.getElementById('pause-game')?.addEventListener('click', clearArenaInput);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') clearArenaInput(); });
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function wrap(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}
function dist2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
function rand(min, max) { return min + Math.random() * (max - min); }
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

export function formatTime(time) {
  const total = Math.max(0, Math.floor(time));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function viewScale() { return CONFIG.width / CONFIG.viewWidth; }

function cameraFor(snake) {
  const focusY = CONFIG.height * 0.38;
  return { x: snake.x, y: snake.y - (focusY - CONFIG.height / 2) / viewScale() };
}

export function worldToScreen(camera, x, y) {
  const scale = viewScale();
  return { x: (x - camera.x) * scale + CONFIG.width / 2, y: (y - camera.y) * scale + CONFIG.height / 2 };
}

function screenToWorld(camera, x, y) {
  const scale = viewScale();
  return { x: camera.x + (x - CONFIG.width / 2) / scale, y: camera.y + (y - CONFIG.height / 2) / scale };
}

function makeTrail(x, y, angle, length) {
  const step = 6;
  const trail = [];
  const count = Math.max(2, Math.ceil(length / step));
  for (let i = 0; i < count; i++) trail.push({ x: x - Math.cos(angle) * step * i, y: y - Math.sin(angle) * step * i });
  return trail;
}

function trimTrail(trail, maxLen) {
  let total = 0;
  for (let i = 1; i < trail.length; i++) total += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
  while (trail.length > 2 && total > maxLen) {
    const last = trail[trail.length - 1];
    const prev = trail[trail.length - 2];
    const seg = Math.hypot(last.x - prev.x, last.y - prev.y);
    if (total - seg > maxLen) { trail.pop(); total -= seg; continue; }
    const keep = maxLen - (total - seg);
    const t = seg === 0 ? 0 : keep / seg;
    trail[trail.length - 1] = { x: prev.x + (last.x - prev.x) * t, y: prev.y + (last.y - prev.y) * t };
    break;
  }
}

function sampleBody(trail, step) {
  if (!trail.length) return [];
  const points = [{ x: trail[0].x, y: trail[0].y }];
  let carried = 0;
  for (let i = 1; i < trail.length; i++) {
    const dx = trail[i].x - trail[i - 1].x;
    const dy = trail[i].y - trail[i - 1].y;
    const seg = Math.hypot(dx, dy);
    if (seg === 0) continue;
    let walked = 0;
    while (carried + (seg - walked) >= step) {
      walked += step - carried;
      const t = walked / seg;
      points.push({ x: trail[i - 1].x + dx * t, y: trail[i - 1].y + dy * t });
      carried = 0;
      if (points.length > 90) return points;
    }
    carried += seg - walked;
  }
  return points;
}

function syncBody(snake) {
  snake.radius = 10 + Math.min(8, Math.max(0, snake.length - CONFIG.startLength) / 110);
  snake.parts = sampleBody(snake.trail, Math.max(11, snake.radius * 0.9));
}

function createSnake({ x, y, angle, color, name, isPlayer, length = CONFIG.startLength }) {
  const snake = {
    x, y, angle, target: angle, color, name,
    isPlayer: !!isPlayer,
    alive: true,
    length,
    score: 0,
    trail: makeTrail(x, y, angle, length),
    parts: [],
    radius: 10,
    think: rand(0, 0.35),
    boostAcc: 0,
    boostLeft: 0,
    boosting: false,
    gulp: 0,
    respawn: 0,
  };
  syncBody(snake);
  return snake;
}

function makeFood(x, y, kind) {
  if (kind === 'special') return { x, y, kind, r: 14, score: 8, grow: 78, color: '#ffe56a' };
  if (kind === 'drop') return { x, y, kind, r: 8, score: 4, grow: 40, color: '#fff4c2' };
  return { x, y, kind: 'normal', r: 8, score: 1, grow: 26, color: pick(CONFIG.foodColors) };
}

function randomPoint() {
  const margin = CONFIG.margin + 70;
  return { x: rand(margin, CONFIG.world - margin), y: rand(margin, CONFIG.world - margin) };
}

function safeSpawn(state) {
  for (let i = 0; i < 16; i++) {
    const point = randomPoint();
    const crowded = state.snakes.some((snake) => snake.alive && dist2(snake, point) < 220 * 220);
    if (!crowded) return point;
  }
  return randomPoint();
}

function selectedSkin() {
  const saved = readStore(SKIN_KEY);
  return CONFIG.skins.find((skin) => skin.id === saved) || CONFIG.skins[0];
}

export function createGame() {
  clearArenaInput();
  const skin = selectedSkin();
  const center = CONFIG.world / 2;
  const player = createSnake({ x: center, y: center, angle: -Math.PI / 2, color: skin.color, name: '나', isPlayer: true });
  const snakes = [player];
  const spots = [
    { angle: Math.PI / 2, dist: 270 },
    { angle: Math.PI / 2 - 0.75, dist: 300 },
    { angle: Math.PI / 2 + 0.75, dist: 300 },
    { angle: Math.PI, dist: 360 },
    { angle: 0, dist: 360 },
    { angle: -1.15, dist: 460 },
  ];
  for (let i = 0; i < CONFIG.startBots; i++) {
    const spot = spots[i];
    snakes.push(createSnake({
      x: center + Math.cos(spot.angle) * spot.dist,
      y: center + Math.sin(spot.angle) * spot.dist,
      angle: spot.angle + Math.PI / 2,
      color: CONFIG.botColors[i % CONFIG.botColors.length],
      name: CONFIG.botNames[i % CONFIG.botNames.length],
    }));
  }
  const state = {
    snakes,
    foods: [],
    sparkles: [],
    floaters: [],
    events: [],
    score: 0,
    best: Number(readStore(BEST_KEY)) || 0,
    kills: 0,
    time: 0,
    surviveAcc: 0,
    skinId: skin.id,
    camera: cameraFor(player),
    danger: 0,
    result: null,
  };
  refill(state);
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI / 2 + (i / 8) * Math.PI * 2;
    const dist = 84 + (i % 3) * 18;
    state.foods.push(makeFood(center + Math.cos(angle) * dist, center + Math.sin(angle) * dist, i === 0 ? 'special' : 'normal'));
  }
  return state;
}

function keyVector(input) {
  const keys = input?.keys;
  if (!keys) return null;
  const x = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
  const y = Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'));
  if (!x && !y) return null;
  return { x, y };
}

function overBoost(point) {
  const boost = controlLayout().boost;
  return point.x >= boost.x && point.x <= boost.x + boost.w && point.y >= boost.y && point.y <= boost.y + boost.h;
}

function desiredAngle(snake, state, input) {
  const keyboard = keyVector(input);
  if (keyboard) return Math.atan2(keyboard.y, keyboard.x);
  if (playInput.stick) {
    if (Math.hypot(playInput.stick.x, playInput.stick.y) > 0.18) return Math.atan2(playInput.stick.y, playInput.stick.x);
    return null;
  }
  if (playInput.mouse && !playInput.mouseOnStick && !overBoost(playInput.mouse)) {
    const world = screenToWorld(state.camera, playInput.mouse.x, playInput.mouse.y);
    return Math.atan2(world.y - snake.y, world.x - snake.x);
  }
  return null;
}

function wantsBoost(input) {
  if (input?.keys?.has(' ')) return true;
  if (playInput.boost) return true;
  return !!(playInput.mouseDown && !playInput.mouseOnStick && !playInput.stick);
}

function moveSnake(snake, dt) {
  const turn = CONFIG.turn / (1 + Math.max(0, snake.length - 180) / 750);
  const diff = wrap(snake.target - snake.angle);
  snake.angle += clamp(diff, -turn * dt, turn * dt);
  const drag = 1 - Math.min(0.18, Math.max(0, snake.length - CONFIG.startLength) / 4800);
  const speed = (snake.boosting ? CONFIG.boostSpeed : CONFIG.baseSpeed) * drag;
  snake.x += Math.cos(snake.angle) * speed * dt;
  snake.y += Math.sin(snake.angle) * speed * dt;
  // Keep the previous head as history even when one frame travels less than 5px.
  // Replacing it each frame erases the curve and stretches the head-to-tail link.
  const head = snake.trail[0];
  if (!head || Math.hypot(snake.x - head.x, snake.y - head.y) > 0.0001) {
    snake.trail.unshift({ x: snake.x, y: snake.y });
  }
  trimTrail(snake.trail, snake.length);
  syncBody(snake);
  if (snake.gulp > 0) snake.gulp = Math.max(0, snake.gulp - dt);
}

function applyBoost(snake, dt, state, wants) {
  const can = wants && snake.length > CONFIG.minLength + 6;
  snake.boosting = can;
  if (!can) { snake.boostAcc = 0; return; }
  snake.boostAcc += dt;
  while (snake.boostAcc >= CONFIG.boostInterval && snake.length > CONFIG.minLength + 6) {
    snake.boostAcc -= CONFIG.boostInterval;
    snake.length = Math.max(CONFIG.minLength, snake.length - CONFIG.boostCost);
    const tail = snake.trail[snake.trail.length - 1];
    if (tail && state.foods.length < CONFIG.maxFoods) state.foods.push(makeFood(tail.x, tail.y, 'drop'));
  }
}

function avoidance(snake, snakes) {
  const ax = snake.x + Math.cos(snake.angle) * 82;
  const ay = snake.y + Math.sin(snake.angle) * 82;
  let side = 0;
  for (const other of snakes) {
    if (!other.alive) continue;
    for (let i = other === snake ? 6 : 0; i < other.parts.length; i += 2) {
      const part = other.parts[i];
      const dx = ax - part.x;
      const dy = ay - part.y;
      if (dx * dx + dy * dy > 70 * 70) continue;
      const cross = Math.cos(snake.angle) * (part.y - snake.y) - Math.sin(snake.angle) * (part.x - snake.x);
      side += cross >= 0 ? -1 : 1;
    }
  }
  return side ? Math.sign(side) * 1.4 : 0;
}

function thinkBot(snake, state, dt) {
  snake.think -= dt;
  if (snake.think > 0) return;
  snake.think = rand(0.22, 0.48);
  const margin = 190;
  const nearEdge = snake.x < margin || snake.y < margin || snake.x > CONFIG.world - margin || snake.y > CONFIG.world - margin;
  if (nearEdge) {
    snake.target = Math.atan2(CONFIG.world / 2 - snake.y, CONFIG.world / 2 - snake.x);
  } else {
    let best = null;
    let bestD = 320 * 320;
    for (const food of state.foods) {
      const d = dist2(snake, food);
      if (d < bestD) { bestD = d; best = food; }
    }
    snake.target = best ? Math.atan2(best.y - snake.y, best.x - snake.x) : snake.angle + rand(-0.7, 0.7);
    const avoid = avoidance(snake, state.snakes);
    if (avoid) snake.target = snake.angle + avoid;
  }
  const blocked = avoidance(snake, state.snakes);
  snake.boostLeft = !blocked && snake.length > 220 && Math.random() < 0.3 ? rand(0.2, 0.5) : 0;
}

function hitWall(snake) {
  const margin = CONFIG.margin + snake.radius;
  return snake.x < margin || snake.y < margin || snake.x > CONFIG.world - margin || snake.y > CONFIG.world - margin;
}

function bodyHit(snake, snakes) {
  for (const other of snakes) {
    if (!other.alive) continue;
    if (other !== snake) {
      const reach = (snake.radius + other.radius) * 0.72;
      if (dist2(snake, other) <= reach * reach) return { snake: other, head: true };
    }
    for (let i = other === snake ? 10 : 3; i < other.parts.length; i++) {
      const part = other.parts[i];
      const reach = snake.radius + other.radius * 0.78;
      const dx = snake.x - part.x;
      const dy = snake.y - part.y;
      if (dx * dx + dy * dy <= reach * reach) return { snake: other, head: false };
    }
  }
  return null;
}

function burst(state, x, y, color) {
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const count = reduced ? 3 : 8;
  for (let i = 0; i < count; i++) {
    state.sparkles.push({ x, y, color, vx: rand(-46, 46), vy: rand(-46, 46), life: rand(0.22, 0.48) });
  }
}

function grant(state, snake, amount) {
  snake.score += amount;
  if (!snake.isPlayer) return;
  state.score = snake.score;
  if (state.score > state.best) {
    state.best = state.score;
    writeStore(BEST_KEY, String(state.best));
  }
}

function eatFood(snake, state) {
  for (let i = state.foods.length - 1; i >= 0; i--) {
    const food = state.foods[i];
    const reach = snake.radius + food.r;
    if (dist2(snake, food) > reach * reach) continue;
    state.foods.splice(i, 1);
    snake.length = Math.min(CONFIG.maxLength, snake.length + food.grow);
    snake.gulp = 0.22;
    grant(state, snake, food.score);
    if (snake.isPlayer) {
      state.events.push(food.kind === 'special' ? 'special' : 'eat');
      state.floaters.push({ x: food.x, y: food.y, text: '+' + food.score, life: 0.7, color: '#fff8d0' });
      burst(state, food.x, food.y, food.color);
    }
  }
}

function scatter(snake, state) {
  const parts = snake.parts.length ? snake.parts : snake.trail;
  let drops = 0;
  for (let i = 0; i < parts.length; i += 2) {
    if (state.foods.length >= CONFIG.maxFoods || drops >= 16) break;
    const part = parts[i];
    state.foods.push(makeFood(part.x + rand(-8, 8), part.y + rand(-8, 8), 'drop'));
    state.sparkles.push({ x: part.x, y: part.y, color: snake.color, vx: rand(-20, 20), vy: rand(-20, 20), life: 0.35 });
    drops++;
  }
}

function finish(state) {
  if (state.result) return;
  const player = state.snakes.find((snake) => snake.isPlayer);
  const length = player ? Math.max(1, Math.round(player.length / 16)) : 1;
  state.result = {
    success: false,
    message: `점수 ${state.score}점 · 처치 ${state.kills} · 길이 ${length}\n생존 ${formatTime(state.time)} · 최고 ${state.best}점`,
  };
  clearArenaInput();
}

function killSnake(snake, state, hit) {
  if (!snake.alive) return;
  snake.alive = false;
  snake.boosting = false;
  scatter(snake, state);
  if (snake.isPlayer) {
    state.events.push('die');
    finish(state);
    return;
  }
  snake.respawn = 3.2;
  snake.score = 0;
  if (hit && !hit.head && hit.snake.isPlayer) {
    state.kills += 1;
    state.events.push('kill');
    state.floaters.push({ x: snake.x, y: snake.y, text: '탈락!', life: 0.9, color: '#fff1a8' });
  }
}

function refill(state) {
  let normal = 0;
  let special = 0;
  for (const food of state.foods) {
    if (food.kind === 'normal') normal += 1;
    else if (food.kind === 'special') special += 1;
  }
  let guard = 0;
  while (normal < CONFIG.foodCount && state.foods.length < CONFIG.maxFoods && guard < 500) {
    const point = randomPoint();
    state.foods.push(makeFood(point.x, point.y, 'normal'));
    normal += 1;
    guard += 1;
  }
  while (special < CONFIG.specialCount && state.foods.length < CONFIG.maxFoods && guard < 520) {
    const point = randomPoint();
    state.foods.push(makeFood(point.x, point.y, 'special'));
    special += 1;
    guard += 1;
  }
}

function revive(snake, state) {
  const point = safeSpawn(state);
  const angle = rand(0, Math.PI * 2);
  snake.x = point.x;
  snake.y = point.y;
  snake.angle = angle;
  snake.target = angle;
  snake.length = CONFIG.startLength;
  snake.score = 0;
  snake.alive = true;
  snake.boosting = false;
  snake.boostAcc = 0;
  snake.boostLeft = 0;
  snake.trail = makeTrail(point.x, point.y, angle, snake.length);
  syncBody(snake);
}

function aliveBots(state) {
  return state.snakes.filter((snake) => snake.alive && !snake.isPlayer).length;
}

function decayFx(state, dt) {
  for (const spark of state.sparkles) {
    spark.life -= dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
  }
  state.sparkles = state.sparkles.filter((spark) => spark.life > 0).slice(-50);
  for (const floater of state.floaters) {
    floater.life -= dt;
    floater.y -= 26 * dt;
  }
  state.floaters = state.floaters.filter((floater) => floater.life > 0).slice(-14);
}

export function updateGame(state, dt, input) {
  state.events.length = 0;
  if (state.result) return;
  const step = clamp(Number(dt) || 0, 0, 0.05);
  if (!step) return;
  state.time += step;
  const player = state.snakes.find((snake) => snake.isPlayer);

  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    const wasBoosting = snake.boosting;
    if (snake.isPlayer) {
      const aim = desiredAngle(snake, state, input);
      if (aim !== null) snake.target = aim;
      applyBoost(snake, step, state, wantsBoost(input));
      if (snake.boosting && !wasBoosting) state.events.push('boost');
    } else {
      thinkBot(snake, state, step);
      if (snake.boostLeft > 0) snake.boostLeft -= step;
      applyBoost(snake, step, state, snake.boostLeft > 0);
    }
    moveSnake(snake, step);
  }

  const doomed = [];
  for (const snake of state.snakes) {
    if (!snake.alive) continue;
    if (hitWall(snake)) { doomed.push([snake, null]); continue; }
    const hit = bodyHit(snake, state.snakes);
    if (hit) doomed.push([snake, hit]);
  }
  for (const [snake, hit] of doomed) killSnake(snake, state, hit);

  if (!state.result && player?.alive) {
    state.surviveAcc += step;
    while (state.surviveAcc >= 5) {
      state.surviveAcc -= 5;
      grant(state, player, 1);
    }
  }

  for (const snake of state.snakes) if (snake.alive) eatFood(snake, state);

  if (state.result) {
    if (player) state.camera = cameraFor(player);
    decayFx(state, step);
    return;
  }

  const cap = Math.min(CONFIG.maxBots, CONFIG.startBots + Math.floor(state.time / CONFIG.botEvery));
  for (const snake of state.snakes) {
    if (snake.alive || snake.isPlayer) continue;
    snake.respawn -= step;
    if (snake.respawn <= 0 && aliveBots(state) < cap) revive(snake, state);
  }
  if (state.snakes.filter((snake) => !snake.isPlayer).length < cap) {
    const point = safeSpawn(state);
    const angle = rand(0, Math.PI * 2);
    state.snakes.push(createSnake({
      x: point.x,
      y: point.y,
      angle,
      color: pick(CONFIG.botColors),
      name: CONFIG.botNames[state.snakes.length % CONFIG.botNames.length],
    }));
  }
  refill(state);
  decayFx(state, step);
  if (player?.alive) {
    const edge = Math.min(player.x, player.y, CONFIG.world - player.x, CONFIG.world - player.y) - CONFIG.margin;
    state.danger = clamp(1 - edge / 150, 0, 1);
    state.camera = cameraFor(player);
  }
}
