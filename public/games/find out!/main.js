import { mountGame } from './game-shell.js';
import { CONFIG, STAGES, stageById } from './config.mjs';
import {
  createGame,
  updateGame,
  hubCards,
  sceneRect,
  listY,
  getUiButtons,
  getInventorySlot,
  getStageProgress,
  visibleFind,
  getCoverBox,
  stageUnlocked,
} from './game.mjs';

const P = CONFIG.palette;

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

function fillRound(ctx, x, y, w, h, r, fill) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function text(ctx, str, x, y, opts = {}) {
  ctx.fillStyle = opts.color || P.text;
  ctx.font = `${opts.weight || 700} ${opts.size || 16}px "Malgun Gothic","Apple SD Gothic Neo",sans-serif`;
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'middle';
  ctx.fillText(str, x, y);
}

function emoji(ctx, mark, x, y, size) {
  ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Malgun Gothic",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mark, x, y);
}

function drawSky(ctx, stage, scene) {
  const g = ctx.createLinearGradient(scene.x, scene.y, scene.x, scene.y + scene.h);
  stage.sky.forEach((c, i) => g.addColorStop(i / (stage.sky.length - 1), c));
  fillRound(ctx, scene.x, scene.y, scene.w, scene.h, 22, g);
  fillRound(ctx, scene.x, scene.y + scene.h * 0.62, scene.w, scene.h * 0.38, 0, stage.floor);
  ctx.beginPath();
  ctx.moveTo(scene.x, scene.y + scene.h * 0.62);
  ctx.lineTo(scene.x + scene.w, scene.y + scene.h * 0.62);
  ctx.lineTo(scene.x + scene.w, scene.y + scene.h);
  ctx.lineTo(scene.x, scene.y + scene.h);
  ctx.closePath();
  ctx.fillStyle = stage.floor;
  ctx.fill();
  fillRound(ctx, scene.x + 18, scene.y + 24, scene.w - 36, scene.h * 0.42, 16, stage.wall);
  // Wall panels and floorboards make the objects belong to a room.
  ctx.strokeStyle = '#724b3930';
  ctx.lineWidth = 2;
  for (let x = scene.x + 40; x < scene.x + scene.w - 20; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, scene.y + 30);
    ctx.lineTo(x, scene.y + scene.h * 0.48);
    ctx.stroke();
  }
  ctx.strokeStyle = '#261b3040';
  for (let y = scene.y + scene.h * 0.68; y < scene.y + scene.h; y += 28) {
    ctx.beginPath();
    ctx.moveTo(scene.x + 4, y);
    ctx.lineTo(scene.x + scene.w - 4, y);
    ctx.stroke();
  }
}

