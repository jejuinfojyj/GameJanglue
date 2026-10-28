import assert from 'node:assert/strict';
import { createGame as survivor, updateGame as updateSurvivor } from '../../public/games/탕탕특공대/game.mjs';
import { CONFIG } from '../../public/games/탕탕특공대/config.mjs';
import { createGame as brawl, updateGame as updateBrawl, teamGemCount } from '../../public/games/젬 브롤/game.mjs';

const originalRandom = Math.random;
function seedRandom(seed) {
  let seedValue = seed;
  Math.random = () => {
    seedValue = (Math.imul(seedValue, 1664525) + 1013904223) >>> 0;
    return seedValue / 4294967296;
  };
}
function input() { return { keys: new Set(), pressed: new Set(), pointer: { down: false, pressed: false, x: 0, y: 0 }, pointers: [] }; }
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function moveKeys(controls, x, y, dead = 8) {
  controls.keys.clear();
  if (x < -dead) controls.keys.add('a');
  if (x > dead) controls.keys.add('d');
  if (y < -dead) controls.keys.add('w');
  if (y > dead) controls.keys.add('s');
}
function runSurvivor(seed) {
  seedRandom(seed);
  const state = survivor(), controls = input();
  let levelAt90 = 1, maxEnemies = 0, evolvedAt = null;
  for (let step = 0; step < 60 * (CONFIG.duration + 20) && !state.result; step++) {
    controls.pressed.clear();
    if (state.choices) {
      const priority = ['evolve:kunai', 'kunai', 'drink', 'lightning', 'drone', 'power', 'vit', 'cooldown', 'magnet', 'saw', 'molotov', 'heal'];
      const pick = priority.find(id => state.choices.includes(id));
      controls.pressed.add(String(Math.max(0, state.choices.indexOf(pick)) + 1));
    } else {
      const p = state.player;
      const gem = [...state.gems].sort((a, b) => distance(p, a) - distance(p, b))[0];
      let x = gem ? gem.x - p.x : -p.x * 0.15;
      let y = gem ? gem.y - p.y : -p.y * 0.15;
      // A simple collector backs away only from immediate contact. It does not
      // alter HP, XP, enemy stats, spawns, cooldowns or the choice pool.
      for (const e of state.enemies) {
        const d = distance(p, e);
        if (d < 95) { x += (p.x - e.x) * (95 - d) / 12; y += (p.y - e.y) * (95 - d) / 12; }
      }
      moveKeys(controls, x, y);
    }
    updateSurvivor(state, 1 / 60, controls);
    if (state.time <= 90) levelAt90 = state.level;
    if (state.evolved.kunai && evolvedAt === null) evolvedAt = Math.round(state.time);
    maxEnemies = Math.max(maxEnemies, state.enemies.length);
  }
  return { seed, success: !!state.result?.success, seconds: Math.round(state.time), level: state.level, levelAt90, kills: state.kills, evolvedAt, maxEnemies, hp: Math.round(state.player.hp) };
}
function runBrawl(seed, pickIndex) {
  seedRandom(seed);
  const state = brawl(), controls = input();
  if (pickIndex !== undefined) state.pickIndex = pickIndex;
  state.phase = 'pick'; controls.pressed.add('enter');
  updateBrawl(state, 1 / 60, controls); controls.pressed.clear();
  let deaths = 0, wasAlive = true;
  for (let step = 0; step < 60 * 152 && !state.result; step++) {
    const p = state.units.find(u => u.id === 'player');
    if (wasAlive && !p.alive) deaths++;
    wasAlive = p.alive;
    const gem = [...state.gems].sort((a, b) => distance(p, a) - distance(p, b))[0];
    const retreat = teamGemCount(state, 'ally') >= 10 || p.hp < p.maxHp * 0.3;
    const target = retreat ? { x: 460, y: 960 } : gem || state.map.mine;
    let x = target.x - p.x, y = target.y - p.y;
    // Detour around the cover crossing the center lane, using ordinary keys.
    if (!retreat && p.y > 680 && p.y < 770 && p.x > 435 && p.x < 590) x = -180;
    if (retreat && p.y > 580 && p.y < 700 && p.x > 435 && p.x < 590) x = -180;
    moveKeys(controls, x, y, 15);
    updateBrawl(state, 1 / 60, controls);
  }
  return { seed, pickIndex: state.pickIndex, success: !!state.result?.success, deaths, seconds: Math.round(150 - state.matchTime), allyGems: teamGemCount(state, 'ally'), enemyGems: teamGemCount(state, 'enemy') };
}
try {
  const survivorRuns = [1, 7, 25, 101, 2026].map(runSurvivor);
  const brawlRuns = [1, 7, 25, 101, 2026].map(seed => runBrawl(seed));
  console.log(JSON.stringify({ survivorRuns, brawlRuns }, null, 2));
  assert.ok(survivorRuns.every(run => run.levelAt90 >= 6), 'not enough early progression');
  assert.ok(survivorRuns.filter(run => run.success).length >= 4, 'collector cannot reliably survive');
  assert.ok(survivorRuns.every(run => run.evolvedAt !== null && run.evolvedAt < 150), 'focused build cannot evolve');
  assert.ok(survivorRuns.every(run => run.maxEnemies <= 112), 'unbounded crowd growth');
  assert.ok(brawlRuns.filter(run => run.success).length >= 2, 'default collector rarely wins');
  assert.ok(brawlRuns.every(run => run.deaths <= 5), 'too many deaths in an introductory match');
  console.log('PASS: full rounds progress, evolve, finish and remain accessible across five deterministic seeds.');
} finally { Math.random = originalRandom; }
