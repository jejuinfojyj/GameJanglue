import { mountGame } from './game-shell.js';
import {
  CONFIG,
  COOKIES,
  PETS,
  TREASURES,
  MODES,
  STORY_EPISODES,
} from './config.mjs';
import {
  createGame,
  updateGame,
  beginButtons,
  registerButton,
  cookieById,
  petById,
  findCombo,
} from './game.mjs';

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

function drawButton(ctx, state, id, x, y, w, h, label, opts = {}) {
  registerButton(state, id, x, y, w, h);
  const active = state.ui.pressId === id || opts.selected;
  roundRect(ctx, x, y, w, h, opts.radius ?? 14);
  ctx.fillStyle = active ? opts.activeFill || CONFIG.palette.primary : opts.fill || CONFIG.palette.surface;
  ctx.fill();
  if (opts.selected) {
    ctx.strokeStyle = CONFIG.palette.primary;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.fillStyle = opts.color || CONFIG.palette.text;
  ctx.font = opts.font || '700 15px "Trebuchet MS", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = String(label).split('\n');
  const mid = y + h / 2 - (lines.length - 1) * 9;
  lines.forEach((line, i) => ctx.fillText(line, x + w / 2, mid + i * 18));
}

function drawCookieFace(ctx, cookie, x, y, size, sliding) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  if (sliding) ctx.scale(1.15, 0.72);
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = cookie.color;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -s * 0.08, s * 0.32, Math.PI, 0);
  ctx.fillStyle = cookie.icing;
  ctx.fill();
  ctx.fillStyle = '#3a2418';
  ctx.beginPath();
  ctx.arc(-s * 0.14, -s * 0.02, s * 0.06, 0, Math.PI * 2);
  ctx.arc(s * 0.14, -s * 0.02, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, s * 0.12, s * 0.1, 0, Math.PI);
  ctx.strokeStyle = '#3a2418';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawPet(ctx, pet, x, y, t) {
  const bob = Math.sin(t * 6) * 4;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = pet.color;
  ctx.fill();
  ctx.fillStyle = '#2b1a14';
  ctx.beginPath();
  ctx.arc(-5, -2, 2.5, 0, Math.PI * 2);
  ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, scroll, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, CONFIG.palette.skyTop);
  g.addColorStop(0.55, '#c45c5c');
  g.addColorStop(1, CONFIG.palette.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const ground = CONFIG.groundY;
  // Distant sugar hills and clouds move more slowly than the playable lane.
  ctx.fillStyle = '#ffdaad22';
  for (let i = -1; i < 7; i++) {
    const x = i * 160 - (scroll * 0.12) % 160;
    ctx.beginPath();
    ctx.ellipse(x, ground - 24, 112, 122 + (i % 2) * 24, 0, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = '#fff2d924';
  for (let i = -1; i < 6; i++) {
    const x = i * 190 - (scroll * 0.07) % 190;
    ctx.beginPath();
    ctx.ellipse(x, 112 + (i % 3) * 24, 36, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = -1; i < 6; i++) {
    const bx = ((i * 180 - (scroll * 0.3) % 180) );
    roundRect(ctx, bx, ground - 160, 70, 90, 8);
    ctx.fillStyle = '#4a2433aa';
    ctx.fill();
  }

  ctx.fillStyle = CONFIG.palette.ground;
  ctx.fillRect(0, ground, w, h - ground);
  ctx.fillStyle = CONFIG.palette.groundTop;
  ctx.fillRect(0, ground, w, 14);
  ctx.fillStyle = '#f7bc78';
  ctx.fillRect(0, ground, w, 3);

  ctx.fillStyle = '#00000022';
  for (let i = 0; i < 12; i++) {
    const tx = (i * 90 - (scroll * 0.8) % 90);
    ctx.fillRect(tx, ground + 18, 40, 8);
  }
}

function drawHud(ctx, state, w) {
  const run = state.run;
  const r = run.runner;
  ctx.fillStyle = '#00000055';
  roundRect(ctx, 12, 10, w - 24, 54, 12);
  ctx.fill();

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '800 20px "Trebuchet MS", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.floor(run.score).toLocaleString('ko-KR'), 28, 28);

  ctx.font = '600 13px "Trebuchet MS", "Malgun Gothic", sans-serif';
  ctx.fillStyle = CONFIG.palette.muted;
  let sub = run.mode.name;
  if (run.duration) sub += ` · ${Math.max(0, Math.ceil(run.duration - run.time))}초`;
  if (run.targetScore) sub += ` · 목표 ${run.targetScore.toLocaleString('ko-KR')}`;
  if (run.mode.id === 'pack') sub += ` · 자원 ${run.resources} · 남은 쿠키 ${run.packQueue?.length || 0}`;
  ctx.fillText(sub, 28, 48);

  // hearts
  for (let i = 0; i < r.maxHp; i++) {
    ctx.beginPath();
    const hx = w - 28 - (r.maxHp - 1 - i) * 22;
    ctx.arc(hx, 28, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < r.hp ? CONFIG.palette.danger : '#ffffff33';
    ctx.fill();
  }
  if (r.shield > 0) {
    ctx.strokeStyle = CONFIG.palette.shield;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CONFIG.runnerX, r.y + r.height * 0.4, 38, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (run.rival) {
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.palette.accent;
    ctx.font = '700 14px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.fillText(
      `${run.rival.name} ${Math.floor(run.rival.score).toLocaleString('ko-KR')}`,
      w - 28,
      50,
    );
  }

  if (r.combo) {
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.palette.primary;
    ctx.font = '700 12px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.fillText(`조합: ${r.combo.name}`, w / 2, 28);
  }
}

function drawRun(ctx, state, view) {
  const run = state.run;
  const r = run.runner;
  const { width: w, height: h, time } = view;
  drawBackground(ctx, run.scroll, w, h);

  for (const item of run.items) {
    if (item.type === 'jelly') {
      ctx.save();
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(run.time * 3 + item.x * 0.02) * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(9, -2);
      ctx.lineTo(6, 8);
      ctx.lineTo(-6, 8);
      ctx.lineTo(-9, -2);
      ctx.closePath();
      ctx.fillStyle = CONFIG.palette.jelly;
      ctx.fill();
      ctx.strokeStyle = '#ffe3f2';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#fff9';
      ctx.fillRect(-4, -5, 3, 5);
      ctx.restore();
    } else if (item.type === 'coin') {
      ctx.beginPath();
      ctx.arc(item.x + 11, item.y + 11, 10, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.palette.coin;
      ctx.fill();
      ctx.strokeStyle = '#fff0a8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff8';
      ctx.fillRect(item.x + 8, item.y + 6, 6, 10);
    } else if (item.type === 'obstacle') {
      roundRect(ctx, item.x, item.y, item.w, item.h, 6);
      ctx.fillStyle = item.kind === 'high' ? '#5c3d2e' : '#8b4518';
      ctx.fill();
      ctx.strokeStyle = '#f1af6b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#2b1a14aa';
      ctx.fillRect(item.x + 4, item.y + 4, item.w - 8, 8);
      ctx.strokeStyle = '#eaa05b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(item.x + 8, item.y + 16);
      ctx.lineTo(item.x + item.w - 8, item.y + item.h - 7);
      ctx.moveTo(item.x + item.w - 8, item.y + 16);
      ctx.lineTo(item.x + 8, item.y + item.h - 7);
      ctx.stroke();
      // An overhead obstacle is readable as a slide gate before it reaches the runner.
      if (item.kind === 'high') {
        ctx.fillStyle = CONFIG.palette.accent;
        ctx.font = '800 12px "Malgun Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('↓', item.x + item.w / 2, item.y - 8);
      }
    }
  }

  ctx.fillStyle = '#351a2344';
  ctx.beginPath();
  const height = Math.max(0, CONFIG.groundY - r.y - r.height);
  ctx.ellipse(CONFIG.runnerX, CONFIG.groundY - 1, Math.max(11, 25 - height * 0.08), 5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const particle of run.particles) {
    ctx.globalAlpha = Math.min(1, particle.life * 3);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const blink = r.invuln > 0 && Math.floor(r.invuln * 12) % 2 === 0;
  if (!blink) {
    const stride = r.onGround && !r.sliding ? Math.sin(run.time * 19) : 0;
    const bob = r.onGround && !r.sliding ? Math.abs(stride) * 2 : 0;
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CONFIG.runnerX - 7, r.y + r.height - 13);
    ctx.lineTo(CONFIG.runnerX - 11 + stride * 7, r.y + r.height - 3);
    ctx.moveTo(CONFIG.runnerX + 7, r.y + r.height - 13);
    ctx.lineTo(CONFIG.runnerX + 10 - stride * 7, r.y + r.height - 3);
    ctx.stroke();
    drawCookieFace(ctx, r.cookie, CONFIG.runnerX, r.y + r.height * 0.42 - bob, r.sliding ? 44 : 50, r.sliding);
  }
  drawPet(ctx, r.pet, CONFIG.runnerX - 48, r.y + 18, time);

  for (const fx of run.fx) {
    ctx.globalAlpha = Math.max(0, fx.life / 0.8);
    ctx.fillStyle = fx.color;
    ctx.font = '800 14px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fx.text, fx.x, fx.y);
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, state, w);

  // touch controls
  drawButton(ctx, state, 'jump', 24, h - 78, 150, 58, '점프', {
    fill: '#ffffff22',
    activeFill: CONFIG.palette.primary,
    font: '800 18px "Trebuchet MS", "Malgun Gothic", sans-serif',
  });
  drawButton(ctx, state, 'slide', w - 174, h - 78, 150, 58, '슬라이드', {
    fill: '#ffffff22',
    activeFill: CONFIG.palette.accent,
    selected: r.sliding,
    font: '800 18px "Trebuchet MS", "Malgun Gothic", sans-serif',
  });

  if (state.toastLife > 0) {
    ctx.globalAlpha = Math.min(1, state.toastLife);
    roundRect(ctx, w / 2 - 160, 70, 320, 36, 12);
    ctx.fillStyle = '#00000088';
    ctx.fill();
    ctx.fillStyle = CONFIG.palette.text;
    ctx.font = '700 14px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.toast, w / 2, 88);
    ctx.globalAlpha = 1;
  }
}

function drawHub(ctx, state, view) {
  const { width: w, height: h } = view;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#3a1828');
  g.addColorStop(1, '#8b3a3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '800 28px "Trebuchet MS", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('쿠키런 오븐브레이크', w / 2, 48);
  ctx.font = '600 14px "Trebuchet MS", "Malgun Gothic", sans-serif';
  ctx.fillStyle = CONFIG.palette.muted;
  ctx.fillText('쿠키·펫·보물을 골라 달리고, 모드마다 다른 목표에 도전!', w / 2, 78);
  ctx.fillText(`최고 점수 ${state.best.toLocaleString('ko-KR')}`, w / 2, 100);

  MODES.forEach((mode, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 40 + col * 360;
    const y = 122 + row * 130;
    drawButton(ctx, state, `mode:${mode.id}`, x, y, 340, 112, '', {
      fill: '#2a1520cc',
      activeFill: '#5a3040',
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.palette.primary;
    ctx.font = '800 20px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.fillText(mode.name, x + 22, y + 34);
    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '600 13px "Trebuchet MS", "Malgun Gothic", sans-serif';
    wrapText(ctx, mode.blurb, x + 22, y + 58, 300, 16);
  });
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawLoadout(ctx, state, view) {
  const { width: w, height: h } = view;
  const mode = MODES.find((m) => m.id === state.modeId);
  ctx.fillStyle = '#241018';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '800 22px "Trebuchet MS", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(mode?.name || '준비', 24, 36);
  ctx.font = '600 13px "Trebuchet MS", "Malgun Gothic", sans-serif';
  ctx.fillStyle = CONFIG.palette.muted;
  ctx.fillText(mode?.blurb || '', 24, 58);

  drawButton(ctx, state, 'back', w - 110, 16, 90, 40, '뒤로', { fill: '#ffffff18' });
  drawButton(ctx, state, 'go', w - 220, h - 58, 196, 44, '달리기 시작!', {
    fill: CONFIG.palette.primary,
    color: '#3a1a10',
    font: '800 16px "Trebuchet MS", "Malgun Gothic", sans-serif',
  });

  const tabs = [];
  if (mode?.id === 'story') tabs.push(['story', '에피소드']);
  else if (mode?.id === 'pack') {
    tabs.push(['pack', '줄달림'], ['pet', '펫'], ['treasure', '보물']);
  } else if (mode?.id === 'challenge') {
    tabs.push(['cookie', '고정 쿠키'], ['treasure', '보물']);
  } else {
    tabs.push(['cookie', '쿠키'], ['pet', '펫'], ['treasure', '보물']);
  }

  tabs.forEach((tab, i) => {
    drawButton(ctx, state, `tab:${tab[0]}`, 24 + i * 110, 78, 100, 34, tab[1], {
      selected: state.loadout.loadoutTab === tab[0],
      fill: '#ffffff14',
      font: '700 13px "Trebuchet MS", "Malgun Gothic", sans-serif',
    });
  });

  const tab = state.loadout.loadoutTab;
  const combo = findCombo(state.loadout.cookieId, state.loadout.petId);

  if (tab === 'cookie') {
    COOKIES.forEach((c, i) => {
      const x = 24 + (i % 4) * 180;
      const y = 130 + Math.floor(i / 4) * 120;
      const locked = mode?.id === 'challenge' || mode?.id === 'story';
      const selected = state.loadout.cookieId === c.id;
      drawButton(ctx, state, `cookie:${c.id}`, x, y, 168, 100, '', {
        selected,
        fill: '#ffffff12',
      });
      drawCookieFace(ctx, c, x + 40, y + 48, 44, false);
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.palette.text;
      ctx.font = '700 14px "Trebuchet MS", "Malgun Gothic", sans-serif';
      ctx.fillText(c.name, x + 72, y + 36);
      ctx.fillStyle = CONFIG.palette.muted;
      ctx.font = '600 11px "Trebuchet MS", "Malgun Gothic", sans-serif';
      wrapText(ctx, locked && !selected ? c.blurb : c.blurb, x + 72, y + 56, 84, 14);
    });
  }

  if (tab === 'pack') {
    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '600 13px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`출전 순서: ${state.loadout.packCookies.map((id) => cookieById(id).name).join(' → ')}`, 24, 128);
    COOKIES.forEach((c, i) => {
      const x = 24 + (i % 4) * 180;
      const y = 148 + Math.floor(i / 4) * 110;
      const order = state.loadout.packCookies.indexOf(c.id);
      drawButton(ctx, state, `cookie:${c.id}`, x, y, 168, 96, '', {
        selected: order >= 0,
        fill: '#ffffff12',
      });
      drawCookieFace(ctx, c, x + 40, y + 48, 40, false);
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.palette.text;
      ctx.font = '700 14px "Trebuchet MS", "Malgun Gothic", sans-serif';
      ctx.fillText(order >= 0 ? `${order + 1}. ${c.name}` : c.name, x + 72, y + 40);
      ctx.fillStyle = CONFIG.palette.muted;
      ctx.font = '600 11px "Trebuchet MS", "Malgun Gothic", sans-serif';
      ctx.fillText('탭해서 순서에 추가', x + 72, y + 62);
    });
  }

  if (tab === 'pet') {
    PETS.forEach((p, i) => {
      const x = 24 + (i % 4) * 180;
      const y = 130 + Math.floor(i / 4) * 120;
      drawButton(ctx, state, `pet:${p.id}`, x, y, 168, 100, '', {
        selected: state.loadout.petId === p.id,
        fill: '#ffffff12',
      });
      drawPet(ctx, p, x + 40, y + 48, view.time);
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.palette.text;
      ctx.font = '700 14px "Trebuchet MS", "Malgun Gothic", sans-serif';
      ctx.fillText(p.name, x + 72, y + 36);
      ctx.fillStyle = CONFIG.palette.muted;
      ctx.font = '600 11px "Trebuchet MS", "Malgun Gothic", sans-serif';
      wrapText(ctx, p.blurb, x + 72, y + 56, 84, 14);
    });
  }

  if (tab === 'treasure') {
    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '600 13px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`보물 ${state.loadout.treasureIds.length}/3 선택`, 24, 128);
    TREASURES.forEach((t, i) => {
      const x = 24 + (i % 3) * 240;
      const y = 148 + Math.floor(i / 3) * 90;
      drawButton(ctx, state, `treasure:${t.id}`, x, y, 224, 78, '', {
        selected: state.loadout.treasureIds.includes(t.id),
        fill: '#ffffff12',
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.palette.primary;
      ctx.font = '800 15px "Trebuchet MS", "Malgun Gothic", sans-serif';
      ctx.fillText(t.name, x + 16, y + 28);
      ctx.fillStyle = CONFIG.palette.muted;
      ctx.font = '600 12px "Trebuchet MS", "Malgun Gothic", sans-serif';
      ctx.fillText(t.blurb, x + 16, y + 52);
    });
  }

  if (tab === 'story') {
    STORY_EPISODES.forEach((ep, i) => {
      const y = 130 + i * 88;
      const cleared = state.storyCleared.includes(ep.id);
      drawButton(ctx, state, `episode:${ep.id}`, 24, y, w - 48, 78, '', {
        selected: state.loadout.episodeId === ep.id,
        fill: '#ffffff12',
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = CONFIG.palette.primary;
      ctx.font = '800 16px "Trebuchet MS", "Malgun Gothic", sans-serif';
      ctx.fillText(`${ep.title}${cleared ? ' ✓' : ''}`, 44, y + 28);
      ctx.fillStyle = CONFIG.palette.muted;
      ctx.font = '600 12px "Trebuchet MS", "Malgun Gothic", sans-serif';
      ctx.fillText(`${ep.text} · 목표 ${ep.targetScore.toLocaleString('ko-KR')}`, 44, y + 52);
    });
  }

  if (combo && mode?.id !== 'story') {
    ctx.fillStyle = CONFIG.palette.accent;
    ctx.font = '700 13px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`조합 보너스: ${combo.name} — ${combo.blurb}`, 24, h - 78);
  } else if (mode?.id !== 'story') {
    const c = cookieById(state.loadout.cookieId);
    const p = petById(state.loadout.petId);
    ctx.fillStyle = CONFIG.palette.muted;
    ctx.font = '600 13px "Trebuchet MS", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${c.name} + ${p.name} · 다른 조합을 시험해 보세요`, 24, h - 78);
  }
}

function render(ctx, state, view) {
  beginButtons(state);
  if (state.phase === 'hub') drawHub(ctx, state, view);
  else if (state.phase === 'loadout') drawLoadout(ctx, state, view);
  else if (state.phase === 'run' && state.run) drawRun(ctx, state, view);
  else {
    ctx.fillStyle = CONFIG.palette.background;
    ctx.fillRect(0, 0, view.width, view.height);
  }
}

mountGame({
  title: CONFIG.title,
  description:
    '쿠키마다 다른 능력, 펫 조합 보너스, 보물 3칸을 장착하고 달려 봐. 경기장·떼탈출·쿠키의 도전·스토리 모드가 있어!',
  controls: '점프: 화면 위쪽·점프 버튼·스페이스/↑ · 슬라이드: 아래쪽·슬라이드 버튼·↓/S를 누르고 있기 (떼면 일어남)',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render,
});