function drawScenery(ctx, stage, runtime) {
  for (const prop of stage.scenery) {
    const cx = prop.x + prop.w / 2;
    const cy = prop.y + prop.h / 2;
    if (prop.type === 'window') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 10, '#9ad0ff');
      ctx.strokeStyle = '#fff8';
      ctx.lineWidth = 3;
      ctx.strokeRect(prop.x + 8, prop.y + 8, prop.w - 16, prop.h - 16);
    } else if (prop.type === 'bed') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 12, '#f2c1d8');
      fillRound(ctx, prop.x + 10, prop.y - 18, 50, 28, 10, '#fff0f6');
    } else if (prop.type === 'shelf') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 8, '#c9956a');
      ctx.fillStyle = '#a8744a';
      ctx.fillRect(prop.x + 8, prop.y + 28, prop.w - 16, 8);
      if (runtime?.selectedItem === 'magnet') {
        ctx.strokeStyle = P.gold;
        ctx.lineWidth = 3;
        roundRect(ctx, prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4, 10);
        ctx.stroke();
      }
    } else if (prop.type === 'rug') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 16, '#d96b6b');
    } else if (prop.type === 'awning') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 8, '#ff8e8e');
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 ? '#fff6' : '#ffb4b4';
        ctx.fillRect(prop.x + i * (prop.w / 5), prop.y, prop.w / 5, prop.h);
      }
    } else if (prop.type === 'cafe' || prop.type === 'shop' || prop.type === 'booth') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 12, '#f6e2c4');
      fillRound(ctx, prop.x + 16, prop.y + 40, prop.w - 32, prop.h - 70, 8, '#7ec8ff55');
    } else if (prop.type === 'lamp') {
      ctx.fillStyle = '#555';
      ctx.fillRect(cx - 4, prop.y, 8, prop.h);
      emoji(ctx, '💡', cx, prop.y + 10, 22);
    } else if (prop.type === 'counter') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 12, '#b8895c');
    } else if (prop.type === 'chest') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 10, '#d4a017');
      const opened = stage.recipes.some(recipe => recipe.target === 'chest' && runtime?.unlocked[recipe.unlocks]);
      if (opened) {
        fillRound(ctx, prop.x + 8, prop.y + 10, prop.w - 16, prop.h - 22, 6, '#6d4027');
        fillRound(ctx, prop.x, prop.y - 14, prop.w, 20, 6, '#b37b22');
      } else {
        ctx.fillStyle = '#ffe19a';
        ctx.fillRect(prop.x + 8, cy - 3, prop.w - 16, 6);
        emoji(ctx, '🔒', cx, cy, 24);
      }
      if (runtime?.selectedItem === 'key') {
        ctx.strokeStyle = P.gold;
        ctx.lineWidth = 3;
        roundRect(ctx, prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4, 12);
        ctx.stroke();
      }
    } else if (prop.type === 'poster') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 8, '#ffe08a');
      emoji(ctx, '🎨', cx, cy, 28);
    } else if (prop.type === 'tree') {
      ctx.fillStyle = '#6b3f22';
      ctx.fillRect(cx - 8, prop.y + 60, 16, prop.h - 60);
      emoji(ctx, '🌳', cx, prop.y + 40, 52);
    } else if (prop.type === 'bud') {
      const grown = runtime?.flags?.flowerGrown;
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 14, grown ? '#8ee7c2' : '#9ccc65');
      emoji(ctx, grown ? '🌸' : '🌱', cx, cy, 32);
      if (runtime?.selectedItem === 'can') {
        ctx.strokeStyle = P.accent;
        ctx.lineWidth = 3;
        roundRect(ctx, prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4, 16);
        ctx.stroke();
      }
    } else if (prop.type === 'fox') {
      const happy = runtime?.flags?.foxHappy;
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 16, '#ffb074');
      emoji(ctx, happy ? '🦊' : '🦊', cx, cy, 36);
      if (happy) emoji(ctx, '💕', cx + 28, cy - 24, 18);
      if (runtime?.selectedItem === 'cookie') {
        ctx.strokeStyle = P.primary;
        ctx.lineWidth = 3;
        roundRect(ctx, prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4, 16);
        ctx.stroke();
      }
    } else if (prop.type === 'pond') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 20, '#6ec8ff');
    } else if (prop.type === 'stall') {
      fillRound(ctx, prop.x, prop.y, prop.w, prop.h, 12, '#ffd98a');
      fillRound(ctx, prop.x, prop.y - 18, prop.w, 24, 8, '#ff8e8e');
      emoji(ctx, '🏪', cx, cy, 36);
      if (runtime?.selectedItem === 'wand') {
        ctx.strokeStyle = P.gold;
        ctx.lineWidth = 3;
        roundRect(ctx, prop.x - 2, prop.y - 20, prop.w + 4, prop.h + 24, 12);
        ctx.stroke();
      }
    } else if (prop.type === 'moon') {
      emoji(ctx, '🌕', cx, cy, 48);
    } else if (prop.type === 'crowd') {
      text(ctx, '♪ 축제 중 ♪', cx, cy, { size: 14, align: 'center', color: '#ffe9' });
    }
  }
}

function drawCovers(ctx, stage, runtime) {
  for (const cover of stage.covers) {
    const st = runtime.covers[cover.id];
    const box = getCoverBox(cover, runtime);
    const quilt = cover.id === 'quilt';
    const basket = cover.id === 'laundry';
    fillRound(ctx, box.x + 3, box.y + 4, box.w, box.h, 8, '#352238');
    fillRound(ctx, box.x, box.y, box.w, box.h, 8, quilt ? '#d6809a' : basket ? '#ad8055' : '#624572');
    ctx.strokeStyle = quilt ? '#f8bbcd' : basket ? '#e2bd86' : '#9471a3';
    ctx.lineWidth = 3;
    if (cover.drag === 'horizontal') {
      for (let x = box.x + 9; x < box.x + box.w; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, box.y + 5); ctx.lineTo(x, box.y + box.h - 5); ctx.stroke();
      }
    } else {
      for (let y = box.y + 8; y < box.y + box.h; y += 14) {
        ctx.beginPath(); ctx.moveTo(box.x + 5, y); ctx.lineTo(box.x + box.w - 5, y); ctx.stroke();
      }
    }
    if (!st.open && box.w > 54 && box.h > 48) {
      emoji(ctx, cover.mark, box.x + box.w / 2, box.y + box.h / 2 - 10, 28);
      text(ctx, cover.drag === 'horizontal' ? '밀기 →' : '올리기 ↑', box.x + box.w / 2, box.y + box.h - 16, {
        size: 11, align: 'center', color: '#ffe5af',
      });
    }
    const pulse = runtime.pulses.find((p) => p.id === cover.id);
    if (pulse) {
      ctx.strokeStyle = `rgba(255,217,138,${Math.max(0, pulse.life)})`;
      ctx.lineWidth = 4;
      roundRect(ctx, box.x - 4, box.y - 4, box.w + 8, box.h + 8, 14);
      ctx.stroke();
    }
  }
}

