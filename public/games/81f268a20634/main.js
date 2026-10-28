import { mountGame } from './game-shell.js';
import { CONFIG } from './config.mjs';
import { createGame, updateGame } from './game.mjs';
import { render, loadArt } from './draw.mjs';
import { W, H } from './layout.mjs';
import { unlockAudio } from './sound.mjs';

loadArt();
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });

mountGame({
  title: CONFIG.title,
  description: `동물 친구들과 우노 한 판!\n같은 색이나 같은 숫자·기호의 카드를 내서 손에 든 카드를 가장 먼저 모두 털어내 봐.\n1장 남으면 꼭 '우노!'를 눌러야 해. 라운드 승자는 남은 카드 점수를 모두 가져가고, ${CONFIG.rules.targetScore}점을 먼저 모으면 최종 우승!`,
  controls: '휴대폰: 낼 카드를 톡 · 낼 카드가 없으면 카드 더미나 [카드 뽑기] · 1장 남기 전에 [우노!] · 친구가 우노를 잊으면 [지적!]\nPC: 카드 클릭 또는 ←→ 고르고 Enter · D 뽑기 · P 넘기기 · U 우노 · C 지적 · 1~4 색 고르기 · ESC 쉬기',
  width: W,
  height: H,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});
