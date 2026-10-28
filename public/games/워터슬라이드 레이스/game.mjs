import { CONFIG, STORAGE_KEY } from './config.mjs';

const { track: TRACK, rules: RULES, skins: SKINS, rivals: RIVALS } = CONFIG;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { coins: 0, unlocked: ['sunny'], selected: 'sunny' };
    const data = JSON.parse(raw);
    return {
      coins: Math.max(0, Number(data.coins) || 0),
      unlocked: Array.isArray(data.unlocked) && data.unlocked.length ? data.unlocked : ['sunny'],
      selected: SKINS.some((s) => s.id === data.selected) ? data.selected : 'sunny',
    };
  } catch {
    return { coins: 0, unlocked: ['sunny'], selected: 'sunny' };
  }
}

function persistSave(save) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* ignore quota */
  }
}

/** 슬라이드 중심선: 진행도 t(0~length) → 화면 기준 가로 오프셋 비율 */
export function slideCenter(t) {
  const u = t / 2000;
  return (
    Math.sin(u * Math.PI * 2.15) * 0.34 +
    Math.sin(u * Math.PI * 5.1 + 0.7) * 0.16 +
    Math.sin(u * Math.PI * 0.85) * 0.1
  );
}

export function slideWidth(t) {
  const u = t / TRACK.length;
  if (u > 0.93) return TRACK.baseWidth * (1.35 + (u - 0.93) * 4);
  return TRACK.baseWidth * (0.92 + Math.sin(u * 9) * 0.06);
}

/** 지름길 구간: 점프하면 landT로 빨리 이동, 착지 레인 맞춤 필요 */
const SHORTCUTS = [
  { from: 900, to: 1060, land: 1360, landLane: -0.15, label: '지름길! 약 2초 단축' },
  { from: 2300, to: 2460, land: 2760, landLane: 0.25, label: '공중 숏컷! 약 2초 단축' },
  { from: 3700, to: 3860, land: 4160, landLane: -0.2, label: '빅 점프! 약 2초 단축' },
  { from: 5100, to: 5260, land: 5560, landLane: 0.2, label: '지름길! 약 2초 단축' },
  { from: 6500, to: 6660, land: 6960, landLane: -0.2, label: '공중 숏컷! 약 2초 단축' },
  { from: 7900, to: 8060, land: 8360, landLane: 0.15, label: '마지막 지름길!' },
];

function buildPickups() {
  const boosts = [];
  const obstacles = [];
  const coins = [];
  for (let i = 0; ; i++) {
    const t = 240 + i * 480 + (i % 3) * 28;
    if (t >= TRACK.length - 80) break;
    boosts.push({ t, lane: ((i % 2) * 2 - 1) * (0.25 + (i % 3) * 0.12), taken: false });
  }
  for (let i = 0; ; i++) {
    const t = 350 + i * 230 + (i % 2) * 22;
    if (t >= TRACK.length - 90) break;
    obstacles.push({ t, lane: Math.sin(i * 1.7) * 0.55, hit: false });
  }
  for (let i = 0; ; i++) {
    const t = 80 + i * 110 + (i % 5) * 7;
    if (t >= TRACK.length - 60) break;
    coins.push({ t, lane: Math.sin(i * 0.9 + 0.3) * 0.62, taken: false });
  }
  return { boosts, obstacles, coins };
}

function makeRacer(id, name, body, tube, progress, lane, isPlayer, skill = 1) {
  return {
    id,
    name,
    body,
    tube,
    progress,
    lane,
    speed: RULES.baseSpeed * (isPlayer ? 1 : 0.9 + skill * 0.12),
    targetSpeed: RULES.baseSpeed,
    boostTimer: 0,
    slowTimer: 0,
    airborne: false,
    airTimer: 0,
    airFrom: 0,
    airTo: 0,
    airLaneFrom: 0,
    airLaneTo: 0,
    jumpCooldown: 0,
    finished: false,
    finishTime: 0,
    fallen: false,
    isPlayer,
    skill,
    splash: 0,
    bumpFlash: 0,
    ceremony: 0,
  };
}

function skinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}

export function createGame() {
  const save = loadSave();
  const skin = skinById(save.selected);
  const pickups = buildPickups();
  const player = makeRacer('you', '나', skin.body, skin.tube, 0, 0, true, 1);
  const rivals = RIVALS.map((r, i) =>
    makeRacer(`ai${i}`, r.name, r.body, r.tube, -12 - i * 18, (i - 1) * 0.35, false, r.skill),
  );
  return {
    save,
    pickups,
    racers: [player, ...rivals],
    playerId: 'you',
    raceTime: 0,
    countdown: 3.4,
    cameraProgress: 0,
    fx: [],
    toast: null,
    toastTimer: 0,
    shopOpen: false,
    dragLane: null,
    lastPointerX: null,
    jumpQueued: false,
    result: null,
    raceCoins: 0,
  };
}

function playerOf(state) {
  return state.racers.find((r) => r.id === state.playerId);
}

function rankList(state) {
  return [...state.racers]
    .filter((r) => !r.fallen)
    .sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
}

function placeOf(state, racer) {
  const list = rankList(state);
  const idx = list.findIndex((r) => r.id === racer.id);
  return idx < 0 ? state.racers.length : idx + 1;
}

function spawnFx(state, kind, x, y, life = 0.45) {
  state.fx.push({ kind, x, y, life, max: life });
}

function setToast(state, text, time = 1.1) {
  state.toast = text;
  state.toastTimer = time;
}

function tryJump(racer, state) {
  if (racer.airborne || racer.finished || racer.fallen || racer.jumpCooldown > 0) return false;
  const zone = SHORTCUTS.find((z) => racer.progress >= z.from && racer.progress <= z.to);
  if (!zone) {
    // A normal hop keeps forward momentum and clears obstacles.
    racer.airborne = true;
    racer.airTimer = 0;
    racer.airFrom = racer.progress;
    racer.airTo = Math.min(TRACK.length, racer.progress + Math.max(RULES.jumpBoost, racer.speed) * RULES.jumpDuration);
    racer.airLaneFrom = racer.lane;
    racer.airLaneTo = racer.lane;
    racer.jumpCooldown = 0.55;
    if (racer.isPlayer) setToast(state, '점프! 장애물을 뛰어넘어요', 0.9);
    return true;
  }
  racer.airborne = true;
  racer.airTimer = 0;
  racer.airFrom = racer.progress;
  racer.airTo = zone.land;
  racer.airLaneFrom = racer.lane;
  racer.airLaneTo = zone.landLane;
  racer.jumpCooldown = 0.8;
  if (racer.isPlayer) setToast(state, zone.label, 0.85);
  return true;
}

function updateAirborne(racer, dt, state) {
  racer.airTimer += dt;
  const u = clamp(racer.airTimer / RULES.jumpDuration, 0, 1);
  const ease = u * u * (3 - 2 * u);
  racer.progress = racer.airFrom + (racer.airTo - racer.airFrom) * ease;
  racer.lane = racer.airLaneFrom + (racer.airLaneTo - racer.airLaneFrom) * ease;
  racer.speed = RULES.jumpBoost;
  if (u >= 1) {
    racer.airborne = false;
    const edge = RULES.fallMargin;
    if (Math.abs(racer.lane) > edge) {
      racer.fallen = true;
      racer.splash = 1;
      if (racer.isPlayer) failRace(state, '수영장으로 빠졌어!');
      return;
    }
    racer.lane = clamp(racer.lane, -0.95, 0.95);
    racer.speed = RULES.baseSpeed * 1.15;
    spawnFx(state, 'land', 0, 0, 0.4);
  }
}

