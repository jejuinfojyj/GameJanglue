import {
  CONFIG,
  CHAINS,
  GENERATORS,
  ORDERABLE,
  DECORATIONS,
  STORY,
  itemDef,
  findItemById,
  boardOrigin,
  cellRect,
} from './config.mjs';

function emptyGrid() {
  return Array.from({ length: CONFIG.rows }, () => Array(CONFIG.cols).fill(null));
}

function loadProgress() {
  const blank = {
    coins: 0,
    stars: 0,
    energy: CONFIG.maxEnergy,
    regenAt: 0,
    owned: [],
    styles: {},
    ordersDone: 0,
    eventReady: false,
    gridSeed: null,
  };
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return blank;
    const data = JSON.parse(raw);
    return {
      coins: Math.max(0, Math.floor(Number(data.coins) || 0)),
      stars: Math.max(0, Math.floor(Number(data.stars) || 0)),
      energy: Math.max(0, Math.min(CONFIG.maxEnergy, Math.floor(Number(data.energy) ?? CONFIG.maxEnergy))),
      regenAt: Number(data.regenAt) || 0,
      owned: Array.isArray(data.owned)
        ? data.owned.filter((id) => DECORATIONS.some((d) => d.id === id))
        : [],
      styles: data.styles && typeof data.styles === 'object' ? data.styles : {},
      ordersDone: Math.max(0, Math.floor(Number(data.ordersDone) || 0)),
      eventReady: Boolean(data.eventReady),
      gridSeed: Array.isArray(data.gridSeed) ? data.gridSeed : null,
    };
  } catch {
    return blank;
  }
}

function saveProgress(state) {
  try {
    localStorage.setItem(
      CONFIG.storageKey,
      JSON.stringify({
        coins: state.coins,
        stars: state.stars,
        energy: state.energy,
        regenAt: state.regenAt,
        owned: state.owned,
        styles: state.styles,
        ordersDone: state.ordersDone,
        eventReady: state.eventReady,
        gridSeed: serializeGrid(state.grid),
      }),
    );
  } catch {
    /* ignore */
  }
}

function serializeGrid(grid) {
  return grid.map((row) =>
    row.map((cell) => (cell ? { chain: cell.chain, level: cell.level } : null)),
  );
}

function restoreGrid(seed) {
  const grid = emptyGrid();
  if (!seed) return grid;
  for (let r = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.cols; c++) {
      const cell = seed[r]?.[c];
      if (!cell) continue;
      const def = itemDef(cell.chain, cell.level);
      if (def) grid[r][c] = { ...def, uid: uid() };
    }
  }
  return grid;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeItem(chain, level) {
  const def = itemDef(chain, level);
  if (!def) return null;
  return { ...def, uid: uid() };
}

function findEmptyCells(grid) {
  const cells = [];
  for (let r = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.cols; c++) {
      if (!grid[r][c]) cells.push({ r, c });
    }
  }
  return cells;
}

function pickOrder(stars) {
  const unlocked = ORDERABLE.filter((o) => {
    if (o.level <= 2) return true;
    if (o.level === 3) return stars >= 2;
    if (o.level === 4) return stars >= 5;
    return stars >= 10;
  });
  const pick = unlocked[Math.floor(Math.random() * unlocked.length)];
  const def = itemDef(pick.chain, pick.level);
  return {
    id: uid(),
    chain: pick.chain,
    level: pick.level,
    itemId: def.id,
    name: def.name,
    mark: def.mark,
    color: def.color,
    coins: pick.coins,
    stars: pick.stars,
    patience: 1,
  };
}

function ensureOrders(state) {
  while (state.orders.length < 2) {
    state.orders.push(pickOrder(state.stars));
  }
}

function storyIndex(stars) {
  let idx = 0;
  for (let i = 0; i < STORY.length; i++) {
    if (stars >= STORY[i].needStars) idx = i;
  }
  return idx;
}

function seedStarterBoard() {
  const grid = emptyGrid();
  const starters = [
    [0, 1, 'sushi', 1],
    [0, 2, 'sushi', 1],
    [1, 0, 'ramen', 1],
    [1, 3, 'ramen', 1],
    [2, 2, 'tool', 1],
    [3, 4, 'sushi', 2],
    [4, 1, 'ramen', 2],
  ];
  for (const [r, c, chain, level] of starters) {
    grid[r][c] = makeItem(chain, level);
  }
  return grid;
}

