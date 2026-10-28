import {
  CONFIG,
  COOKIES,
  PETS,
  COMBOS,
  TREASURES,
  MODES,
  STORY_EPISODES,
} from './config.mjs';

const BEST_KEY = 'cookie-ovenbreak-best';
const STORY_KEY = 'cookie-ovenbreak-story';

function loadBest() {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    if (score > loadBest()) localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* ignore */
  }
}

function loadStoryClear() {
  try {
    return JSON.parse(localStorage.getItem(STORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveStoryClear(id) {
  try {
    const list = new Set(loadStoryClear());
    list.add(id);
    localStorage.setItem(STORY_KEY, JSON.stringify([...list]));
  } catch {
    /* ignore */
  }
}

function cookieById(id) {
  return COOKIES.find((c) => c.id === id) || COOKIES[0];
}

function petById(id) {
  return PETS.find((p) => p.id === id) || PETS[0];
}

function treasureById(id) {
  return TREASURES.find((t) => t.id === id);
}

function findCombo(cookieId, petId) {
  return COMBOS.find((c) => c.cookieId === cookieId && c.petId === petId) || null;
}

function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function rect(x, y, w, h) {
  return { x, y, w, h };
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeRivalName() {
  const a = ['바삭', '촉촉', '달콤', '고소', '폭신'];
  const b = ['토끼', '곰', '별', '용', '냥'];
  return a[Math.floor(Math.random() * a.length)] + b[Math.floor(Math.random() * b.length)];
}

function defaultLoadout() {
  return {
    cookieId: COOKIES[0].id,
    petId: PETS[0].id,
    treasureIds: [],
    packCookies: [COOKIES[0].id, COOKIES[1].id, COOKIES[2].id],
    episodeId: STORY_EPISODES[0].id,
    loadoutTab: 'cookie',
  };
}

export function createGame() {
  return {
    phase: 'hub',
    modeId: null,
    loadout: defaultLoadout(),
    best: loadBest(),
    storyCleared: loadStoryClear(),
    ui: { buttons: [], pressId: null },
    run: null,
    toast: '',
    toastLife: 0,
    result: null,
    hubScroll: 0,
  };
}

function scoreMultiplier(run) {
  const r = run.runner;
  let m = 1;
  if (r.cookie.ability === 'scoreBoost') m *= 1.5;
  if (r.combo?.effect === 'scoreStorm') m *= r.combo.mult || 1.35;
  for (const t of r.treasures) {
    if (t.effect === 'scorePct') m *= 1 + t.value;
  }
  return m;
}

function coinMultiplier(run) {
  for (const t of run.runner.treasures) {
    if (t.effect === 'coinDouble') return t.value;
  }
  return 1;
}

function magnetRange(run) {
  const r = run.runner;
  let range = r.pet.effect === 'magnet' ? r.pet.magnetRange : 0;
  for (const t of r.treasures) {
    if (t.effect === 'magnetPlus') range += t.value;
  }
  return range;
}

function speedFactor(run) {
  let s = 1;
  for (const t of run.runner.treasures) {
    if (t.effect === 'speedPct') s += t.value;
  }
  return s;
}

function buildRunnerFromCookie(cookieId, treasures, petId) {
  const cookie = cookieById(cookieId);
  const pet = petById(petId);
  const treasureObjs = treasures.map(treasureById).filter(Boolean);
  let hp = CONFIG.maxHp;
  let shield = cookie.ability === 'shield' ? 1 : 0;
  let breakCharges = 0;
  for (const t of treasureObjs) {
    if (t.effect === 'extraHp') hp += t.value;
    if (t.effect === 'breakOnHit') breakCharges += t.value;
  }
  const combo = findCombo(cookie.id, pet.id);
  if (combo?.effect === 'ironWall') {
    shield = Math.max(shield, 1);
    breakCharges += 1;
  }
  return {
    cookie,
    pet,
    treasures: treasureObjs,
    combo,
    hp,
    maxHp: hp,
    shield,
    breakCharges,
    y: CONFIG.groundY - 56,
    vy: 0,
    onGround: true,
    jumpsLeft: cookie.ability === 'extraJump' ? 2 : 1,
    maxJumps: cookie.ability === 'extraJump' ? 2 : 1,
    sliding: false,
    slideTimer: 0,
    invuln: 0,
    width: 44,
    height: 56,
  };
}

function startRun(state, input) {
  const mode = MODES.find((m) => m.id === state.modeId);
  const loadout = state.loadout;
  let cookieId = loadout.cookieId;
  let petId = loadout.petId;
  let treasures = [...loadout.treasureIds].slice(0, 3);
  let packQueue = null;
  let episode = null;
  let duration = null;
  let targetScore = null;
  let rival = null;

  if (mode.id === 'challenge') {
    cookieId = mode.fixedCookieId;
    petId = mode.fixedPetId;
    targetScore = mode.targetScore;
  } else if (mode.id === 'story') {
    episode = STORY_EPISODES.find((e) => e.id === loadout.episodeId) || STORY_EPISODES[0];
    cookieId = episode.cookieId;
    petId = episode.petId;
    duration = episode.duration;
    targetScore = episode.targetScore;
  } else if (mode.id === 'arena') {
    duration = mode.duration;
    rival = {
      name: makeRivalName(),
      score: 0,
      rate: 180 + Math.random() * 90,
    };
  } else if (mode.id === 'pack') {
    packQueue = [...loadout.packCookies].slice(0, 3);
    cookieId = packQueue.shift();
  }

  const runner = buildRunnerFromCookie(cookieId, treasures, petId);
  state.phase = 'run';
  state.run = {
    mode,
    episode,
    duration,
    targetScore,
    rival,
    packQueue,
    resources: 0,
    time: 0,
    distance: 0,
    score: 0,
    mult: 1,
    scroll: 0,
    spawnTimer: 0.4,
    jellyTimer: 0.2,
    items: [],
    fx: [],
    particles: [],
    dustTimer: 0,
    // Ignore a finger still held on the loadout's start button.
    pointerActions: new Map((input?.pointers || []).map(p => [p.id, null])),
    petTimer: runner.pet.cooldown || 0,
    cookieTimer: runner.cookie.ability === 'shield' ? runner.cookie.shieldCooldown || 12 : 0,
    runner,
    ended: false,
    message: '',
  };
  state.toast = runner.combo ? `조합 보너스! ${runner.combo.name}` : `${runner.cookie.name} 출발!`;
  state.toastLife = 2.2;
}

function spawnObstacle(run) {
  const kind = randomPick(['low', 'high', 'mid', 'gap']);
  const ground = CONFIG.groundY;
  let obs;
  if (kind === 'low') {
    obs = { type: 'obstacle', kind, x: CONFIG.width + 40, y: ground - 36, w: 42, h: 36, breakable: true };
  } else if (kind === 'high') {
    obs = { type: 'obstacle', kind, x: CONFIG.width + 40, y: ground - 120, w: 50, h: 70, breakable: false };
  } else if (kind === 'mid') {
    obs = { type: 'obstacle', kind, x: CONFIG.width + 40, y: ground - 78, w: 40, h: 50, breakable: true };
  } else {
    obs = { type: 'obstacle', kind: 'low', x: CONFIG.width + 40, y: ground - 28, w: 70, h: 28, breakable: true };
  }
  run.items.push(obs);
}

function spawnJellyRow(run) {
  const pattern = randomPick(['line', 'arc', 'coin']);
  const baseX = CONFIG.width + 30;
  const ground = CONFIG.groundY;
  if (pattern === 'coin') {
    for (let i = 0; i < 4; i++) {
      run.items.push({
        type: 'coin',
        x: baseX + i * 36,
        y: ground - 90 - (i % 2) * 20,
        w: 22,
        h: 22,
      });
    }
    return;
  }
  for (let i = 0; i < 5; i++) {
    const arc = pattern === 'arc' ? Math.sin(i / 4 * Math.PI) * 70 : 0;
    run.items.push({
      type: 'jelly',
      x: baseX + i * 34,
      y: ground - 70 - arc,
      w: 20,
      h: 20,
    });
  }
}

function addFx(run, text, x, y, color) {
  run.fx.push({ text, x, y, life: 0.8, color });
}

function jump(run) {
  const r = run.runner;
  if (r.sliding) return;
  if (r.jumpsLeft <= 0) return;
  r.vy = CONFIG.jumpVelocity;
  r.onGround = false;
  r.jumpsLeft -= 1;
  puff(run, CONFIG.runnerX, r.y + r.height, '#fff1c9', 6);
  if (r.combo?.effect === 'jumpJelly') {
    for (let i = 0; i < 3; i++) {
      run.items.push({
        type: 'jelly',
        x: CONFIG.runnerX + 40 + i * 28,
        y: r.y - 10,
        w: 18,
        h: 18,
      });
    }
  }
}

function startSlide(run) {
  const r = run.runner;
  if (!r.onGround || r.sliding) return;
  r.sliding = true;
  r.slideTimer = 0;
  r.height = 32;
  r.y = CONFIG.groundY - r.height;
}

function endSlide(run) {
  const r = run.runner;
  if (!r.sliding) return;
  r.sliding = false;
  r.slideTimer = 0;
  r.height = 56;
  if (r.onGround) r.y = CONFIG.groundY - r.height;
}

function puff(run, x, y, color, count = 5) {
  for (let i = 0; i < count; i++) {
    run.particles.push({ x, y, vx: -30 - Math.random() * 90, vy: -15 - Math.random() * 65,
      life: 0.3 + Math.random() * 0.2, color, size: 2 + Math.random() * 3 });
  }
}

function runnerInput(state, input) {
  const run = state.run;
  const actions = run.pointerActions;
  const active = input.pointers?.length ? input.pointers : input.pointer.down
    ? [{ id: 'primary', ...input.pointer }] : [];
  const ids = new Set(active.map(p => p.id));
  for (const id of actions.keys()) if (!ids.has(id)) actions.delete(id);
  let jumpPressed = [' ', 'arrowup', 'w', 'enter'].some(key => input.pressed.has(key));
  for (const p of active) {
    if (actions.has(p.id)) continue;
    const button = state.ui.buttons.find(b => pointIn(p, b));
    const action = button?.id === 'jump' ? 'jump' : button?.id === 'slide' ? 'slide'
      : p.y < CONFIG.height * 0.55 ? 'jump' : 'slide';
    actions.set(p.id, action);
    if (action === 'jump') jumpPressed = true;
  }
  // A quick tap can be pressed and released between two animation frames.
  if (!active.length && input.pointer.pressed) {
    const button = state.ui.buttons.find(b => pointIn(input.pointer, b));
    if (button?.id === 'jump' || (!button && input.pointer.y < CONFIG.height * 0.55)) jumpPressed = true;
  }
  return {
    jumpPressed,
    slideHeld: input.keys.has('arrowdown') || input.keys.has('s') || [...actions.values()].includes('slide'),
  };
}

function destroyAhead(run, range, label) {
  const r = run.runner;
  let count = 0;
  for (const item of run.items) {
    if (item.type !== 'obstacle') continue;
    if (item.x > CONFIG.runnerX - 10 && item.x < CONFIG.runnerX + range) {
      item.dead = true;
      count += 1;
      run.score += Math.round(200 * scoreMultiplier(run));
      addFx(run, label || '파괴!', item.x, item.y, CONFIG.palette.primary);
    }
  }
  return count;
}

function takeHit(run) {
  const r = run.runner;
  if (r.invuln > 0) return;
  if (r.breakCharges > 0) {
    r.breakCharges -= 1;
    destroyAhead(run, 90, '부수개!');
    r.invuln = 0.6;
    return;
  }
  if (r.shield > 0) {
    r.shield -= 1;
    r.invuln = 1;
    addFx(run, '보호막!', CONFIG.runnerX, r.y - 20, CONFIG.palette.shield);
    return;
  }
  r.hp -= 1;
  r.invuln = 1.2;
  addFx(run, '아야!', CONFIG.runnerX, r.y - 20, CONFIG.palette.danger);
  puff(run, CONFIG.runnerX, r.y + 20, CONFIG.palette.danger, 10);
  if (r.hp <= 0) {
    if (run.packQueue && run.packQueue.length > 0) {
      const nextId = run.packQueue.shift();
      const next = buildRunnerFromCookie(nextId, run.runner.treasures.map((t) => t.id), run.runner.pet.id);
      // preserve treasures as objects
      next.treasures = run.runner.treasures;
      next.combo = findCombo(next.cookie.id, next.pet.id);
      run.runner = next;
      run.petTimer = next.pet.cooldown || 0;
      run.cookieTimer = next.cookie.ability === 'shield' ? next.cookie.shieldCooldown || 12 : 0;
      addFx(run, `${next.cookie.name} 등장!`, CONFIG.runnerX, 80, CONFIG.palette.accent);
      return;
    }
    finishRun(run, false, '쿠키가 더 이상 달릴 수 없어...');
  }
}

function finishRun(run, success, message) {
  if (run.ended) return;
  run.ended = true;
  run.message = message;
  run.success = success;
}

function finalizeResult(state) {
  const run = state.run;
  if (!run || !run.ended || state.result) return;
  const score = Math.floor(run.score);
  saveBest(score);
  state.best = loadBest();

  let success = !!run.success;
  let message = run.message || `점수 ${score.toLocaleString('ko-KR')}`;

  if (run.mode.id === 'arena' && run.rival) {
    success = score >= run.rival.score;
    message = success
      ? `${run.rival.name}을(를) 이겼어! ${score.toLocaleString('ko-KR')} vs ${Math.floor(run.rival.score).toLocaleString('ko-KR')}`
      : `${run.rival.name}에게 졌어요. ${score.toLocaleString('ko-KR')} vs ${Math.floor(run.rival.score).toLocaleString('ko-KR')}`;
  } else if (run.targetScore) {
    success = score >= run.targetScore;
    message = success
      ? `목표 ${run.targetScore.toLocaleString('ko-KR')} 달성! 점수 ${score.toLocaleString('ko-KR')}`
      : `목표 ${run.targetScore.toLocaleString('ko-KR')}에 못 미쳤어. 점수 ${score.toLocaleString('ko-KR')}`;
    if (success && run.episode) {
      saveStoryClear(run.episode.id);
      state.storyCleared = loadStoryClear();
      message += ` · ${run.episode.title} 클리어!`;
    }
  } else if (run.mode.id === 'pack') {
    success = true;
    message = `떼탈출 완료! 점수 ${score.toLocaleString('ko-KR')} · 자원 ${run.resources}`;
  }

  if (run.mode.id === 'challenge' && success) {
    message += ' · 도전 보상: 달콤 별사탕!';
  }

  state.result = { success, message, score };
  state.phase = 'hub';
  state.run = null;
}

function pointIn(p, b) {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

function handleUiPress(state, input) {
  if (!input.pointer.pressed) {
    state.ui.pressId = null;
    return null;
  }
  const p = input.pointer;
  for (const b of state.ui.buttons) {
    if (pointIn(p, b)) {
      state.ui.pressId = b.id;
      return b;
    }
  }
  return null;
}

function toggleTreasure(loadout, id) {
  const i = loadout.treasureIds.indexOf(id);
  if (i >= 0) {
    loadout.treasureIds.splice(i, 1);
    return;
  }
  if (loadout.treasureIds.length >= 3) loadout.treasureIds.shift();
  loadout.treasureIds.push(id);
}

function applyHubAction(state, id) {
  if (id.startsWith('mode:')) {
    state.modeId = id.slice(5);
    const mode = MODES.find((m) => m.id === state.modeId);
    state.phase = 'loadout';
    state.loadout.loadoutTab = 'cookie';
    if (mode?.id === 'challenge') {
      state.loadout.cookieId = mode.fixedCookieId;
      state.loadout.petId = mode.fixedPetId;
    }
    return;
  }
}

function applyLoadoutAction(state, id, input) {
  const mode = MODES.find((m) => m.id === state.modeId);
  if (id === 'back') {
    state.phase = 'hub';
    state.modeId = null;
    return;
  }
  if (id === 'tab:cookie' || id === 'tab:pet' || id === 'tab:treasure' || id === 'tab:pack' || id === 'tab:story') {
    state.loadout.loadoutTab = id.slice(4);
    return;
  }
  if (id === 'go') {
    if (mode?.id === 'pack' && state.loadout.packCookies.length < 1) {
      state.loadout.packCookies = [COOKIES[0].id, COOKIES[1].id, COOKIES[2].id];
    }
    startRun(state, input);
    return;
  }
  if (id.startsWith('cookie:') && mode?.id !== 'challenge' && mode?.id !== 'story') {
    const cid = id.slice(7);
    if (mode?.id === 'pack' && state.loadout.loadoutTab === 'pack') {
      const arr = state.loadout.packCookies.filter((x) => x !== cid);
      arr.push(cid);
      state.loadout.packCookies = arr.slice(-3);
      return;
    }
    state.loadout.cookieId = cid;
    return;
  }
  if (id.startsWith('pet:') && mode?.id !== 'challenge' && mode?.id !== 'story') {
    state.loadout.petId = id.slice(4);
    return;
  }
  if (id.startsWith('treasure:')) {
    toggleTreasure(state.loadout, id.slice(9));
    return;
  }
  if (id.startsWith('episode:')) {
    state.loadout.episodeId = id.slice(8);
    return;
  }
}

function updateHub(state, input) {
  const pressed = handleUiPress(state, input);
  if (pressed) applyHubAction(state, pressed.id);
}

function updateLoadout(state, input) {
  const pressed = handleUiPress(state, input);
  if (pressed) applyLoadoutAction(state, pressed.id, input);
}

function updateRun(state, dt, input) {
  const run = state.run;
  if (!run || run.ended) {
    if (run?.ended) finalizeResult(state);
    return;
  }

  const r = run.runner;
  run.time += dt;
  const spd = CONFIG.baseSpeed * speedFactor(run) * (1 + Math.min(0.45, run.time * 0.008));
  run.scroll += spd * dt;
  run.distance += spd * dt;

  const controls = runnerInput(state, input);
  state.ui.pressId = controls.slideHeld ? 'slide' : controls.jumpPressed ? 'jump' : null;
  if (!controls.slideHeld) endSlide(run);
  if (controls.jumpPressed) jump(run);
  if (controls.slideHeld) startSlide(run);

  // physics
  r.vy += CONFIG.gravity * dt;
  r.y += r.vy * dt;
  const floor = CONFIG.groundY - r.height;
  if (r.y >= floor) {
    r.y = floor;
    r.vy = 0;
    if (!r.onGround) {
      r.onGround = true;
      r.jumpsLeft = r.maxJumps;
    }
  } else {
    r.onGround = false;
  }
  if (r.invuln > 0) r.invuln -= dt;
  // A slide held in the air begins on landing; release always restores standing.
  if (controls.slideHeld && r.onGround) startSlide(run);
  run.dustTimer -= dt;
  if (r.onGround && run.dustTimer <= 0) {
    puff(run, CONFIG.runnerX - 18, CONFIG.groundY - 4, '#f6d3a2', r.sliding ? 2 : 1);
    run.dustTimer = r.sliding ? 0.07 : 0.13;
  }

  // cookie / pet timers
  if (r.cookie.ability === 'shield') {
    run.cookieTimer -= dt;
    if (run.cookieTimer <= 0 && r.shield < 1) {
      r.shield = 1;
      run.cookieTimer = r.cookie.shieldCooldown || 12;
      addFx(run, '보호막 충전', CONFIG.runnerX, r.y - 30, CONFIG.palette.shield);
    }
  }

  if (r.pet.cooldown) {
    run.petTimer -= dt;
    if (run.petTimer <= 0) {
      run.petTimer = r.pet.cooldown;
      if (r.pet.effect === 'petShield') {
        r.shield = Math.min(2, r.shield + 1);
        addFx(run, '펫 보호막', CONFIG.runnerX + 30, r.y - 20, CONFIG.palette.shield);
      } else if (r.pet.effect === 'scorePulse') {
        const gain = Math.round((r.pet.amount || 500) * scoreMultiplier(run));
        run.score += gain;
        addFx(run, `+${gain}`, CONFIG.runnerX + 40, r.y - 40, CONFIG.palette.coin);
      } else if (r.pet.effect === 'blast') {
        const range = r.combo?.effect === 'megaBlast' ? r.pet.range * 1.4 : r.pet.range;
        if (r.combo?.effect === 'megaBlast') run.petTimer = Math.max(5, r.pet.cooldown - 2);
        destroyAhead(run, range, '폭파!');
      }
    }
  }

  // spawn
  run.spawnTimer -= dt;
  run.jellyTimer -= dt;
  if (run.spawnTimer <= 0) {
    spawnObstacle(run);
    run.spawnTimer = 1.1 + Math.random() * 0.9 - Math.min(0.4, run.time * 0.01);
  }
  if (run.jellyTimer <= 0) {
    spawnJellyRow(run);
    run.jellyTimer = 0.7 + Math.random() * 0.6;
  }

  // move items & collide
  const magnet = magnetRange(run);
  const body = {
    x: CONFIG.runnerX - r.width * 0.35,
    y: r.y + (r.sliding ? 4 : 4),
    w: r.width * 0.7,
    h: r.height - 8,
  };

  for (const item of run.items) {
    item.x -= spd * dt;
    if (item.type === 'jelly' || item.type === 'coin') {
      if (magnet > 0) {
        const cx = item.x + item.w / 2;
        const cy = item.y + item.h / 2;
        const dx = CONFIG.runnerX - cx;
        const dy = r.y + r.height * 0.4 - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < magnet) {
          item.x += (dx / (dist || 1)) * 320 * dt;
          item.y += (dy / (dist || 1)) * 320 * dt;
        }
      }
      if (hit(body, item)) {
        item.dead = true;
        puff(run, item.x + item.w / 2, item.y + item.h / 2,
          item.type === 'jelly' ? CONFIG.palette.jelly : CONFIG.palette.coin, 4);
        if (item.type === 'jelly') {
          const gain = Math.round(CONFIG.jellyScore * scoreMultiplier(run));
          run.score += gain;
          addFx(run, `+${gain}`, item.x, item.y, CONFIG.palette.jelly);
        } else {
          const gain = Math.round(CONFIG.coinScore * scoreMultiplier(run) * coinMultiplier(run));
          run.score += gain;
          run.resources += 1;
          addFx(run, `코인 +${gain}`, item.x, item.y, CONFIG.palette.coin);
        }
      }
    } else if (item.type === 'obstacle') {
      if (hit(body, item)) {
        // lemon smash: sliding into low breakable
        if (
          r.cookie.ability === 'smash' &&
          r.sliding &&
          item.breakable &&
          item.kind !== 'high'
        ) {
          item.dead = true;
          run.score += Math.round(150 * scoreMultiplier(run));
          addFx(run, '번개 파괴!', item.x, item.y, CONFIG.palette.primary);
        } else {
          item.dead = true;
          takeHit(run);
          if (run.ended) break;
        }
      }
    }
  }
  run.items = run.items.filter((it) => !it.dead && it.x > -80);

  for (const fx of run.fx) {
    fx.life -= dt;
    fx.y -= 30 * dt;
  }
  run.fx = run.fx.filter((f) => f.life > 0);
  for (const particle of run.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 180 * dt;
  }
  run.particles = run.particles.filter(p => p.life > 0).slice(-90);
  run.fx = run.fx.slice(-28);

  // rival
  if (run.rival) {
    run.rival.score += run.rival.rate * dt * (0.9 + Math.sin(run.time * 1.7) * 0.15);
  }

  // end conditions
  if (run.duration && run.time >= run.duration) {
    const ok = run.targetScore ? run.score >= run.targetScore : true;
    finishRun(run, ok, '시간 종료!');
  }
  if (run.targetScore && !run.duration && run.score >= run.targetScore) {
    finishRun(run, true, '목표 달성!');
  }

  if (run.ended) finalizeResult(state);
}

export function updateGame(state, dt, input) {
  if (state.toastLife > 0) state.toastLife -= dt;

  if (state.phase === 'hub') updateHub(state, input);
  else if (state.phase === 'loadout') updateLoadout(state, input);
  else if (state.phase === 'run') updateRun(state, dt, input);
}

export function beginButtons(state) {
  state.ui.buttons = [];
}

export function registerButton(state, id, x, y, w, h, meta = {}) {
  state.ui.buttons.push({ id, x, y, w, h, ...meta });
}

export {
  cookieById,
  petById,
  treasureById,
  findCombo,
  rect,
  STORY_EPISODES,
  MODES,
};