function steerPlayer(racer, dt, input, state) {
  let steer = 0;
  if (input.keys.has('arrowleft') || input.keys.has('a')) steer -= 1;
  if (input.keys.has('arrowright') || input.keys.has('d')) steer += 1;

  const isJumpTouch = (p) => Math.hypot(p.x - (CONFIG.width - 58), p.y - (CONFIG.height - 78)) <= 44;
  const pointer = input.pointers?.find((p) => p.down !== false && !isJumpTouch(p)) ||
    (input.pointer.down && input.pointer.inside && !isJumpTouch(input.pointer) ? input.pointer : null);
  if (pointer) {
    if (state.lastPointerX == null) state.lastPointerX = pointer.x;
    const dx = pointer.x - state.lastPointerX;
    state.lastPointerX = pointer.x;
    // 드래그로 레인 조절 + 화면 위치로 보조
    const target = clamp((pointer.x / CONFIG.width) * 2 - 1, -1, 1);
    racer.lane += (target - racer.lane) * Math.min(1, dt * 7);
    racer.lane += (dx / CONFIG.width) * 2.8;
  } else {
    state.lastPointerX = null;
    racer.lane += steer * RULES.steerSpeed * dt;
  }

  if (input.pressed.has(' ') || input.pressed.has('arrowup') || input.pressed.has('w') || state.jumpQueued) {
    tryJump(racer, state);
    state.jumpQueued = false;
  }
}

function updateAI(racer, dt, state) {
  if (racer.airborne || racer.finished || racer.fallen) return;
  const ahead = racer.progress + 40;
  let desire = slideCenter(ahead) * 0; // 레인 기준은 상대 좌표
  // 코인·부스트 쪽으로, 장애물 회피
  let best = racer.lane;
  let score = -999;
  for (let lane = -0.7; lane <= 0.7; lane += 0.35) {
    let s = -Math.abs(lane) * 0.2;
    for (const b of state.pickups.boosts) {
      if (!b.taken && Math.abs(b.t - ahead) < 50) s += (1 - Math.abs(b.lane - lane)) * 1.2;
    }
    for (const c of state.pickups.coins) {
      if (!c.taken && Math.abs(c.t - ahead) < 40) s += (1 - Math.abs(c.lane - lane)) * 0.5;
    }
    for (const o of state.pickups.obstacles) {
      if (Math.abs(o.t - ahead) < 45) s -= (1 - Math.abs(o.lane - lane)) * 2.2;
    }
    if (s > score) {
      score = s;
      best = lane;
    }
  }
  desire = best;
  racer.lane += (desire - racer.lane) * Math.min(1, dt * (2.2 * racer.skill));

  const zone = SHORTCUTS.find((z) => racer.progress >= z.from && racer.progress <= z.to);
  if (zone && Math.random() < dt * (0.55 + racer.skill * 0.5)) {
    if (Math.abs(racer.lane - zone.landLane) < 0.55 || Math.random() < 0.35) tryJump(racer, state);
  }
}

function collidePickups(racer, state) {
  if (racer.airborne || racer.fallen || racer.finished) return;
  for (const b of state.pickups.boosts) {
    if (b.taken) continue;
    if (Math.abs(b.t - racer.progress) < 14 && Math.abs(b.lane - racer.lane) < 0.28) {
      b.taken = true;
      racer.boostTimer = RULES.boostDuration;
      racer.speed = Math.min(RULES.maxSpeed, racer.speed + RULES.boostForce);
      if (racer.isPlayer) {
        setToast(state, '가속 패드!', 0.7);
        spawnFx(state, 'boost', 0, 0, 0.5);
      }
    }
  }
  for (const o of state.pickups.obstacles) {
    if (Math.abs(o.t - racer.progress) < 12 && Math.abs(o.lane - racer.lane) < 0.26) {
      o.hitBy ||= [];
      if (!o.hitBy.includes(racer.id)) {
        o.hitBy.push(racer.id);
        o.hit = true;
        racer.slowTimer = RULES.obstacleHold;
        racer.speed *= RULES.obstacleSlow;
        if (racer.isPlayer) setToast(state, '장애물! 속도 감소', 0.75);
      }
    }
  }
  if (racer.isPlayer) {
    for (const c of state.pickups.coins) {
      if (c.taken) continue;
      if (Math.abs(c.t - racer.progress) < 12 && Math.abs(c.lane - racer.lane) < 0.3) {
        c.taken = true;
        state.raceCoins += RULES.coinValue;
        spawnFx(state, 'coin', 0, 0, 0.35);
      }
    }
  }
}