export function createGame() {
  const progress = loadProgress();
  const grid = progress.gridSeed ? restoreGrid(progress.gridSeed) : seedStarterBoard();
  const state = {
    view: 'kitchen',
    grid,
    coins: progress.coins,
    stars: progress.stars,
    energy: progress.energy,
    regenAt: progress.regenAt || 0,
    owned: progress.owned,
    styles: { ...progress.styles },
    ordersDone: progress.ordersDone,
    eventReady: progress.eventReady,
    orders: [],
    selected: null,
    drag: null,
    toast: null,
    toastLife: 0,
    fx: [],
    stylePick: null,
    message: '',
    result: null,
  };
  ensureOrders(state);
  if (state.energy < CONFIG.maxEnergy && !state.regenAt) {
    state.regenAt = CONFIG.energyRegenSec;
  }
  return state;
}

function showToast(state, text, kind = 'info') {
  state.toast = { text, kind };
  state.toastLife = 1.8;
}

function addFx(state, type, x, y, color) {
  state.fx.push({ type, x, y, color, life: 0.55, max: 0.55 });
}

function hitCell(x, y) {
  for (let r = 0; r < CONFIG.rows; r++) {
    for (let c = 0; c < CONFIG.cols; c++) {
      const rect = cellRect(r, c);
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
        return { r, c, rect };
      }
    }
  }
  return null;
}

function generatorRects() {
  return GENERATORS.map((g) => ({
    ...g,
    x: g.x,
    y: g.y,
    w: 128,
    h: 72,
  }));
}

function orderRects() {
  return [
    { index: 0, x: 28, y: 108, w: 204, h: 88 },
    { index: 1, x: 248, y: 108, w: 204, h: 88 },
  ];
}

function tabRects() {
  return {
    kitchen: { x: 28, y: 668, w: 200, h: 46 },
    restaurant: { x: 252, y: 668, w: 200, h: 46 },
  };
}

function eventRect() {
  return { x: 100, y: 76, w: 280, h: 28 };
}

function decorationHitAreas() {
  const startY = 286;
  return DECORATIONS.map((d, i) => ({
    id: d.id,
    x: 28,
    y: startY + i * 52,
    w: 424,
    h: 46,
  }));
}

function stylePickAreas(styles) {
  const startY = 250;
  return styles.map((s, i) => ({
    id: s.id,
    name: s.name,
    x: 60,
    y: startY + i * 70,
    w: 360,
    h: 58,
  }));
}

function tickEnergy(state, dt) {
  if (state.energy >= CONFIG.maxEnergy) {
    state.regenAt = 0;
    return;
  }
  if (!state.regenAt) state.regenAt = CONFIG.energyRegenSec;
  state.regenAt -= dt;
  while (state.regenAt <= 0 && state.energy < CONFIG.maxEnergy) {
    state.energy += 1;
    if (state.energy >= CONFIG.maxEnergy) {
      state.regenAt = 0;
      break;
    }
    state.regenAt += CONFIG.energyRegenSec;
  }
}

function spendEnergy(state, amount) {
  if (state.energy < amount) {
    showToast(state, '에너지가 부족해요. 잠시 기다리거나 이벤트를 노려 보세요!', 'warn');
    return false;
  }
  state.energy -= amount;
  if (state.energy < CONFIG.maxEnergy && !state.regenAt) {
    state.regenAt = CONFIG.energyRegenSec;
  }
  return true;
}

function spawnFromGenerator(state, chainId) {
  if (!spendEnergy(state, CONFIG.spawnCost)) return;
  const empty = findEmptyCells(state.grid);
  if (!empty.length) {
    state.energy += CONFIG.spawnCost;
    showToast(state, '판이 가득 찼어요. 합치거나 손님에게 전달해 보세요.', 'warn');
    return;
  }
  const spot = empty[Math.floor(Math.random() * empty.length)];
  const item = makeItem(chainId, 1);
  state.grid[spot.r][spot.c] = item;
  const rect = cellRect(spot.r, spot.c);
  addFx(state, 'spawn', rect.x + rect.w / 2, rect.y + rect.h / 2, item.color);
  showToast(state, `${CHAINS[chainId].generatorName}에서 ${item.name} 생성!`, 'ok');
  saveProgress(state);
}

