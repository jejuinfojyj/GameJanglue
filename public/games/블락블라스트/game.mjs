import { CONFIG, SHAPES, boardPixelSize, traySlotX } from './config.mjs';

const BEST_KEY = 'blockblast-best';

function emptyGrid() {
  return Array.from({ length: CONFIG.gridSize }, () => Array(CONFIG.gridSize).fill(0));
}

function shapeBounds(cells) {
  let maxR = 0, maxC = 0;
  for (const [r, c] of cells) {
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { rows: maxR + 1, cols: maxC + 1 };
}

function pickShape(shape = SHAPES[Math.floor(Math.random() * SHAPES.length)], random = Math.random) {
  const color = 1 + Math.floor(random() * CONFIG.blockColors.length);
  return {
    id: shape.id,
    cells: shape.cells.map(([r, c]) => [r, c]),
    color,
    ...shapeBounds(shape.cells),
  };
}

function fillTray(tray, grid) {
  const offer = generateTray(grid);
  for (let i = 0; i < 3; i++) {
    if (!tray[i]) tray[i] = offer[i];
  }
}

// Build a legal route on a copy, including line clears. The player still chooses
// where and in which order to place these fixed, non-rotatable pieces.
export function generateTray(grid, random = Math.random) {
  let preview = grid.map(row => [...row]);
  const offer = [];
  for (let slot = 0; slot < 3; slot++) {
    const occupied = preview.flat().filter(Boolean).length / (CONFIG.gridSize ** 2);
    const preferredSize = occupied > 0.72 ? 3 : occupied > 0.45 ? 4 : 5;
    const candidates = [];
    for (const shape of SHAPES) {
      const placements = [];
      for (let row = 0; row < CONFIG.gridSize; row++) for (let col = 0; col < CONFIG.gridSize; col++) {
        if (!canPlace(preview, shape, row, col)) continue;
        const next = preview.map(line => [...line]);
        placeOnGrid(next, { ...shape, color: 1 }, row, col);
        const lines = findFullLines(next);
        const clears = lines.rows.length + lines.cols.length;
        clearLines(next, lines);
        // Prefer line openings and edges so the simulated route keeps usable space.
        const last = CONFIG.gridSize - 1;
        const edge = shape.cells.reduce((score, [dr, dc]) => score + Number(row + dr === 0 || col + dc === 0 || row + dr === last || col + dc === last), 0);
        placements.push({ next, rank: clears * 20 + edge });
      }
      if (!placements.length) continue;
      const size = shape.cells.length;
      let weight = Math.max(0.35, 4 - Math.abs(size - preferredSize) * 0.8);
      if (size <= 2 && occupied < 0.65) weight *= 0.25;
      if (offer.some(piece => piece.id === shape.id)) weight *= 0.3;
      candidates.push({ shape, placements, weight });
    }
    if (!candidates.length) {
      // A completely blocked board is a real loss; never alter it or reroll forever.
      while (offer.length < 3) offer.push(pickShape(SHAPES[Math.floor(random() * SHAPES.length)], random));
      break;
    }
    let ticket = random() * candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let chosen = candidates[candidates.length - 1];
    for (const candidate of candidates) {
      ticket -= candidate.weight;
      if (ticket <= 0) { chosen = candidate; break; }
    }
    chosen.placements.sort((a, b) => b.rank - a.rank);
    const bestRank = chosen.placements[0].rank;
    const best = chosen.placements.filter(placement => placement.rank === bestRank);
    preview = best[Math.floor(random() * best.length)].next;
    offer.push(pickShape(chosen.shape, random));
  }
  // Conceal the simulated order: all three can be played in at least one order.
  for (let i = offer.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [offer[i], offer[j]] = [offer[j], offer[i]];
  }
  return offer;
}

function canPlace(grid, piece, row, col) {
  if (!piece) return false;
  for (const [dr, dc] of piece.cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= CONFIG.gridSize || c >= CONFIG.gridSize) return false;
    if (grid[r][c]) return false;
  }
  return true;
}

function anyPlacement(grid, piece) {
  if (!piece) return false;
  for (let r = 0; r < CONFIG.gridSize; r++) {
    for (let c = 0; c < CONFIG.gridSize; c++) {
      if (canPlace(grid, piece, r, c)) return true;
    }
  }
  return false;
}