function bumpRacers(state, dt) {
  const list = state.racers.filter((r) => !r.fallen && !r.finished && !r.airborne);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (Math.abs(a.progress - b.progress) > 18) continue;
      if (Math.abs(a.lane - b.lane) > 0.32) continue;
      const push = RULES.bumpForce * dt * 60 * 0.016;
      if (a.lane <= b.lane) {
        a.lane -= push;
        b.lane += push;
      } else {
        a.lane += push;
        b.lane -= push;
      }
      a.bumpFlash = 0.25;
      b.bumpFlash = 0.25;
      // 가장자리로 밀리면 추락
      for (const r of [a, b]) {
        if (Math.abs(r.lane) > RULES.fallMargin) {
          r.fallen = true;
          r.splash = 1;
          if (r.isPlayer) failRace(state, '밀려 떨어졌어!');
          else if (playerOf(state) && !playerOf(state).fallen) setToast(state, `${r.name} 아웃!`, 0.8);
        }
      }
    }
  }
}

function bankCoins(state, extra = 0) {
  const gained = state.raceCoins + extra;
  state.save.coins += gained;
  persistSave(state.save);
  return gained;
}

function failRace(state, reason) {
  if (state.result) return;
  const gained = bankCoins(state, 0);
  state.result = {
    success: false,
    message: `${reason} 모은 코인 +${gained} (보유 ${state.save.coins}) · 다시 하기 후 스킨을 골라 봐!`,
    place: null,
    coins: gained,
  };
}

function finishRace(state, player) {
  if (state.result) return;
  const place = placeOf(state, player);
  const bonus = RULES.placeBonus[place - 1] || 0;
  const gained = bankCoins(state, bonus);
  player.ceremony = 1;
  const placeText = place === 1 ? '1등 입수!' : `${place}등으로 골인!`;
  state.result = {
    success: place <= 2,
    message: `${placeText} 코인 +${gained} (보유 ${state.save.coins}) · 다시 하기 후 카운트에서 스킨을 골라 봐!`,
    place,
    coins: gained,
  };
}

function tryBuySkin(state, skinId) {
  const skin = skinById(skinId);
  if (!skin) return;
  if (state.save.unlocked.includes(skin.id)) {
    state.save.selected = skin.id;
    persistSave(state.save);
    const p = playerOf(state);
    if (p) {
      p.body = skin.body;
      p.tube = skin.tube;
    }
    setToast(state, `${skin.name} 장착!`, 0.9);
    return;
  }
  if (state.save.coins < skin.cost) {
    setToast(state, `코인이 부족해 (${skin.cost} 필요)`, 1);
    return;
  }
  state.save.coins -= skin.cost;
  state.save.unlocked.push(skin.id);
  state.save.selected = skin.id;
  persistSave(state.save);
  const p = playerOf(state);
  if (p) {
    p.body = skin.body;
    p.tube = skin.tube;
  }
  setToast(state, `${skin.name} 해금!`, 1);
}

export function handleCanvasTap(state, x, y, view) {
  // 카운트다운·로비에서 스킨 상점
  if (state.countdown > 0 || state.result) {
    const top = state.countdown > 0 ? view.height - 130 : 430;
    for (let i = 0; i < SKINS.length; i++) {
      const skin = SKINS[i];
      const bx = 28 + i * 68;
      const by = top;
      if (x >= bx && x <= bx + 58 && y >= by && y <= by + 70) {
        tryBuySkin(state, skin.id);
        return true;
      }
    }
  }
  if (state.countdown > 0 || state.result) return false;
  // 점프 버튼
  const jump = { x: view.width - 58, y: view.height - 78, r: 36 };
  if (Math.hypot(x - jump.x, y - jump.y) <= jump.r + 8) {
    state.jumpQueued = true;
    return true;
  }
  return false;
}

