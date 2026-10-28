import assert from 'node:assert/strict';
import { createGame as watermelon, updateGame as stepFruit } from '../../public/games/수박게임/game.mjs';
import { CONFIG as fruitConfig, FRUITS } from '../../public/games/수박게임/config.mjs';
import { createGame as snakeGame, updateGame as stepSnake } from '../../public/games/Snake.io/game.mjs';
import { createGame as royal, updateGame as stepRoyal, tileVisuals } from '../../public/games/로얄매치/game.mjs';

const input = (x = 0, y = 0, pressed = false) => ({
  keys: new Set(), pressed: new Set(),
  pointer: { x, y, down: pressed, pressed, released: !pressed, inside: false },
});
const fruit = (id, type, x, y, vx = 0, vy = 0) => ({ id, type, x, y, vx, vy, age: 1, pop: 0, squash: 0 });
let randomSeed = 1503;
Math.random = () => ((randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
let failed = 0, passed = 0;
function test(name, run) {
  try { run(); console.log(`PASS ${name}`); passed++; }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}

test('watermelon does not merge matching fruits across visible air', () => {
  const state = watermelon();
  state.fruits = [fruit(1, 0, 180, 500), fruit(2, 0, 217, 500)];
  state.nextId = 3;
  stepFruit(state, .001, input());
  assert.equal(state.fruits.length, 2, 'a 1px gap is not a contact');
});

test('watermelon glancing contact does not glue tangential movement', () => {
  const state = watermelon();
  state.fruits = [fruit(1, 0, 180, 500, 0, -100), fruit(2, 1, 222.9, 500, 0, 100)];
  stepFruit(state, .001, input());
  assert.ok(state.fruits[0].vy < -80, `upward speed was erased: ${state.fruits[0].vy}`);
  assert.ok(state.fruits[1].vy > 85, `downward speed was erased: ${state.fruits[1].vy}`);
});

test('watermelon touching equals merge once and preserve downward momentum', () => {
  const state = watermelon(); state.nextId = 3;
  state.fruits = [fruit(1, 0, 180, 500, 0, 100), fruit(2, 0, 216, 500, 0, 100)];
  stepFruit(state, .001, input());
  assert.equal(state.fruits.length, 1); assert.equal(state.fruits[0].type, 1);
  assert.equal(state.score, 2); assert.ok(state.fruits[0].vy > 100, 'merging must not invent an upward kick');
  for (let n = 0; n < 60; n++) stepFruit(state, 1 / 60, input());
  assert.equal(state.score, 2);
});

test('watermelon off-center fruit rolls independently and stack settles solidly', () => {
  const state = watermelon();
  state.fruits = [fruit(1, 4, 240, 738), fruit(2, 0, 250, 738 - Math.sqrt(66 ** 2 - 10 ** 2))];
  for (let n = 0; n < 120; n++) stepFruit(state, 1 / 60, input());
  assert.ok(state.fruits[1].x > 310, 'off-center cherry should roll off the curved lemon');
  assert.ok(Math.abs(state.fruits[1].y - 768) < .1);
  const stack = watermelon();
  stack.fruits = [fruit(1, 4, 240, 738), fruit(2, 3, 240, 650), fruit(3, 2, 240, 578), fruit(4, 1, 240, 521), fruit(5, 0, 240, 478)];
  for (let n = 0; n < 600; n++) stepFruit(stack, 1 / 60, input());
  for (let i = 0; i < stack.fruits.length; i++) {
    const a = stack.fruits[i], ar = FRUITS[a.type].radius;
    assert.ok(Number.isFinite(a.x + a.y + a.vx + a.vy));
    assert.ok(a.x - ar >= fruitConfig.box.left && a.x + ar <= fruitConfig.box.right);
    assert.ok(a.y + ar <= fruitConfig.box.floor + .01);
    assert.ok(Math.hypot(a.vx, a.vy) < 2, 'settled stack should not keep bouncing');
    for (let j = i + 1; j < stack.fruits.length; j++) {
      const b = stack.fruits[j];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= ar + FRUITS[b.type].radius - .1, 'circular bodies must not interpenetrate');
    }
  }
});

function loopTrail(snake) {
  snake.x = 1100; snake.y = 1100; snake.angle = 0; snake.target = 0; snake.length = 600; snake.think = 10;
  snake.trail = [
    { x: 1100, y: 1100 }, { x: 1000, y: 1100 }, { x: 1000, y: 1000 },
    { x: 1100, y: 1000 }, { x: 1100, y: 1100 }, { x: 1200, y: 1100 },
  ];
}

for (const isPlayer of [true, false]) test(`Snake ${isPlayer ? 'player' : 'AI'} crosses its own body`, () => {
  const state = snakeGame();
  const target = state.snakes.find((snake) => snake.isPlayer === isPlayer);
  loopTrail(target);
  state.snakes = isPlayer ? [target] : [state.snakes[0], target];
  if (!isPlayer) {
    const player = state.snakes[0];
    player.x = 500; player.y = 500; player.trail = [{ x: 500, y: 500 }, { x: 500, y: 620 }];
  }
  state.foods = [];
  stepSnake(state, .001, input());
  assert.equal(target.alive, true, 'own body must not be lethal');
  assert.equal(state.result, null);
});

test('Snake still dies at walls', () => {
  const state = snakeGame();
  state.snakes = [state.snakes[0]];
  const player = state.snakes[0];
  player.x = 54; player.angle = Math.PI; player.target = Math.PI;
  player.trail = [{ x: 54, y: player.y }, { x: 174, y: player.y }];
  stepSnake(state, .001, input());
  assert.equal(player.alive, false);
});

test('Snake still dies when crossing another snake', () => {
  const state = snakeGame();
  const [player, other] = state.snakes;
  state.snakes = [player, other]; state.foods = [];
  player.angle = 0; player.target = 0;
  other.x = 1100; other.y = 1000; other.angle = -Math.PI / 2; other.target = other.angle; other.think = 10;
  other.trail = [{ x: 1100, y: 1000 }, { x: 1100, y: 1180 }]; other.length = 240;
  stepSnake(state, .001, input());
  assert.equal(player.alive, false);
});

test('Snake AI pursues food across its own future path', () => {
  const state = snakeGame(); const [player, bot] = state.snakes;
  state.snakes = [player, bot];
  player.x = 500; player.y = 500; player.trail = [{ x: 500, y: 500 }, { x: 500, y: 620 }];
  loopTrail(bot); bot.think = 0;
  bot.parts = Array.from({ length: 20 }, () => ({ x: 1182, y: 1110 }));
  state.foods = [{ x: 1300, y: 1100, r: 8, score: 1, grow: 26, kind: 'normal' }];
  stepSnake(state, .001, input());
  assert.equal(bot.target, 0, 'own body should not steer AI away from food');
});

function boardFixture() {
  return Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => ({ color: (r * 2 + c) % 6, special: null, id: `${r}-${c}` })));
}
function royalFixture() {
  const state = royal(); state.board = boardFixture();
  state.goals = [{ type: 'collect', color: 0, have: 0, need: 999 }]; state.moves = 10;
  return state;
}
function clickCell(state, r, c) {
  stepRoyal(state, .001, input(60 + c * 52, 142 + r * 52, true));
  stepRoyal(state, .001, input());
}
function validSwap(state) {
  state.board[3][0].color = 2;
  state.board[3][1].color = 0; state.board[3][2].color = 0;
  state.board[3][3].color = 1; state.board[2][3].color = 0;
  clickCell(state, 2, 3); clickCell(state, 3, 3);
}