function anyTrayFits(grid, tray) {
  return tray.some((piece) => anyPlacement(grid, piece));
}

function placeOnGrid(grid, piece, row, col) {
  for (const [dr, dc] of piece.cells) {
    grid[row + dr][col + dc] = piece.color;
  }
}

function findFullLines(grid) {
  const rows = [];
  const cols = [];
  for (let r = 0; r < CONFIG.gridSize; r++) {
    if (grid[r].every((v) => v)) rows.push(r);
  }
  for (let c = 0; c < CONFIG.gridSize; c++) {
    let full = true;
    for (let r = 0; r < CONFIG.gridSize; r++) {
      if (!grid[r][c]) { full = false; break; }
    }
    if (full) cols.push(c);
  }
  return { rows, cols };
}

function clearLines(grid, lines) {
  for (const r of lines.rows) {
    for (let c = 0; c < CONFIG.gridSize; c++) grid[r][c] = 0;
  }
  for (const c of lines.cols) {
    for (let r = 0; r < CONFIG.gridSize; r++) grid[r][c] = 0;
  }
}

function scoreClear(lineCount, combo) {
  if (lineCount <= 0) return 0;
  const multi = Math.max(0, lineCount - 1) * CONFIG.multiLineBonus;
  const comboPts = Math.max(0, combo - 1) * CONFIG.comboBonus * lineCount;
  return lineCount * CONFIG.lineBase + multi + comboPts;
}

function loadBest() {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* ignore */
  }
}

function hitTrayIndex(x, y) {
  if (y < CONFIG.trayY || y > CONFIG.trayY + CONFIG.traySlotH) return -1;
  for (let i = 0; i < 3; i++) {
    const sx = traySlotX(i);
    if (x >= sx && x < sx + CONFIG.traySlotW) return i;
  }
  return -1;
}

function boardOrigin() {
  return { x: CONFIG.boardX, y: CONFIG.boardY, size: boardPixelSize() };
}

function pointerToCell(x, y, piece) {
  const origin = boardOrigin();
  const step = CONFIG.cell + CONFIG.boardGap;
  const anchorX = x - ((piece.cols - 1) * step + CONFIG.cell) / 2;
  const anchorY = y - ((piece.rows - 1) * step + CONFIG.cell) / 2;
  const col = Math.round((anchorX - origin.x) / step);
  const row = Math.round((anchorY - origin.y) / step);
  return { row, col };
}

function pieceTrayScale(piece) {
  const maxDim = Math.max(piece.rows, piece.cols, 1);
  return Math.min(0.72, 2.6 / maxDim);
}

function endGame(state) {
  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.best);
  }
  state.result = {
    success: state.score >= 200,
    message: `최종 점수 ${state.score}점\n최고 ${state.best}점\n더 이상 놓을 조각이 없어요.`,
  };
}

function refreshTrayOrEnd(state) {
  if (state.tray.every((p) => !p)) fillTray(state.tray, state.grid);
  if (!anyTrayFits(state.grid, state.tray)) endGame(state);
}

function pushFloat(state, text, x, y, color) {
  state.floats.push({ text, x, y, color, life: 0.9 });
}

function applyPlacement(state, trayIndex, row, col) {
  const piece = state.tray[trayIndex];
  if (!canPlace(state.grid, piece, row, col)) return false;

  placeOnGrid(state.grid, piece, row, col);
  const placeScore = piece.cells.length * CONFIG.placePointsPerCell;
  state.score += placeScore;

  const lines = findFullLines(state.grid);
  const lineCount = lines.rows.length + lines.cols.length;
  if (lineCount > 0) {
    state.combo += 1;
    const gained = scoreClear(lineCount, state.combo);
    state.score += gained;
    clearLines(state.grid, lines);
    state.bursts.push({
      rows: [...lines.rows],
      cols: [...lines.cols],
      life: 0.35,
    });
    const origin = boardOrigin();
    const cx = origin.x + boardPixelSize() / 2;
    const cy = origin.y + boardPixelSize() / 2;
    const label = state.combo > 1
      ? `콤보 x${state.combo} +${gained}`
      : lineCount > 1
        ? `${lineCount}줄 클리어 +${gained}`
        : `클리어 +${gained}`;
    pushFloat(state, label, cx, cy - 20, CONFIG.palette.primary);
  } else {
    state.combo = 0;
  }

  if (state.score > state.best) {
    state.best = state.score;
    saveBest(state.best);
  }

  state.tray[trayIndex] = null;
  state.selected = null;
  state.drag = null;
  state.cursor = null;
  refreshTrayOrEnd(state);
  return true;
}

