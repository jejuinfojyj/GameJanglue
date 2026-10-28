import { CONFIG, FRUITS } from './config.mjs';

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

function drawFruit(ctx, type, radius) {
  const spec = FRUITS[type];
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  const surface = ctx.createRadialGradient(-radius * 0.3, -radius * 0.35, radius * 0.08, 0, 0, radius);
  surface.addColorStop(0, spec.fill);
  surface.addColorStop(0.65, spec.fill);
  surface.addColorStop(1, spec.shade);
  ctx.fillStyle = surface;
  ctx.fill();
  // Decorative leaves and patterns stay inside the same rigid circular shell
  // that the collision solver uses, even while the fruit is rolling.
  ctx.clip();

  if (type === 0) {
    ctx.fillStyle = spec.shade;
    ctx.beginPath();
    ctx.arc(-radius * 0.28, radius * 0.08, radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spec.fill;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b3a22';
    ctx.lineWidth = Math.max(2, radius * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.7);
    ctx.quadraticCurveTo(radius * 0.2, -radius * 1.15, radius * 0.15, -radius * 1.35);
    ctx.stroke();
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.ellipse(radius * 0.28, -radius * 0.95, radius * 0.28, radius * 0.16, -0.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 1) {
    ctx.fillStyle = '#fff6f2';
    for (let i = 0; i < 7; i++) {
      const angle = i * 0.9 + 0.4;
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * radius * 0.42, Math.sin(angle) * radius * 0.38 + 2, 1.4, 2.1, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.78, radius * 0.46, radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f7a38';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.22, -radius * 0.95, radius * 0.2, radius * 0.1, -0.8, 0, Math.PI * 2);
    ctx.ellipse(radius * 0.22, -radius * 0.95, radius * 0.2, radius * 0.1, 0.8, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 2) {
    ctx.fillStyle = spec.accent;
  for (const [x, y] of [[-0.32, -0.22], [0.28, -0.26], [0, 0.02], [0.3, 0.28], [-0.26, 0.3]]) {
    ctx.beginPath();
    ctx.arc(x * radius, y * radius, radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = spec.shade;
  ctx.globalAlpha = 0.35;
  for (const [x, y] of [[-0.32, -0.22], [0.28, -0.26], [0, 0.02]]) {
    ctx.beginPath();
    ctx.arc(x * radius, y * radius, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  } else if (type === 3) {
    ctx.strokeStyle = spec.shade;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0.4, 1.5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.ellipse(radius * 0.1, -radius * 0.92, radius * 0.28, radius * 0.14, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 4) {
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.ellipse(-radius * 0.15, -radius * 0.05, radius * 0.45, radius * 0.7, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spec.shade;
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.92, radius * 0.12, radius * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 5) {
    ctx.fillStyle = '#f7f0dc';
    ctx.beginPath();
    ctx.ellipse(radius * 0.08, -radius * 0.15, radius * 0.1, radius * 0.72, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a5a32';
    ctx.fillRect(-radius * 0.06, -radius * 1.08, radius * 0.12, radius * 0.28);
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.ellipse(radius * 0.32, -radius * 0.86, radius * 0.26, radius * 0.14, 0.7, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 6) {
    ctx.fillStyle = spec.accent;
    ctx.fillRect(-radius * 0.05, -radius * 1.05, radius * 0.1, radius * 0.22);
    ctx.fillStyle = '#6f9a3a';
    ctx.beginPath();
    ctx.ellipse(radius * 0.22, -radius * 0.9, radius * 0.22, radius * 0.1, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = spec.shade;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.2);
    ctx.quadraticCurveTo(radius * 0.3, radius * 0.1, 0, radius * 0.55);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (type === 7) {
    ctx.strokeStyle = spec.shade;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = Math.max(2, radius * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.15);
    ctx.quadraticCurveTo(radius * 0.2, radius * 0.15, 0, radius * 0.72);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#6e9a44';
    ctx.beginPath();
    ctx.ellipse(radius * 0.2, -radius * 0.9, radius * 0.24, radius * 0.12, 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 8) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = spec.shade;
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-radius, i * radius * 0.28);
      ctx.lineTo(radius, i * radius * 0.28);
      ctx.moveTo(i * radius * 0.28, -radius);
      ctx.lineTo(i * radius * 0.28, radius);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = spec.accent;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(i * radius * 0.18, -radius * 0.95, radius * 0.1, radius * 0.38, i * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 9) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = spec.shade;
    ctx.lineWidth = radius * 0.1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-radius, i * radius * 0.32);
      ctx.quadraticCurveTo(0, i * radius * 0.32 + radius * 0.18, radius, i * radius * 0.32);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = '#174f2c';
    ctx.lineWidth = radius * 0.12;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-radius, i * radius * 0.28);
      ctx.quadraticCurveTo(0, i * radius * 0.28 + radius * 0.22, radius, i * radius * 0.28);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = Math.max(3, radius * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.38;
  ctx.beginPath();
  ctx.ellipse(-radius * 0.32, -radius * 0.34, radius * 0.28, radius * 0.16, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = spec.shade;
  ctx.lineWidth = Math.max(1, radius * 0.025);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx, width, height, clock) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#fff1b8');
  sky.addColorStop(0.45, '#ffe7a3');
  sky.addColorStop(1, '#f6c56a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 ? '#ef4b4c' : '#fffaf0';
    ctx.beginPath();
    const x0 = (width / stripes) * i;
    const x1 = (width / stripes) * (i + 1);
    ctx.moveTo(x0, 0);
    ctx.lineTo(x1, 0);
    ctx.lineTo(x1, 34);
    ctx.quadraticCurveTo((x0 + x1) / 2, 56, x0, 34);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffffcc';
  for (const [x, y, r] of [[70, 150, 18], [150, 190, 26], [400, 160, 20]]) {
    ctx.beginPath();
    ctx.arc(x + Math.sin(clock + x) * 4, y, r, 0, Math.PI * 2);
    ctx.arc(x + 22, y + 6, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrate(ctx) {
  const { left, right, floor } = CONFIG.box;
  ctx.fillStyle = '#e7c48a';
  roundRect(ctx, left, 150, right - left, floor - 150, 18);
  ctx.fill();
  ctx.fillStyle = '#f8e2b4';
  roundRect(ctx, left + 10, 162, right - left - 20, floor - 174, 14);
  ctx.fill();
}

function drawCrateFront(ctx) {
  const { left, right, floor } = CONFIG.box;
  ctx.fillStyle = '#c9844a';
  roundRect(ctx, left - 12, floor - 18, right - left + 24, 46, 10);
  ctx.fill();
  ctx.fillStyle = '#a86832';
  ctx.fillRect(left - 12, floor - 8, right - left + 24, 8);
  ctx.strokeStyle = '#8a5428';
  ctx.lineWidth = 4;
  ctx.strokeRect(left - 8, 168, 10, floor - 160);
  ctx.strokeRect(right - 2, 168, 10, floor - 160);
}

function drawDanger(ctx, state) {
  const { left, right, dangerY } = CONFIG.box;
  const hot = state.overTimer > 0;
  ctx.save();
  ctx.strokeStyle = hot ? '#d5253a' : '#ef6a62';
  ctx.globalAlpha = hot ? 0.55 + Math.min(0.4, state.overTimer) : 0.7;
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = hot ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(left + 12, dangerY);
  ctx.lineTo(right - 12, dangerY);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = hot ? '#d5253a' : '#c45a4a';
  ctx.font = "700 13px system-ui, 'Malgun Gothic', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText('여기까지', left + 16, dangerY - 8);
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#fffaf0ee';
  roundRect(ctx, 16, 64, 448, 78, 18);
  ctx.fill();
  ctx.fillStyle = CONFIG.palette.text;
  ctx.textAlign = 'left';
  ctx.font = "700 14px system-ui, 'Malgun Gothic', sans-serif";
  ctx.fillText('점수', 32, 90);
  ctx.fillText('최고', 168, 90);
  ctx.font = "800 28px system-ui, 'Malgun Gothic', sans-serif";
  ctx.fillText(String(state.score), 32, 124);
  ctx.fillText(String(state.best), 168, 124);
  if (state.madeWatermelon) {
    ctx.fillStyle = '#1d6b38';
    ctx.font = "800 13px system-ui, 'Malgun Gothic', sans-serif";
    ctx.fillText('수박 완성', 248, 122);
  }

  ctx.font = "700 14px system-ui, 'Malgun Gothic', sans-serif";
  ctx.fillText('다음', 330, 90);
  const next = FRUITS[state.next];
  ctx.save();
  ctx.translate(404, 112);
  drawFruit(ctx, state.next, Math.min(22, next.radius));
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.font = "700 13px system-ui, 'Malgun Gothic', sans-serif";
  ctx.fillText(next.name, 332, 132);
}

export function drawGame(ctx, state) {
  const { width, height } = CONFIG.view;
  const { left, right, floor } = CONFIG.box;
  const shake = state.shake * 4;
  ctx.save();
  ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  drawBackground(ctx, width, height, state.clock);
  drawCrate(ctx);

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, 120, right - left, floor - 120);
  ctx.clip();
  const ordered = [...state.fruits].sort((a, b) => a.y - b.y);
  for (const fruit of ordered) {
    const spec = FRUITS[fruit.type];
    ctx.save();
    ctx.translate(fruit.x, fruit.y + 4);
    ctx.fillStyle = '#00000022';
    ctx.beginPath();
    ctx.ellipse(0, spec.radius * 0.72, spec.radius * 0.62, spec.radius * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(fruit.x, fruit.y);
    ctx.rotate(fruit.angle || 0);
    drawFruit(ctx, fruit.type, spec.radius);
    ctx.restore();
  }
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  drawDanger(ctx, state);
  drawCrateFront(ctx);

  const hold = FRUITS[state.hold];
  const ready = state.cooldown <= 0 ? 1 : 1 - state.cooldown / CONFIG.rules.dropCooldown;
  ctx.save();
  ctx.strokeStyle = '#8a542888';
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(state.aimX, CONFIG.box.dropY + 8);
  ctx.lineTo(state.aimX, Math.min(floor - 30, CONFIG.box.dropY + 220));
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(state.aimX, CONFIG.box.dropY + Math.sin(state.clock * 3) * 2);
  ctx.globalAlpha = 0.45 + ready * 0.55;
  ctx.scale(0.55 + ready * 0.45, 0.55 + ready * 0.45);
  drawFruit(ctx, state.hold, hold.radius);
  ctx.restore();

  if (!state.dropped && state.clock > 0.2) {
    ctx.fillStyle = CONFIG.palette.text;
    ctx.textAlign = 'center';
    ctx.font = "700 15px system-ui, 'Malgun Gothic', sans-serif";
    ctx.fillText('좌우로 맞추고 눌러서 떨어뜨리기', width / 2, height - 16);
  }
  if (state.hintTime > 0) {
    ctx.fillStyle = '#d5253a';
    ctx.textAlign = 'center';
    ctx.font = "700 16px system-ui, 'Malgun Gothic', sans-serif";
    ctx.fillText(state.hint, width / 2, height - 38);
  }
  for (const item of state.floats) {
    ctx.globalAlpha = Math.max(0, item.life / 0.8);
    ctx.fillStyle = '#8a3418';
    ctx.textAlign = 'center';
    ctx.font = "800 18px system-ui, 'Malgun Gothic', sans-serif";
    ctx.fillText(`${item.name} ${item.text}`, item.x, item.y);
    ctx.globalAlpha = 1;
  }
  drawHud(ctx, state);
  ctx.restore();
}