function drawFinds(ctx, stage, runtime) {
  for (const find of stage.finds) {
    if (runtime.found[find.id]) continue;
    const pulse = runtime.pulses.find((p) => p.id === find.id);
    // Always paint the real object. Foreground props physically conceal it.
    emoji(ctx, find.mark, find.x + find.w / 2, find.y + find.h / 2, Math.min(36, find.w * 0.7));
    if (pulse && visibleFind(find, runtime)) {
      ctx.strokeStyle = `rgba(126,200,255,${Math.max(0, pulse.life)})`;
      ctx.lineWidth = 4;
      roundRect(ctx, find.x - 6, find.y - 6, find.w + 12, find.h + 12, 16);
      ctx.stroke();
    }
  }
}

function drawLockedFronts(ctx, stage, runtime) {
  for (const find of stage.finds) {
    if (find.kind !== 'locked' || visibleFind(find, runtime) || runtime.found[find.id]) continue;
    const recipe = stage.recipes.find(recipe => recipe.unlocks === find.id);
    const prop = stage.scenery.find(prop => prop.type === recipe?.target);
    if (prop) drawScenery(ctx, { ...stage, scenery: [prop] }, runtime);
  }
}

function drawTools(ctx, stage, runtime) {
  for (const tool of stage.tools) {
    if (runtime.toolsTaken[tool.id]) continue;
    fillRound(ctx, tool.x - 2, tool.y - 2, tool.w + 4, tool.h + 4, 12, '#f3dcb8');
    emoji(ctx, tool.mark, tool.x + tool.w / 2, tool.y + tool.h / 2, 30);
    const pulse = runtime.pulses.find((p) => p.id === tool.id);
    if (pulse) {
      ctx.strokeStyle = `rgba(142,231,194,${Math.max(0, pulse.life)})`;
      ctx.lineWidth = 3;
      roundRect(ctx, tool.x - 6, tool.y - 6, tool.w + 12, tool.h + 12, 14);
      ctx.stroke();
    }
  }
}

function drawFindList(ctx, stage, runtime) {
  const y = listY();
  text(ctx, '찾을 물건', 24, y - 18, { size: 13, color: P.muted });
  let x = 16;
  for (const find of stage.finds) {
    const done = !!runtime.found[find.id];
    fillRound(ctx, x, y, 86, 44, 12, done ? '#8ee7c244' : P.panel);
    emoji(ctx, find.mark, x + 22, y + 22, 22);
    text(ctx, find.name, x + 40, y + 22, {
      size: 11,
      color: done ? P.mint : P.text,
      weight: 600,
    });
    if (done) {
      text(ctx, '✓', x + 74, y + 14, { size: 12, color: P.mint, align: 'center' });
    }
    x += 92;
  }
}

function drawInventory(ctx, runtime, stage) {
  text(ctx, '가방', 24, 600, { size: 13, color: P.muted });
  for (let i = 0; i < 5; i++) {
    const slot = getInventorySlot(i);
    const id = runtime.inventory[i];
    const selected = id && runtime.selectedItem === id;
    fillRound(ctx, slot.x, slot.y, slot.w, slot.h, 14, selected ? '#ffb4d055' : P.panel);
    if (selected) {
      ctx.strokeStyle = P.primary;
      ctx.lineWidth = 3;
      roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 14);
      ctx.stroke();
    }
    if (id) {
      const tool = stage.tools.find((t) => t.id === id);
      emoji(ctx, tool?.mark || '?', slot.x + slot.w / 2, slot.y + slot.h / 2, 28);
    }
  }
  const tip = stage.mascot;
  fillRound(ctx, 390, 600, 70, 80, 16, P.panel);
  emoji(ctx, tip.mark, 425, 630, 28);
  text(ctx, tip.name, 425, 662, { size: 11, align: 'center', color: P.muted });
}