test('Royal Match preserves visible clear, fall, refill and lock until settled', () => {
  const state = royalFixture(); validSwap(state);
  assert.equal(state.busy, true);
  const phases = new Set(), seenTiles = new Set();
  let intermediate = false;
  for (let frame = 0; frame < 800 && state.busy; frame++) {
    stepRoyal(state, 1 / 60, input());
    if (state.resolution) phases.add(state.resolution.phase);
    if (state.board.some((row) => row.some((tile) => !tile))) intermediate = true;
    for (const tile of tileVisuals(state)) if (tile.moving && !state.swapAnimation) seenTiles.add(tile.tile.id);
    if (state.resolution) {
      const moves = state.moves;
      stepRoyal(state, 0, input(60, 142, true));
      assert.equal(state.moves, moves, 'resolving board accepts no extra move');
      assert.equal(state.selected, null, 'resolving board accepts no selection');
    }
  }
  assert.equal(state.busy, false, 'finite cascades eventually unlock');
  assert.ok(intermediate, 'clear holes must be visible before refill');
  for (const phase of ['clear', 'fall', 'refill']) assert.ok(phases.has(phase), `missing visible ${phase} phase`);
  assert.ok(seenTiles.size > 0, 'fall/refill must move rendered tiles');
  assert.equal(state.moves, 9);
  assert.ok(state.board.every((row) => row.every(Boolean)));
});

