import { mountGame } from './game-shell.js';
import { CONFIG, KEYS } from './config.mjs';
import { createGame, updateGame } from './game.mjs';
import { renderGame, LAYOUT } from './render.mjs';
import { HEROES, PETS, heroSprite, petSprite, findPet } from './characters.mjs';
import { loadProfile, saveProfile } from './profile.mjs';
import { sfx, unlockAudio, setSoundEnabled } from './sound.mjs';

const profile = loadProfile({ heroIds: HEROES.map(h => h.id), petIds: PETS.map(p => p.id) });
setSoundEnabled(profile.sound);

const canvas = document.getElementById('game-canvas');
const primary = document.getElementById('round-primary');
const shop = document.getElementById('shop');
const recordLine = document.getElementById('record-line');
const heroList = document.getElementById('hero-list');
const petList = document.getElementById('pet-list');
const soundToggle = document.getElementById('sound-toggle');

const queue = [];
let runner = null, lastMode = '', resultAt = 0;

function choice() {
  const pet = findPet(profile.pet);
  return { hero: profile.hero, pet: pet.id, coinMultiplier: pet.coinMultiplier, gainBonus: pet.gainBonus };
}

function finishRun(state) {
  state.saved = true;
  const previous = profile.best;
  profile.coins += state.coins;
  profile.best = Math.max(profile.best, state.score);
  saveProfile(profile);
  const newBest = state.score > previous;
  const why = state.result.reason === 'time' ? '시간 막대가 다 줄었어!' : '방향을 잘못 골라 떨어졌어!';
  state.result.success = newBest;
  state.result.message = (newBest ? `새 최고 기록! ${state.score}계단` : `${state.score}계단 올랐어 (최고 ${profile.best}계단)`)
    + `\n${why}\n코인 +${state.coins} · 모은 코인 ${profile.coins}`;
  resultAt = performance.now();
  refreshShop();
}

runner = mountGame({
  title: CONFIG.title,
  description: '구름 위까지 이어진 계단을 한 칸씩 올라가자!\n계단이 꺾이는 곳에서는 방향을 바꿔야 해. 시간 막대가 다 줄거나 허공을 밟으면 끝!',
  controls: '휴대폰: 화면 왼쪽 = 방향 바꾸기, 오른쪽 = 오르기\nPC: F·← 방향 바꾸기 / J·→ 오르기 / Esc 쉬기',
  width: LAYOUT.width,
  height: LAYOUT.height,
  theme: CONFIG.palette,
  create: () => createGame(choice()),
  update(state, dt) {
    updateGame(state, dt, queue.splice(0));
    for (const event of state.events.splice(0)) sfx[event]?.(state);
    if (state.result && !state.saved) finishRun(state);
  },
  render(ctx, state, view) {
    const mode = runner?.mode || 'start';
    if (mode !== 'play') queue.length = 0;
    renderGame(ctx, state, { ...view, mode });
    if (mode !== lastMode) { lastMode = mode; syncOverlay(mode); }
  },
});

function syncOverlay(mode) {
  const showShop = mode === 'start' || mode === 'result';
  shop.hidden = !showShop;
  recordLine.hidden = !showShop;
  refreshShop();
}

// 화면 왼쪽 절반은 방향 바꾸기, 오른쪽 절반은 오르기. 손가락마다 한 번씩 입력된다.
canvas.addEventListener('pointerdown', event => {
  unlockAudio();
  if (runner.mode !== 'play') return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  queue.push((event.clientX - rect.left) / rect.width < 0.5 ? 'turn' : 'climb');
});

window.addEventListener('keydown', event => {
  if (event.target.closest?.('dialog,input,textarea,select,button,summary,a,#maker-guide')) return;
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (runner.mode === 'play') {
    if (KEYS.climb.includes(key)) queue.push('climb');
    else if (KEYS.turn.includes(key)) queue.push('turn');
    return;
  }
  if ((key === 'enter' || key === ' ') && runner.mode !== 'pause' && performance.now() - resultAt > 700) {
    event.preventDefault();
    unlockAudio();
    primary.click();
  }
});

for (const id of ['round-primary', 'round-restart']) document.getElementById(id).addEventListener('click', unlockAudio);

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

const ownedList = kind => profile.owned[kind === 'hero' ? 'heroes' : 'pets'];

function makeChip(kind, item, sprite) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'chip';
  button.dataset.kind = kind;
  button.dataset.id = item.id;
  const art = document.createElement('canvas');
  art.width = 40; art.height = 48;
  const g = art.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (sprite) {
    const scale = Math.min(40 / sprite.width, 48 / sprite.height), w = sprite.width * scale, h = sprite.height * scale;
    g.drawImage(sprite, (40 - w) / 2, 48 - h, w, h);
  } else {
    g.strokeStyle = '#ffffff88'; g.lineWidth = 3; g.setLineDash([5, 4]);
    g.beginPath(); g.arc(20, 26, 13, 0, Math.PI * 2); g.stroke();
  }
  const name = document.createElement('span'); name.className = 'name'; name.textContent = item.name;
  const price = document.createElement('span'); price.className = 'price';
  button.append(art, name, price);
  button.addEventListener('click', () => choose(kind, item));
  return button;
}

function choose(kind, item) {
  const owned = ownedList(kind);
  if (!owned.includes(item.id)) {
    if (profile.coins < item.price) return;
    profile.coins -= item.price;
    owned.push(item.id);
    unlockAudio();
    sfx.buy();
  }
  profile[kind] = item.id;
  saveProfile(profile);
  const state = runner.state;
  if (kind === 'hero') state.hero = item.id;
  else Object.assign(state, { pet: item.id, coinMultiplier: item.coinMultiplier, gainBonus: item.gainBonus });
  refreshShop();
}

function refreshShop() {
  recordLine.textContent = `최고 기록 ${profile.best}계단 · 모은 코인 ${profile.coins}`;
  for (const button of shop.querySelectorAll('.chip')) {
    const kind = button.dataset.kind, list = kind === 'hero' ? HEROES : PETS;
    const item = list.find(entry => entry.id === button.dataset.id);
    const owned = ownedList(kind).includes(item.id), selected = profile[kind] === item.id;
    button.classList.toggle('selected', selected);
    button.classList.toggle('locked', !owned);
    button.disabled = !owned && profile.coins < item.price;
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.price').textContent = owned ? (selected ? '선택됨' : (item.perk || '보유')) : `● ${item.price}`;
    button.title = owned ? item.name + (item.perk ? ' · ' + item.perk : '') : `${item.name}: 코인 ${item.price}개로 열기`;
  }
}

heroList.replaceChildren(...HEROES.map(hero => makeChip('hero', hero, heroSprite(hero))));
petList.replaceChildren(...PETS.map(pet => makeChip('pet', pet, petSprite(pet))));
updateSoundButton();
syncOverlay(runner.mode);