function drawHud(ctx, state, stage, runtime) {
  const prog = getStageProgress(runtime, stage);
  const buttons = getUiButtons();
  fillRound(ctx, 16, 16, 448, 72, 18, P.surface);
  text(ctx, stage.title, 128, 40, { size: 18 });
  text(ctx, `${prog.done} / ${prog.total}`, 128, 64, { size: 13, color: P.muted });
  if (stage.event) {
    fillRound(ctx, 250, 28, 86, 24, 10, '#7ec8ff44');
    text(ctx, '이벤트', 293, 40, { size: 12, align: 'center', color: P.accent });
  }

  for (const key of ['hub', 'hint']) {
    const b = buttons[key];
    fillRound(ctx, b.x, b.y, b.w, b.h, 12, key === 'hint' ? '#ffb4d044' : '#ffffff18');
    text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2, { size: 14, align: 'center' });
  }

  if (runtime.toast) {
    fillRound(ctx, 60, 700, 360, 40, 14, '#241830ee');
    text(ctx, runtime.toast, 240, 720, { size: 14, align: 'center', color: P.gold });
  }

  for (const s of runtime.sparkles) {
    ctx.globalAlpha = Math.max(0, s.life);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawHub(ctx, state, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, '#3a2452');
  g.addColorStop(0.5, '#2b1f3a');
  g.addColorStop(1, '#1c1430');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);

  for (let i = 0; i < 18; i++) {
    const x = (i * 97 + state.fxTime * 20) % view.width;
    const y = (i * 53 + Math.sin(state.fxTime + i) * 8) % 160;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = P.gold;
    ctx.beginPath();
    ctx.arc(x, 40 + y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  text(ctx, 'find out!', 240, 48, { size: 34, align: 'center', color: P.primary });
  text(ctx, '테마 룸에서 숨은 물건을 찾아보세요', 240, 86, {
    size: 14,
    align: 'center',
    color: P.muted,
  });
  text(ctx, `별 ${state.progress.stars} · 클리어 ${state.progress.cleared.length}/${STAGES.length}`, 240, 112, {
    size: 13,
    align: 'center',
    color: P.accent,
  });
  text(ctx, state.hubMessage, 240, 144, { size: 13, align: 'center', color: P.gold });

  for (const card of hubCards()) {
    const unlocked = stageUnlocked(card.stage, card.index, state.progress);
    const cleared = state.progress.cleared.includes(card.stage.id);
    fillRound(ctx, card.x, card.y, card.w, card.h, 18, unlocked ? P.surface : '#241830');
    if (card.stage.event) {
      fillRound(ctx, card.x + 12, card.y + 12, 72, 22, 10, '#7ec8ff33');
      text(ctx, '주간', card.x + 48, card.y + 23, { size: 11, align: 'center', color: P.accent });
    }
    emoji(ctx, card.stage.mascot.mark, card.x + 36, card.y + 64, 30);
    text(ctx, card.stage.title, card.x + 64, card.y + 52, { size: 15 });
    text(ctx, card.stage.pack, card.x + 64, card.y + 74, { size: 12, color: P.muted });
    text(ctx, cleared ? '완료 ★' : unlocked ? '플레이' : '잠김', card.x + 64, card.y + 100, {
      size: 13,
      color: cleared ? P.mint : unlocked ? P.primary : '#887',
    });
    if (!unlocked) {
      ctx.fillStyle = '#0006';
      roundRect(ctx, card.x, card.y, card.w, card.h, 18);
      ctx.fill();
      emoji(ctx, '🔒', card.x + card.w - 28, card.y + 28, 20);
    }
  }

  text(ctx, '이벤트 팩은 첫 스테이지 클리어 후 열려요', 240, 750, {
    size: 12,
    align: 'center',
    color: P.muted,
  });
}

function drawPlay(ctx, state, view) {
  ctx.fillStyle = P.background;
  ctx.fillRect(0, 0, view.width, view.height);

  const runtime = state.runtime;
  const stage = stageById(runtime.stageId);
  const scene = sceneRect();

  drawSky(ctx, stage, scene);
  drawScenery(ctx, stage, runtime);
  drawFinds(ctx, stage, runtime);
  drawLockedFronts(ctx, stage, runtime);
  drawTools(ctx, stage, runtime);
  drawCovers(ctx, stage, runtime);

  ctx.strokeStyle = '#ffffff22';
  ctx.lineWidth = 2;
  roundRect(ctx, scene.x, scene.y, scene.w, scene.h, 22);
  ctx.stroke();

  drawFindList(ctx, stage, runtime);
  drawInventory(ctx, runtime, stage);
  drawHud(ctx, state, stage, runtime);

  if (runtime.cleared) {
    fillRound(ctx, 70, 300, 340, 120, 20, '#241830ee');
    text(ctx, '스테이지 클리어!', 240, 345, { size: 24, align: 'center', color: P.gold });
    text(ctx, '목록으로 돌아가는 중…', 240, 385, { size: 14, align: 'center', color: P.muted });
  }
}

mountGame({
  title: CONFIG.title,
  description:
    '테마 룸마다 숨은 물건을 찾아보세요. 커튼을 밀고, 도구를 조합해 숨겨진 장소를 열면 새로운 단서가 나타납니다.',
  controls:
    '터치: 물건 누르기 · 덮개 드래그 · 도구를 집고 대상에 사용. PC: 같은 동작 + H 힌트.',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: {
    background: P.background,
    primary: P.primary,
    text: P.text,
  },
  create: createGame,
  update: updateGame,
  render(ctx, state, view) {
    if (state.screen === 'hub') drawHub(ctx, state, view);
    else drawPlay(ctx, state, view);
  },
});
