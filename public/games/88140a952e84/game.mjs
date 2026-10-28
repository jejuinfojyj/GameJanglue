import { CONFIG, FRUITS } from './config.mjs';
import { playDrop, playGameOver, playPop } from './audio.mjs';

function readBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(CONFIG.bestKey)) || 0);
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(CONFIG.bestKey, String(score));
  } catch {
    /* 저장을 못 해도 이번 판 점수는 화면에 남는다. */
  }
}

export function rollFruit() {
  const count = Math.max(1, Math.min(FRUITS.length, CONFIG.rules.spawnCount));
  return Math.floor(Math.random() * count);
}

export function createGame() {
  const { left, right } = CONFIG.box;
  return {
    hold: rollFruit(),
    next: rollFruit(),
    fruits: [],
    score: 0,
    best: readBest(),
    aimX: (left + right) / 2,
    cooldown: 0,
    overTimer: 0,
    result: null,
    madeWatermelon: false,
    clock: 0,
    nextId: 1,
    particles: [],
    floats: [],
    hint: '',
    hintTime: 0,
    shake: 0,
    dropped: false,
    lastPointerX: null,
    endedSound: false,
  };
}

function clampAim(state) {
  const radius = FRUITS[state.hold].radius;
  const { left, right } = CONFIG.box;
  state.aimX = Math.min(right - radius - 1, Math.max(left + radius + 1, state.aimX));
}

function rememberScore(state) {
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.best);
  }
}

function burst(state, x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 160;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      life: 0.35 + Math.random() * 0.25,
      max: 0.6,
      color,
      radius: 2 + Math.random() * 3,
    });
  }
  if (state.particles.length > 90) state.particles.splice(0, state.particles.length - 90);
}

function handleInput(state, dt, input) {
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.hintTime = Math.max(0, state.hintTime - dt);
  const pointer = input.pointer;
  const moved = pointer.inside && pointer.x !== state.lastPointerX;
  if (pointer.inside && (moved || pointer.pressed || pointer.down)) {
    state.aimX = pointer.x;
    state.lastPointerX = pointer.x;
  }
  if (input.keys.has('arrowleft') || input.keys.has('a')) state.aimX -= CONFIG.rules.aimSpeed * dt;
  if (input.keys.has('arrowright') || input.keys.has('d')) state.aimX += CONFIG.rules.aimSpeed * dt;
  clampAim(state);

  const dropPressed = pointer.pressed
    || input.pressed.has(' ')
    || input.pressed.has('space')
    || input.pressed.has('enter')
    || input.pressed.has('arrowdown');
  if (dropPressed) dropFruit(state);
}

function dropFruit(state) {
  if (state.cooldown > 0) return;
  const spec = FRUITS[state.hold];
  const x = state.aimX;
  const y = CONFIG.box.dropY;
  const blocked = state.fruits.some((fruit) => {
    const other = FRUITS[fruit.type].radius;
    return Math.hypot(fruit.x - x, fruit.y - y) < other + spec.radius + 3;
  });
  if (blocked) {
    state.hint = '여기엔 놓을 자리가 없어';
    state.hintTime = 0.9;
    return;
  }
  state.fruits.push({
    id: state.nextId++,
    type: state.hold,
    x,
    y,
    vx: 0,
    vy: 20,
    age: 0,
    pop: 0,
    squash: 0,
  });
  state.dropped = true;
  state.hold = state.next;
  state.next = rollFruit();
  state.cooldown = CONFIG.rules.dropCooldown;
  clampAim(state);
  playDrop();
}

function resolvePair(a, b) {
  const ar = FRUITS[a.type].radius;
  const br = FRUITS[b.type].radius;
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let dist = Math.hypot(dx, dy);
  const min = ar + br;
  if (dist === 0) {
    dx = 1;
    dy = 0;
    dist = 1;
  }
  if (dist >= min) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = min - dist;
  const massA = ar * ar;
  const massB = br * br;
  const total = massA + massB;
  a.x -= nx * overlap * (massB / total);
  a.y -= ny * overlap * (massB / total);
  b.x += nx * overlap * (massA / total);
  b.y += ny * overlap * (massA / total);
  const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rv < 0) {
    const impulse = -(1 + CONFIG.physics.restitution) * rv / (1 / massA + 1 / massB);
    a.vx -= (impulse * nx) / massA;
    a.vy -= (impulse * ny) / massA;
    b.vx += (impulse * nx) / massB;
    b.vy += (impulse * ny) / massB;
    if (Math.abs(rv) > 80) {
      a.squash = Math.max(a.squash, 0.08);
      b.squash = Math.max(b.squash, 0.08);
    }
  }
  const tx = -ny;
  const ty = nx;
  const tangent = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
  const damp = tangent * 0.18;
  a.vx += damp * tx * (massB / total);
  a.vy += damp * ty * (massB / total);
  b.vx -= damp * tx * (massA / total);
  b.vy -= damp * ty * (massA / total);
}

