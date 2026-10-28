import { mountGame } from './game-shell.js';
import { CONFIG } from './config.mjs';
import { createGame, updateGame } from './game.mjs';
import { drawGame } from './draw.mjs';
import { unlockAudio } from './audio.mjs';

window.addEventListener('pointerdown', () => unlockAudio(), { passive: true });
window.addEventListener('keydown', () => unlockAudio());

mountGame({
  title: CONFIG.title,
  description: '같은 과일을 붙여 더 큰 과일로 만들어 봐.\n수박을 만들고, 빨간 선을 넘지 않게 쌓아.',
  controls: '손가락이나 마우스를 좌우로 움직여 위치를 고르고, 화면을 누르면 과일이 떨어져.\n키보드: ← → 이동, Space 떨어뜨리기, ESC 쉬기.',
  width: CONFIG.view.width,
  height: CONFIG.view.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render(ctx, state) {
    drawGame(ctx, state);
  },
});