test('Royal Match invalid swaps return without spending a move', () => {
  const state = royalFixture(), ids = state.board.flat().map((tile) => tile.id);
  clickCell(state, 0, 0); clickCell(state, 0, 1);
  for (let n = 0; n < 60; n++) stepRoyal(state, 1 / 60, input());
  assert.equal(state.busy, false); assert.equal(state.moves, 10);
  assert.deepEqual(state.board.flat().map((tile) => tile.id), ids);
});

test('Royal Match counts both special activations in a disco combination', () => {
  const state = royalFixture();
  state.goals = [{ type: 'clear', special: 'disco', have: 0, need: 1 }, { type: 'clear', special: 'rocket', have: 0, need: 1 }];
  state.board[3][3].special = 'disco'; state.board[3][4].special = 'rocket-h';
  clickCell(state, 3, 3); clickCell(state, 3, 4);
  for (let n = 0; n < 1200 && state.busy; n++) stepRoyal(state, 1 / 60, input());
  assert.equal(state.goals[0].have, 1); assert.equal(state.goals[1].have, 1);
  assert.equal(state.result?.success, true);
});

test('Royal Match chain-triggered disco targets are counted once per tile', () => {
  const state = royalFixture();
  state.goals = [{ type: 'clear', special: 'disco', have: 0, need: 99 }, { type: 'clear', special: 'rocket', have: 0, need: 99 }];
  state.board[3][3].special = 'disco'; state.board[3][4].special = 'rocket-h';
  clickCell(state, 3, 3); clickCell(state, 3, 4);
  while (state.swapAnimation) stepRoyal(state, 1 / 60, input());
  assert.equal(state.goals[0].have, 1);
  assert.equal(state.goals[1].have, 10, 'ten color-4 tiles become ten rockets, even when they trigger each other');
});

test('Royal Match disco conversion keeps original gem collection credit', () => {
  const state = royalFixture();
  state.goals = [{ type: 'collect', color: 4, have: 0, need: 99 }];
  state.board[3][3].special = 'disco'; state.board[3][4].special = 'rocket-h';
  clickCell(state, 3, 3); clickCell(state, 3, 4);
  while (state.swapAnimation) stepRoyal(state, 1 / 60, input());
  assert.equal(state.goals[0].have, 9, 'nine ordinary color-4 gems consumed by conversion must count');
});

test('Royal Match grants last-move victory only after resolution and awards once', () => {
  const state = royalFixture(); state.moves = 1;
  state.goals = [{ type: 'collect', color: 0, have: 0, need: 3 }];
  validSwap(state);
  let cleared = false;
  for (let n = 0; n < 1200 && state.busy; n++) {
    stepRoyal(state, 1 / 60, input());
    if (state.resolution) {
      assert.equal(state.result, null, 'victory must wait for falling/refilling gems');
      if (state.goals[0].have >= 3) cleared = true;
    }
  }
  assert.ok(cleared); assert.equal(state.result?.success, true); assert.equal(state.moves, 0);
  const stars = state.stars;
  for (let n = 0; n < 120; n++) stepRoyal(state, 1 / 60, input(60, 142, true));
  assert.equal(state.stars, stars, 'result screen must not grant a second reward');
});

