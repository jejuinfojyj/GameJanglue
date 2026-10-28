import { CONFIG } from './config.mjs';
import { getBallSkin } from './game.mjs';

const HR = CONFIG.hoop.radius;
const RT = CONFIG.hoop.rimThickness;

function drawCourt(ctx, w, h, cameraY, time) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#152238');
  g.addColorStop(0.45, CONFIG.palette.background);
  g.addColorStop(1, '#0f1a2c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(0, -cameraY * 0.15);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 2;
  for (let y = -200; y < h + 400; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y + (time * 12) % 48);
    ctx.lineTo(w, y + (time * 12) % 48);
    ctx.stroke();
  }
  ctx.restore();

  // soft side lights
  const side = ctx.createLinearGradient(0, 0, w, 0);
  side.addColorStop(0, 'rgba(255,138,61,0.08)');
  side.addColorStop(0.5, 'transparent');
  side.addColorStop(1, 'rgba(61,139,253,0.08)');
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, w, h);
}

function drawHoop(ctx, hoop, cameraY, target) {
  const x = hoop.x;
  const y = hoop.y - cameraY;
  const netDrop = 34 + Math.sin((hoop.netPulse || 0) / 0.4 * Math.PI) * 15;

  // backboard
  ctx.fillStyle = 'rgba(244,247,255,0.18)';
  ctx.fillRect(x - 28, y - 52, 56, 36);
  ctx.strokeStyle = target ? 'rgba(255,212,71,0.8)' : 'rgba(244,247,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 28, y - 52, 56, 36);
  ctx.strokeRect(x - 12, y - 40, 24, 16);

  // net
  ctx.strokeStyle = 'rgba(244,247,255,0.55)';
  ctx.lineWidth = 1.4;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * (HR - 5) / 3, y + 2);
    ctx.quadraticCurveTo(x + i * 7, y + netDrop * 0.65, x + i * 4, y + netDrop);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - HR + 4, y + 2);
  ctx.quadraticCurveTo(x, y + 18, x + HR - 4, y + 2);
  ctx.stroke();

  // rim
  ctx.strokeStyle = CONFIG.palette.rim;
  ctx.lineWidth = RT;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(x, y, HR, HR * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();

  // inner highlight
  ctx.strokeStyle = 'rgba(255,200,160,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 1, HR - 4, HR * 0.2, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
}

function drawStar(ctx, star, cameraY) {
  if (star.taken) return;
  const x = star.x;
  const y = star.y - cameraY;
  const pulse = 1 + Math.sin(star.pulse) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pulse, pulse);
  ctx.rotate(star.pulse * 0.15);
  ctx.fillStyle = CONFIG.palette.star;
  ctx.shadowColor = CONFIG.palette.accent;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const b = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
    ctx.lineTo(Math.cos(b) * 5, Math.sin(b) * 5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx, state) {
  const ball = state.ball;
  const skin = getBallSkin(state);
  const x = ball.x;
  const y = ball.y - state.cameraY;
  const r = CONFIG.physics.ballRadius;

  if (state.flames > 0.15 && !ball.resting) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      ctx.globalAlpha = (0.35 - t * 0.05) * state.flames;
      ctx.fillStyle = i % 2 ? CONFIG.palette.accent : CONFIG.palette.flame;
      ctx.beginPath();
      ctx.ellipse(x - ball.vx * t * 0.02, y - ball.vy * t * 0.02 + 6 + i * 3, r * (1 - t * 0.2), r * (1.2 - t * 0.1), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ball.spinning);
  const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 2, 0, 0, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, skin.colors[0]);
  grad.addColorStop(1, skin.colors[1] || skin.colors[0]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r + 2, 0);
  ctx.quadraticCurveTo(0, -6, r - 2, 0);
  ctx.moveTo(0, -r + 2);
  ctx.quadraticCurveTo(4, 0, 0, r - 2);
  ctx.stroke();
  ctx.restore();
}

function drawAim(ctx, state) {
  if (!state.aim.pulling || !state.aim.path.length) return;
  const hoop = state.hoops[state.currentIndex];
  ctx.strokeStyle = 'rgba(255,212,71,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(hoop.x, hoop.y - state.cameraY);
  ctx.lineTo(state.ball.x, state.ball.y - state.cameraY);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < state.aim.path.length; i++) {
    const p = state.aim.path[i];
    const a = 1 - i / state.aim.path.length;
    ctx.fillStyle = `rgba(255,244,214,${0.15 + a * 0.55})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y - state.cameraY, 2.5 + a * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // power meter
  const power = Math.min(1, Math.hypot(state.aim.pullX, state.aim.pullY) / CONFIG.physics.maxPull);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(18, CONFIG.height - 28, 120, 8);
  ctx.fillStyle = power > 0.85 ? CONFIG.palette.flame : CONFIG.palette.primary;
  ctx.fillRect(18, CONFIG.height - 28, 120 * power, 8);
}

function drawHud(ctx, state, w) {
  ctx.fillStyle = 'rgba(10,16,28,0.45)';
  ctx.fillRect(12, 12, w - 24, 54);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.strokeRect(12.5, 12.5, w - 25, 53);

  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 22px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(state.score), 24, 48);

  ctx.font = '600 13px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.fillStyle = 'rgba(255,247,234,0.7)';
  ctx.fillText(`최고 ${state.highScore}`, 24, 28);

  ctx.textAlign = 'right';
  ctx.fillStyle = CONFIG.palette.star;
  ctx.font = '700 16px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.fillText(`★ ${state.totalStars}`, w - 24, 36);

  if (state.combo > 1) {
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.palette.flame;
    ctx.font = '800 18px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
    ctx.fillText(`클린 ×${state.combo}`, w * 0.5, 48);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,247,234,0.55)';
  ctx.font = '12px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
  ctx.fillText('끌어서 발사 · Q/E 공 바꾸기', 18, CONFIG.height - 40);
}

export function renderGame(ctx, state, view) {
  const w = view.width;
  const h = view.height;
  let shakeX = 0;
  let shakeY = 0;
  if (state.shake > 0) {
    shakeX = (Math.random() - 0.5) * 10 * state.shake * 5;
    shakeY = (Math.random() - 0.5) * 10 * state.shake * 5;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawCourt(ctx, w, h, state.cameraY, state.time);

  const cam = state.cameraY;
  const visible = state.hoops.filter((hoop) => {
    const y = hoop.y - cam;
    return y > -80 && y < h + 80;
  });

  for (const star of state.stars) {
    const y = star.y - cam;
    if (y > -40 && y < h + 40) drawStar(ctx, star, cam);
  }

  // draw distant hoops first, then near
  visible.sort((a, b) => a.y - b.y);
  for (const hoop of visible) drawHoop(ctx, hoop, cam, hoop.index === state.currentIndex + 1);

  drawAim(ctx, state);
  drawBall(ctx, state);
  // The near lip occludes the ball as it drops into the net.
  for (const hoop of visible) {
    ctx.strokeStyle = CONFIG.palette.rim;
    ctx.lineWidth = RT;
    ctx.beginPath();
    ctx.ellipse(hoop.x, hoop.y - cam, HR, HR * 0.28, 0, 0, Math.PI);
    ctx.stroke();
  }

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - cam, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const t of state.floatTexts) {
    ctx.globalAlpha = Math.max(0, t.life);
    ctx.fillStyle = t.color;
    ctx.font = '800 18px "Segoe UI", "Apple SD Gothic Neo", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y - cam);
  }
  ctx.globalAlpha = 1;

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,138,61,${state.flash * 0.35})`;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.restore();
  drawHud(ctx, state, w);
}
