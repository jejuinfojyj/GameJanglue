import { mountGame } from './game-shell.js';
import { CONFIG, controlLayout } from './config.mjs';
import { bindArenaInput, clearArenaInput, createGame, formatTime, playInput, updateGame } from './game.mjs';

const canvas = document.getElementById('game-canvas');
bindArenaInput(canvas);

const runner = mountGame({
  title: CONFIG.title,
  description: '넓은 잔디 경기장에서 먹이를 먹어 뱀을 길게 키워. 다른 뱀의 몸은 피하고, 상대가 내 몸에 부딪히면 그 뱀이 남긴 먹이를 주워.',
  controls: '왼쪽 조이스틱으로 방향을 밀고, 오른쪽 부스트를 길게 누르면 빨라져. 부스트는 몸길이를 써. 컴퓨터에서는 마우스나 WASD, 부스트는 클릭이나 스페이스야.',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});

mountSkins(runner);
bindAudio();

function render(ctx, state) {
  const camera = state.camera;
  const scale = CONFIG.width / CONFIG.viewWidth;
  ctx.fillStyle = '#0c2416';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.save();
  ctx.translate(CONFIG.width / 2, CONFIG.height / 2);
  ctx.scale(scale, scale);
  ctx.translate(-camera.x, -camera.y);
  drawArena(ctx, state);
  for (const food of state.foods) drawFood(ctx, food, state.time);
  for (const spark of state.sparkles) drawSpark(ctx, spark);
  const bots = state.snakes.filter((snake) => snake.alive && !snake.isPlayer);
  for (const snake of bots) drawSnake(ctx, snake);
  const player = state.snakes.find((snake) => snake.isPlayer && snake.alive);
  if (player) drawSnake(ctx, player);
  for (const floater of state.floaters) drawFloater(ctx, floater);
  ctx.restore();
  if (state.danger > 0) {
    ctx.fillStyle = `rgba(255, 64, 48, ${state.danger * 0.28})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }
  drawHud(ctx, state);
  drawControls(ctx, player);
  playEvents(state.events);
}

function drawArena(ctx, state) {
  ctx.fillStyle = '#1f7a3a';
  ctx.fillRect(0, 0, CONFIG.world, CONFIG.world);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  const blobs = [[400, 500, 180, 120], [1500, 700, 220, 140], [900, 1500, 260, 160], [1700, 1600, 180, 200], [600, 1100, 140, 90]];
  for (const [x, y, rx, ry] of blobs) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const viewHeight = CONFIG.height / (CONFIG.width / CONFIG.viewWidth);
  const left = Math.max(0, Math.floor((state.camera.x - CONFIG.viewWidth) / 48) * 48);
  const top = Math.max(0, Math.floor((state.camera.y - viewHeight) / 48) * 48);
  const right = Math.min(CONFIG.world, state.camera.x + CONFIG.viewWidth);
  const bottom = Math.min(CONFIG.world, state.camera.y + viewHeight);
  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  for (let x = left; x <= right; x += 48) {
    for (let y = top; y <= bottom; y += 48) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = state.danger > 0.25 ? '#ffb4a2' : '#e7ffb0';
  ctx.lineWidth = 12;
  ctx.strokeRect(CONFIG.margin, CONFIG.margin, CONFIG.world - CONFIG.margin * 2, CONFIG.world - CONFIG.margin * 2);
}

function drawFood(ctx, food, time) {
  const pulse = food.kind === 'special' ? 1 + Math.sin(time * 5) * 0.14 : 1;
  const radius = food.r * pulse;
  ctx.save();
  ctx.translate(food.x, food.y);
  ctx.fillStyle = food.color;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(-radius * 0.28, -radius * 0.32, radius * 0.32, 0, Math.PI * 2);
  ctx.fill();
  if (food.kind === 'special') {
    ctx.strokeStyle = '#fff6bf';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpark(ctx, spark) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, spark.life * 2);
  ctx.fillStyle = spark.color;
  ctx.beginPath();
  ctx.arc(spark.x, spark.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSnake(ctx, snake) {
  const parts = snake.parts.length ? snake.parts : [{ x: snake.x, y: snake.y }];
  ctx.save();
  if (snake.boosting) {
    ctx.strokeStyle = 'rgba(255, 244, 180, 0.45)';
    ctx.lineWidth = snake.radius * 1.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    parts.forEach((part, index) => index === 0 ? ctx.moveTo(part.x, part.y) : ctx.lineTo(part.x, part.y));
    ctx.stroke();
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    const shade = 0.55 + 0.45 * (1 - i / Math.max(1, parts.length - 1));
    ctx.fillStyle = tint(snake.color, shade);
    ctx.beginPath();
    const radius = i === 0 ? snake.radius * (1.12 + snake.gulp * 1.4) : snake.radius;
    ctx.arc(part.x, part.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const head = parts[0];
  ctx.translate(head.x, head.y);
  ctx.rotate(snake.angle);
  const spread = snake.radius * 0.36;
  const forward = snake.radius * 0.28;
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(forward, side * spread, snake.radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c2430';
    ctx.beginPath();
    ctx.arc(forward + snake.radius * 0.08, side * spread, snake.radius * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  if (snake.gulp > 0) {
    ctx.strokeStyle = '#1c2430';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(forward * 0.2, 0, snake.radius * 0.22, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  if (snake.isPlayer) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, snake.radius * (1.28 + snake.gulp), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFloater(ctx, floater) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, floater.life * 2));
  ctx.fillStyle = floater.color;
  ctx.font = '700 22px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(floater.text, floater.x, floater.y);
  ctx.restore();
}

function drawHud(ctx, state) {
  roundRect(ctx, 12, 12, 148, 78, 16);
  ctx.fillStyle = 'rgba(7, 28, 16, 0.62)';
  ctx.fill();
  ctx.fillStyle = '#f4ffe9';
  ctx.textAlign = 'left';
  ctx.font = '800 20px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText(String(state.score), 26, 40);
  ctx.font = '600 13px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillStyle = '#d9f5c8';
  ctx.fillText('최고 ' + state.best, 26, 60);
  ctx.fillText('시간 ' + formatTime(state.time), 26, 80);

  const rows = state.snakes.filter((snake) => snake.alive || snake.isPlayer).sort((a, b) => b.score - a.score).slice(0, 5);
  const boardX = CONFIG.width - 156;
  roundRect(ctx, boardX, 12, 144, 28 + rows.length * 22, 16);
  ctx.fillStyle = 'rgba(7, 28, 16, 0.62)';
  ctx.fill();
  ctx.fillStyle = '#ffe08a';
  ctx.font = '700 12px "Malgun Gothic", system-ui, sans-serif';
  ctx.fillText('순위', boardX + 12, 32);
  rows.forEach((snake, index) => {
    const y = 54 + index * 22;
    ctx.fillStyle = snake.isPlayer ? '#ffffff' : '#d7f5c4';
    ctx.font = '600 13px "Malgun Gothic", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${index + 1} ${snake.name}`, boardX + 12, y);
    ctx.textAlign = 'right';
    ctx.fillText(String(snake.score), boardX + 132, y);
  });
  ctx.textAlign = 'left';
}

