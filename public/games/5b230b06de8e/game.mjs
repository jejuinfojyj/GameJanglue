import {
  CONFIG,
  LEVELS,
  DECORATIONS,
  boardPixelSize,
  boardOrigin,
} from './config.mjs';

const SPECIALS = ['rocket-h', 'rocket-v', 'bomb', 'propeller', 'disco'];

function cloneGoals(goals) {
  return goals.map((g) => ({ ...g, have: 0 }));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return { levelIndex: 0, stars: 0, owned: [] };
    const data = JSON.parse(raw);
    return {
      levelIndex: Math.max(0, Math.min(LEVELS.length - 1, Number(data.levelIndex) || 0)),
      stars: Math.max(0, Math.floor(Number(data.stars) || 0)),
      owned: Array.isArray(data.owned) ? data.owned.filter((id) => DECORATIONS.some((d) => d.id === id)) : [],
    };
  } catch {
    return { levelIndex: 0, stars: 0, owned: [] };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify({
      levelIndex: progress.levelIndex,
      stars: progress.stars,
      owned: progress.owned,
    }));
  } catch {
    /* ignore */
  }
}

function randomColor() {
  return Math.floor(Math.random() * CONFIG.colorCount);
}

function makeTile(color, special = null) {
  return { color, special, id: Math.random().toString(36).slice(2, 9) };
}

function emptyBoard() {
  return Array.from({ length: CONFIG.gridSize }, () => Array(CONFIG.gridSize).fill(null));
}

function inBounds(r, c) {
  return r >= 0 && c >= 0 && r < CONFIG.gridSize && c < CONFIG.gridSize;
}

function colorsMatch(a, b) {
  if (!a || !b) return false;
  if (a.special === 'disco' || b.special === 'disco') return false;
  return a.color === b.color;
}

function findLineMatches(board) {
  const marked = new Set();
  const groups = [];

  for (let r = 0; r < CONFIG.gridSize; r++) {
    let run = 1;
    for (let c = 1; c <= CONFIG.gridSize; c++) {
      const same = c < CONFIG.gridSize && colorsMatch(board[r][c], board[r][c - 1]);
      if (same) {
        run += 1;
      } else {
        if (run >= 3) {
          const cells = [];
          for (let k = 0; k < run; k++) {
            const cc = c - 1 - k;
            cells.push([r, cc]);
            marked.add(`${r},${cc}`);
          }
          groups.push({ cells, dir: 'h', len: run, color: board[r][c - 1].color });
        }
        run = 1;
      }
    }
  }

  for (let c = 0; c < CONFIG.gridSize; c++) {
    let run = 1;
    for (let r = 1; r <= CONFIG.gridSize; r++) {
      const same = r < CONFIG.gridSize && colorsMatch(board[r][c], board[r - 1][c]);
      if (same) {
        run += 1;
      } else {
        if (run >= 3) {
          const cells = [];
          for (let k = 0; k < run; k++) {
            const rr = r - 1 - k;
            cells.push([rr, c]);
            marked.add(`${rr},${c}`);
          }
          groups.push({ cells, dir: 'v', len: run, color: board[r - 1][c].color });
        }
        run = 1;
      }
    }
  }

  return { marked, groups };
}

function findSquares(board) {
  const squares = [];
  for (let r = 0; r < CONFIG.gridSize - 1; r++) {
    for (let c = 0; c < CONFIG.gridSize - 1; c++) {
      const a = board[r][c];
      const b = board[r][c + 1];
      const d = board[r + 1][c];
      const e = board[r + 1][c + 1];
      if (a && b && d && e && colorsMatch(a, b) && colorsMatch(a, d) && colorsMatch(a, e) && !a.special) {
        squares.push({
          cells: [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]],
          color: a.color,
        });
      }
    }
  }
  return squares;
}

function hasAnyMatch(board) {
  const { marked } = findLineMatches(board);
  if (marked.size) return true;
  return findSquares(board).length > 0;
}

