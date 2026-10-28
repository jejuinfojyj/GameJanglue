import { CONFIG } from './config.mjs';

// Fixed north-up camera: screen directions never rotate with the player's aim.
export function updateCamera(state, player, dt = 1 / 60) {
  const scale = Math.min(0.82, (CONFIG.width - 64) / CONFIG.world.w);
  const top = 64;
  const bottom = CONFIG.height - 126;
  const halfHeight = (bottom - top) / (2 * scale);
  const targetY = Math.max(halfHeight, Math.min(CONFIG.world.h - halfHeight, player.y - 80));
  const camera = state.camera || (state.camera = {});
  const follow = 1 - Math.exp(-8 * dt);
  camera.x = CONFIG.world.w / 2;
  camera.y = camera.scale ? camera.y + (targetY - camera.y) * follow : targetY;
  camera.scale = scale;
  camera.screenX = CONFIG.width / 2;
  camera.screenY = (top + bottom) / 2;
  return camera;
}

export function worldToScreen(x, y, camera) {
  return {
    x: camera.screenX + (x - camera.x) * camera.scale,
    y: camera.screenY + (y - camera.y) * camera.scale,
  };
}

export function screenToWorld(x, y, camera) {
  return {
    x: camera.x + (x - camera.screenX) / camera.scale,
    y: camera.y + (y - camera.screenY) / camera.scale,
  };
}

export function turnToward(curX, curY, wantX, wantY, turnSpeed, dt) {
  if (Math.hypot(wantX, wantY) < 0.001) return { x: curX, y: curY };
  const current = Math.atan2(curY, curX);
  let delta = Math.atan2(wantY, wantX) - current;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  const step = Math.max(-turnSpeed * dt, Math.min(turnSpeed * dt, delta));
  return { x: Math.cos(current + step), y: Math.sin(current + step) };
}