function drawControls(ctx, player) {
  const { stick, boost } = controlLayout();
  const knobX = stick.x + (playInput.stick?.dx || 0);
  const knobY = stick.y + (playInput.stick?.dy || 0);
  ctx.fillStyle = 'rgba(6, 24, 14, 0.4)';
  ctx.beginPath();
  ctx.arc(stick.x, stick.y, stick.base, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = playInput.stick ? '#ffe08a' : 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.arc(knobX, knobY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#14301c';
  ctx.font = '700 11px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('이동', stick.x, stick.y + stick.base + 16);

  const ready = !player || player.length > CONFIG.minLength + 6;
  const active = !!player?.boosting;
  roundRect(ctx, boost.x, boost.y, boost.w, boost.h, 22);
  ctx.fillStyle = active ? '#fff1b0' : ready ? '#ffe08a' : 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.fillStyle = '#1a2a16';
  ctx.font = '800 16px "Malgun Gothic", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(active ? '부스트!' : ready ? '부스트' : '몸이 짧아', boost.x + boost.w / 2, boost.y + 42);
  ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function tint(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const channel = (shift) => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * amount)));
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

function mountSkins(current) {
  const host = document.getElementById('skin-picker');
  const paint = () => {
    host.replaceChildren();
    const label = document.createElement('span');
    label.className = 'skin-label';
    label.textContent = '내 뱀 색';
    host.appendChild(label);
    for (const skin of CONFIG.skins) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = skin.name;
      button.style.background = skin.color;
      button.classList.toggle('is-selected', skin.id === current.state.skinId);
      button.addEventListener('click', () => {
        current.state.skinId = skin.id;
        const player = current.state.snakes.find((snake) => snake.isPlayer);
        if (player) player.color = skin.color;
        try { localStorage.setItem('snake.io.skin', skin.id); } catch { /* 다음 판 색은 이번 화면에만 남는다. */ }
        paint();
      });
      host.appendChild(button);
    }
  };
  paint();
  document.getElementById('round-primary')?.addEventListener('click', clearArenaInput);
  document.getElementById('round-restart')?.addEventListener('click', clearArenaInput);
}

let audioCtx;
function bindAudio() {
  const unlock = () => {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function tone(freq, duration, type, volume) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playEvents(events) {
  for (const event of events) {
    if (event === 'eat') tone(640, 0.08, 'sine', 0.05);
    if (event === 'special') { tone(760, 0.1, 'triangle', 0.06); tone(1040, 0.12, 'sine', 0.04); }
    if (event === 'boost') tone(210, 0.1, 'sawtooth', 0.025);
    if (event === 'kill') tone(540, 0.14, 'square', 0.035);
    if (event === 'die') tone(130, 0.28, 'triangle', 0.05);
  }
  events.length = 0;
}
