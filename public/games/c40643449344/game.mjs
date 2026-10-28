import { CONFIG, VEHICLES, STAGES, UPGRADES } from './config.mjs';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function defaultSave() {
  return {
    coins: 80,
    owned: ['classic'],
    selected: 'classic',
    stage: 'countryside',
    upgrades: {},
    best: {},
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return defaultSave();
    const data = { ...defaultSave(), ...JSON.parse(raw) };
    if (!Array.isArray(data.owned) || !data.owned.includes('classic')) data.owned = ['classic', ...(data.owned || [])];
    data.upgrades = data.upgrades || {};
    data.best = data.best || {};
    return data;
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(save));
  } catch {
    /* ignore quota */
  }
}

function upgradesFor(save, vehicleId) {
  const u = save.upgrades[vehicleId] || {};
  return {
    engine: u.engine || 0,
    suspension: u.suspension || 0,
    tires: u.tires || 0,
    awd: u.awd || 0,
  };
}

export function upgradeCost(level) {
  return Math.round(CONFIG.upgradeBaseCost * Math.pow(1.65, level));
}

export function vehicleStats(vehicle, levels) {
  const e = levels.engine || 0;
  const s = levels.suspension || 0;
  const t = levels.tires || 0;
  const a = levels.awd || 0;
  return {
    ...vehicle,
    power: vehicle.power * (1 + e * 0.14),
    grip: vehicle.grip * (1 + t * 0.1) * (1 + a * 0.04),
    spring: vehicle.spring * (1 + s * 0.12),
    damp: vehicle.damp * (1 + s * 0.08),
    airControl: 0.35 + a * 0.18,
    driveBias: 0.55 + a * 0.08,
  };
}

/** 시드 기반 간단 난수 */
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStage(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** 지형 높이맵 생성 (y는 아래로 증가, 값이 작을수록 높은 언덕) */
export function buildTerrain(stage, length = 12000) {
  const rnd = mulberry32(hashStage(stage.id) ^ 0x9e3779b9);
  const phase = rnd() * Math.PI * 2;
  const phase2 = rnd() * Math.PI * 2;
  const step = 12;
  const hills = [];
  // Each feature spans hundreds of pixels, with zero slope at both ends.
  for (let start = 650; start < length; start += 950 + rnd() * 240) {
    hills.push({ start, width: 450 + rnd() * 100, height: (65 + rnd() * 12) * Math.min(1.2, stage.hilliness) });
  }
  const points = [];
  for (let x = 0; x <= length + step; x += step) {
    const blend = clamp((x - 150) / 430, 0, 1);
    const ease = blend * blend * (3 - 2 * blend);
    let y = 265 + Math.sin(x * 0.0045 + phase) * 27 * stage.hilliness
      + Math.sin(x * 0.009 + phase2) * 12 * stage.hilliness
      + Math.sin(x * 0.014) * 3 * stage.roughness;
    for (const hill of hills) {
      const u = (x - hill.start) / hill.width;
      if (u > 0 && u < 1) y -= hill.height * Math.sin(Math.PI * u) ** 4;
    }
    points.push({ x, y: lerp(286, y, ease) });
  }
  return { points, step, length };
}

export function groundAt(terrain, x) {
  const { points, step } = terrain;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  const i = clamp(Math.floor(x / step), 0, points.length - 2);
  const a = points[i], b = points[i + 1];
  const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 2)];
  const span = b.x - a.x;
  const t = (x - a.x) / span;
  const m0 = (b.y - before.y) / (b.x - before.x);
  const m1 = (after.y - a.y) / (after.x - a.x);
  // Shared tangents give continuous surface normals at every sample boundary.
  return (2*t*t*t - 3*t*t + 1)*a.y + (t*t*t - 2*t*t + t)*span*m0
    + (-2*t*t*t + 3*t*t)*b.y + (t*t*t - t*t)*span*m1;
}