for (const existing of ['propeller', 'rocket-h']) test(`Royal Match credits a new rocket caught in same-cell ${existing} blast`, () => {
  const state = royalFixture();
  state.goals = existing === 'propeller'
    ? [{ type: 'clear', special: 'propeller', have: 0, need: 1 }, { type: 'clear', special: 'rocket', have: 0, need: 1 }]
    : [{ type: 'clear', special: 'rocket', have: 0, need: 2 }];
  state.board[3][0].color = 2;
  state.board[3][1].color = 0; state.board[3][2].color = 0;
  state.board[3][3].color = 1; state.board[3][4].color = 0;
  state.board[2][3].color = 0; state.board[2][3].special = existing;
  clickCell(state, 2, 3); clickCell(state, 3, 3);
  while (state.swapAnimation) stepRoyal(state, 1 / 60, input());
  for (const goal of state.goals) assert.equal(goal.have, goal.need, 'each removed special instance must trigger and count');
});

for (const [one, two, goals] of [
  ['rocket-h', 'rocket-v', ['rocket', 'rocket']],
  ['rocket-h', 'bomb', ['rocket', 'bomb']],
  ['propeller', 'bomb', ['propeller', 'bomb']],
  ['propeller', 'rocket-v', ['propeller', 'rocket']],
  ['bomb', 'bomb', ['bomb', 'bomb']],
  ['propeller', 'propeller', ['propeller', 'propeller']],
  ['disco', 'bomb', ['disco', 'bomb']],
  ['disco', 'propeller', ['disco', 'propeller']],
  ['disco', 'disco', ['disco', 'disco']],
]) test(`Royal Match ${one} + ${two} resolves both special goals`, () => {
  const state = royalFixture();
  const counts = new Map(); for (const goal of goals) counts.set(goal, (counts.get(goal) || 0) + 1);
  state.goals = [...counts].map(([special, need]) => ({ type: 'clear', special, have: 0, need }));
  state.board[3][3].special = one; state.board[3][4].special = two;
  clickCell(state, 3, 3); clickCell(state, 3, 4);
  for (let n = 0; n < 1800 && state.busy; n++) stepRoyal(state, 1 / 60, input());
  for (const goal of state.goals) assert.equal(goal.have, goal.need);
  assert.equal(state.busy, false); assert.equal(state.result?.success, true); assert.equal(state.moves, 9);
});

function boardHasMatch(board) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const color = board[r][c]?.color;
    if (color === undefined) continue;
    if (c < 6 && board[r][c + 1]?.color === color && board[r][c + 2]?.color === color) return true;
    if (r < 6 && board[r + 1][c]?.color === color && board[r + 2][c]?.color === color) return true;
    if (r < 7 && c < 7 && board[r + 1][c]?.color === color && board[r][c + 1]?.color === color && board[r + 1][c + 1]?.color === color) return true;
  }
  return false;
}
function boardHasMove(board) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) for (const [rr, cc] of [[r + 1, c], [r, c + 1]]) {
    if (rr >= 8 || cc >= 8) continue;
    [board[r][c], board[rr][cc]] = [board[rr][cc], board[r][c]];
    const match = boardHasMatch(board);
    [board[r][c], board[rr][cc]] = [board[rr][cc], board[r][c]];
    if (match) return true;
  }
  return false;
}

test('Royal Match fresh boards have no pre-matched squares', () => {
  const oldRandom = Math.random;
  let seed = 2023558400;
  Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  try {
    for (let n = 0; n < 50; n++) {
      const state = royal();
      assert.equal(boardHasMatch(state.board), false, `fresh board ${n} has an automatic match`);
      assert.equal(boardHasMove(state.board), true, `fresh board ${n} cannot be played`);
    }
  } finally { Math.random = oldRandom; }
});

test('Royal Match recovers a board without legal moves for free', () => {
  const state = royalFixture();
  assert.equal(boardHasMove(state.board), false, 'hand-built dead-board fixture must have no legal swap');
  state.busy = true;
  state.resolution = { phase: 'refill', elapsed: 1, duration: .3, movements: [], removed: [], newborn: new Set() };
  stepRoyal(state, .001, input());
  for (let frame = 0; frame < 100 && state.busy; frame++) stepRoyal(state, 1 / 60, input());
  assert.equal(state.busy, false);
  assert.equal(state.moves, 10, 'reshuffling must not consume a move');
  assert.equal(boardHasMatch(state.board), false);
  assert.equal(boardHasMove(state.board), true, 'settled board must offer an action');
});

console.log(`${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
