// 게임 규칙: 조준 → 발사 → 능력 → 무너짐이 멈추면 다음 새 → 단계 성공/실패 → 별점
import { WORLD, SLING, SCORE } from './config.mjs';
import { BIRDS, EGG } from './birds.mjs';
import { LEVELS } from './levels.mjs';
import { makeBlock, makePig, makeShot, stepBodies, stepShot, explode } from './physics.mjs';
import { sfx } from './sound.mjs';

const SUBSTEP = 1 / 240;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const formatScore = n => Math.round(n).toLocaleString('ko-KR');

// 실패하면 다음 판은 그 단계부터 다시 시작한다.
let retryStage = 0;

export function pullVelocity(pull) {
  return { x: -pull.x * SLING.power, y: -pull.y * SLING.power };
}

export function queueSpot(index, type) {
  return { x: SLING.x - 50 - index * 36, y: WORLD.ground - BIRDS[type].r };
}

export function pigsLeft(s) {
  return s.world.bodies.filter(b => b.kind === 'pig' && !b.dead).length;
}

export function createGame() {
  const first = retryStage;
  retryStage = 0;
  const s = { firstStage: first, totalScore: 0, starsTotal: 0, clock: 0, result: null };
  loadStage(s, first);
  return s;
}

function loadStage(s, index) {
  const level = LEVELS[index];
  Object.assign(s, {
    stageIndex: index, level,
    world: {
      bodies: [...level.blocks.map(b => makeBlock(...b)), ...level.pigs.map(p => makePig(...p))],
      events: [],
    },
    queue: [...level.birds], current: null, shots: [], lead: null,
    phase: 'aim', timer: 0, score: 0, stars: 0, clearT: 0, starSounds: 0,
    drag: null, pull: null, kb: { angle: -0.7, power: 0.85, active: false },
    trail: [], lastTrail: [], trailT: 0,
    particles: [], popups: [], rings: [], shake: 0, banner: 2.2, loadT: 0,
  });
  nextBird(s);
}

function nextBird(s) {
  s.current = s.queue.shift();
  s.loadT = 0.35;
  s.phase = 'aim';
  s.shots = [];
  s.lead = null;
  s.drag = null;
  s.pull = null;
  s.kb.active = false;
}

function clampPull(x, y) {
  const len = Math.hypot(x, y), max = SLING.maxPull;
  return len > max ? { x: x / len * max, y: y / len * max } : { x, y };
}

function aim(s, dt, input, confirm) {
  if (s.loadT > 0) { s.loadT = Math.max(0, s.loadT - dt); return; }
  const p = input.pointer, held = k => input.keys.has(k);
  // 손가락·마우스: 화면 아무 곳이나 누른 채 뒤로 끌었다가 놓으면 발사
  if (p.pressed && !s.drag) { s.drag = { x: p.x, y: p.y }; s.kb.active = false; sfx('stretch'); }
  if (s.drag) {
    s.pull = clampPull(p.x - s.drag.x, p.y - s.drag.y);
    if (p.released) {
      s.drag = null;
      if (Math.hypot(s.pull.x, s.pull.y) >= 18) launch(s, s.pull); else s.pull = null;
    } else if (!p.down) { s.drag = null; s.pull = null; }
    return;
  }
  // 키보드: ↑↓ 각도, ←→ 힘, Space/Enter 발사
  let moved = false;
  if (held('arrowup') || held('w')) { s.kb.angle -= 1.1 * dt; moved = true; }
  if (held('arrowdown') || held('s')) { s.kb.angle += 1.1 * dt; moved = true; }
  if (held('arrowleft') || held('a')) { s.kb.power += 0.7 * dt; moved = true; }
  if (held('arrowright') || held('d')) { s.kb.power -= 0.7 * dt; moved = true; }
  s.kb.angle = clamp(s.kb.angle, -1.45, 0.35);
  s.kb.power = clamp(s.kb.power, 0.25, 1);
  if (moved || confirm) {
    const wasActive = s.kb.active;
    s.kb.active = true;
    s.pull = { x: -Math.cos(s.kb.angle) * s.kb.power * SLING.maxPull, y: -Math.sin(s.kb.angle) * s.kb.power * SLING.maxPull };
    if (confirm && wasActive) launch(s, s.pull);
  }
}

function launch(s, pull) {
  const v = pullVelocity(pull), def = BIRDS[s.current];
  const shot = makeShot(s.current, def, SLING.x + pull.x, SLING.y + pull.y, v.x, v.y);
  s.lead = shot;
  s.shots = [shot];
  s.pull = null;
  s.phase = 'fly';
  s.timer = 0;
  if (s.trail.length) s.lastTrail = s.trail;
  s.trail = [];
  s.trailT = 0;
  sfx('launch');
}

