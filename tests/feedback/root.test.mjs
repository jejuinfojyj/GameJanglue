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

test('stairs left control turns and right control climbs in the facing direction', () => {
  const state = stairs();
  state.steps = [{col:0},{col:1},{col:0},{col:-1},{col:0}];
  updateStairs(state, 0, ['climb']);
  assert.equal(state.score, 1);
  updateStairs(state, 0, ['turn']);
  assert.equal(state.score, 1);
  assert.equal(state.facing, -1);
  for (const action of ['climb', 'climb', 'turn', 'climb']) updateStairs(state, 0, [action]);
  assert.equal(state.score, 4);
  assert.equal(state.phase, 'play');
  assert.equal(state.facing, 1);
});

test('stairs climbing while facing away from the next step still causes a fall', () => {
  const state = stairs();
  updateStairs(state, 0, ['turn']);
  updateStairs(state, 0, ['climb']);
  assert.equal(state.phase, 'falling');
  assert.equal(state.score, 0);
});