function fillBoardNoMatch(board) {
  for (let r = 0; r < CONFIG.gridSize; r++) {
    for (let c = 0; c < CONFIG.gridSize; c++) {
      const candidates = [];
      for (let color = 0; color < CONFIG.colorCount; color++) {
        board[r][c] = { color };
        if (!hasImmediateMatchAt(board, r, c)) candidates.push(color);
      }
      board[r][c] = makeTile(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }
}

function hasImmediateMatchAt(board, r, c) {
  const tile = board[r][c];
  if (!tile) return false;
  if (c >= 2 && colorsMatch(tile, board[r][c - 1]) && colorsMatch(tile, board[r][c - 2])) return true;
  if (r >= 2 && colorsMatch(tile, board[r - 1][c]) && colorsMatch(tile, board[r - 2][c])) return true;
  if (r >= 1 && c >= 1) {
    const a = board[r][c];
    const b = board[r][c - 1];
    const d = board[r - 1][c];
    const e = board[r - 1][c - 1];
    if (a && b && d && e && colorsMatch(a, b) && colorsMatch(a, d) && colorsMatch(a, e)) return true;
  }
  return false;
}

function adjacent(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

function swapTiles(board, a, b) {
  const tmp = board[a.r][a.c];
  board[a.r][a.c] = board[b.r][b.c];
  board[b.r][b.c] = tmp;
}

function hasAvailableMove(board) {
  if (board.some((row) => row.some((tile) => tile?.special))) return true;
  for (let r = 0; r < CONFIG.gridSize; r++) for (let c = 0; c < CONFIG.gridSize; c++) {
    for (const to of [{ r: r + 1, c }, { r, c: c + 1 }]) {
      if (!inBounds(to.r, to.c)) continue;
      const from = { r, c };
      swapTiles(board, from, to);
      const matched = hasAnyMatch(board);
      swapTiles(board, from, to);
      if (matched) return true;
    }
  }
  return false;
}

function reshuffleBoard(state) {
  const tiles = state.board.flat();
  for (let attempt = 0; attempt < 80; attempt++) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    state.board = Array.from({ length: CONFIG.gridSize }, (_, r) => tiles.slice(r * CONFIG.gridSize, (r + 1) * CONFIG.gridSize));
    if (!hasAnyMatch(state.board) && hasAvailableMove(state.board)) return;
  }
  // A pathological color distribution may have no match-free permutation.
  // Rebuild and install one local, guaranteed move without pre-clearing gems.
  fillBoardNoMatch(state.board);
  const safe = [
    [0, 1, 0],
    [2, 0, 3],
    [4, 2, 4],
    [5, 3, 5],
  ];
  for (let r = 0; r < safe.length; r++) for (let c = 0; c < safe[r].length; c++) {
    state.board[r][c] = makeTile(safe[r][c]);
  }
  // Fill to the right and below the guaranteed move so its boundary also stays
  // match-free. The three fixed columns contain no match or 2×2 themselves.
  for (let r = 0; r < CONFIG.gridSize; r++) for (let c = 0; c < CONFIG.gridSize; c++) {
    if (r < safe.length && c < safe[r].length) continue;
    const candidates = [];
    for (let color = 0; color < CONFIG.colorCount; color++) {
      state.board[r][c] = { color };
      if (!hasImmediateMatchAt(state.board, r, c)) candidates.push(color);
    }
    state.board[r][c] = makeTile(candidates[Math.floor(Math.random() * candidates.length)]);
  }
}

function cellFromPointer(x, y) {
  const origin = boardOrigin();
  const step = CONFIG.cell + CONFIG.boardGap;
  const size = boardPixelSize();
  if (x < origin.x || y < origin.y || x >= origin.x + size || y >= origin.y + size) return null;
  const c = Math.floor((x - origin.x) / step);
  const r = Math.floor((y - origin.y) / step);
  if (!inBounds(r, c)) return null;
  return { r, c };
}

function hitButton(x, y, rect) {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h;
}

function uiRects() {
  return {
    kingdom: { x: 28, y: 640, w: 200, h: 48 },
    puzzle: { x: 252, y: 640, w: 200, h: 48 },
  };
}

function decorationHitAreas() {
  const items = [];
  const startY = 210;
  DECORATIONS.forEach((dec, i) => {
    items.push({
      id: dec.id,
      x: 40,
      y: startY + i * 62,
      w: 400,
      h: 54,
    });
  });
  return items;
}

function pickSpecialFromGroups(groups, squares, focus) {
  let best = null;
  const consider = (type, score, cells, color, dir) => {
    if (!best || score > best.score) {
      best = { type, score, cells, color, dir };
    }
  };

  for (const g of groups) {
    if (g.len >= 5) consider('disco', 50 + g.len, g.cells, g.color, g.dir);
    else if (g.len === 4) consider(g.dir === 'h' ? 'rocket-h' : 'rocket-v', 30, g.cells, g.color, g.dir);
  }

  const cellKey = new Set();
  for (const g of groups) for (const [r, c] of g.cells) cellKey.add(`${r},${c}`);
  const overlap = new Map();
  for (const g of groups) {
    for (const [r, c] of g.cells) {
      const key = `${r},${c}`;
      overlap.set(key, (overlap.get(key) || 0) + 1);
    }
  }
  const junction = [...overlap.entries()].some(([, n]) => n >= 2);
  if (junction) {
    const all = [];
    for (const g of groups) all.push(...g.cells);
    consider('bomb', 40, all, groups[0]?.color ?? 0, 'both');
  }

  for (const sq of squares) {
    consider('propeller', 35, sq.cells, sq.color, 'sq');
  }

  if (!best) return null;

  let place = focus;
  if (!place || !best.cells.some(([r, c]) => r === place.r && c === place.c)) {
    place = { r: best.cells[0][0], c: best.cells[0][1] };
  }
  return { ...best, place };
}

function collectColorProgress(state, color, amount) {
  for (const goal of state.goals) {
    if (goal.type === 'collect' && goal.color === color) {
      goal.have = Math.min(goal.need, goal.have + amount);
    }
  }
}

function collectSpecialProgress(state, special) {
  const base = special?.startsWith('rocket') ? 'rocket' : special;
  for (const goal of state.goals) {
    if (goal.type === 'clear' && goal.special === base) {
      goal.have = Math.min(goal.need, goal.have + 1);
    }
  }
}

function goalsDone(state) {
  return state.goals.every((g) => g.have >= g.need);
}

function starReward(movesLeft) {
  if (movesLeft >= 10) return 3;
  if (movesLeft >= 5) return 2;
  return 1;
}

function pushFx(state, kind, payload) {
  state.fx.push({ kind, life: payload.life ?? 0.35, ...payload });
}

function clearCells(state, cells, opts = {}) {
  const board = state.board;
  const removedSpecials = [];
  const unique = new Map();
  for (const [r, c] of cells) {
    if (!inBounds(r, c)) continue;
    unique.set(`${r},${c}`, [r, c]);
  }
  for (const [r, c] of unique.values()) {
    const tile = board[r][c];
    if (!tile) continue;
    if (tile.special && !opts.ignoreSpecialTrigger) removedSpecials.push({ r, c, id: tile.id, special: tile.special, color: tile.color });
    if (!tile.special) collectColorProgress(state, tile.color, 1);
    pushFx(state, 'pop', { r, c, color: tile.color, special: tile.special, life: 0.28 });
    board[r][c] = null;
  }
  return removedSpecials;
}

function activateSpecial(state, r, c, special, color, chain = new Set(), sourceId = state.board[r][c]?.id) {
  // Coordinates can already contain a newly created special by the time an old
  // matched special fires. Track instances so neither one silently eats the other.
  const key = sourceId ?? `${r},${c}:${special}`;
  if (chain.has(key)) return;
  chain.add(key);
  collectSpecialProgress(state, special);
  pushFx(state, 'blast', { r, c, special, life: 0.4 });

  const cells = [];
  if (special === 'rocket-h') {
    for (let cc = 0; cc < CONFIG.gridSize; cc++) cells.push([r, cc]);
  } else if (special === 'rocket-v') {
    for (let rr = 0; rr < CONFIG.gridSize; rr++) cells.push([rr, c]);
  } else if (special === 'bomb') {
    for (let rr = r - 1; rr <= r + 1; rr++) {
      for (let cc = c - 1; cc <= c + 1; cc++) cells.push([rr, cc]);
    }
  } else if (special === 'propeller') {
    let target = findPropellerTarget(state);
    if (!target) target = { r, c };
    cells.push([r, c], [target.r, target.c]);
    for (let rr = target.r - 1; rr <= target.r + 1; rr++) {
      for (let cc = target.c - 1; cc <= target.c + 1; cc++) cells.push([rr, cc]);
    }
    pushFx(state, 'fly', { fromR: r, fromC: c, toR: target.r, toC: target.c, life: 0.45 });
  } else if (special === 'disco') {
    const targetColor = color ?? randomColor();
    for (let rr = 0; rr < CONFIG.gridSize; rr++) {
      for (let cc = 0; cc < CONFIG.gridSize; cc++) {
        const t = state.board[rr][cc];
        if (t && t.color === targetColor) cells.push([rr, cc]);
      }
    }
    cells.push([r, c]);
  }

  if (state.board[r][c]?.id === sourceId) state.board[r][c] = null;
  const cascaded = clearCells(state, cells, { ignoreSpecialTrigger: false });
  for (const extra of cascaded) {
    activateSpecial(state, extra.r, extra.c, extra.special, extra.color, chain, extra.id);
  }
}

function findPropellerTarget(state) {
  for (const goal of state.goals) {
    if (goal.type === 'collect' && goal.have < goal.need) {
      const candidates = [];
      for (let r = 0; r < CONFIG.gridSize; r++) {
        for (let c = 0; c < CONFIG.gridSize; c++) {
          const t = state.board[r][c];
          if (t && !t.special && t.color === goal.color) candidates.push({ r, c });
        }
      }
      if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  const filled = [];
  for (let r = 0; r < CONFIG.gridSize; r++) {
    for (let c = 0; c < CONFIG.gridSize; c++) {
      if (state.board[r][c]) filled.push({ r, c });
    }
  }
  return filled.length ? filled[Math.floor(Math.random() * filled.length)] : null;
}

function resolveMatches(state, focus) {
  const board = state.board;
  const { marked, groups } = findLineMatches(board);
  const squares = findSquares(board);
  for (const sq of squares) {
    for (const [r, c] of sq.cells) marked.add(`${r},${c}`);
  }
  if (!marked.size) return false;

  const specialPlan = pickSpecialFromGroups(groups, squares, focus);
  const cells = [...marked].map((key) => key.split(',').map(Number));

  const specialsHere = [];
  for (const [r, c] of cells) {
    const t = board[r][c];
    if (t?.special) specialsHere.push({ r, c, id: t.id, special: t.special, color: t.color });
  }

  clearCells(state, cells, { ignoreSpecialTrigger: true });

  if (specialPlan) {
    const { place, type, color } = specialPlan;
    board[place.r][place.c] = makeTile(color, type);
    pushFx(state, 'spawn', { r: place.r, c: place.c, special: type, life: 0.4 });
  }

  const chain = new Set();
  for (const s of specialsHere) {
    activateSpecial(state, s.r, s.c, s.special, s.color, chain, s.id);
  }

  return true;
}

function applyGravity(state) {
  const board = state.board;
  const movements = [];
  for (let c = 0; c < CONFIG.gridSize; c++) {
    let write = CONFIG.gridSize - 1;
    for (let r = CONFIG.gridSize - 1; r >= 0; r--) {
      if (board[r][c]) {
        if (write !== r) {
          board[write][c] = board[r][c];
          board[r][c] = null;
          movements.push({ id: board[write][c].id, fromR: r, toR: write, c });
        }
        write -= 1;
      }
    }
  }
  return movements;
}

function refillBoard(state) {
  const movements = [];
  for (let c = 0; c < CONFIG.gridSize; c++) {
    let holes = 0;
    while (holes < CONFIG.gridSize && !state.board[holes][c]) holes++;
    for (let r = 0; r < holes; r++) {
      const tile = makeTile(randomColor());
      state.board[r][c] = tile;
      movements.push({ id: tile.id, fromR: r - holes, toR: r, c });
    }
  }
  return movements;
}

function beginClear(state, action) {
  const before = [];
  for (let r = 0; r < CONFIG.gridSize; r++) for (let c = 0; c < CONFIG.gridSize; c++) {
    if (state.board[r][c]) before.push({ r, c, tile: state.board[r][c] });
  }
  if (action() === false) return false;
  const removed = before.filter(({ r, c, tile }) => state.board[r][c]?.id !== tile.id);
  const newborn = new Set();
  const oldIds = new Set(before.map(({ tile }) => tile.id));
  for (const row of state.board) for (const tile of row) if (tile && !oldIds.has(tile.id)) newborn.add(tile.id);
  state.busy = true;
  state.selected = null;
  state.drag = null;
  state.resolution = {
    phase: 'clear', elapsed: 0, duration: state.fx.some((fx) => fx.kind === 'fly') ? 0.46 : 0.3,
    removed, newborn, movements: [],
  };
  return true;
}

function updateResolution(state, dt) {
  const resolution = state.resolution;
  resolution.elapsed += dt;
  if (resolution.elapsed < resolution.duration) return;
  if (resolution.phase === 'clear') {
    resolution.phase = 'fall';
    resolution.movements = applyGravity(state);
    resolution.removed = [];
    resolution.newborn = new Set();
    const distance = Math.max(1, ...resolution.movements.map((move) => move.toR - move.fromR));
    resolution.duration = 0.18 + Math.sqrt(distance) * 0.085;
    resolution.elapsed = 0;
  } else if (resolution.phase === 'fall') {
    resolution.phase = 'refill';
    resolution.movements = refillBoard(state);
    resolution.duration = 0.32;
    resolution.elapsed = 0;
  } else if (resolution.phase === 'shuffle') {
    state.resolution = null;
    state.busy = false;
    state.hintTimer = 0;
  } else {
    state.resolution = null;
    if (!beginClear(state, () => resolveMatches(state, null))) finishMove(state);
  }
}

function comboActivate(state, a, b) {
  const ta = state.board[a.r][a.c];
  const tb = state.board[b.r][b.c];
  if (!ta?.special || !tb?.special) return false;

  const sa = ta.special;
  const sb = tb.special;
  state.board[a.r][a.c] = null;
  state.board[b.r][b.c] = null;

  const cells = new Set();
  const add = (r, c) => cells.add(`${r},${c}`);

  const rocketPair = (sa.startsWith('rocket') || sb.startsWith('rocket'));
  const bombPair = sa === 'bomb' || sb === 'bomb';
  const discoPair = sa === 'disco' || sb === 'disco';
  const chain = new Set();
  pushFx(state, 'blast', { ...a, special: sa, life: 0.4 });
  pushFx(state, 'blast', { ...b, special: sb, life: 0.4 });

  if (sa === 'disco' && sb === 'disco') {
    for (let r = 0; r < CONFIG.gridSize; r++) for (let c = 0; c < CONFIG.gridSize; c++) add(r, c);
    collectSpecialProgress(state, sa);
    collectSpecialProgress(state, sb);
  } else if (discoPair) {
    const color = sa === 'disco' ? tb.color : ta.color;
    const special = sa === 'disco' ? sb : sa;
    const other = sa === 'disco' ? b : a;
    const targets = [{ r: other.r, c: other.c, id: sa === 'disco' ? tb.id : ta.id }];
    for (let r = 0; r < CONFIG.gridSize; r++) {
      for (let c = 0; c < CONFIG.gridSize; c++) {
        const t = state.board[r][c];
        if (t && !t.special && t.color === color) {
          collectColorProgress(state, t.color, 1);
          t.special = special;
          targets.push({ r, c, id: t.id });
        }
      }
    }
    collectSpecialProgress(state, 'disco');
    for (const target of targets) activateSpecial(state, target.r, target.c, special, color, chain, target.id);
    return true;
  } else if (rocketPair && bombPair) {
    for (let r = 0; r < CONFIG.gridSize; r++) add(r, a.c);
    for (let c = 0; c < CONFIG.gridSize; c++) add(a.r, c);
    for (let r = a.r - 1; r <= a.r + 1; r++) {
      for (let c = 0; c < CONFIG.gridSize; c++) add(r, c);
    }
    for (let c = a.c - 1; c <= a.c + 1; c++) {
      for (let r = 0; r < CONFIG.gridSize; r++) add(r, c);
    }
    collectSpecialProgress(state, 'rocket');
    collectSpecialProgress(state, 'bomb');
  } else if (sa.startsWith('rocket') && sb.startsWith('rocket')) {
    for (let r = 0; r < CONFIG.gridSize; r++) add(r, a.c);
    for (let c = 0; c < CONFIG.gridSize; c++) add(a.r, c);
    collectSpecialProgress(state, 'rocket');
    collectSpecialProgress(state, 'rocket');
  } else {
    activateSpecial(state, a.r, a.c, sa, ta.color, chain, ta.id);
    activateSpecial(state, b.r, b.c, sb, tb.color, chain, tb.id);
    return true;
  }

  const list = [...cells].map((k) => k.split(',').map(Number));
  const extras = clearCells(state, list);
  for (const extra of extras) activateSpecial(state, extra.r, extra.c, extra.special, extra.color, chain, extra.id);
  return true;
}

function trySwap(state, from, to) {
  if (!from || !to || !adjacent(from, to) || state.busy) return false;
  const board = state.board;
  const a = board[from.r][from.c];
  const b = board[to.r][to.c];
  if (!a || !b) return false;

  state.busy = true;
  state.selected = null;
  state.drag = null;
  // Probe the move without changing the board the renderer is still showing.
  swapTiles(board, from, to);
  const { marked } = findLineMatches(board);
  const squares = findSquares(board);
  const valid = !!((a.special && b.special) || a.special === 'disco' || b.special === 'disco' || marked.size || squares.length);
  swapTiles(board, from, to);
  state.swapAnimation = { from: { ...from }, to: { ...to }, valid, phase: 'forward', elapsed: 0, duration: 0.19 };
  return valid;
}

function resolveSwap(state, from, to) {
  swapTiles(state.board, from, to);
  const a = state.board[from.r][from.c];
  const b = state.board[to.r][to.c];
  state.moves -= 1;
  if (a.special && b.special) {
    beginClear(state, () => comboActivate(state, from, to));
  } else if (a.special === 'disco' || b.special === 'disco') {
    const discoPos = a.special === 'disco' ? from : to;
    const other = a.special === 'disco' ? b : a;
    beginClear(state, () => activateSpecial(state, discoPos.r, discoPos.c, 'disco', other.color));
  } else {
    if (!beginClear(state, () => resolveMatches(state, to))) finishMove(state);
  }
}

function updateSwapAnimation(state, dt) {
  const animation = state.swapAnimation;
  if (!animation) return;
  animation.elapsed += dt;
  if (animation.elapsed < animation.duration) return;
  if (animation.phase === 'forward' && !animation.valid) {
    animation.phase = 'return';
    animation.elapsed = 0;
    animation.duration = 0.18;
    return;
  }
  state.swapAnimation = null;
  if (animation.valid) resolveSwap(state, animation.from, animation.to);
  else {
    state.busy = false;
    pushFx(state, 'shake', { ...animation.from, life: 0.15 });
    pushFx(state, 'shake', { ...animation.to, life: 0.15 });
  }
}

// Shared by rendering and input tests: logical cells stay fixed during travel.
export function tileVisuals(state) {
  const tiles = [];
  const animation = state.swapAnimation;
  const resolution = state.resolution;
  const travel = new Map((resolution?.movements || []).map((move) => [move.id, move]));
  const phaseProgress = resolution ? Math.min(1, resolution.elapsed / resolution.duration) : 0;
  let progress = 0;
  if (animation) {
    const t = Math.min(1, animation.elapsed / animation.duration);
    progress = t * t * (3 - 2 * t);
    if (animation.phase === 'return') progress = 1 - progress;
  }
  for (let r = 0; r < CONFIG.gridSize; r++) for (let c = 0; c < CONFIG.gridSize; c++) {
    const tile = state.board[r][c];
    if (!tile) continue;
    const visual = { tile, r, c, moving: false, selected: state.selected?.r === r && state.selected?.c === c };
    if (animation) {
      const { from, to } = animation;
      const forward = from.r === r && from.c === c;
      const backward = to.r === r && to.c === c;
      if (forward || backward) {
        const sign = forward ? 1 : -1;
        visual.r += (to.r - from.r) * progress * sign;
        visual.c += (to.c - from.c) * progress * sign;
        visual.moving = true;
      }
    } else if (travel.has(tile.id)) {
      const move = travel.get(tile.id);
      const eased = phaseProgress * phaseProgress;
      visual.r = move.fromR + (move.toR - move.fromR) * eased;
      visual.moving = true;
    } else if (state.drag?.r === r && state.drag?.c === c) {
      visual.r += (state.drag.dy || 0) / (CONFIG.cell + CONFIG.boardGap);
      visual.c += (state.drag.dx || 0) / (CONFIG.cell + CONFIG.boardGap);
      visual.moving = true;
    }
    if (resolution?.newborn.has(tile.id)) {
      visual.scale = resolution.phase === 'shuffle' ? 0.3 + phaseProgress * 0.7 : Math.max(0, (phaseProgress - 0.5) * 2);
      visual.alpha = visual.scale;
    }
    tiles.push(visual);
  }
  if (resolution?.phase === 'clear') for (const removed of resolution.removed) {
    tiles.push({ ...removed, moving: false, selected: false, scale: 1 - phaseProgress * 0.85, alpha: 1 - phaseProgress });
  }
  return tiles.sort((a, b) => Number(a.moving) - Number(b.moving));
}

function finishMove(state) {
  state.busy = false;
  state.resolution = null;
  state.hintTimer = 0;
  if (goalsDone(state)) {
    const gained = starReward(state.moves);
    state.stars += gained;
    const cleared = state.progressLevel;
    const nextIndex = Math.min(LEVELS.length - 1, cleared + 1);
    state.progressLevel = nextIndex;
    saveProgress({
      levelIndex: nextIndex,
      stars: state.stars,
      owned: state.owned,
    });
    const last = cleared >= LEVELS.length - 1;
    state.result = {
      success: true,
      message: last
        ? `모든 기본 레벨을 클리어!\n별 ${gained}개 획득 (보유 ${state.stars}개)\n왕국 리모델링을 계속해 보세요.`
        : `레벨 ${state.level.id} 클리어!\n별 ${gained}개 획득 (보유 ${state.stars}개)\n왕국에서 성과 정원을 꾸며 보세요.`,
    };
    return;
  }
  if (state.moves <= 0) {
    saveProgress({
      levelIndex: state.progressLevel,
      stars: state.stars,
      owned: state.owned,
    });
    state.result = {
      success: false,
      message: `이동 횟수가 끝났어요.\n별 ${state.stars}개는 그대로 보관됩니다.\n다시 도전해 볼까요?`,
    };
    return;
  }
  if (!hasAvailableMove(state.board)) {
    reshuffleBoard(state);
    state.busy = true;
    state.resolution = {
      phase: 'shuffle', elapsed: 0, duration: 0.5, removed: [], movements: [],
      newborn: new Set(state.board.flat().map((tile) => tile.id)),
    };
  }
}

function buyDecoration(state, id) {
  const item = DECORATIONS.find((d) => d.id === id);
  if (!item || state.owned.includes(id) || state.stars < item.cost) return false;
  state.stars -= item.cost;
  state.owned = [...state.owned, id];
  saveProgress({
    levelIndex: state.progressLevel,
    stars: state.stars,
    owned: state.owned,
  });
  pushFx(state, 'buy', { id, life: 0.5 });
  return true;
}

function startLevel(state, levelIndex) {
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))];
  state.level = level;
  state.progressLevel = levelIndex;
  state.moves = level.moves;
  state.goals = cloneGoals(level.goals);
  state.board = emptyBoard();
  fillBoardNoMatch(state.board);
  if (!hasAvailableMove(state.board)) reshuffleBoard(state);
  state.selected = null;
  state.drag = null;
  state.swapAnimation = null;
  state.resolution = null;
  state.busy = false;
  state.view = 'puzzle';
  state.fx = [];
  state.hintTimer = 0;
  state.result = null;
}

export function createGame() {
  const progress = loadProgress();
  const state = {
    view: 'puzzle',
    board: emptyBoard(),
    selected: null,
    drag: null,
    busy: false,
    fx: [],
    hintTimer: 0,
    stars: progress.stars,
    owned: progress.owned,
    progressLevel: progress.levelIndex,
    level: LEVELS[progress.levelIndex],
    moves: 0,
    goals: [],
    result: null,
    pointerWasDown: false,
  };
  startLevel(state, progress.levelIndex);
  return state;
}

export function updateGame(state, dt, input) {
  for (const fx of state.fx) fx.life -= dt;
  state.fx = state.fx.filter((fx) => fx.life > 0);
  state.hintTimer += dt;

  if (state.swapAnimation) {
    updateSwapAnimation(state, dt);
    state.pointerWasDown = input.pointer.down;
    return;
  }

  if (state.resolution) {
    updateResolution(state, dt);
    state.pointerWasDown = input.pointer.down;
    return;
  }

  if (state.result || state.busy) {
    state.pointerWasDown = input.pointer.down;
    return;
  }

  const pressed = input.pointer.pressed || (input.pointer.down && !state.pointerWasDown);
  const released = input.pointer.released;
  const x = input.pointer.x;
  const y = input.pointer.y;
  const rects = uiRects();

  if (state.view === 'kingdom') {
    if (pressed && hitButton(x, y, rects.puzzle)) {
      state.view = 'puzzle';
      state.selected = null;
    } else if (pressed) {
      for (const area of decorationHitAreas()) {
        if (hitButton(x, y, area)) {
          buyDecoration(state, area.id);
          break;
        }
      }
    }
    state.pointerWasDown = input.pointer.down;
    return;
  }

  if (pressed && hitButton(x, y, rects.kingdom)) {
    state.view = 'kingdom';
    state.selected = null;
    state.drag = null;
    state.pointerWasDown = input.pointer.down;
    return;
  }

  const cell = cellFromPointer(x, y);

  if (pressed && cell) {
    if (state.selected && adjacent(state.selected, cell)) {
      trySwap(state, state.selected, cell);
    } else if (state.selected && state.selected.r === cell.r && state.selected.c === cell.c) {
      const tile = state.board[cell.r][cell.c];
      if (tile?.special) {
        state.moves -= 1;
        state.busy = true;
        beginClear(state, () => activateSpecial(state, cell.r, cell.c, tile.special, tile.color));
        state.selected = null;
      } else {
        state.selected = null;
      }
    } else {
      state.selected = cell;
      state.drag = { ...cell, x, y };
    }
  }

  if (input.pointer.down && state.drag) {
    const drag = state.drag;
    const dx = x - drag.x, dy = y - drag.y;
    const threshold = CONFIG.cell * 0.25;
    drag.dx = Math.max(-threshold, Math.min(threshold, dx));
    drag.dy = Math.max(-threshold, Math.min(threshold, dy));
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= threshold) {
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      const target = { r: drag.r + (horizontal ? 0 : Math.sign(dy)), c: drag.c + (horizontal ? Math.sign(dx) : 0) };
      if (inBounds(target.r, target.c)) trySwap(state, drag, target);
    }
  }

  if (released || !input.pointer.down || input.pointer.cancelled) state.drag = null;

  if (input.pressed.has('k')) state.view = 'kingdom';
  if (input.pressed.has('p') || input.pressed.has('escape')) {
    /* escape handled by shell for pause */
  }

  if (state.selected && input.pressed.size) {
    const s = state.selected;
    let target = null;
    if (input.pressed.has('arrowleft') || input.pressed.has('a')) target = { r: s.r, c: s.c - 1 };
    if (input.pressed.has('arrowright') || input.pressed.has('d')) target = { r: s.r, c: s.c + 1 };
    if (input.pressed.has('arrowup') || input.pressed.has('w')) target = { r: s.r - 1, c: s.c };
    if (input.pressed.has('arrowdown') || input.pressed.has('s')) target = { r: s.r + 1, c: s.c };
    if (target && inBounds(target.r, target.c)) trySwap(state, s, target);
  }

  state.pointerWasDown = input.pointer.down;
}

export {
  boardOrigin,
  boardPixelSize,
  uiRects,
  decorationHitAreas,
  SPECIALS,
  cellFromPointer,
};