function physics(state, dt) {
  const { gravity, iterations, maxSpeed } = CONFIG.physics;
  const { left, right, floor } = CONFIG.box;
  const fruits = state.fruits;
  for (const fruit of fruits) {
    fruit.vy = Math.min(maxSpeed, fruit.vy + gravity * dt);
    fruit.vx *= Math.exp(-0.7 * dt);
    fruit.x += fruit.vx * dt;
    fruit.y += fruit.vy * dt;
    fruit.age += dt;
    fruit.pop = Math.max(0, fruit.pop - dt * 3.2);
    fruit.squash = Math.max(0, fruit.squash - dt);
  }
  for (let step = 0; step < iterations; step++) {
    for (const fruit of fruits) {
      const radius = FRUITS[fruit.type].radius;
      if (fruit.x - radius < left) {
        fruit.x = left + radius;
        if (fruit.vx < 0) fruit.vx *= -CONFIG.physics.restitution;
      }
      if (fruit.x + radius > right) {
        fruit.x = right - radius;
        if (fruit.vx > 0) fruit.vx *= -CONFIG.physics.restitution;
      }
      if (fruit.y + radius > floor) {
        fruit.y = floor - radius;
        if (fruit.vy > 50) fruit.squash = Math.max(fruit.squash, 0.1);
        if (fruit.vy > 0) fruit.vy *= -CONFIG.physics.restitution;
        fruit.vx *= 0.88;
      }
    }
    for (let i = 0; i < fruits.length; i++) {
      for (let j = i + 1; j < fruits.length; j++) resolvePair(fruits[i], fruits[j]);
    }
  }
  for (const fruit of fruits) {
    const radius = FRUITS[fruit.type].radius;
    const supported = fruit.y + radius >= floor - 2
      || fruits.some((other) => other !== fruit && other.y > fruit.y && Math.hypot(other.x - fruit.x, other.y - fruit.y) < FRUITS[other.type].radius + radius + 3);
    if (supported && Math.abs(fruit.vy) < 36 && Math.abs(fruit.vx) < 24) {
      fruit.vx = 0;
      fruit.vy = 0;
    }
  }
}

function keepInside(fruit) {
  const radius = FRUITS[fruit.type].radius;
  const { left, right, floor } = CONFIG.box;
  fruit.x = Math.min(right - radius, Math.max(left + radius, fruit.x));
  if (fruit.y + radius > floor) fruit.y = floor - radius;
}

function mergeFruits(state) {
  const list = state.fruits;
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.type !== b.type || a.type >= FRUITS.length - 1) continue;
      if (a.age < CONFIG.rules.mergeDelay || b.age < CONFIG.rules.mergeDelay) continue;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const reach = FRUITS[a.type].radius + FRUITS[b.type].radius + CONFIG.rules.mergeSlack;
      if (dist <= reach) pairs.push({ a, b, type: a.type, dist });
    }
  }
  if (!pairs.length) return;
  pairs.sort((a, b) => b.type - a.type || a.dist - b.dist);
  const removed = new Set();
  const born = [];
  for (const pair of pairs) {
    if (removed.has(pair.a.id) || removed.has(pair.b.id)) continue;
    removed.add(pair.a.id);
    removed.add(pair.b.id);
    const type = pair.a.type + 1;
    const spec = FRUITS[type];
    const massA = FRUITS[pair.a.type].radius ** 2;
    const massB = FRUITS[pair.b.type].radius ** 2;
    const fruit = {
      id: state.nextId++,
      type,
      x: (pair.a.x * massA + pair.b.x * massB) / (massA + massB),
      y: (pair.a.y * massA + pair.b.y * massB) / (massA + massB),
      vx: (pair.a.vx * massA + pair.b.vx * massB) / (massA + massB),
      vy: (pair.a.vy * massA + pair.b.vy * massB) / (massA + massB) - 70,
      age: 0,
      pop: 1,
      squash: 0,
    };
    keepInside(fruit);
    born.push(fruit);
    state.score += spec.score;
    if (type === FRUITS.length - 1) state.madeWatermelon = true;
    state.shake = Math.min(1, state.shake + 0.25 + type * 0.04);
    burst(state, fruit.x, fruit.y, spec.fill, 8 + type);
    state.floats.push({ x: fruit.x, y: fruit.y - spec.radius, text: `+${spec.score}`, life: 0.8, name: spec.name });
    playPop(type);
  }
  if (!removed.size) return;
  state.fruits = list.filter((fruit) => !removed.has(fruit.id)).concat(born);
  if (state.floats.length > 16) state.floats.splice(0, state.floats.length - 16);
  rememberScore(state);
}

function watchDanger(state, dt) {
  const crowding = state.fruits.some((fruit) => {
    if (fruit.age < CONFIG.rules.overAge) return false;
    return fruit.y - FRUITS[fruit.type].radius < CONFIG.box.dangerY;
  });
  if (crowding) state.overTimer += dt;
  else state.overTimer = Math.max(0, state.overTimer - dt * 3);
  if (state.overTimer < CONFIG.rules.overSeconds) return;
  rememberScore(state);
  const headline = state.madeWatermelon ? '수박을 만들었어!' : '상자가 넘쳤어.';
  state.result = {
    success: state.madeWatermelon,
    message: `${headline}\n점수 ${state.score}점 · 최고 ${state.best}점`,
  };
  if (!state.endedSound) {
    state.endedSound = true;
    playGameOver();
  }
}

function effects(state, dt) {
  state.shake = Math.max(0, state.shake - dt * 1.6);
  state.clock += dt;
  for (const particle of state.particles) {
    particle.life -= dt;
    particle.vy += 500 * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
  for (const item of state.floats) {
    item.life -= dt;
    item.y -= 28 * dt;
  }
  state.floats = state.floats.filter((item) => item.life > 0);
}

export function updateGame(state, dt, input) {
  if (state.result) return;
  const frame = Math.max(0, Math.min(dt, 0.05));
  handleInput(state, frame, input);
  let left = frame;
  while (left > 0.0001) {
    const step = Math.min(CONFIG.physics.substep, left);
    physics(state, step);
    left -= step;
  }
  mergeFruits(state);
  watchDanger(state, frame);
  effects(state, frame);
}
