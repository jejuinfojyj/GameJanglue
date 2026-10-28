import assert from 'node:assert/strict';
import { createGame as fruitGame, updateGame as fruitStep } from '../../public/games/88140a952e84/game.mjs';
import { CONFIG as fruitConfig, FRUITS } from '../../public/games/88140a952e84/config.mjs';
import { createGame as royalGame, updateGame as royalStep, tileVisuals } from '../../public/games/5b230b06de8e/game.mjs';

let seed = 27451;
Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const idle = () => ({ keys: new Set(), pressed: new Set(), pointer: { x: 0, y: 0, down: false, pressed: false, released: false, inside: false } });
let fruit = fruitGame(), rounds = 1, drops = 0, maxFruitCount = 0;
for (let frame = 0; frame < 12000; frame++) {
  const input = idle();
  if (frame % 28 === 0) {
    input.pointer = { x: 70 + Math.random() * 340, y: 250, inside: true, pressed: true, down: true };
    drops++;
  }
  fruitStep(fruit, 1 / 60, input);
  maxFruitCount = Math.max(maxFruitCount, fruit.fruits.length);
  for (const body of fruit.fruits) {
    const radius = FRUITS[body.type].radius;
    assert.ok(Number.isFinite(body.x + body.y + body.vx + body.vy));
    assert.ok(body.x - radius >= fruitConfig.box.left - .001 && body.x + radius <= fruitConfig.box.right + .001);
    assert.ok(body.y + radius <= fruitConfig.box.floor + .001);
  }
  if (fruit.result) { fruit = fruitGame(); rounds++; }
}

function matched(board) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const color = board[r][c].color;
    if (c < 6 && board[r][c + 1].color === color && board[r][c + 2].color === color) return true;
    if (r < 6 && board[r + 1][c].color === color && board[r + 2][c].color === color) return true;
    if (r < 7 && c < 7 && board[r + 1][c].color === color && board[r][c + 1].color === color && board[r + 1][c + 1].color === color) return true;
  }
  return false;
}
function nextAction(board) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c].special) return [{ r, c }, { r, c }];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) for (const [rr, cc] of [[r + 1, c], [r, c + 1]]) {
    if (rr >= 8 || cc >= 8) continue;
    [board[r][c], board[rr][cc]] = [board[rr][cc], board[r][c]];
    const match = matched(board);
    [board[r][c], board[rr][cc]] = [board[rr][cc], board[r][c]];
    if (match) return [{ r, c }, { r: rr, c: cc }];
  }
  return null;
}
function click(state, { r, c }) {
  const input = idle();
  input.pointer = { x: 60 + c * 52, y: 142 + r * 52, pressed: true, down: true, inside: true };
  royalStep(state, 1 / 60, input);
  royalStep(state, 1 / 60, idle());
}
let royal = royalGame(), royalRounds = 1, maxResolveFrames = 0, wins = 0;
const phases = new Set();
for (let turn = 0; turn < 250; turn++) {
  const action = nextAction(royal.board);
  assert.ok(action, 'settled board must have a move');
  const moves = royal.moves;
  click(royal, action[0]); click(royal, action[1]);
  let frames = 0;
  while (royal.busy && frames < 5000) {
    royalStep(royal, 1 / 60, idle());
    if (royal.resolution) phases.add(royal.resolution.phase);
    for (const visual of tileVisuals(royal)) assert.ok(Number.isFinite(visual.r + visual.c));
    frames++;
  }
  maxResolveFrames = Math.max(maxResolveFrames, frames);
  assert.equal(royal.busy, false, 'resolution should terminate');
  assert.equal(royal.moves, moves - 1, 'one action consumes one move, including specials');
  assert.ok(royal.board.flat().every(Boolean));
  if (royal.result) { wins += Number(royal.result.success); royal = royalGame(); royalRounds++; }
}
console.log(JSON.stringify({ fruit: { simulatedSeconds: 200, rounds, drops, maxFruitCount }, royal: { actions: 250, rounds: royalRounds, wins, maxResolveFrames, phases: [...phases] } }, null, 2));