export function groundSlope(terrain, x) {
  const d = 8;
  return (groundAt(terrain, x + d) - groundAt(terrain, x - d)) / (2 * d);
}

function scatterPickups(terrain, stage, rnd) {
  const fuels = [];
  const coins = [];
  for (let x = 280; x < terrain.length - 80; x += 90 + rnd() * 70) {
    const gy = groundAt(terrain, x);
    if (rnd() < 0.72) coins.push({ x, y: gy - 28 - rnd() * 24, taken: false, value: CONFIG.coinValue + Math.floor(rnd() * 3) * 2 });
  }
  // Guaranteed reachable fuel stops; random-only placement could leave an
  // entire starting section or a long stretch without a single can.
  for (let x = 360; x < terrain.length - 80; x += (stage.id === 'desert' ? 400 : 480) + rnd() * 70) {
    fuels.push({ x, y: groundAt(terrain, x) - 32, taken: false });
  }
  return { fuels, coins };
}

function makeCar(stats, x, groundY) {
  const half = stats.wheelBase / 2;
  const wheelLy = stats.wheelR * 0.15;
  return {
    x,
    y: groundY - stats.wheelR - wheelLy,
    angle: 0,
    vx: 0,
    vy: 0,
    omega: 0,
    speed: 0,
    wheels: [
      { lx: -half, ly: wheelLy, spring: 0, onGround: true },
      { lx: half, ly: wheelLy, spring: 0, onGround: true },
    ],
  };
}

function worldWheel(car, w) {
  const c = Math.cos(car.angle);
  const s = Math.sin(car.angle);
  return {
    x: car.x + w.lx * c - w.ly * s,
    y: car.y + w.lx * s + w.ly * c,
  };
}