function tryMerge(state, from, to) {
  if (from.r === to.r && from.c === to.c) return false;
  const a = state.grid[from.r][from.c];
  const b = state.grid[to.r][to.c];
  if (!a) return false;
  if (!b) {
    state.grid[to.r][to.c] = a;
    state.grid[from.r][from.c] = null;
    return true;
  }
  if (a.chain === b.chain && a.level === b.level && a.level < a.maxLevel) {
    const next = makeItem(a.chain, a.level + 1);
    state.grid[to.r][to.c] = next;
    state.grid[from.r][from.c] = null;
    const rect = cellRect(to.r, to.c);
    addFx(state, 'merge', rect.x + rect.w / 2, rect.y + rect.h / 2, next.color);
    showToast(state, `${next.name} 완성!`, 'ok');
    saveProgress(state);
    return true;
  }
  showToast(state, '같은 단계 아이템끼리만 합쳐져요.', 'warn');
  return false;
}

function tryDeliver(state, orderIndex, itemCell) {
  const order = state.orders[orderIndex];
  if (!order || !itemCell) return false;
  const item = state.grid[itemCell.r][itemCell.c];
  if (!item) return false;
  if (item.chain !== order.chain || item.level !== order.level) {
    showToast(state, `${order.name}이(가) 필요해요.`, 'warn');
    return false;
  }
  state.grid[itemCell.r][itemCell.c] = null;
  state.coins += order.coins;
  state.stars += order.stars;
  state.ordersDone += 1;
  state.orders.splice(orderIndex, 1);
  ensureOrders(state);
  if (state.ordersDone % CONFIG.ordersNeededForEvent === 0) {
    state.eventReady = true;
    showToast(state, '항구 이벤트! 에너지 보너스를 받을 수 있어요.', 'ok');
  } else {
    showToast(state, `전달 완료! 코인 +${order.coins} · 별 +${order.stars}`, 'ok');
  }
  addFx(state, 'reward', 240, 140, CONFIG.palette.primary);
  saveProgress(state);
  checkVictory(state);
  return true;
}

function claimEvent(state) {
  if (!state.eventReady) return;
  state.eventReady = false;
  state.energy = Math.min(CONFIG.maxEnergy, state.energy + CONFIG.eventEnergyBonus);
  showToast(state, `이벤트 보상! 에너지 +${CONFIG.eventEnergyBonus}`, 'ok');
  saveProgress(state);
}

function buyDecoration(state, id) {
  const item = DECORATIONS.find((d) => d.id === id);
  if (!item || state.owned.includes(id)) return;
  if (state.stars < item.cost) {
    showToast(state, '별이 부족해요. 손님 주문을 더 맞춰 보세요.', 'warn');
    return;
  }
  if (item.styles?.length) {
    state.stylePick = { decorId: id, styles: item.styles, cost: item.cost };
    return;
  }
  state.stars -= item.cost;
  state.owned = [...state.owned, id];
  showToast(state, `${item.name} 완료!`, 'ok');
  saveProgress(state);
  checkVictory(state);
}

function confirmStyle(state, styleId) {
  const pick = state.stylePick;
  if (!pick) return;
  if (state.stars < pick.cost) {
    showToast(state, '별이 부족해요.', 'warn');
    state.stylePick = null;
    return;
  }
  state.stars -= pick.cost;
  state.owned = [...state.owned, pick.decorId];
  state.styles[pick.decorId] = styleId;
  const name = pick.styles.find((s) => s.id === styleId)?.name || styleId;
  showToast(state, `${name} 스타일로 꾸몄어요!`, 'ok');
  state.stylePick = null;
  saveProgress(state);
  checkVictory(state);
}

