import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as gossip, updateGame as updateGossip } from '../../public/games/가십하버/game.mjs';
import { createGame as stairs, updateGame as updateStairs } from '../../public/games/끝없는 계단/game.mjs';

const idle = () => ({ pressed: new Set(), keys: new Set(), pointer: {} });
let saved = null;
globalThis.localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };

test('energy recharges within 10 seconds without losing partial progress', () => {
  saved = null;
  const state = gossip();
  state.energy = 0; state.regenAt = 0;
  updateGossip(state, 9, idle());
  assert.equal(state.energy, 0);
  updateGossip(state, 1, idle());
  assert.equal(state.energy, 1);
  updateGossip(state, 290, idle());
  assert.equal(state.energy, 30);
  assert.equal(state.regenAt, 0);
});

test('saved game recovers energy while closed and handles malformed energy', () => {
  saved = JSON.stringify({ energy: 2, regenAt: 5, savedAt: Date.now() - 25000 });
  const recovered = gossip();
  assert.equal(recovered.energy, 5);
  saved = JSON.stringify({ energy: 'broken' });
  const fallback = gossip();
  assert.equal(fallback.energy, 30);
  assert.ok(Number.isFinite(fallback.energy));
});

test('a full board reports space problem before energy and never consumes energy', () => {
  saved = null;
  const state = gossip();
  const item = state.grid[0][1];
  state.grid = state.grid.map(row => row.map(() => ({...item})));
  state.energy = 0;
  const input = idle(); input.pressed.add('1');
  updateGossip(state, 0, input);
  assert.match(state.toast.text, /가득/);
  assert.equal(state.energy, 0);
});

test('stairs turn changes direction and climbs one stair, including its reward', () => {
  const state = stairs();
  state.steps = [{col:0}, {col:1}, {col:0, coin:true}, {col:-1}, {col:0}];
  updateStairs(state, 0, ['climb']);
  updateStairs(state, 0, ['turn']);
  assert.equal(state.facing, -1);
  assert.equal(state.stepIndex, 2);
  assert.equal(state.score, 2);
  assert.ok(state.coins > 0);
  for (const action of ['climb', 'turn']) updateStairs(state, 0, [action]);
  assert.equal(state.score, 4);
  assert.equal(state.phase, 'play');
  assert.equal(state.facing, 1);
});

test('stairs turning toward empty space causes a fall without scoring', () => {
  const state = stairs();
  state.steps = [{col:0}, {col:1}];
  updateStairs(state, 0, ['turn']);
  assert.equal(state.phase, 'falling');
  assert.equal(state.score, 0);
});

test('rail surfer rolls for as long as down is held and stands on release', async () => {
  const { createGame, updateGame } = await import('../../public/games/레일 서퍼/game.mjs');
  const state = createGame({ seed: 7 });
  state.obstacles = []; state.nextZ = state.nextPowerZ = 1e9;
  updateGame(state, 0.05, ['down'], true);
  for (let i = 0; i < 40; i++) updateGame(state, 0.05, [], true);
  assert.ok(state.rolling > 0, 'holding down must keep the player rolling');
  updateGame(state, 0.05, [], false);
  assert.equal(state.rolling, 0, 'releasing down must make the player stand');
});

test('rail surfer does not roll on landing if down was released in the air', async () => {
  const { createGame, updateGame } = await import('../../public/games/레일 서퍼/game.mjs');
  const state = createGame({ seed: 7 });
  state.obstacles = []; state.nextZ = state.nextPowerZ = 1e9;
  updateGame(state, 0.05, ['up']);
  for (let i = 0; i < 5; i++) updateGame(state, 0.05);
  updateGame(state, 0.001, ['down'], true);
  assert.equal(state.grounded, false);
  for (let i = 0; i < 20 && !state.grounded; i++) updateGame(state, 0.05, [], false);
  assert.equal(state.grounded, true);
  assert.equal(state.rolling, 0);
});
