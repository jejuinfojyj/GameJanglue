import { mountGame } from './game-shell.js';
import { CONFIG, KEYS, HEROES, BOARDS } from './config.mjs';
import { createGame, updateGame } from './game.mjs';
import { renderGame, LAYOUT } from './render.mjs';
import { heroPortrait, boardPortrait } from './characters.mjs';
import { loadProfile, saveProfile } from './profile.mjs';
import { sfx, unlockAudio, setSoundEnabled } from './sound.mjs';

const profile = loadProfile({ heroIds: HEROES.map(h => h.id), boardIds: BOARDS.map(b => b.id) });
setSoundEnabled(profile.sound);

const canvas = document.getElementById('game-canvas');
const primary = document.getElementById('round-primary');
const shop = document.getElementById('shop');
const recordLine = document.getElementById('record-line');
const heroList = document.getElementById('hero-list');
const boardList = document.getElementById('board-list');
const soundToggle = document.getElementById('sound-toggle');

const queue = [];
let runner = null, lastMode = '', resultAt = 0;

// 손가락 조작: 밀기(스와이프), 두 번 톡, 보드 버튼
const SWIPE = 24, TAP_TIME = 280, DOUBLE_TAP = 330;
const touches = new Map();
let lastTap = 0;

const REASONS = {
  train: '기차에 정면으로 부딪혔어!',
  hurdle: '낮은 차단봉에 걸렸어! 위로 밀어 뛰어넘자.',
  gate: '높은 차단봉에 부딪혔어! 아래로 밀어 굴러 지나가자.',
  caught: '옆으로 두 번 부딪혀서 경비원에게 잡혔어!',
};

function finishRun(state) {
  state.saved = true;
  const score = Math.floor(state.score), previous = profile.best;
  profile.coins += state.coins;
  profile.best = Math.max(profile.best, score);
  saveProfile(profile);
  const newBest = score > previous;
  state.result.success = newBest;
  state.result.message = (newBest ? `새 최고 기록! ${score}점` : `${score}점 (최고 ${profile.best}점)`)
    + ` · ${Math.floor(state.distance)}m 달렸어\n${REASONS[state.result.reason] || '부딪혔어!'}\n코인 +${state.coins} · 모은 코인 ${profile.coins}`;
  resultAt = performance.now();
  refreshShop();
}

function keyActions(pressed) {
  const actions = [];
  for (const [action, keys] of Object.entries(KEYS)) if (keys.some(key => pressed.has(key))) actions.push(action);
  return actions;
}

runner = mountGame({
  title: CONFIG.title,
  description: '기찻길 3개 레인을 달리며 기차와 차단봉을 피하고 코인을 모으자!\n경사로로 기차 지붕에 오르면 코인이 가득해. 정면으로 부딪히거나 옆으로 두 번 부딪히면 끝!',
  controls: '휴대폰: 좌우로 밀어 레인 · 위로 밀어 점프 · 아래로 밀어 구르기 · 두 번 톡 호버보드\nPC: ←→·A·D 레인 / ↑·W 점프 / ↓·S 구르기 / Space·B 보드 / Esc 쉬기',
  width: LAYOUT.width,
  height: LAYOUT.height,
  theme: CONFIG.palette,
  create: () => createGame({ hero: profile.hero, board: profile.board }),
  update(state, dt, input) {
    updateGame(state, dt, [...queue.splice(0), ...keyActions(input.pressed)]);
    for (const event of state.events.splice(0)) sfx[event]?.();
    if (state.result && !state.saved) finishRun(state);
  },
  render(ctx, state, view) {
    const mode = runner?.mode || 'start';
    if (mode !== 'play') { queue.length = 0; touches.clear(); }
    renderGame(ctx, state, { ...view, mode, best: profile.best });
    if (mode !== lastMode) { lastMode = mode; syncOverlay(mode); }
  },
});

function logical(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * LAYOUT.width, y: (event.clientY - rect.top) / rect.height * LAYOUT.height };
}