function checkVictory(state) {
  if (state.owned.length < DECORATIONS.length) return;
  if (state.result) return;
  state.result = {
    success: true,
    message: `가십하버 식당이 다시 열렸어요!\n코인 ${state.coins} · 별 ${state.stars}\n처음부터 다시 꾸며 볼 수도 있어요.`,
  };
}

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function handleKitchenPointer(state, input) {
  const p = input.pointer;

  if (p.pressed) {
    if (state.eventReady && pointIn(eventRect(), p.x, p.y)) {
      claimEvent(state);
      return;
    }
    const tabs = tabRects();
    if (pointIn(tabs.restaurant, p.x, p.y)) {
      state.view = 'restaurant';
      state.selected = null;
      state.drag = null;
      return;
    }
    for (const gen of generatorRects()) {
      if (pointIn(gen, p.x, p.y)) {
        spawnFromGenerator(state, gen.chain);
        return;
      }
    }
    const cell = hitCell(p.x, p.y);
    if (cell && state.grid[cell.r][cell.c]) {
      state.drag = {
        from: { r: cell.r, c: cell.c },
        x: p.x,
        y: p.y,
        item: state.grid[cell.r][cell.c],
      };
      state.selected = { r: cell.r, c: cell.c };
    } else {
      state.selected = null;
    }
  }

  if (state.drag && p.down) {
    state.drag.x = p.x;
    state.drag.y = p.y;
  }

  if (state.drag && p.released) {
    const from = state.drag.from;
    const orders = orderRects();
    let delivered = false;
    for (const area of orders) {
      if (pointIn(area, p.x, p.y)) {
        delivered = tryDeliver(state, area.index, from);
        break;
      }
    }
    if (!delivered) {
      const cell = hitCell(p.x, p.y);
      if (cell) tryMerge(state, from, { r: cell.r, c: cell.c });
    }
    state.drag = null;
  }
}

function handleRestaurantPointer(state, input) {
  const p = input.pointer;
  if (!p.pressed) return;

  if (state.stylePick) {
    const areas = stylePickAreas(state.stylePick.styles);
    for (const area of areas) {
      if (pointIn(area, p.x, p.y)) {
        confirmStyle(state, area.id);
        return;
      }
    }
    if (pointIn({ x: 160, y: 480, w: 160, h: 44 }, p.x, p.y)) {
      state.stylePick = null;
    }
    return;
  }

  const tabs = tabRects();
  if (pointIn(tabs.kitchen, p.x, p.y)) {
    state.view = 'kitchen';
    return;
  }

  for (const area of decorationHitAreas()) {
    if (pointIn(area, p.x, p.y)) {
      buyDecoration(state, area.id);
      return;
    }
  }
}

function handleKeys(state, input) {
  if (input.pressed.has('k')) {
    state.view = 'kitchen';
    state.stylePick = null;
  }
  if (input.pressed.has('j')) {
    state.view = 'restaurant';
    state.drag = null;
  }
  if (input.pressed.has('1')) spawnFromGenerator(state, 'sushi');
  if (input.pressed.has('2')) spawnFromGenerator(state, 'ramen');
  if (input.pressed.has('3')) spawnFromGenerator(state, 'tool');
  if (input.pressed.has('e') && state.eventReady) claimEvent(state);

  if (!state.selected) return;
  const { r, c } = state.selected;
  let nr = r;
  let nc = c;
  if (input.pressed.has('arrowleft') || input.pressed.has('a')) nc -= 1;
  if (input.pressed.has('arrowright') || input.pressed.has('d')) nc += 1;
  if (input.pressed.has('arrowup') || input.pressed.has('w')) nr -= 1;
  if (input.pressed.has('arrowdown') || input.pressed.has('s')) nr += 1;
  if (nr === r && nc === c) {
    if (input.pressed.has('enter') || input.pressed.has(' ')) {
      const orderIdx = state.orders.findIndex(
        (o) => state.grid[r][c] && o.chain === state.grid[r][c].chain && o.level === state.grid[r][c].level,
      );
      if (orderIdx >= 0) tryDeliver(state, orderIdx, { r, c });
    }
    return;
  }
  if (nr < 0 || nc < 0 || nr >= CONFIG.rows || nc >= CONFIG.cols) return;
  if (state.grid[r][c]) {
    tryMerge(state, { r, c }, { r: nr, c: nc });
    if (state.grid[nr][nc]) state.selected = { r: nr, c: nc };
    else if (state.grid[r][c]) state.selected = { r, c };
    else state.selected = null;
  }
}

export function updateGame(state, dt, input) {
  if (state.result) return;
  tickEnergy(state, dt);

  if (state.toastLife > 0) {
    state.toastLife -= dt;
    if (state.toastLife <= 0) state.toast = null;
  }
  state.fx = state.fx
    .map((f) => ({ ...f, life: f.life - dt }))
    .filter((f) => f.life > 0);

  if (state.view === 'kitchen') handleKitchenPointer(state, input);
  else handleRestaurantPointer(state, input);
  handleKeys(state, input);
}

export {
  orderRects,
  generatorRects,
  tabRects,
  eventRect,
  decorationHitAreas,
  stylePickAreas,
  storyIndex,
  findItemById,
  boardOrigin,
  cellRect,
};
