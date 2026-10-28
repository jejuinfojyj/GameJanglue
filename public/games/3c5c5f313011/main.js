import { mountGame } from './game-shell.js';
import { CONFIG, WORLD } from './config.mjs';
import { createGame, updateGame } from './game.mjs';
import { render, loadArt } from './draw.mjs';
import { unlockAudio } from './sound.mjs';

loadArt();
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });

mountGame({
  title: CONFIG.title,
  description: '알을 훔쳐 간 돼지들이 요새에 숨었어!\n새총으로 새를 날려 3단계 요새의 돼지를 모두 물리쳐 줘.',
  controls: '휴대폰: 화면을 누른 채 뒤로 끌었다가 놓으면 발사. 날아가는 동안 화면을 톡 누르면 새마다 다른 능력!\nPC: 마우스로 끌어서 쏘기 · ↑↓ 각도 · ←→ 힘 · Space 발사와 능력 · ESC 쉬기',
  width: WORLD.width,
  height: WORLD.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});
