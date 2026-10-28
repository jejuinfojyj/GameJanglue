import { CONFIG } from './config.mjs';

function len3(x, y, z) {
  return Math.hypot(x, y, z);
}
function norm3(x, y, z) {
  const d = len3(x, y, z) || 1;
  return { x: x / d, y: y / d, z: z / d };
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** 플레이어 뒤·위에서 전장을 내려다보는 가로 3D 카메라 (느린 방향 전환) */
export function updateCam3d(state, player, dt = 1 / 60) {
  const cfg = CONFIG.cam;
  const cam = state.cam3d || (state.cam3d = {});

  // 카메라 요(yaw): 조준이 아니라 viewYaw를 천천히 따라감
  const wantYaw = Math.atan2(state.viewDir?.y ?? player.aimY, state.viewDir?.x ?? player.aimX);
  if (cam.yaw == null) cam.yaw = wantYaw;
  const yawT = 1 - Math.exp(-(cfg.yawSpeed || 1.6) * dt);
  cam.yaw = lerpAngle(cam.yaw, wantYaw, yawT);

  const fx = Math.cos(cam.yaw);
  const fy = Math.sin(cam.yaw);
  const lookX = player.x + fx * cfg.lookAhead;
  const lookY = player.y + fy * cfg.lookAhead;
  const tx = player.x - fx * cfg.back;
  const ty = player.y - fy * cfg.back;
  const tz = cfg.height;

  const follow = cfg.follow ?? 0.06;
  const lookFollow = cfg.lookFollow ?? 0.05;
  const posT = 1 - Math.exp(-follow * 60 * dt);
  const lookT = 1 - Math.exp(-lookFollow * 60 * dt);

  cam.x = (cam.x ?? tx) + (tx - (cam.x ?? tx)) * posT;
  cam.y = (cam.y ?? ty) + (ty - (cam.y ?? ty)) * posT;
  cam.z = (cam.z ?? tz) + (tz - (cam.z ?? tz)) * posT;
  cam.lx = (cam.lx ?? lookX) + (lookX - (cam.lx ?? lookX)) * lookT;
  cam.ly = (cam.ly ?? lookY) + (lookY - (cam.ly ?? lookY)) * lookT;
  cam.lz = 40;

  const f = norm3(cam.lx - cam.x, cam.ly - cam.y, cam.lz - cam.z);
  const r = norm3(f.y, -f.x, 0);
  const u = {
    x: r.y * f.z - r.z * f.y,
    y: r.z * f.x - r.x * f.z,
    z: r.x * f.y - r.y * f.x,
  };
  cam.fx = f.x;
  cam.fy = f.y;
  cam.fz = f.z;
  cam.rx = r.x;
  cam.ry = r.y;
  cam.rz = r.z;
  cam.ux = u.x;
  cam.uy = u.y;
  cam.uz = u.z;
  cam.fov = cfg.fov;
  return cam;
}

export function project3d(wx, wy, wz, cam, view) {
  const dx = wx - cam.x;
  const dy = wy - cam.y;
  const dz = wz - cam.z;
  const cx = dx * cam.rx + dy * cam.ry + dz * cam.rz;
  const cy = dx * cam.ux + dy * cam.uy + dz * cam.uz;
  const cz = dx * cam.fx + dy * cam.fy + dz * cam.fz;
  if (cz < 24) return { x: 0, y: 0, depth: cz, ok: false };
  const s = cam.fov / cz;
  return {
    x: view.width * 0.5 + cx * s,
    y: view.height * 0.52 - cy * s,
    depth: cz,
    scale: s,
    ok: true,
  };
}

/** 화면 좌표 → 바닥(z=0) 교차점 */
export function unprojectGround(sx, sy, cam, view) {
  const ndcX = (sx - view.width * 0.5) / cam.fov;
  const ndcY = (view.height * 0.52 - sy) / cam.fov;
  const dir = norm3(
    cam.rx * ndcX + cam.ux * ndcY + cam.fx,
    cam.ry * ndcX + cam.uy * ndcY + cam.fy,
    cam.rz * ndcX + cam.uz * ndcY + cam.fz
  );
  if (Math.abs(dir.z) < 1e-4) return null;
  const t = -cam.z / dir.z;
  if (t < 0) return null;
  return { x: cam.x + dir.x * t, y: cam.y + dir.y * t };
}

/** 현재 조준을 목표 방향으로 천천히 회전 */
export function turnToward(curX, curY, wantX, wantY, turnSpeed, dt) {
  const cl = Math.hypot(curX, curY) || 1;
  const wl = Math.hypot(wantX, wantY) || 1;
  const cx = curX / cl;
  const cy = curY / cl;
  const wx = wantX / wl;
  const wy = wantY / wl;
  const cur = Math.atan2(cy, cx);
  const want = Math.atan2(wy, wx);
  let d = want - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const maxStep = turnSpeed * dt;
  const step = Math.max(-maxStep, Math.min(maxStep, d));
  const next = cur + step;
  return { x: Math.cos(next), y: Math.sin(next) };
}