function hitButtons(ui, x, y) {
  if (!ui) return null;
  for (const b of ui) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

export function createGame() {
  const save = loadSave();
  return {
    save,
    screen: 'garage', // garage | stage | race
    garageTab: 'vehicles', // vehicles | upgrades
    message: '',
    messageT: 0,
    stageId: save.stage,
    vehicleId: save.selected,
    ui: [],
    race: null,
    pedals: { gas: false, brake: false },
    result: null,
    pressLatch: false,
  };
}

function toast(state, text) {
  state.message = text;
  state.messageT = 2.2;
}

function beginRace(state) {
  const save = state.save;
  const stage = STAGES.find((s) => s.id === state.stageId) || STAGES[0];
  const vehicle = VEHICLES.find((v) => v.id === state.vehicleId) || VEHICLES[0];
  const levels = upgradesFor(save, vehicle.id);
  const stats = vehicleStats(vehicle, levels);
  const rnd = mulberry32((hashStage(stage.id) ^ hashStage(vehicle.id)) + 17);
  const terrain = buildTerrain(stage);
  const startX = 80;
  const pickups = scatterPickups(terrain, stage, rnd);
  state.race = {
    stage,
    vehicle,
    stats,
    levels,
    terrain,
    car: makeCar(stats, startX, groundAt(terrain, startX)),
    fuels: pickups.fuels,
    coins: pickups.coins,
    fuel: CONFIG.fuelMax,
    distance: 0,
    maxDistance: 0,
    earned: 0,
    airTime: 0,
    flipTimer: 0,
    camX: 0,
    camY: 0,
    pickupT: 0,
    time: 0,
    finished: false,
  };
  state.screen = 'race';
  state.pedals = { gas: false, brake: false };
  state.result = null;
}

function buyVehicle(state, id) {
  const v = VEHICLES.find((x) => x.id === id);
  if (!v) return;
  if (state.save.owned.includes(id)) {
    state.vehicleId = id;
    state.save.selected = id;
    writeSave(state.save);
    return;
  }
  if (state.save.coins < v.price) {
    toast(state, '코인이 부족해요');
    return;
  }
  state.save.coins -= v.price;
  state.save.owned.push(id);
  state.vehicleId = id;
  state.save.selected = id;
  writeSave(state.save);
  toast(state, `${v.name} 구매 완료!`);
}

function buyUpgrade(state, partId) {
  const id = state.vehicleId;
  if (!state.save.owned.includes(id)) {
    toast(state, '먼저 탈것을 구매하세요');
    return;
  }
  const levels = upgradesFor(state.save, id);
  const level = levels[partId] || 0;
  if (level >= CONFIG.upgradeMax) {
    toast(state, '이미 최고 단계예요');
    return;
  }
  const cost = upgradeCost(level);
  if (state.save.coins < cost) {
    toast(state, '코인이 부족해요');
    return;
  }
  state.save.coins -= cost;
  if (!state.save.upgrades[id]) state.save.upgrades[id] = {};
  state.save.upgrades[id][partId] = level + 1;
  writeSave(state.save);
  const name = UPGRADES.find((u) => u.id === partId)?.name || partId;
  toast(state, `${name} Lv.${level + 1}`);
}

function stageUnlocked(save, stage) {
  if (stage.unlockAt <= 0) return true;
  const bestCountry = save.best.countryside || 0;
  const bestCave = save.best.cave || 0;
  const bestDesert = save.best.desert || 0;
  const bestArctic = save.best.arctic || 0;
  const bestMoon = save.best.moon || 0;
  const progress = Math.max(bestCountry, bestCave, bestDesert, bestArctic, bestMoon, save.best.mars || 0);
  // 해금은 해당 스테이지 unlockAt 거리(미터)를 어느 스테이지에서든 달성하면
  return progress >= stage.unlockAt;
}

function endRace(state, reason) {
  const race = state.race;
  if (!race || race.finished) return;
  race.finished = true;
  const meters = Math.floor(race.maxDistance / 10);
  const bonus = Math.floor(meters * 0.35) + race.earned;
  state.save.coins += bonus;
  const prev = state.save.best[race.stage.id] || 0;
  if (meters > prev) state.save.best[race.stage.id] = meters;
  writeSave(state.save);
  const best = state.save.best[race.stage.id] || meters;
  state.result = {
    success: meters >= 80,
    message: `${reason}\n주행 ${meters}m · 코인 +${bonus}\n최고 기록 ${best}m\n보유 코인 ${state.save.coins}`,
  };
}

function updatePhysics(race, dt, gas, brake) {
  const { car, stats, stage, terrain } = race;
  // Arcade gravity gives broad hill jumps time for deliberate air control.
  const g = stage.gravity * 0.5;
  const gripMul = stage.gripMul;
  const wheelR = stats.wheelR;

  if (gas && race.fuel > 0) race.fuel -= CONFIG.fuelDriveDrain * stage.fuelMul * dt;
  else race.fuel -= CONFIG.fuelIdleDrain * stage.fuelMul * dt;
  race.fuel = clamp(race.fuel, 0, CONFIG.fuelMax);
  const hasFuel = race.fuel > 0.05;
  const drive = hasFuel && gas;
  const reverse = hasFuel && brake;

  let grounded = 0;
  const steps = Math.max(1, Math.ceil(dt * 180));
  const h = dt / steps;
  const inertia = stats.wheelBase * stats.wheelBase * 0.45;
  const roofTouches = () => {
    if (Math.cos(car.angle) > 0.35) return false;
    const cos = Math.cos(car.angle), sin = Math.sin(car.angle);
    return [-stats.bodyW * 0.32, 0, stats.bodyW * 0.32].some(lx => {
      const x = car.x + lx * cos + stats.roof * sin;
      const y = car.y + lx * sin - stats.roof * cos;
      return y >= groundAt(terrain, x) - 1;
    });
  };

  for (let step = 0; step < steps; step++) {
    // A wheel supports the car only while touching and moving into the ground.
    // No downward height correction or adhesion: upward momentum can leave a crest.
    const contacts = car.wheels.map(w => {
      const p = worldWheel(car, w);
      const slope = groundSlope(terrain, p.x);
      const scale = Math.hypot(1, slope);
      const nx = slope / scale, ny = -1 / scale;
      const rx = p.x - car.x, ry = p.y - car.y;
      const vn = (car.vx - car.omega * ry) * nx + (car.vy + car.omega * rx) * ny;
      const penetration = p.y + wheelR - groundAt(terrain, p.x);
      return { w, p, slope, nx, ny, rx, ry, penetration, vn };
    }).filter(c => c.penetration >= -0.75 && c.vn <= 20);

    if (contacts.length) {
      const slope = contacts.reduce((sum, c) => sum + c.slope, 0) / contacts.length;
      const scale = Math.hypot(1, slope), tx = 1 / scale, ty = slope / scale;
      let speed = car.vx * tx + car.vy * ty;
      const pedal = (drive ? 1 : 0) - (reverse ? 0.75 : 0);
      // Wheel torque must exceed the downhill gravity component on ordinary
      // inclines. The old scalar-speed model hid that force; a real normal
      // impulse solver needs enough engine traction to climb the same course.
      const accel = 1050 * stats.power * Math.min(1.35, stats.grip * gripMul);
      const change = pedal * accel * h - speed * (gas || brake ? 0.14 : 0.45) * h;
      const limit = 320 * stats.power;
      const newSpeed = clamp(speed + change, -limit * 0.5, limit);
      car.vx += (newSpeed - speed) * tx;
      car.vy += (newSpeed - speed) * ty;
      if (Math.cos(car.angle) > 0.2) {
        const diff = Math.atan2(Math.sin(Math.atan(slope) - car.angle), Math.cos(Math.atan(slope) - car.angle));
        car.omega += (diff * 18 * stats.spring - car.omega * 5 * stats.damp) * h;
      }
    } else {
      const pedal = (gas ? 1 : 0) - (brake ? 1 : 0);
      car.omega += pedal * (16 + stats.airControl * 8) * h;
      car.omega *= Math.exp(-(pedal ? 0.25 : 2.5) * h);
    }
    car.vy += g * h;
    car.omega = clamp(car.omega, -9, 9);
    car.vx = clamp(car.vx, -500, 600);
    car.vy = clamp(car.vy, -850, 850);
    car.x += car.vx * h;
    car.y += car.vy * h;
    car.angle += car.omega * h;
    if (roofTouches()) return 'flip';

    // Resolve wheel impulses against the surface normal, including angular
    // momentum. Terrain can push the car upward, but cannot pull it down.
    let correction = 0;
    for (const w of car.wheels) {
      const p = worldWheel(car, w);
      const penetration = p.y + wheelR - groundAt(terrain, p.x);
      correction = Math.max(correction, penetration);
      w.spring = Math.max(0, penetration);
      w.onGround = penetration >= -0.5;
    }
    if (correction > 0) car.y -= correction;
    grounded = 0;
    for (let pass = 0; pass < 4; pass++) {
      for (const w of car.wheels) {
        const p = worldWheel(car, w);
        if (p.y + wheelR < groundAt(terrain, p.x) - 1) continue;
        if (pass === 0) grounded++;
        const slope = groundSlope(terrain, p.x), scale = Math.hypot(1, slope);
        const nx = slope / scale, ny = -1 / scale;
        const rx = p.x - car.x, ry = p.y - car.y;
        const arm = rx * ny - ry * nx;
        const vn = (car.vx - car.omega * ry) * nx + (car.vy + car.omega * rx) * ny;
        if (vn < 0) {
          const impulse = -vn / (1 + arm * arm / inertia);
          car.vx += nx * impulse;
          car.vy += ny * impulse;
          car.omega += arm * impulse / inertia;
        }
      }
    }
    race.airTime = grounded ? 0 : race.airTime + h;
    if (car.x < 10) { car.x = 10; car.vx = Math.max(0, car.vx); }
    car.speed = car.vx;
  }

  race.distance = Math.max(0, car.x - 80);
  race.maxDistance = Math.max(race.maxDistance, race.distance);
  race.camX = lerp(race.camX, car.x - 220, 1 - Math.pow(0.002, dt));
  race.camY = lerp(race.camY || 0, Math.min(0, car.y - 110), 1 - Math.exp(-6 * dt));
  race.pickupT = Math.max(0, (race.pickupT || 0) - dt);
  race.time += dt;

  for (const f of race.fuels) {
    if (f.taken) continue;
    if (Math.hypot(car.x - f.x, car.y - f.y) < 40) {
      f.taken = true;
      race.fuel = clamp(race.fuel + CONFIG.fuelPickup, 0, CONFIG.fuelMax);
      race.pickupT = 1.1;
    }
  }
  for (const coin of race.coins) {
    if (coin.taken) continue;
    if (Math.hypot(car.x - coin.x, car.y - coin.y) < 36) {
      coin.taken = true;
      race.earned += coin.value;
    }
  }

  if (race.fuel <= 0 && Math.abs(car.speed) < 12 && grounded > 0) return 'fuel';
  if (car.x > terrain.length - 40) return 'goal';
  if (car.y > 560) return 'flip';
  return null;
}

export function updateGame(state, dt, input) {
  if (state.messageT > 0) state.messageT -= dt;

  const gasKey = input.keys.has('arrowright') || input.keys.has('d') || input.keys.has('arrowup') || input.keys.has('w');
  const brakeKey = input.keys.has('arrowleft') || input.keys.has('a') || input.keys.has('arrowdown') || input.keys.has('s');

  // 터치 페달: 레이스 중 화면 하단 좌/우
  let gasTouch = false;
  let brakeTouch = false;
  if (state.screen === 'race' && state.race && !state.race.finished) {
    for (const p of input.pointers) {
      if (!p.down) continue;
      if (p.y > CONFIG.height * 0.62) {
        if (p.x < CONFIG.width * 0.42) brakeTouch = true;
        if (p.x > CONFIG.width * 0.58) gasTouch = true;
      }
    }
    // 단일 포인터도 지원
    if (input.pointer.down && input.pointer.y > CONFIG.height * 0.62) {
      if (input.pointer.x < CONFIG.width * 0.42) brakeTouch = true;
      if (input.pointer.x > CONFIG.width * 0.58) gasTouch = true;
    }
  }
  state.pedals.gas = gasKey || gasTouch;
  state.pedals.brake = brakeKey || brakeTouch;

  // UI 클릭 (포인터 pressed)
  const clicked = input.pointer.pressed;
  if (clicked) {
    const hit = hitButtons(state.ui, input.pointer.x, input.pointer.y);
    if (hit) {
      if (hit.action === 'tab') state.garageTab = hit.value;
      else if (hit.action === 'select-vehicle') buyVehicle(state, hit.value);
      else if (hit.action === 'upgrade') buyUpgrade(state, hit.value);
      else if (hit.action === 'open-stage') state.screen = 'stage';
      else if (hit.action === 'open-garage') state.screen = 'garage';
      else if (hit.action === 'pick-stage') {
        const st = STAGES.find((s) => s.id === hit.value);
        if (st && stageUnlocked(state.save, st)) {
          state.stageId = st.id;
          state.save.stage = st.id;
          writeSave(state.save);
        } else toast(state, '아직 잠겨 있어요. 더 멀리 달려 보세요!');
      } else if (hit.action === 'start-race') beginRace(state);
    }
  }

  if (state.screen === 'race' && state.race && !state.race.finished) {
    const reason = updatePhysics(state.race, dt, state.pedals.gas, state.pedals.brake);
    if (reason === 'fuel') endRace(state, '연료가 떨어졌어요!');
    else if (reason === 'flip') endRace(state, '차량이 뒤집혔어요!');
    else if (reason === 'goal') endRace(state, '코스 완주!');
  }
}

export { stageUnlocked, upgradesFor, hitButtons };
