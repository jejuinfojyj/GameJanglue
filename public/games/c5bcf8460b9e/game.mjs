import { CONFIG } from './config.mjs';
import { SFX } from './audio.mjs';

const W = CONFIG.width;
const H = CONFIG.height;
const BR = CONFIG.physics.ballRadius;
const HR = CONFIG.hoop.radius;
const RT = CONFIG.hoop.rimThickness;
const SR = CONFIG.hoop.scoreRadius;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveProgress(state) {
  try {
    localStorage.setItem(
      CONFIG.storageKey,
      JSON.stringify({
        highScore: state.highScore,
        stars: state.totalStars,
        unlocked: state.unlocked,
        selectedBall: state.selectedBall,
      }),
    );
  } catch {
    /* ignore */
  }
}

function makeHoop(x, y, index) {
  const moving = index > 6 && index % 4 === 0;
  return {
    x,
    y,
    index,
    scored: false,
    moving,
    moveAmp: moving ? 40 + Math.min(30, index) : 0,
    moveSpeed: moving ? 1.1 + index * 0.02 : 0,
    baseX: x,
    phase: Math.random() * Math.PI * 2,
  };
}

function makeNextHoop(previous) {
  const index = previous.index + 1;
  const side = index % 2 === 0 ? 1 : -1;
  const hoop = makeHoop(W * 0.5 + side * (70 + Math.random() * 45),
    previous.y - (195 + Math.random() * 30 + Math.min(20, index)), index);
  // Reserve room for the full moving rim, including the ball at either edge.
  const margin = HR + BR + RT + hoop.moveAmp;
  hoop.x = hoop.baseX = clamp(hoop.x, margin, W - margin);
  return hoop;
}

function layoutHoops() {
  const hoops = [makeHoop(W * 0.5, H * 0.72, 0)];
  while (hoops.length < 40) hoops.push(makeNextHoop(hoops[hoops.length - 1]));
  return hoops;
}

