// 앞으로 달릴 길을 조각(패턴)으로 이어 붙인다. 모든 패턴은 피할 길을 하나 이상 남긴다.
// 레인 번호: 0 왼쪽, 1 가운데, 2 오른쪽. z는 앞으로 갈수록 커지는 거리(m).

export const TRAIN_HEIGHT = 3.2;
export const RAMP_LENGTH = 7;
export const HURDLE_HEIGHT = 1.0;
export const GATE_BOTTOM = 1.15;
export const GATE_TOP = 3.0;

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const shuffle = (rng, list) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function coinLine(state, lane, z, count, { gap = 2.4, y = 0.9 } = {}) {
  for (let i = 0; i < count; i++) state.coinItems.push({ lane, z: z + i * gap, y, taken: false });
}
function coinArc(state, lane, centerZ, base = 0.9, height = 1.5) {
  for (let i = -3; i <= 3; i++) {
    const t = i / 3.6;
    state.coinItems.push({ lane, z: centerZ + i * 1.5, y: base + height * (1 - t * t), taken: false });
  }
}
function train(state, lane, z, len, { ramp = false, speed = 0 } = {}) {
  state.obstacles.push({ kind: 'train', lane, z, len, h: TRAIN_HEIGHT, ramp: ramp ? RAMP_LENGTH : 0, speed, moving: false, color: Math.floor(state.rng() * 3), dead: false });
}
function hurdle(state, lane, z) { state.obstacles.push({ kind: 'hurdle', lane, z, len: 0.5, h: HURDLE_HEIGHT, dead: false }); }
function gate(state, lane, z) { state.obstacles.push({ kind: 'gate', lane, z, len: 0.5, h: GATE_TOP, dead: false }); }

const PATTERNS = {
  coinRun(state, z) {
    coinLine(state, Math.floor(state.rng() * 3), z, 9);
    return 22;
  },
  hurdles(state, z) {
    const lanes = shuffle(state.rng, [0, 1, 2]).slice(0, 1 + Math.floor(state.rng() * 3));
    for (const lane of lanes) hurdle(state, lane, z + 6);
    coinArc(state, lanes[0], z + 6.2);
    const open = [0, 1, 2].find(l => !lanes.includes(l));
    if (open !== undefined) coinLine(state, open, z + 1, 5);
    return 14;
  },
  gates(state, z) {
    const lanes = shuffle(state.rng, [0, 1, 2]).slice(0, 1 + Math.floor(state.rng() * 3));
    for (const lane of lanes) gate(state, lane, z + 6);
    coinLine(state, lanes[0], z + 3.6, 3, { gap: 2.4, y: 0.55 });
    return 14;
  },
  trains(state, z) {
    const count = state.distance > 150 && state.rng() < 0.55 ? 2 : 1;
    const lanes = shuffle(state.rng, [0, 1, 2]);
    let longest = 0;
    for (const lane of lanes.slice(0, count)) {
      const len = 20 + Math.floor(state.rng() * 3) * 11;
      train(state, lane, z + state.rng() * 6, len);
      longest = Math.max(longest, len + 6);
    }
    coinLine(state, lanes[2], z + 2, Math.floor(longest / 3));
    return longest;
  },
  rampTrain(state, z) {
    const lanes = shuffle(state.rng, [0, 1, 2]);
    const len = 32 + Math.floor(state.rng() * 2) * 11;
    train(state, lanes[0], z, len, { ramp: true });
    coinLine(state, lanes[0], z + RAMP_LENGTH + 2, Math.floor((len - RAMP_LENGTH - 4) / 2.6), { gap: 2.6, y: TRAIN_HEIGHT + 0.9 });
    // 다른 레인은 막혀 있을 수도 있다. 경사로가 언제나 길이 된다.
    for (const lane of lanes.slice(1)) {
      const roll = state.rng();
      if (roll < 0.45) train(state, lane, z + 4 + state.rng() * 6, 20 + Math.floor(state.rng() * 2) * 11);
      else if (roll < 0.7) hurdle(state, lane, z + 10);
      else if (roll < 0.85) gate(state, lane, z + 10);
    }
    return len + 2;
  },
  moving(state, z) {
    const lanes = shuffle(state.rng, [0, 1, 2]);
    const lead = 42;
    train(state, lanes[0], z + lead, 22, { speed: 9 + state.rng() * 4 });
    const other = state.rng() < 0.5 ? hurdle : gate;
    other(state, lanes[1], z + 14);
    coinLine(state, lanes[2], z + 6, 8);
    return lead + 24;
  },
  mixed(state, z) {
    const [a, b, c] = shuffle(state.rng, [0, 1, 2]);
    hurdle(state, a, z + 6);
    gate(state, b, z + 14);
    train(state, c, z + 2, 20);
    coinArc(state, a, z + 6.2);
    coinLine(state, b, z + 11.5, 3, { y: 0.55 });
    return 24;
  },
};

function weights(distance) {
  return {
    coinRun: 2,
    hurdles: 2,
    gates: distance > 60 ? 2 : 1,
    trains: 2.5,
    rampTrain: distance > 100 ? 2 : 0.6,
    moving: distance > 250 ? 1.6 : 0,
    mixed: distance > 200 ? 2 : 0,
  };
}

function choosePattern(state) {
  const table = Object.entries(weights(state.distance)).filter(([, w]) => w > 0);
  let roll = state.rng() * table.reduce((sum, [, w]) => sum + w, 0);
  for (const [name, w] of table) { roll -= w; if (roll <= 0) return name; }
  return table[0][0];
}

const POWER_KINDS = ['magnet', 'sneakers', 'jetpack', 'double', 'board'];

function placePowerup(state, z) {
  const lane = Math.floor(state.rng() * 3);
  const kind = pick(state.rng, POWER_KINDS);
  coinLine(state, lane, z, 3);
  state.pickups.push({ kind, lane, z: z + 8, y: 1.1, taken: false });
  return 14;
}

/** 플레이어 앞 viewAhead 미터까지 길을 미리 만든다. */
export function fillTrack(state, viewAhead = 170) {
  while (state.nextZ < state.z + viewAhead) {
    const gap = 8 + state.speed * 0.45;
    let used;
    if (state.nextZ >= state.nextPowerZ) {
      used = placePowerup(state, state.nextZ);
      state.nextPowerZ = state.nextZ + 220 + state.rng() * 160;
    } else {
      used = PATTERNS[choosePattern(state)](state, state.nextZ);
    }
    state.nextZ += used + gap;
  }
}

/** 제트팩으로 나는 동안 하늘에 코인 길을 깐다. */
export function skyCoins(state, fromZ, length, y) {
  let lane = 1;
  for (let z = fromZ; z < fromZ + length; z += 2.6) {
    if (state.rng() < 0.12) lane = Math.max(0, Math.min(2, lane + (state.rng() < 0.5 ? -1 : 1)));
    state.coinItems.push({ lane, z, y, taken: false, sky: true });
  }
}
