import { RULES } from './config.mjs';

// 한 판의 상태. steps[i].col은 i번째 계단의 가로 칸, 위로 갈수록 i가 커진다.
export function createGame(options = {}) {
  const state = {
    hero: options.hero || 'sky',
    pet: options.pet || 'none',
    coinMultiplier: options.coinMultiplier || 1,
    gainBonus: options.gainBonus || 0,
    steps: [{ col: 0, coin: false }],
    genDir: 1,
    runLength: 0,
    stepIndex: 0,
    facing: 1,
    score: 0,
    coins: 0,
    stage: 0,
    time: RULES.timeMax,
    started: false,
    phase: 'play',
    failReason: '',
    fallTimer: 0,
    fallCol: 0,
    fallLevel: 0,
    view: { x: 0, y: 0 },
    petView: { x: 0, y: 0 },
    hop: 0,
    flash: 0,
    press: { left: 0, right: 0 },
    effects: [],
    events: [],
    elapsed: 0,
    result: null,
    saved: false,
  };
  fillSteps(state);
  return state;
}

function fillSteps(state) {
  while (state.steps.length < state.stepIndex + RULES.stepsAhead) addStep(state);
}

function addStep(state) {
  const count = state.steps.length, last = state.steps[count - 1];
  if (count > RULES.safeSteps) {
    state.runLength++;
    if (state.runLength >= RULES.maxStraight || Math.random() < RULES.turnChance) {
      state.genDir *= -1;
      state.runLength = 0;
    }
  }
  state.steps.push({ col: last.col + state.genDir, coin: count > RULES.safeSteps && Math.random() < RULES.coinChance });
}

export function needsTurn(state) {
  const current = state.steps[state.stepIndex], next = state.steps[state.stepIndex + 1];
  return next.col !== current.col + state.facing;
}

export function currentDrain(state) {
  return Math.min(RULES.drainMax, RULES.drainStart + state.score * RULES.drainPerStep);
}

function effect(state, item) {
  state.effects.push({ t: 0, ...item });
  if (state.effects.length > 40) state.effects.shift();
}

// Buttons and arrow keys always indicate the actual direction of the next step.
function act(state, kind) {
  if (state.phase !== 'play') return;
  if (kind !== 'left' && kind !== 'right') return;
  state.started = true;
  state.press[kind] = 1;
  state.hop = 1;
  state.facing = kind === 'left' ? -1 : 1;
  const current = state.steps[state.stepIndex], next = state.steps[state.stepIndex + 1];
  if (next.col !== current.col + state.facing) { fail(state, 'wrong'); return; }

  effect(state, { kind: 'dust', col: current.col, level: state.stepIndex, life: 0.35 });
  state.stepIndex++;
  state.score++;
  state.time = Math.min(RULES.timeMax, state.time + RULES.timeGain * (1 + state.gainBonus));
  state.events.push('step');

  if (next.coin) {
    next.coin = false;
    const gain = RULES.coinValue * state.coinMultiplier;
    state.coins += gain;
    state.events.push('coin');
    effect(state, { kind: 'text', text: '+' + gain, color: '#ffe066', col: next.col, level: state.stepIndex + 0.9, life: 0.7 });
  }
  if (state.score % RULES.stageSteps === 0) {
    state.stage++;
    state.flash = 1;
    state.time = Math.min(RULES.timeMax, state.time + RULES.stageBonusTime);
    state.events.push('stage');
  }
  fillSteps(state);
}

function fail(state, reason) {
  const current = state.steps[state.stepIndex];
  state.phase = 'falling';
  state.failReason = reason;
  state.fallTimer = 0;
  state.fallCol = reason === 'wrong' ? current.col + state.facing : current.col;
  state.fallLevel = reason === 'wrong' ? state.stepIndex + 1 : state.stepIndex;
  state.events.push(reason === 'wrong' ? 'fall' : 'timeout');
  effect(state, { kind: 'text', text: reason === 'wrong' ? '앗!' : '시간 끝!', color: '#ffffff', col: state.fallCol, level: state.fallLevel + 1.8, life: 0.9 });
}

export function updateGame(state, dt, actions = []) {
  state.elapsed += dt;
  for (const action of actions) act(state, action);

  if (state.phase === 'play' && state.started) {
    state.time -= currentDrain(state) * dt;
    if (state.time <= 0) { state.time = 0; fail(state, 'time'); }
  } else if (state.phase === 'falling') {
    state.fallTimer += dt;
    if (state.fallTimer >= RULES.fallSeconds && !state.result) {
      state.result = { success: false, reason: state.failReason, score: state.score, coins: state.coins, message: '' };
    }
  }

  if (state.phase === 'play') {
    const k = 1 - Math.exp(-dt * 24), current = state.steps[state.stepIndex];
    state.view.x += (current.col - state.view.x) * k;
    state.view.y += (state.stepIndex - state.view.y) * k;
  }
  const backIndex = Math.max(0, state.stepIndex - 1), petK = 1 - Math.exp(-dt * 12);
  state.petView.x += (state.steps[backIndex].col - state.petView.x) * petK;
  state.petView.y += (backIndex - state.petView.y) * petK;

  state.hop = Math.max(0, state.hop - dt * 8);
  state.press.left = Math.max(0, state.press.left - dt * 7);
  state.press.right = Math.max(0, state.press.right - dt * 7);
  state.flash = Math.max(0, state.flash - dt * 0.8);
  for (const item of state.effects) item.t += dt;
  state.effects = state.effects.filter(item => item.t < item.life);
}
