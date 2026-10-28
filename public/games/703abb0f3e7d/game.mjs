import { CONFIG, STAGES, stageById } from './config.mjs';

const SCENE = { x: 16, y: 168, w: 448, h: 420 };
const INV_Y = 620;
const LIST_Y = 96;

function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return { cleared: [], stars: 0 };
    const data = JSON.parse(raw);
    return {
      cleared: Array.isArray(data.cleared) ? data.cleared : [],
      stars: Number(data.stars) || 0,
    };
  } catch {
    return { cleared: [], stars: 0 };
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

function cloneStageRuntime(stage) {
  const covers = {};
  for (const cover of stage.covers) {
    covers[cover.id] = { offset: 0, open: false };
  }
  return {
    stageId: stage.id,
    found: {},
    inventory: [],
    selectedItem: null,
    covers,
    flags: {},
    unlocked: {},
    toolsTaken: {},
    toast: null,
    toastTimer: 0,
    sparkles: [],
    pulses: [],
    drag: null,
    clearTimer: 0,
    cleared: false,
  };
}

export function createGame() {
  const progress = loadProgress();
  return {
    screen: 'hub',
    progress,
    runtime: null,
    hubMessage: '스테이지를 골라 숨은 물건을 찾아보세요!',
    fxTime: 0,
  };
}

function showToast(runtime, text, seconds = 2.2) {
  runtime.toast = text;
  runtime.toastTimer = seconds;
}

function addSparkle(runtime, x, y, color = CONFIG.palette.gold) {
  runtime.sparkles.push({ x, y, life: 0.7, color, r: 8 + Math.random() * 10 });
}

function remainingFinds(stage, runtime) {
  return stage.finds.filter((f) => !runtime.found[f.id]);
}

function isFindVisible(find, runtime) {
  if (runtime.found[find.id]) return false;
  if (find.kind === 'hidden') {
    const cover = runtime.covers[find.revealedBy];
    return !!(cover && cover.open);
  }
  if (find.kind === 'locked') {
    if (find.needFlag) return !!runtime.flags[find.needFlag];
    if (find.needItem) return !!runtime.unlocked[find.id];
    return false;
  }
  return true;
}

function findHit(stage, runtime, x, y) {
  for (let i = stage.finds.length - 1; i >= 0; i--) {
    const find = stage.finds[i];
    if (!isFindVisible(find, runtime)) continue;
    if (coveredAt(stage, runtime, x, y)) continue;
    if (hit(find, x, y)) return { type: 'find', find };
  }
  return null;
}

function toolHit(stage, runtime, x, y) {
  if (coveredAt(stage, runtime, x, y)) return null;
  for (let i = stage.tools.length - 1; i >= 0; i--) {
    const tool = stage.tools[i];
    if (runtime.toolsTaken[tool.id]) continue;
    if (hit(tool, x, y)) return { type: 'tool', tool };
  }
  return null;
}

function coverHit(stage, runtime, x, y) {
  for (let i = stage.covers.length - 1; i >= 0; i--) {
    const cover = stage.covers[i];
    const state = runtime.covers[cover.id];
    if (state.open) continue;
    const box = coverBox(cover, state);
    if (pointIn(box, x, y)) return { type: 'cover', cover };
  }
  return null;
}

function sceneryTargetHit(stage, x, y) {
  for (let i = stage.scenery.length - 1; i >= 0; i--) {
    const prop = stage.scenery[i];
    if (['chest', 'shelf', 'bud', 'fox', 'stall'].includes(prop.type) && hit(prop, x, y)) {
      return { type: 'target', prop };
    }
  }
  return null;
}

function hit(box, x, y) {
  return pointIn(box, x, y);
}

function pointIn(box, x, y) {
  return x >= box.x && y >= box.y && x <= box.x + box.w && y <= box.y + box.h;
}

function coverBox(cover, state) {
  // Curtains gather at the side and blinds roll up. Open covers remain scenery.
  if (cover.drag === 'horizontal') {
    const offset = Math.min(state.offset, cover.w - 14);
    return { x: cover.x + offset, y: cover.y, w: cover.w - offset, h: cover.h };
  }
  const offset = Math.min(state.offset, cover.h - 14);
  return { x: cover.x, y: cover.y, w: cover.w, h: cover.h - offset };
}

function coveredAt(stage, runtime, x, y) {
  return stage.covers.some(cover => pointIn(coverBox(cover, runtime.covers[cover.id]), x, y));
}

export function hubCards() {
  const cards = [];
  const startY = 190;
  STAGES.forEach((stage, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    cards.push({
      stage,
      index,
      x: 28 + col * 220,
      y: startY + row * 150,
      w: 200,
      h: 132,
    });
  });
  return cards;
}

function isStageUnlocked(stage, index, progress) {
  if (index === 0) return true;
  if (stage.event) return progress.cleared.includes(STAGES[0].id);
  return progress.cleared.includes(STAGES[index - 1].id);
}

function inventorySlot(index) {
  return { x: 24 + index * 72, y: INV_Y, w: 60, h: 60 };
}

function uiButtons() {
  return {
    hint: { x: 360, y: 48, w: 96, h: 36, label: '힌트' },
    hub: { x: 16, y: 48, w: 96, h: 36, label: '목록' },
  };
}

function tryFind(runtime, stage, find) {
  if (runtime.found[find.id]) return;
  runtime.found[find.id] = true;
  addSparkle(runtime, find.x + find.w / 2, find.y + find.h / 2);
  showToast(runtime, `${find.name} 발견!`);
  checkStageClear(runtime, stage);
}

function checkStageClear(runtime, stage) {
  if (remainingFinds(stage, runtime).length > 0) return;
  runtime.cleared = true;
  runtime.clearTimer = 1.4;
  showToast(runtime, `${stage.title} 완료!`, 2.5);
}

function applyRecipe(runtime, stage, recipe) {
  if (recipe.setFlag) runtime.flags[recipe.setFlag] = true;
  if (recipe.unlocks) runtime.unlocked[recipe.unlocks] = true;
  const unlockedFind = stage.finds.find((f) => f.id === recipe.unlocks);
  if (unlockedFind && !runtime.found[unlockedFind.id] && isFindVisible(unlockedFind, runtime)) {
    /* leave for player tap, or auto if now visible locked-by-flag */
  }
  showToast(runtime, recipe.message || '효과가 나타났어요!');
  if (unlockedFind) {
    addSparkle(runtime, unlockedFind.x + unlockedFind.w / 2, unlockedFind.y + unlockedFind.h / 2, CONFIG.palette.mint);
  }
}

function useSelectedOnTarget(runtime, stage, prop) {
  if (!runtime.selectedItem) return false;
  const recipe = stage.recipes.find(
    (r) => r.item === runtime.selectedItem && r.target === prop.type,
  );
  if (!recipe) {
    showToast(runtime, '여기에는 쓸 수 없어요');
    return true;
  }
  runtime.inventory = runtime.inventory.filter((id) => id !== runtime.selectedItem);
  runtime.selectedItem = null;
  applyRecipe(runtime, stage, recipe);
  const unlocked = stage.finds.find((f) => f.id === recipe.unlocks);
  if (unlocked && (unlocked.needFlag ? runtime.flags[unlocked.needFlag] : runtime.unlocked[unlocked.id])) {
    if (!runtime.found[unlocked.id]) {
      tryFind(runtime, stage, unlocked);
    }
  }
  return true;
}

function giveHint(runtime, stage) {
  const next = remainingFinds(stage, runtime).find((f) => {
    if (f.kind === 'tap') return true;
    if (f.kind === 'hidden') {
      const cover = runtime.covers[f.revealedBy];
      return cover && cover.open;
    }
    if (f.kind === 'locked') return isFindVisible(f, runtime);
    return false;
  });
  if (next) {
    runtime.pulses.push({ id: next.id, life: 1.6 });
    showToast(runtime, `${next.name} 쪽을 살펴보세요`);
    return;
  }
  const closed = stage.covers.find((c) => !runtime.covers[c.id].open);
  if (closed) {
    runtime.pulses.push({ id: closed.id, life: 1.6 });
    showToast(runtime, closed.hint || '숨겨진 장소를 열어보세요');
    return;
  }
  const tool = stage.tools.find((t) => !runtime.toolsTaken[t.id]);
  if (tool) {
    runtime.pulses.push({ id: tool.id, life: 1.6 });
    showToast(runtime, `${tool.name}을(를) 집어 보세요`);
    return;
  }
  if (runtime.inventory.length) {
    showToast(runtime, '인벤토리 아이템을 대상에 사용해 보세요');
    return;
  }
  showToast(runtime, '조금만 더 둘러보세요');
}

function enterStage(state, stageId) {
  const stage = stageById(stageId);
  state.screen = 'play';
  state.runtime = cloneStageRuntime(stage);
  showToast(state.runtime, stage.blurb, 2.4);
}

function completeStage(state) {
  const stage = stageById(state.runtime.stageId);
  if (!state.progress.cleared.includes(stage.id)) {
    state.progress.cleared.push(stage.id);
    state.progress.stars += stage.finds.length;
    saveProgress(state.progress);
  }
  state.hubMessage = `${stage.title} 클리어! 별 +${stage.finds.length}`;
  state.screen = 'hub';
  state.runtime = null;

  if (state.progress.cleared.length >= STAGES.length) {
    state.result = {
      success: true,
      message: `모든 테마 룸과 이벤트 스테이지를 클리어했어요! 별 ${state.progress.stars}개를 모았습니다.`,
    };
  }
}

function handleHubPointer(state, input) {
  if (!input.pointer.pressed) return;
  const { x, y } = input.pointer;
  for (const card of hubCards()) {
    if (!pointIn(card, x, y)) continue;
    if (!isStageUnlocked(card.stage, card.index, state.progress)) {
      state.hubMessage = card.stage.event
        ? '첫 스테이지를 깨면 이벤트 팩이 열려요'
        : '이전 스테이지를 먼저 클리어하세요';
      return;
    }
    enterStage(state, card.stage.id);
    return;
  }
}

function handlePlayPointer(state, input) {
  const runtime = state.runtime;
  const stage = stageById(runtime.stageId);
  const { x, y } = input.pointer;

  if (runtime.drag) {
    const cover = stage.covers.find((c) => c.id === runtime.drag.id);
    const st = runtime.covers[cover.id];
    if (input.pointer.down && !input.pointer.cancelled) {
      const dx = x - runtime.drag.startX;
      const dy = y - runtime.drag.startY;
      if (cover.drag === 'horizontal') {
        st.offset = Math.max(0, Math.min(cover.openOffset, runtime.drag.base + dx));
      } else {
        st.offset = Math.max(0, Math.min(cover.openOffset, runtime.drag.base - dy));
      }
      if (st.offset >= cover.openOffset * 0.72) {
        st.open = true;
        st.offset = cover.openOffset;
        runtime.drag = null;
        showToast(runtime, `${cover.name}이(가) 열렸어요!`);
        addSparkle(runtime, cover.x + cover.w / 2, cover.y + cover.h / 2, CONFIG.palette.accent);
      }
    } else {
      if (!st.open) st.offset = 0;
      runtime.drag = null;
    }
    return;
  }

  if (input.pointer.pressed) {
    const buttons = uiButtons();
    if (pointIn(buttons.hub, x, y)) {
      state.screen = 'hub';
      state.runtime = null;
      state.hubMessage = '스테이지 목록으로 돌아왔어요';
      return;
    }
    if (pointIn(buttons.hint, x, y)) {
      giveHint(runtime, stage);
      return;
    }

    for (let i = 0; i < runtime.inventory.length; i++) {
      const slot = inventorySlot(i);
      if (pointIn(slot, x, y)) {
        const id = runtime.inventory[i];
        runtime.selectedItem = runtime.selectedItem === id ? null : id;
        const tool = stage.tools.find((t) => t.id === id);
        showToast(runtime, runtime.selectedItem ? `${tool?.name || id} 선택` : '선택 해제');
        return;
      }
    }

    if (runtime.selectedItem) {
      const target = sceneryTargetHit(stage, x, y);
      if (target && useSelectedOnTarget(runtime, stage, target.prop)) return;
    }

    const cover = coverHit(stage, runtime, x, y);
    if (cover) {
      runtime.drag = {
        id: cover.cover.id,
        startX: x,
        startY: y,
        base: runtime.covers[cover.cover.id].offset,
      };
      return;
    }

    const tool = toolHit(stage, runtime, x, y);
    if (tool) {
      runtime.toolsTaken[tool.tool.id] = true;
      runtime.inventory.push(tool.tool.id);
      runtime.selectedItem = tool.tool.id;
      showToast(runtime, `${tool.tool.name}을(를) 챙겼어요`);
      addSparkle(runtime, tool.tool.x + tool.tool.w / 2, tool.tool.y + tool.tool.h / 2);
      return;
    }

    const found = findHit(stage, runtime, x, y);
    if (found) {
      tryFind(runtime, stage, found.find);
      return;
    }

    if (runtime.selectedItem) {
      showToast(runtime, '대상에 아이템을 사용해 보세요');
    }
  }
}

export function updateGame(state, dt, input) {
  state.fxTime += dt;

  if (state.screen === 'hub') {
    handleHubPointer(state, input);
    return;
  }

  const runtime = state.runtime;
  if (!runtime) return;

  if (runtime.toastTimer > 0) {
    runtime.toastTimer -= dt;
    if (runtime.toastTimer <= 0) runtime.toast = null;
  }

  runtime.sparkles = runtime.sparkles
    .map((s) => ({ ...s, life: s.life - dt, y: s.y - dt * 28 }))
    .filter((s) => s.life > 0);
  runtime.pulses = runtime.pulses
    .map((p) => ({ ...p, life: p.life - dt }))
    .filter((p) => p.life > 0);

  if (runtime.cleared) {
    runtime.clearTimer -= dt;
    if (runtime.clearTimer <= 0) completeStage(state);
    return;
  }

  handlePlayPointer(state, input);

  if (input.pressed.has('h')) giveHint(runtime, stageById(runtime.stageId));
  if (input.pressed.has('escape') || input.pressed.has('b')) {
    /* ESC handled by shell for pause; B returns hub via custom? skip */
  }
}

export function sceneRect() {
  return SCENE;
}

export function listY() {
  return LIST_Y;
}

export function inventoryY() {
  return INV_Y;
}

export function getUiButtons() {
  return uiButtons();
}

export function getInventorySlot(index) {
  return inventorySlot(index);
}

export function getStageProgress(runtime, stage) {
  const total = stage.finds.length;
  const done = stage.finds.filter((f) => runtime.found[f.id]).length;
  return { done, total };
}

export function visibleFind(find, runtime) {
  return isFindVisible(find, runtime);
}

export function getCoverBox(cover, runtime) {
  return coverBox(cover, runtime.covers[cover.id]);
}

export function stageUnlocked(stage, index, progress) {
  return isStageUnlocked(stage, index, progress);
}

export { SCENE, STAGES };