function placeStars(hoops) {
  const stars = [];
  for (let i = 0; i < hoops.length - 1; i++) {
    if (i === 0 || Math.random() > 0.55) continue;
    const a = hoops[i];
    const b = hoops[i + 1];
    stars.push({
      x: (a.x + b.x) * 0.5 + (Math.random() - 0.5) * 30,
      y: (a.y + b.y) * 0.5,
      r: 10,
      taken: false,
      pulse: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function extendHoops(state) {
  for (let i = 0; i < 20; i++) {
    const hoop = makeNextHoop(state.hoops[state.hoops.length - 1]);
    state.hoops.push(hoop);
    if (Math.random() > 0.45) {
      const prev = state.hoops[state.hoops.length - 2];
      state.stars.push({
        x: (prev.x + hoop.x) * 0.5,
        y: (prev.y + hoop.y) * 0.5,
        r: 10,
        taken: false,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }
}

function currentHoop(state) {
  return state.hoops[state.currentIndex];
}

function nextHoop(state) {
  return state.hoops[state.currentIndex + 1] || null;
}

function aimFromPull(pullX, pullY) {
  const len = Math.hypot(pullX, pullY);
  if (len < 8) return { vx: 0, vy: 0, power: 0, angle: -Math.PI / 2 };
  const nx = pullX / len;
  const ny = pullY / len;
  const power = clamp(len, 0, CONFIG.physics.maxPull) * CONFIG.physics.powerScale;
  return {
    vx: -nx * power,
    vy: -ny * power,
    power: clamp(len / CONFIG.physics.maxPull, 0, 1),
    angle: Math.atan2(-ny, -nx),
  };
}

function integrateBall(ball, dt) {
  ball.vy += CONFIG.physics.gravity * dt;
  ball.vx *= Math.pow(1 - CONFIG.physics.airDrag, dt * 15);
  ball.vy *= Math.pow(1 - CONFIG.physics.airDrag, dt * 9);
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  if (ball.x < BR || ball.x > W - BR) {
    ball.x = clamp(ball.x, BR, W - BR);
    ball.vx = (ball.x === BR ? 1 : -1) * Math.abs(ball.vx) * CONFIG.physics.bounce;
  }
}

function trajectory(state, vx, vy, steps = 60) {
  const pts = [];
  const hoop = currentHoop(state);
  const preview = { x: hoop.x, y: hoop.y - 2, vx, vy };
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < 4; j++) integrateBall(preview, 1 / 180);
    pts.push({ x: preview.x, y: preview.y });
  }
  return pts;
}

function rimPoints(hoop) {
  return [
    { x: hoop.x - HR, y: hoop.y, r: RT / 2 },
    { x: hoop.x + HR, y: hoop.y, r: RT / 2 },
  ];
}

function collideRim(ball, hoop) {
  let hit = false;
  for (const rim of rimPoints(hoop)) {
    const dx = ball.x - rim.x;
    const dy = ball.y - rim.y;
    const dist = Math.hypot(dx, dy);
    const min = BR + rim.r;
    if (dist < min && dist > 0.001) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = min - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        ball.vx -= (1 + CONFIG.physics.bounce) * vn * nx;
        ball.vy -= (1 + CONFIG.physics.bounce) * vn * ny;
        hit = true;
      }
    }
  }
  return hit;
}

function throughHoop(ball, hoop, previous) {
  if (previous.y >= hoop.y || ball.y < hoop.y || ball.vy <= 0) return false;
  const t = (hoop.y - previous.y) / (ball.y - previous.y);
  const crossX = previous.x + (ball.x - previous.x) * t;
  const clearance = Math.min(SR, HR - RT / 2 - BR);
  return Math.abs(crossX - hoop.x) < clearance;
}

function addParticles(state, x, y, color, count, speed = 180) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random());
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 40,
      life: 0.35 + Math.random() * 0.45,
      max: 0.8,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function addFloatText(state, x, y, text, color) {
  state.floatTexts.push({ x, y, text, color, life: 0.9 });
}

function unlockCheck(state) {
  for (const ball of CONFIG.balls) {
    if (ball.cost <= 0 || state.unlocked.includes(ball.id)) continue;
    if (state.totalStars >= ball.cost) {
      state.totalStars -= ball.cost;
      state.unlocked.push(ball.id);
      addFloatText(state, W * 0.5, H * 0.35, `${ball.name} 해금!`, CONFIG.palette.accent);
    }
  }
}

export function createGame() {
  const saved = loadSave() || {};
  const unlocked = Array.isArray(saved.unlocked) ? saved.unlocked : ['orange'];
  if (!unlocked.includes('orange')) unlocked.unshift('orange');
  const hoops = layoutHoops();
  const first = hoops[0];
  return {
    score: 0,
    highScore: Number(saved.highScore) || 0,
    totalStars: Number(saved.stars) || 0,
    runStars: 0,
    combo: 0,
    currentIndex: 0,
    hoops,
    stars: placeStars(hoops),
    ball: {
      x: first.x,
      y: first.y - 2,
      vx: 0,
      vy: 0,
      spinning: 0,
      resting: true,
      cleanCandidate: true,
    },
    aim: { pulling: false, keyboard: false, pullX: 0, pullY: 0, path: [] },
    cameraY: 0,
    targetCameraY: 0,
    particles: [],
    floatTexts: [],
    flames: 0,
    flash: 0,
    shake: 0,
    message: '',
    messageTimer: 0,
    unlocked,
    selectedBall: saved.selectedBall && unlocked.includes(saved.selectedBall) ? saved.selectedBall : 'orange',
    result: null,
    time: 0,
    missed: false,
  };
}

function settleBall(state) {
  const hoop = currentHoop(state);
  state.ball.x = hoop.x;
  state.ball.y = hoop.y - 2;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.resting = true;
  state.ball.cleanCandidate = true;
  state.ball.captured = 0;
  state.aim.pulling = false;
  state.aim.keyboard = false;
  state.aim.pullX = 0;
  state.aim.pullY = 0;
  state.aim.path = [];
  state.targetCameraY = hoop.y - H * 0.68;
}

function scoreHoop(state, hoop, clean) {
  hoop.scored = true;
  hoop.netPulse = 0.4;
  state.currentIndex = hoop.index;
  if (clean) {
    state.combo += 1;
    const points = CONFIG.scoring.cleanBase + (state.combo - 1);
    state.score += points;
    state.flames = Math.min(1, state.combo / 5);
    state.flash = 0.25;
    state.shake = 0.18;
    addFloatText(state, hoop.x, hoop.y - 50, `클린 +${points}`, CONFIG.palette.accent);
    addParticles(state, hoop.x, hoop.y, CONFIG.palette.flame, 18, 220);
    addParticles(state, hoop.x, hoop.y, CONFIG.palette.accent, 10, 160);
    SFX.score(true);
  } else {
    state.combo = 0;
    state.flames = 0;
    state.score += CONFIG.scoring.normal;
    addFloatText(state, hoop.x, hoop.y - 50, `+${CONFIG.scoring.normal}`, CONFIG.palette.text);
    addParticles(state, hoop.x, hoop.y, CONFIG.palette.net, 10, 140);
    SFX.score(false);
  }
  if (state.score > state.highScore) state.highScore = state.score;
  if (state.currentIndex >= state.hoops.length - 8) extendHoops(state);
  // Let the made shot visibly drop into the net before preparing the next shot.
  state.ball.captured = 0.14;
  state.ball.vx *= 0.25;
  state.ball.vy = Math.min(state.ball.vy, 190);
  saveProgress(state);
}

function fail(state) {
  if (state.result) return;
  state.missed = true;
  state.combo = 0;
  state.flames = 0;
  SFX.miss();
  saveProgress(state);
  state.result = {
    success: false,
    message: `점수 ${state.score} · 별 ${state.runStars}개 획득\n최고 ${state.highScore}점`,
  };
}

function applyPull(state, hoop, pullX, pullY) {
  const len = Math.hypot(pullX, pullY);
  if (len > CONFIG.physics.maxPull) {
    pullX = (pullX / len) * CONFIG.physics.maxPull;
    pullY = (pullY / len) * CONFIG.physics.maxPull;
  }
  if (pullY < 12) pullY = 12 + Math.abs(pullY) * 0.15;
  state.aim.pulling = true;
  state.aim.pullX = pullX;
  state.aim.pullY = pullY;
  const aim = aimFromPull(pullX, pullY);
  state.aim.path = trajectory(state, aim.vx, aim.vy);
  state.ball.x = hoop.x + pullX * 0.22;
  state.ball.y = hoop.y + pullY * 0.22;
}

function tryShoot(state) {
  const aim = aimFromPull(state.aim.pullX, state.aim.pullY);
  if (aim.power > 0.12) {
    const hoop = currentHoop(state);
    state.ball.x = hoop.x;
    state.ball.y = hoop.y - 2;
    state.ball.resting = false;
    state.ball.vx = aim.vx;
    state.ball.vy = aim.vy;
    state.ball.spinning = aim.vx * 0.02;
    state.ball.cleanCandidate = true;
    state.aim.pulling = false;
    state.aim.keyboard = false;
    state.aim.path = [];
    SFX.shoot();
  } else {
    settleBall(state);
  }
}

function updateAim(state, input) {
  const hoop = currentHoop(state);
  if (!state.ball.resting) return;

  // Resting ball follows moving hoop when not pulling
  if (!state.aim.pulling && !input.pointer.down) {
    state.ball.x = hoop.x;
    state.ball.y = hoop.y - 2;
  }

  if (input.pointer.pressed && input.pointer.inside) {
    state.aim.pulling = true;
    SFX.pull();
  }

  if (input.pointer.down) {
    state.aim.keyboard = false;
    const screenHoopY = hoop.y - state.cameraY;
    applyPull(state, hoop, input.pointer.x - hoop.x, input.pointer.y - screenHoopY);
  } else {
    let kx = 0;
    let ky = 0;
    if (input.keys.has('a') || input.keys.has('arrowleft')) kx -= 1;
    if (input.keys.has('d') || input.keys.has('arrowright')) kx += 1;
    if (input.keys.has('s') || input.keys.has('arrowdown')) ky += 1;
    if (input.keys.has('w') || input.keys.has('arrowup')) ky -= 0.15;
    if (kx || ky > 0) {
      state.aim.keyboard = true;
      applyPull(
        state,
        hoop,
        kx * CONFIG.physics.maxPull * 0.75,
        Math.max(40, (ky || 1) * CONFIG.physics.maxPull * 0.85),
      );
    } else if (state.aim.keyboard && state.aim.pulling) {
      applyPull(state, hoop, state.aim.pullX, state.aim.pullY);
    }
  }

  if (state.aim.pulling && input.pointer.released) tryShoot(state);
  else if (state.aim.pulling && (input.pressed.has(' ') || input.pressed.has('enter'))) tryShoot(state);
}

function updateFlight(state, dt) {
  const ball = state.ball;
  const previous = { x: ball.x, y: ball.y };
  integrateBall(ball, dt);
  ball.spinning += ball.vx * dt * 0.05;
  if (ball.captured > 0) {
    ball.captured -= dt;
    if (ball.captured <= 0) settleBall(state);
    return;
  }

  const from = Math.max(0, state.currentIndex);
  const to = Math.min(state.hoops.length - 1, state.currentIndex + 3);
  for (let i = from; i <= to; i++) {
    const hoop = state.hoops[i];
    if (collideRim(ball, hoop)) {
      ball.cleanCandidate = false;
      state.shake = Math.max(state.shake, 0.08);
      SFX.rim();
    }
    if (!hoop.scored && i === state.currentIndex + 1 && throughHoop(ball, hoop, previous)) {
      scoreHoop(state, hoop, ball.cleanCandidate);
      return;
    }
  }

  for (const star of state.stars) {
    if (star.taken) continue;
    if (Math.hypot(ball.x - star.x, ball.y - star.y) < BR + star.r) {
      star.taken = true;
      state.runStars += 1;
      state.totalStars += 1;
      addParticles(state, star.x, star.y, CONFIG.palette.star, 12, 160);
      addFloatText(state, star.x, star.y - 20, '+별', CONFIG.palette.star);
      SFX.star();
      unlockCheck(state);
      saveProgress(state);
    }
  }

  // Fall below current hoop too far → miss
  const base = currentHoop(state);
  if (ball.y > base.y + 220 && ball.vy > 0) fail(state);
}

export function updateGame(state, dt, input) {
  state.time += dt;
  if (state.flash > 0) state.flash -= dt;
  if (state.shake > 0) state.shake -= dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;

  for (const hoop of state.hoops) {
    hoop.netPulse = Math.max(0, (hoop.netPulse || 0) - dt);
    if (hoop.moving) {
      hoop.x = hoop.baseX + Math.sin(state.time * hoop.moveSpeed + hoop.phase) * hoop.moveAmp;
    }
  }

  for (const star of state.stars) star.pulse += dt * 4;

  if (state.ball.resting) updateAim(state, input);
  else {
    const steps = Math.max(1, Math.ceil(dt * 180));
    for (let i = 0; i < steps && !state.result && !state.ball.resting; i++) updateFlight(state, dt / steps);
  }

  // Camera follow
  const focus = state.ball.resting ? currentHoop(state).y : state.ball.y;
  state.targetCameraY = focus - H * 0.68;
  state.cameraY += (state.targetCameraY - state.cameraY) * Math.min(1, dt * 6);

  // Particles / float text
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 400 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.floatTexts.length - 1; i >= 0; i--) {
    const t = state.floatTexts[i];
    t.life -= dt;
    t.y -= 40 * dt;
    if (t.life <= 0) state.floatTexts.splice(i, 1);
  }

  // Cycle ball with Q/E when resting on start? optional - skip during play to keep simple
  if (state.ball.resting && input.pressed.has('q')) {
    cycleBall(state, -1);
  }
  if (state.ball.resting && input.pressed.has('e')) {
    cycleBall(state, 1);
  }
}

function cycleBall(state, dir) {
  const owned = CONFIG.balls.filter((b) => state.unlocked.includes(b.id));
  const idx = owned.findIndex((b) => b.id === state.selectedBall);
  const next = owned[(idx + dir + owned.length) % owned.length];
  state.selectedBall = next.id;
  saveProgress(state);
  addFloatText(state, state.ball.x, state.ball.y - 40, next.name, CONFIG.palette.primary);
}

export function getBallSkin(state) {
  return CONFIG.balls.find((b) => b.id === state.selectedBall) || CONFIG.balls[0];
}
