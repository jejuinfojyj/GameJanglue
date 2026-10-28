import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame as survivor, updateGame as updateSurvivor, skillStats } from '../../public/games/344a4bafce5e/game.mjs';
import { CONFIG as SURVIVOR } from '../../public/games/344a4bafce5e/config.mjs';
import { createGame as brawl, updateGame as updateBrawl } from '../../public/games/36e2e73c26cd/game.mjs';
import { BRAWLERS } from '../../public/games/36e2e73c26cd/config.mjs';

const input = () => ({ keys: new Set(), pressed: new Set(), pointer: { x: 0, y: 0, down: false, pressed: false }, pointers: [] });
function ticks(update, state, seconds, controls = input()) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    update(state, 1 / 60, controls);
    controls.pressed.clear();
    controls.pointer.pressed = false;
  }
}
function match() {
  const state = brawl();
  state.phase = 'pick';
  const controls = input();
  controls.pressed.add('enter');
  updateBrawl(state, 1 / 60, controls);
  return state;
}
function onlyPlayer(state) {
  state.units = state.units.filter(u => u.id === 'player');
  state.gemTimer = 999;
  return state.units[0];
}

test('Survivor: starter kunai can kill a basic enemy with one early hit', () => {
  assert.ok(skillStats(survivor(), 'kunai').damage >= 18);
});
test('Survivor: a target within auto-aim range is reachable by the projectile', () => {
  const state = survivor();
  state.spawnTimer = 999;
  state.enemies.push({ kind: 'basic', x: 390, y: 0, r: 14, hp: 1, maxHp: 1, speed: 0, damage: 0, xp: 3, flash: 0 });
  ticks(updateSurvivor, state, 1.8);
  assert.equal(state.kills, 1);
});
test('Survivor: every level offers an owned weapon upgrade', () => {
  for (let i = 0; i < 25; i++) {
    const state = survivor();
    state.spawnTimer = 999;
    state.xp = state.xpToNext;
    updateSurvivor(state, 1 / 60, input());
    assert.ok(state.choices.includes('kunai'), `missing focused upgrade in ${state.choices}`);
  }
});
test('Survivor: a ready evolution is offered immediately and pauses the clock', () => {
  const state = survivor();
  state.spawnTimer = 999;
  state.skills = { kunai: 5, drink: 1 };
  state.xp = state.xpToNext;
  updateSurvivor(state, 1 / 60, input());
  assert.equal(state.choices[0], 'evolve:kunai');
  const before = state.time;
  ticks(updateSurvivor, state, 5);
  assert.equal(state.time, before);
  const controls = input(); controls.pressed.add('1');
  updateSurvivor(state, 1 / 60, controls);
  assert.equal(state.evolved.kunai, true);
});
test('Survivor: moving back to a gem after 25 seconds still grants XP', () => {
  const state = survivor();
  state.spawnTimer = 999;
  state.gems.push({ x: 500, y: 0, value: 1, life: SURVIVOR.gemLifetime || 18 });
  ticks(updateSurvivor, state, 25);
  state.player.x = 500;
  ticks(updateSurvivor, state, 0.1);
  assert.equal(state.xp, 1);
});
test('Survivor: a world edge never clamps a new enemy onto the player', () => {
  const state = survivor(), before = Math.random;
  state.player.x = -state.half + 20; state.spawnTimer = 0; state.skills = {};
  try {
    Math.random = () => 0.5;
    updateSurvivor(state, 1 / 60, input());
  } finally { Math.random = before; }
  assert.ok(state.enemies.every(e => Math.hypot(e.x - state.player.x, e.y - state.player.y) > 250));
  assert.equal(state.player.hp, state.player.maxHp);
});
test('Brawl: moving is enough to automatically attack a nearby enemy', () => {
  const state = match();
  const p = state.units[0], foe = state.units.find(u => u.team === 'enemy');
  state.units = [p, foe]; state.map.walls = []; state.map.bushes = [];
  p.x = 400; p.y = 700; foe.x = 400; foe.y = 610;
  foe.think = 999; foe._aiMove = { move: { x: 0, y: 0 }, shoot: false };
  const before = foe.hp;
  ticks(updateBrawl, state, 2);
  assert.ok(foe.hp < before, 'player never attacked');
});
test('Brawl: floating movement stick starts where the finger lands', () => {
  const state = match(), p = onlyPlayer(state);
  p.x = 460; p.y = 950;
  const controls = input(); controls.pointers = [{ id: 7, x: 250, y: 450, down: true, pointerType: 'touch' }];
  ticks(updateBrawl, state, 0.2, controls);
  assert.equal(p.x, 460); assert.equal(p.y, 950);
  controls.pointers[0].y -= 50;
  ticks(updateBrawl, state, 0.4, controls);
  assert.ok(p.y < 925, `drag did not move north: ${p.y}`);
});
test('Brawl: holding Q consumes one gadget until released and pressed again', () => {
  const state = match(), p = onlyPlayer(state), before = p.gadgetLeft;
  const controls = input(); controls.keys.add('q'); controls.pressed.add('q');
  ticks(updateBrawl, state, 1, controls);
  assert.equal(p.gadgetLeft, before - 1);
});
test('Brawl: leaving combat restores health', () => {
  const state = match(), p = onlyPlayer(state);
  p.hp = p.maxHp * 0.4;
  ticks(updateBrawl, state, 6);
  assert.ok(p.hp > p.maxHp * 0.65, `no useful recovery: ${p.hp}/${p.maxHp}`);
});
test('Brawl: player keeps pace with the selected brawler and stops on release', () => {
  const state = match(), p = onlyPlayer(state);
  state.map.walls = []; p.x = 460; p.y = 950;
  const controls = input(); controls.keys.add('w');
  ticks(updateBrawl, state, 1, controls);
  assert.ok(950 - p.y > BRAWLERS[p.brawlerIndex].speed * 0.85);
  controls.keys.clear(); const stopY = p.y;
  ticks(updateBrawl, state, 0.4, controls);
  assert.ok(stopY - p.y < 3, 'player slides after release');
});
test('Brawl: holding a touch gadget consumes one use, even after sliding away', () => {
  const state = match(), p = onlyPlayer(state), before = p.gadgetLeft;
  const controls = input();
  controls.pointers = [{ id: 9, x: 782, y: 362, down: true, pointerType: 'touch' }];
  ticks(updateBrawl, state, 0.5, controls);
  controls.pointers[0].x = 250;
  ticks(updateBrawl, state, 0.5, controls);
  assert.equal(p.gadgetLeft, before - 1);
  assert.equal(state.sticks.left.mag, 0, 'gadget finger silently became movement');
});
test('Brawl: two fingers retain movement and aim roles independently', () => {
  const state = match(), p = onlyPlayer(state);
  state.map.walls = []; p.x = 460; p.y = 950;
  const controls = input();
  controls.pointers = [
    { id: 1, x: 200, y: 450, down: true, pointerType: 'touch' },
    { id: 2, x: 800, y: 450, down: true, pointerType: 'touch' },
  ];
  ticks(updateBrawl, state, 0.1, controls);
  controls.pointers[0].y = 400;
  controls.pointers[1].x = 400;
  ticks(updateBrawl, state, 0.4, controls);
  assert.ok(p.y < 925);
  assert.equal(p.x, 460);
  assert.equal(state.aimMode, 'manual');
  assert.ok(state.playerAim.x < -0.95);
});
test('Brawl: a mouse click below the old cutoff aims instead of moving', () => {
  const state = match(), p = onlyPlayer(state);
  const controls = input();
  controls.pointer = { x: 700, y: 410, down: true, pointerType: 'mouse' };
  controls.pointers = [{ id: 5, ...controls.pointer }];
  const before = { x: p.x, y: p.y };
  ticks(updateBrawl, state, 0.3, controls);
  assert.deepEqual({ x: p.x, y: p.y }, before);
  assert.equal(state.aimMode, 'manual');
  assert.ok(state.playerAim.x > 0.7);
});
test('Brawl: automatic aim respects walls and stealth', () => {
  for (const protection of ['wall', 'stealth']) {
    const state = match();
    const p = state.units[0], foe = state.units.find(u => u.team === 'enemy');
    state.units = [p, foe]; state.map.walls = []; state.map.bushes = [];
    p.x = 400; p.y = 700; foe.x = 400; foe.y = 610;
    foe.think = 999; foe._aiMove = { move: { x: 0, y: 0 }, shoot: false };
    if (protection === 'wall') state.map.walls = [{ x: 375, y: 650, w: 50, h: 20 }];
    else foe.stealth = 10;
    ticks(updateBrawl, state, 2);
    assert.equal(state.autoTargetId, null, protection);
    assert.equal(state.bullets.length, 0, protection);
  }
});
test('Brawl: respawn protection absorbs incoming damage', () => {
  const state = match(), p = onlyPlayer(state), before = p.hp;
  p.spawnProtection = 2;
  state.bullets.push({ x: p.x, y: p.y, vx: 0, vy: 0, r: 6, damage: 1000, life: 1, team: 'enemy', ownerId: 'enemy', color: '#fff' });
  ticks(updateBrawl, state, 0.1);
  assert.equal(p.hp, before);
});