export { SHORTCUTS, SKINS, loadSave, persistSave, placeOf, rankList };

export function updateGame(state, dt, input) {
  if (state.result) {
    // 결과 화면에서도 스킨 탭 가능하도록 pointer pressed 처리
    if (input.pointer.pressed && input.pointer.inside) {
      handleCanvasTap(state, input.pointer.x, input.pointer.y, { width: CONFIG.width, height: CONFIG.height });
    }
    state.fx = state.fx.filter((f) => {
      f.life -= dt;
      return f.life > 0;
    });
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0) state.toast = null;
    }
    return;
  }

  if (state.countdown > 0) {
    if (input.pointer.pressed && input.pointer.inside) {
      handleCanvasTap(state, input.pointer.x, input.pointer.y, { width: CONFIG.width, height: CONFIG.height });
    }
    state.countdown -= dt;
    state.cameraProgress = playerOf(state).progress;
    return;
  }

  state.raceTime += dt;
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) state.toast = null;
  }

  if (input.pointer.pressed && input.pointer.inside) {
    handleCanvasTap(state, input.pointer.x, input.pointer.y, { width: CONFIG.width, height: CONFIG.height });
  }

  for (const racer of state.racers) {
    if (racer.fallen || racer.finished) {
      if (racer.splash > 0) racer.splash = Math.max(0, racer.splash - dt);
      if (racer.ceremony > 0) racer.ceremony = Math.min(1.5, racer.ceremony + dt);
      continue;
    }

    if (racer.jumpCooldown > 0) racer.jumpCooldown -= dt;
    if (racer.bumpFlash > 0) racer.bumpFlash -= dt;
    if (racer.boostTimer > 0) racer.boostTimer -= dt;
    if (racer.slowTimer > 0) racer.slowTimer -= dt;

    if (racer.airborne) {
      updateAirborne(racer, dt, state);
      continue;
    }

    if (racer.isPlayer) steerPlayer(racer, dt, input, state);
    else updateAI(racer, dt, state);
    if (racer.airborne) continue;

    let target = RULES.baseSpeed * (racer.isPlayer ? 1 : 0.88 + racer.skill * 0.14);
    if (racer.boostTimer > 0) target = RULES.maxSpeed;
    if (racer.slowTimer > 0) target *= 0.5;
    racer.speed += (target - racer.speed) * Math.min(1, dt * 3.2);
    racer.progress += racer.speed * dt;

    // 슬라이드 밖으로 벗어나면 추락 (공중 아닐 때)
    if (Math.abs(racer.lane) > RULES.fallMargin) {
      racer.fallen = true;
      racer.splash = 1;
      if (racer.isPlayer) failRace(state, '슬라이드 밖으로 떨어졌어!');
      continue;
    }
    racer.lane = clamp(racer.lane, -1.05, 1.05);

    collidePickups(racer, state);

    if (racer.progress >= TRACK.length) {
      racer.progress = TRACK.length;
      racer.finished = true;
      racer.finishTime = state.raceTime;
      racer.ceremony = 0.01;
      if (racer.isPlayer) finishRace(state, racer);
    }
  }

  bumpRacers(state, dt);

  const player = playerOf(state);
  if (player && !player.fallen) {
    state.cameraProgress += (player.progress - state.cameraProgress) * Math.min(1, dt * 6);
  }

  // 전원 종료(플레이어만 살아 있고 이미 결과 없음) — 플레이어 추락 외 AI만 남을 때
  if (!state.result && player && player.fallen) {
    /* result set above */
  }

  state.fx = state.fx.filter((f) => {
    f.life -= dt;
    return f.life > 0;
  });
}