export function canUseAbility(s) {
  const lead = s.lead;
  if (s.phase !== 'fly' || !lead || lead.done || lead.used) return false;
  const ability = BIRDS[lead.type].ability;
  return ability !== 'none' && (!lead.touched || ability === 'boom');
}

function useAbility(s) {
  if (!canUseAbility(s)) return;
  const lead = s.lead, def = BIRDS[lead.type];
  lead.used = true;
  if (def.ability === 'shout') {
    explode(s.world, lead.x, lead.y, def.shout.radius, def.shout);
    s.rings.push({ x: lead.x, y: lead.y, r: 10, max: def.shout.radius, t: 0, color: '#ffffff' });
    sfx('shout');
  } else if (def.ability === 'split') {
    for (const a of [-def.spread, def.spread]) {
      const c = Math.cos(a), n = Math.sin(a);
      const twin = makeShot(lead.type, def, lead.x, lead.y, lead.vx * c - lead.vy * n, lead.vx * n + lead.vy * c);
      twin.used = true;
      s.shots.push(twin);
    }
    burst(s, lead.x, lead.y, '#cfe9ff', 8, 120);
    sfx('split');
  } else if (def.ability === 'dash') {
    const sp = Math.hypot(lead.vx, lead.vy) || 1;
    lead.vx = lead.vx / sp * def.dash;
    lead.vy = lead.vy / sp * def.dash;
    lead.power = 1.35;
    lead.dashed = true;
    sfx('dash');
  } else if (def.ability === 'boom') {
    blast(s, lead, def.blast);
  } else if (def.ability === 'egg') {
    const egg = makeShot('egg', EGG, lead.x, lead.y + lead.r, lead.vx * 0.15, 520);
    egg.isEgg = true;
    egg.used = true;
    s.shots.push(egg);
    lead.vx *= 1.15;
    lead.vy = -620;
    burst(s, lead.x, lead.y, '#ffffff', 10, 140);
    sfx('egg');
  }
}

function blast(s, shot, b) {
  explode(s.world, shot.x, shot.y, b.radius, b);
  shot.used = true;
  shot.done = true;
  shot.exploded = true;
  s.rings.push({ x: shot.x, y: shot.y, r: 10, max: b.radius, t: 0, color: '#ffcf5a' });
  s.shake = Math.max(s.shake, 0.45);
  burst(s, shot.x, shot.y, '#ffb347', 18, 340);
  burst(s, shot.x, shot.y, '#5a5a66', 10, 160);
  sfx('boom');
}

function shotRules(s, shot, dt) {
  if (shot.isEgg) { if (shot.touched && !shot.done) blast(s, shot, EGG.blast); return; }
  const def = BIRDS[shot.type];
  if (def.ability === 'boom' && !shot.used && shot.touched && shot.fuse < 0) shot.fuse = def.fuse;
  if (shot.fuse >= 0 && !shot.used) {
    shot.fuse -= dt;
    if (shot.fuse <= 0) blast(s, shot, def.blast);
  }
}

// ---------- 효과 ----------
function popup(s, x, y, value, color, big = false) {
  s.popups.push({ x, y, text: formatScore(value), color, big, t: 0 });
}

function burst(s, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7);
    s.particles.push({ kind: 'puff', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, r: 3 + Math.random() * 5,
      color, life: 0.5 + Math.random() * 0.4, t: 0, gravity: 200 });
  }
}

function debris(s, body) {
  const color = body.kind === 'pig' ? '#8fe05c' : null;
  const n = Math.min(10, 4 + Math.round((body.w * body.h) / 600));
  for (let i = 0; i < n; i++) {
    s.particles.push({ kind: 'chip', mat: body.mat, color,
      x: body.x + (Math.random() - 0.5) * body.w, y: body.y + (Math.random() - 0.5) * body.h,
      vx: (Math.random() - 0.5) * 260 + body.vx * 0.5, vy: -Math.random() * 260,
      w: 5 + Math.random() * 9, h: 4 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14,
      life: 0.9 + Math.random() * 0.5, t: 0, gravity: 900 });
  }
}

function handleEvents(s) {
  for (const e of s.world.events.splice(0)) {
    if (e.type === 'break') {
      const pts = SCORE.block[e.body.mat];
      s.score += pts;
      popup(s, e.x, e.y, pts, '#ffffff');
      debris(s, e.body);
      sfx('break-' + e.body.mat);
    } else if (e.type === 'pop') {
      s.score += SCORE.pig;
      popup(s, e.x, e.y - 12, SCORE.pig, '#b6ff7a', true);
      burst(s, e.x, e.y, '#8fe05c', 14, 260);
      sfx('pop');
    } else if (e.type === 'hit') sfx('hit', e.power / 900);
    else if (e.type === 'thud') sfx('thud', e.power / 900);
  }
}