canvas.addEventListener('pointerdown', event => {
  unlockAudio();
  if (runner.mode !== 'play' || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const p = logical(event), btn = LAYOUT.boardButton;
  const onButton = Math.hypot(p.x - btn.x, p.y - btn.y) <= btn.r;
  if (onButton) queue.push('board');
  touches.set(event.pointerId, { ...p, t: performance.now(), fired: onButton, button: onButton });
});
canvas.addEventListener('pointermove', event => {
  const touch = touches.get(event.pointerId);
  if (!touch || touch.fired || runner.mode !== 'play') return;
  const p = logical(event), dx = p.x - touch.x, dy = p.y - touch.y;
  if (Math.hypot(dx, dy) < SWIPE) return;
  queue.push(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down'));
  touch.fired = true;
});
function endTouch(event, cancelled) {
  const touch = touches.get(event.pointerId);
  touches.delete(event.pointerId);
  if (!touch || touch.fired || cancelled || runner.mode !== 'play') return;
  const now = performance.now();
  if (now - touch.t > TAP_TIME) return;
  if (now - lastTap < DOUBLE_TAP) { queue.push('board'); lastTap = 0; }
  else lastTap = now;
}
canvas.addEventListener('pointerup', event => endTouch(event, false));
canvas.addEventListener('pointercancel', event => endTouch(event, true));
canvas.addEventListener('lostpointercapture', event => touches.delete(event.pointerId));
window.addEventListener('blur', () => touches.clear());

window.addEventListener('keydown', event => {
  if (event.target.closest?.('dialog,input,textarea,select,button,summary,a,#maker-guide')) return;
  unlockAudio();
  const key = event.key.toLowerCase();
  if (runner.mode === 'play') return;
  if ((key === 'enter' || key === ' ') && performance.now() - resultAt > 700) {
    event.preventDefault();
    primary.click();
  }
});
for (const id of ['round-primary', 'round-restart']) document.getElementById(id).addEventListener('click', unlockAudio);

// ---------- 소리 ----------
function updateSoundButton() {
  soundToggle.textContent = profile.sound ? '소리 켬 🔊' : '소리 끔 🔇';
  soundToggle.setAttribute('aria-pressed', String(profile.sound));
}
soundToggle.addEventListener('click', () => {
  profile.sound = !profile.sound;
  setSoundEnabled(profile.sound);
  saveProfile(profile);
  unlockAudio();
  updateSoundButton();
  canvas.focus({ preventScroll: true });
});

// ---------- 캐릭터와 보드 고르기 ----------
const SHOP = {
  hero: { list: HEROES, owned: () => profile.owned.heroes, portrait: heroPortrait },
  board: { list: BOARDS, owned: () => profile.owned.boards, portrait: boardPortrait },
};

function syncOverlay(mode) {
  const show = mode === 'start' || mode === 'result';
  shop.hidden = !show;
  recordLine.hidden = !show;
  refreshShop();
}

function makeChip(kind, item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.dataset.kind = kind;
  button.dataset.id = item.id;
  const name = document.createElement('span'); name.className = 'name'; name.textContent = item.name;
  const price = document.createElement('span'); price.className = 'price';
  button.append(SHOP[kind].portrait(item.id), name, price);
  button.addEventListener('click', () => choose(kind, item));
  return button;
}

function choose(kind, item) {
  const owned = SHOP[kind].owned();
  if (!owned.includes(item.id)) {
    if (profile.coins < item.price) return;
    profile.coins -= item.price;
    owned.push(item.id);
    unlockAudio();
    sfx.buy();
  }
  profile[kind] = item.id;
  saveProfile(profile);
  if (kind === 'hero') runner.state.hero = item.id;
  else runner.state.boardStyle = item.id;
  refreshShop();
}

function refreshShop() {
  recordLine.textContent = `최고 점수 ${profile.best} · 모은 코인 ${profile.coins}`;
  for (const button of shop.querySelectorAll('.chip')) {
    const kind = button.dataset.kind, item = SHOP[kind].list.find(entry => entry.id === button.dataset.id);
    const owned = SHOP[kind].owned().includes(item.id), selected = profile[kind] === item.id;
    button.classList.toggle('selected', selected);
    button.classList.toggle('locked', !owned);
    button.disabled = !owned && profile.coins < item.price;
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.price').textContent = owned ? (selected ? '선택됨' : '보유') : `● ${item.price}`;
    button.title = owned ? item.name : `${item.name}: 코인 ${item.price}개로 열기`;
  }
}

heroList.replaceChildren(...HEROES.map(hero => makeChip('hero', hero)));
boardList.replaceChildren(...BOARDS.map(board => makeChip('board', board)));
updateSoundButton();
syncOverlay(runner.mode);