export function createGame() {
  const tray = [null, null, null];
  const grid = emptyGrid();
  fillTray(tray, grid);
  const state = {
    grid,
    tray,
    score: 0,
    best: loadBest(),
    combo: 0,
    selected: null,
    cursor: null,
    drag: null,
    bursts: [],
    floats: [],
    result: null,
  };
  return state;
}

function clearPointerPlacement(state) {
  state.drag = null;
  state.selected = null;
  state.cursor = null;
}

export function updateGame(state, dt, input) {
  for (const burst of state.bursts) burst.life -= dt;
  state.bursts = state.bursts.filter((b) => b.life > 0);
  for (const f of state.floats) {
    f.life -= dt;
    f.y -= 28 * dt;
  }
  state.floats = state.floats.filter((f) => f.life > 0);

  if (state.result) { clearPointerPlacement(state); return; }

  const p = input.pointer;

  // pointercancel, lost capture and blur can remove `down` without `released`.
  if (state.drag && (p.cancelled || p.inside === false || (!p.down && !p.released))) {
    clearPointerPlacement(state);
  }

  if (state.drag) {
    const piece = state.tray[state.drag.index];
    if (!piece) {
      clearPointerPlacement(state);
    } else {
      const hoverY = p.y - 36;
      const cell = pointerToCell(p.x, hoverY, piece);
      state.drag.row = cell.row;
      state.drag.col = cell.col;
      state.drag.valid = canPlace(state.grid, piece, cell.row, cell.col);
      state.drag.x = p.x;
      state.drag.y = hoverY;
    }
  }

  if (p.pressed) {
    const trayHit = hitTrayIndex(p.x, p.y);
    if (trayHit >= 0 && state.tray[trayHit]) {
      state.drag = {
        index: trayHit,
        x: p.x,
        y: p.y - 36,
        row: -1,
        col: -1,
        valid: false,
      };
      state.selected = trayHit;
      state.cursor = null;
    } else if (state.selected != null && state.tray[state.selected]) {
      const piece = state.tray[state.selected];
      const origin = boardOrigin();
      const step = CONFIG.cell + CONFIG.boardGap;
      if (
        p.x >= origin.x &&
        p.y >= origin.y &&
        p.x <= origin.x + boardPixelSize() &&
        p.y <= origin.y + boardPixelSize()
      ) {
        const col = Math.floor((p.x - origin.x) / step);
        const row = Math.floor((p.y - origin.y) / step);
        if (!applyPlacement(state, state.selected, row, col)) clearPointerPlacement(state);
      } else {
        state.selected = null;
        state.cursor = null;
      }
    }
  }

  if (p.released && state.drag) {
    const { index, row, col, valid } = state.drag;
    if (valid) applyPlacement(state, index, row, col);
    clearPointerPlacement(state);
  }

  // 숫자 키로 조각 선택, 화살표+Enter로 배치(PC)
  if (input.pressed.has('1') && state.tray[0]) state.selected = 0;
  if (input.pressed.has('2') && state.tray[1]) state.selected = 1;
  if (input.pressed.has('3') && state.tray[2]) state.selected = 2;

  if (state.selected != null && state.tray[state.selected]) {
    if (!state.cursor) state.cursor = { row: 0, col: 0 };
    if (input.pressed.has('arrowleft') || input.pressed.has('a')) state.cursor.col = Math.max(0, state.cursor.col - 1);
    if (input.pressed.has('arrowright') || input.pressed.has('d')) state.cursor.col = Math.min(CONFIG.gridSize - 1, state.cursor.col + 1);
    if (input.pressed.has('arrowup') || input.pressed.has('w')) state.cursor.row = Math.max(0, state.cursor.row - 1);
    if (input.pressed.has('arrowdown') || input.pressed.has('s')) state.cursor.row = Math.min(CONFIG.gridSize - 1, state.cursor.row + 1);
    if (input.pressed.has('enter') || input.pressed.has(' ')) {
      applyPlacement(state, state.selected, state.cursor.row, state.cursor.col);
    }
  }
}

export {
  canPlace,
  anyPlacement,
  boardOrigin,
  pieceTrayScale,
  shapeBounds,
};