function updateEffects(s, dt) {
  for (const p of s.particles) {
    p.t += dt; p.vy += p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.vr) p.rot += p.vr * dt;
    if (p.kind === 'chip' && p.y > WORLD.ground - 3) { p.y = WORLD.ground - 3; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
  }
  s.particles = s.particles.filter(p => p.t < p.life);
  for (const p of s.popups) { p.t += dt; p.y -= 40 * dt; }
  s.popups = s.popups.filter(p => p.t < 1.2);
  for (const r of s.rings) { r.t += dt; r.r += (r.max - r.r) * Math.min(1, dt * 12); }
  s.rings = s.rings.filter(r => r.t < 0.45);
  s.shake = Math.max(0, s.shake - dt);
  s.banner = Math.max(0, s.banner - dt);
}

// ---------- 단계 끝 ----------
function clearStage(s) {
  s.queue.forEach((type, i) => { const p = queueSpot(i, type); popup(s, p.x, p.y - 34, SCORE.birdLeft, '#ffe066', true); });
  s.score += s.queue.length * SCORE.birdLeft;
  const [two, three] = s.level.stars;
  s.stars = s.score >= three ? 3 : s.score >= two ? 2 : 1;
  s.totalScore += s.score;
  s.starsTotal += s.stars;
  s.phase = 'clear';
  s.clearT = 0;
  s.starSounds = 0;
  sfx('clear');
}

function finishRun(s) {
  retryStage = 0;
  const maxStars = (LEVELS.length - s.firstStage) * 3;
  const from = s.firstStage > 0 ? ` (${s.firstStage + 1}단계부터 도전)` : '';
  s.result = { success: true,
    message: `알 도둑 돼지들의 요새를 모두 무너뜨렸어!${from}\n총점 ${formatScore(s.totalScore)}점 · 별 ${s.starsTotal}/${maxStars}개` };
}

export function updateGame(s, dt, input) {
  s.clock += dt;
  const confirm = input.pressed.has(' ') || input.pressed.has('enter');

  if (s.phase === 'aim') aim(s, dt, input, confirm);
  else if (s.phase === 'fly' && (input.pointer.pressed || confirm)) useAbility(s);

  const steps = Math.max(1, Math.ceil(dt / SUBSTEP)), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    stepBodies(s.world, h);
    for (const shot of s.shots) {
      if (shot.done) continue;
      stepShot(s.world, shot, h);
      shotRules(s, shot, h);
    }
  }
  for (const shot of s.shots) {
    if (shot.done && !shot.gone) {
      shot.gone = true;
      if (!shot.exploded) burst(s, shot.x, shot.y, '#ffffff', 8, 120);
    }
  }
  const lead = s.lead;
  if (lead && !lead.done && !lead.touched) {
    s.trailT += dt;
    if (s.trailT >= 0.04) { s.trailT = 0; s.trail.push({ x: lead.x, y: lead.y, big: lead.dashed }); }
  }
  handleEvents(s);
  updateEffects(s, dt);

  const left = pigsLeft(s);
  if (s.phase === 'fly') {
    s.timer += dt;
    if (s.shots.every(x => x.done) || (left === 0 && s.timer > 1.5)) { s.phase = 'settle'; s.timer = 0; }
  } else if (s.phase === 'settle') {
    s.timer += dt;
    const still = s.world.bodies.every(b => b.dead || (Math.abs(b.vx) < 6 && Math.abs(b.vy) < 6));
    if ((s.timer > 0.6 && still) || s.timer > 3.5) {
      if (left === 0) clearStage(s);
      else if (s.queue.length) nextBird(s);
      else { s.phase = 'fail'; s.timer = 0; sfx('fail'); }
    }
  } else if (s.phase === 'clear') {
    s.clearT += dt;
    const due = s.clearT < 0.5 ? 0 : Math.min(s.stars, 1 + Math.floor((s.clearT - 0.5) / 0.3));
    while (s.starSounds < due) { s.starSounds++; sfx('star'); }
    if (s.clearT > 1.4 && (input.pointer.pressed || confirm)) {
      if (s.stageIndex + 1 < LEVELS.length) loadStage(s, s.stageIndex + 1);
      else finishRun(s);
    }
  } else if (s.phase === 'fail') {
    s.timer += dt;
    if (s.timer > 1.8) {
      retryStage = s.stageIndex;
      const n = s.stageIndex + 1;
      s.result = { success: false,
        message: `${n}단계 요새에 돼지가 ${left}마리 남았어.\n다시 하기를 누르면 ${n}단계부터 다시 도전해!` };
    }
  }
}
