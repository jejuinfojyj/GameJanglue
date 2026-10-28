(function(){
'use strict';
try{
// Shared input, round lifecycle and platform menu. Each template owns its rules and art.
function createInputState(){return{keys:new Set(),pressed:new Set(),pointer:{x:0,y:0,down:false,pressed:false,released:false,inside:false},pointers:[]};}
function clearInputState(input){input.keys.clear();input.pressed.clear();input.pointer.down=false;input.pointer.pressed=false;input.pointer.released=false;input.pointers=[];}
function createRunner(options){
 const runner={state:options.create(),time:0,mode:'start',start(input){clearInputState(input);this.mode='play';},pause(input){if(this.mode==='play'){this.mode='pause';clearInputState(input);}},resume(input){if(this.mode==='pause'){clearInputState(input);this.mode='play';}},restart(input){this.state=options.create();this.time=0;clearInputState(input);this.mode='play';},tick(dt,input){
  if(this.mode==='play'){const delta=Math.max(0,Math.min(Number(dt)||0,.05));this.time+=delta;options.update(this.state,delta,input);if(this.state.result){this.mode='result';clearInputState(input);}}
  input.pressed.clear();input.pointer.pressed=false;input.pointer.released=false;
 }};return runner;
}
function mountGame(options){
 const canvas=document.getElementById('game-canvas'),context=canvas.getContext('2d'),input=createInputState(),runner=createRunner(options);
 const width=options.width||480,height=options.height||680,title=window.GAME_CONFIG?.title||options.title;
 const frame=document.getElementById('game-frame'),overlay=document.getElementById('round-overlay'),heading=document.getElementById('round-heading'),description=document.getElementById('round-description');
 const primary=document.getElementById('round-primary'),restart=document.getElementById('round-restart'),pause=document.getElementById('pause-game'),help=document.getElementById('game-help');
 document.title=title;document.querySelectorAll('[data-game-title]').forEach(el=>el.textContent=title);
 document.getElementById('game-credit').textContent=window.GAME_CONFIG?.creator?'기획·디자인: '+window.GAME_CONFIG.creator:'먼저 해 보고 나만의 게임으로 바꿔 봐!';
 help.textContent=options.controls||'';canvas.setAttribute('aria-label',title+' 게임 화면');canvas.tabIndex=0;
 for(const[key,value]of Object.entries(options.theme||{}))if(typeof value==='string')document.documentElement.style.setProperty('--'+key,value);
 frame.style.setProperty('--game-ratio',width+'/'+height);
 function resize(){const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);context.setTransform(ratio,0,0,ratio,0,0);}
 resize();window.addEventListener('resize',resize);
 const active=new Map();
 function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*width/r.width,y:(e.clientY-r.top)*height/r.height};}
 function sync(e,kind){const p=point(e);Object.assign(input.pointer,p,{inside:p.x>=0&&p.y>=0&&p.x<=width&&p.y<=height});if(kind==='down'){input.pointer.down=true;input.pointer.pressed=true;active.set(e.pointerId,{id:e.pointerId,...p,down:true});}else if(kind==='move'){if(active.has(e.pointerId))active.set(e.pointerId,{id:e.pointerId,...p,down:true});}else{active.delete(e.pointerId);input.pointer.down=active.size>0;input.pointer.released=true;}input.pointers=[...active.values()];}
 canvas.addEventListener('pointerdown',e=>{if(runner.mode!=='play')return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);sync(e,'down');});
 canvas.addEventListener('pointermove',e=>{if(runner.mode==='play')sync(e,'move');});
 canvas.addEventListener('pointerup',e=>{if(runner.mode==='play')sync(e,'up');});
 const resetInput=()=>{active.clear();clearInputState(input);};canvas.addEventListener('pointercancel',resetInput);canvas.addEventListener('lostpointercapture',e=>{active.delete(e.pointerId);if(active.size===0)input.pointer.down=false;input.pointers=[...active.values()];});
 function renderOverlay(){
  const mode=runner.mode;overlay.hidden=mode==='play';pause.hidden=mode!=='play';restart.hidden=mode==='start';
  if(mode==='start'){heading.textContent=title;description.textContent=options.description||'';primary.textContent='게임 시작';}
  if(mode==='pause'){heading.textContent='잠깐 쉬어 가기';description.textContent='준비되면 계속해 봐!';primary.textContent='계속하기';}
  if(mode==='result'){heading.textContent=runner.state.result.success?'해냈어!':'한 번 더 해볼까?';description.textContent=runner.state.result.message||'';primary.textContent='다시 하기';restart.hidden=true;}
 }
 function play(){if(runner.mode==='start')runner.start(input);else if(runner.mode==='pause')runner.resume(input);else runner.restart(input);renderOverlay();canvas.focus({preventScroll:true});}
 primary.addEventListener('click',play);restart.addEventListener('click',()=>{runner.restart(input);renderOverlay();canvas.focus({preventScroll:true});});
 pause.addEventListener('click',()=>{runner.pause(input);resetInput();renderOverlay();});
 window.addEventListener('keydown',e=>{if(e.target.closest?.('dialog,input,textarea,select,button,summary,a,#maker-guide'))return;const key=e.key.toLowerCase();if(key==='escape'){if(runner.mode==='play')runner.pause(input);else if(runner.mode==='pause')runner.resume(input);resetInput();renderOverlay();return;}if(runner.mode!=='play')return;if(['arrowleft','arrowright','arrowup','arrowdown',' ','enter','w','a','s','d'].includes(key))e.preventDefault();if(!input.keys.has(key))input.pressed.add(key);input.keys.add(key);});
 window.addEventListener('keyup',e=>input.keys.delete(e.key.toLowerCase()));
 function suspend(){resetInput();runner.pause(input);renderOverlay();}window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
 let last=performance.now(),previousMode=runner.mode;
 function frameLoop(now){const dt=(now-last)/1000;last=now;runner.tick(dt,input);context.save();context.clearRect(0,0,width,height);try{options.render(context,runner.state,{width,height,time:runner.time});}finally{context.restore();}if(previousMode!==runner.mode){renderOverlay();previousMode=runner.mode;}requestAnimationFrame(frameLoop);}
 renderOverlay();requestAnimationFrame(frameLoop);
 return runner;
}

const CONFIG = {
  title: '젬 브롤',
  width: 960,
  height: 540,
  world: { w: 920, h: 1180 },
  feel: {
    /** 조준 방향이 목표로 따라가는 속도(초당) */
    aimTurn: 12,
    /** 마우스 조준은 더 천천히 */
    mouseAimTurn: 18,
    /** 스틱/오토에임 조준 */
    stickAimTurn: 12,
    /** WASD·이동 입력 가속 보간 */
    moveAccel: 4.5,
    /** 이동 최고 속도 배율(1=기본) */
    moveScale: 0.82,
  },
  palette: {
    background: '#1a4d2e',
    surface: '#0f2f1c',
    primary: '#ffd24a',
    accent: '#5ad0ff',
    danger: '#ff5a6a',
    text: '#fff8e7',
    ally: '#4db7ff',
    enemy: '#ff6b5a',
    bush: '#1f6b3a',
    wall: '#6b5a4a',
    gem: '#b14dff',
  },
  rules: {
    gemWinCount: 10,
    holdSeconds: 15,
    gemSpawnEvery: 2.2,
    maxGemsOnField: 14,
    respawnSeconds: 3,
    matchSeconds: 150,
    ballGoalsToWin: 2,
    heistSafeHp: 28000,
    hotzoneSeconds: 100,
    knockoutRounds: 2,
  },
};

const MODES = [
  { id: 'gem', name: '젬 그래버', blurb: '젬 10개 모아 15초 버티기 · 3v3', team: true },
];

/** 역할군별 브롤러 — HP·사거리·가젯·궁극기는 여기만 바꿔도 체감이 바뀝니다. */
const BRAWLERS = [
  {
    id: 'bull',
    name: '불',
    role: '탱커',
    color: '#ff8a3d',
    hp: 5200,
    speed: 132,
    range: 140,
    damage: 380,
    fireRate: 0.85,
    bulletSpeed: 400,
    pellets: 5,
    spread: 0.5,
    radius: 22,
    gadget: { name: '속도 자극', type: 'speed', duration: 2.2, uses: 3 },
    super: { name: '돌진', type: 'dash', damage: 700, range: 230, cost: 1 },
  },
  {
    id: 'primo',
    name: '프리모',
    role: '탱커',
    color: '#5ec8ff',
    hp: 5600,
    speed: 128,
    range: 110,
    damage: 640,
    fireRate: 0.9,
    bulletSpeed: 0,
    pellets: 0,
    spread: 0,
    radius: 23,
    melee: true,
    gadget: { name: '장갑', type: 'shield', duration: 2.5, uses: 3 },
    super: { name: '낙하 펀치', type: 'dash', damage: 900, range: 250, cost: 1 },
  },
  {
    id: 'mortis',
    name: '모티스',
    role: '어쌔신',
    color: '#c45cff',
    hp: 3000,
    speed: 182,
    range: 118,
    damage: 720,
    fireRate: 0.9,
    bulletSpeed: 0,
    pellets: 0,
    spread: 0,
    radius: 17,
    melee: true,
    gadget: { name: '생존본능', type: 'heal', amount: 900, uses: 3 },
    super: { name: '흡혈 대시', type: 'dash', damage: 950, range: 270, heal: 450, cost: 1 },
  },
  {
    id: 'leon',
    name: '레온',
    role: '어쌔신',
    color: '#7dffb0',
    hp: 2900,
    speed: 170,
    range: 200,
    damage: 340,
    fireRate: 0.28,
    bulletSpeed: 480,
    pellets: 1,
    spread: 0.05,
    radius: 16,
    burst: 4,
    gadget: { name: '미끼', type: 'speed', duration: 1.8, uses: 3 },
    super: { name: '은신', type: 'stealth', duration: 5, cost: 1 },
  },
  {
    id: 'shelly',
    name: '쉘리',
    role: '딜러',
    color: '#8fd14a',
    hp: 3600,
    speed: 155,
    range: 165,
    damage: 300,
    fireRate: 0.72,
    bulletSpeed: 430,
    pellets: 5,
    spread: 0.42,
    radius: 18,
    gadget: { name: '대시', type: 'dash', range: 140, uses: 3 },
    super: { name: '슈퍼 셸', type: 'shotgun', damage: 560, pellets: 7, spread: 0.55, range: 220, cost: 1 },
  },
  {
    id: 'colt',
    name: '콜트',
    role: '딜러',
    color: '#4aa3ff',
    hp: 2800,
    speed: 165,
    range: 285,
    damage: 230,
    fireRate: 0.2,
    bulletSpeed: 540,
    pellets: 1,
    spread: 0.035,
    radius: 16,
    burst: 6,
    gadget: { name: '속도탄', type: 'speed', duration: 2, uses: 3 },
    super: { name: '총알 비', type: 'beam', damage: 280, pellets: 1, spread: 0, range: 360, cost: 1 },
  },
  {
    id: 'piper',
    name: '파이퍼',
    role: '저격수',
    color: '#ff6eb0',
    hp: 2400,
    speed: 150,
    range: 360,
    damage: 620,
    fireRate: 1.05,
    bulletSpeed: 620,
    pellets: 1,
    spread: 0.01,
    radius: 15,
    sniperFalloff: true,
    gadget: { name: '홈런', type: 'knock', range: 160, uses: 3 },
    super: { name: '곡사포', type: 'artillery', damage: 800, range: 300, cost: 1 },
  },
  {
    id: 'spike',
    name: '스파이크',
    role: '컨트롤러',
    color: '#5cff7a',
    hp: 3100,
    speed: 148,
    range: 250,
    damage: 360,
    fireRate: 0.95,
    bulletSpeed: 380,
    pellets: 1,
    spread: 0.05,
    radius: 17,
    cactus: true,
    gadget: { name: '가시 장판', type: 'zone', duration: 3.5, uses: 3 },
    super: { name: '가시 폭풍', type: 'shotgun', damage: 400, pellets: 8, spread: 0.9, range: 200, cost: 1 },
  },
  {
    id: 'poco',
    name: '포코',
    role: '서포터',
    color: '#ffd45c',
    hp: 3400,
    speed: 150,
    range: 235,
    damage: 190,
    fireRate: 0.88,
    bulletSpeed: 360,
    pellets: 1,
    spread: 0.08,
    radius: 17,
    healShot: 450,
    gadget: { name: '응급 치료', type: 'heal', amount: 1100, uses: 3 },
    super: { name: '응원가', type: 'healwave', heal: 1400, range: 220, cost: 1 },
  },
  {
    id: 'dynamike',
    name: '다이너',
    role: '투척수',
    color: '#ffb347',
    hp: 2700,
    speed: 145,
    range: 270,
    damage: 700,
    fireRate: 1.1,
    bulletSpeed: 280,
    pellets: 1,
    spread: 0.06,
    radius: 16,
    lob: true,
    gadget: { name: '점프', type: 'dash', range: 160, uses: 3 },
    super: { name: '빅 폭탄', type: 'artillery', damage: 1200, range: 280, cost: 1 },
  },
];


// Fixed north-up camera: screen directions never rotate with the player's aim.
function updateCamera(state, player, dt = 1 / 60) {
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

function worldToScreen(x, y, camera) {
  return {
    x: camera.screenX + (x - camera.x) * camera.scale,
    y: camera.screenY + (y - camera.y) * camera.scale,
  };
}

function screenToWorld(x, y, camera) {
  return {
    x: camera.x + (x - camera.screenX) / camera.scale,
    y: camera.y + (y - camera.screenY) / camera.scale,
  };
}

function turnToward(curX, curY, wantX, wantY, turnSpeed, dt) {
  if (Math.hypot(wantX, wantY) < 0.001) return { x: curX, y: curY };
  const current = Math.atan2(curY, curX);
  let delta = Math.atan2(wantY, wantX) - current;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  const step = Math.max(-turnSpeed * dt, Math.min(turnSpeed * dt, delta));
  return { x: Math.cos(current + step), y: Math.sin(current + step) };
}


const TAU = Math.PI * 2;
const STICK_R = 58;
const LEFT_STICK = { x: 96, y: CONFIG.height - 86 };
const RIGHT_STICK = { x: CONFIG.width - 96, y: CONFIG.height - 86 };
const SUPER_BTN = { x: CONFIG.width - 96, y: CONFIG.height - 178, r: 28 };
const GADGET_BTN = { x: CONFIG.width - 178, y: CONFIG.height - 178, r: 26 };

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function len(x, y) {
  return Math.hypot(x, y);
}
function norm(x, y) {
  const d = len(x, y) || 1;
  return { x: x / d, y: y / d };
}
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function circleHitsRect(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}
function pointInBush(x, y, bushes) {
  return bushes.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
}
function inStick(px, py, stick) {
  return len(px - stick.x, py - stick.y) <= STICK_R + 30;
}
function stickVec(px, py, stick) {
  const dx = px - stick.x;
  const dy = py - stick.y;
  const d = len(dx, dy);
  if (d < 6) return { x: 0, y: 0, mag: 0 };
  const m = Math.min(1, d / STICK_R);
  return { x: (dx / d) * m, y: (dy / d) * m, mag: m };
}
function hitTest(px, py, x, y, w, h) {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function buildMap() {
  const { w, h } = CONFIG.world;
  return {
    walls: [
      { x: 60, y: 220, w: 70, h: 28 },
      { x: 790, y: 220, w: 70, h: 28 },
      { x: 60, y: 930, w: 70, h: 28 },
      { x: 790, y: 930, w: 70, h: 28 },
      { x: 200, y: 360, w: 28, h: 110 },
      { x: 692, y: 360, w: 28, h: 110 },
      { x: 200, y: 710, w: 28, h: 110 },
      { x: 692, y: 710, w: 28, h: 110 },
      { x: 360, y: 500, w: 90, h: 28 },
      { x: 470, y: 650, w: 90, h: 28 },
      { x: 140, y: 560, w: 60, h: 24 },
      { x: 720, y: 560, w: 60, h: 24 },
    ],
    bushes: [
      { x: 110, y: 280, w: 120, h: 90 },
      { x: 690, y: 280, w: 120, h: 90 },
      { x: 110, y: 820, w: 120, h: 90 },
      { x: 690, y: 820, w: 120, h: 90 },
      { x: 300, y: 180, w: 140, h: 70 },
      { x: 480, y: 930, w: 140, h: 70 },
      { x: 390, y: 430, w: 140, h: 55 },
      { x: 390, y: 700, w: 140, h: 55 },
    ],
    mine: { x: w / 2, y: h / 2, r: 36 },
    allyGoal: { x: w / 2 - 55, y: h - 36, w: 110, h: 28 },
    enemyGoal: { x: w / 2 - 55, y: 8, w: 110, h: 28 },
    allySafe: { x: w / 2 - 40, y: h - 70, w: 80, h: 50, hp: CONFIG.rules.heistSafeHp, maxHp: CONFIG.rules.heistSafeHp },
    enemySafe: { x: w / 2 - 40, y: 20, w: 80, h: 50, hp: CONFIG.rules.heistSafeHp, maxHp: CONFIG.rules.heistSafeHp },
    hotzone: { x: w / 2 - 70, y: h / 2 - 70, w: 140, h: 140 },
    allySpawn: [
      { x: w / 2 - 70, y: h - 90 },
      { x: w / 2, y: h - 70 },
      { x: w / 2 + 70, y: h - 90 },
    ],
    enemySpawn: [
      { x: w / 2 - 70, y: 90 },
      { x: w / 2, y: 70 },
      { x: w / 2 + 70, y: 90 },
    ],
  };
}

function makeUnit(id, team, brawlerIndex, spawn, extras = {}) {
  const b = BRAWLERS[brawlerIndex];
  const power = extras.power || 1;
  return {
    id,
    team,
    brawlerIndex,
    name: b.name,
    role: b.role,
    color: b.color,
    x: spawn.x,
    y: spawn.y,
    hp: b.hp * power,
    maxHp: b.hp * power,
    aimX: team === 'ally' ? 0 : 0,
    aimY: team === 'ally' ? -1 : 1,
    cooldown: 0,
    burstLeft: 0,
    superCharge: 0,
    gadgetLeft: b.gadget?.uses || 3,
    gadgetBuff: 0,
    shield: 0,
    stealth: 0,
    speedMul: 1,
    damageMul: power,
    gems: 0,
    stars: 0,
    cubes: 0,
    alive: true,
    respawn: 0,
    hidden: false,
    flash: 0,
    think: Math.random(),
    dashT: 0,
    dashDx: 0,
    dashDy: 0,
    _dashDamage: 0,
    _dashHeal: 0,
    ai: id !== 'player',
    ...extras,
  };
}

function resolveMove(unit, dx, dy, dt, map, speedScale = 1) {
  const b = BRAWLERS[unit.brawlerIndex];
  const spd = b.speed * (unit.speedMul || 1) * speedScale;
  let nx = unit.x + dx * spd * dt;
  let ny = unit.y + dy * spd * dt;
  const r = b.radius;
  const { w, h } = CONFIG.world;
  nx = clamp(nx, r + 8, w - r - 8);
  ny = clamp(ny, r + 8, h - r - 8);
  for (const wall of map.walls) {
    if (circleHitsRect(nx, unit.y, r, wall)) nx = unit.x;
    if (circleHitsRect(unit.x, ny, r, wall)) ny = unit.y;
    if (circleHitsRect(nx, ny, r, wall)) {
      nx = unit.x;
      ny = unit.y;
    }
  }
  unit.x = nx;
  unit.y = ny;
}

function spawnBullet(state, owner, angle, damage, speed, life, color, opts = {}) {
  state.bullets.push({
    x: owner.x + Math.cos(angle) * 20,
    y: owner.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage: damage * (owner.damageMul || 1),
    heal: opts.heal || 0,
    life,
    team: owner.team,
    ownerId: owner.id,
    color,
    r: opts.r || 6,
    lob: !!opts.lob,
    arc: opts.lob ? 0 : 0,
    ignoreWall: !!opts.lob,
    splash: opts.splash || 0,
  });
}

function fireNormal(state, unit) {
  const b = BRAWLERS[unit.brawlerIndex];
  if (unit.cooldown > 0 || !unit.alive) return;
  const ang = Math.atan2(unit.aimY, unit.aimX);
  if (b.melee) {
    for (const other of state.units) {
      if (!other.alive || other.team === unit.team) continue;
      if (dist(unit, other) <= b.range + BRAWLERS[other.brawlerIndex].radius) {
        const d = norm(other.x - unit.x, other.y - unit.y);
        if (d.x * unit.aimX + d.y * unit.aimY > 0.3) hurt(state, other, b.damage, unit);
      }
    }
    unit.cooldown = b.fireRate;
    unit.flash = 0.12;
    state.fx.push({ kind: 'slash', x: unit.x, y: unit.y, ang, t: 0.18, color: unit.color });
    return;
  }
  const pellets = b.pellets || 1;
  for (let i = 0; i < pellets; i++) {
    const t = pellets === 1 ? 0 : (i / (pellets - 1) - 0.5) * b.spread;
    let dmg = b.damage;
    if (b.sniperFalloff) {
      // 멀리서 더  Sem게 (저격수 맛)
      dmg = b.damage * 0.75;
    }
    spawnBullet(state, unit, ang + t, dmg, b.bulletSpeed, b.range / Math.max(b.bulletSpeed, 1) + 0.08, unit.color, {
      heal: b.healShot || 0,
      lob: b.lob,
      splash: b.cactus ? 42 : b.lob ? 36 : 0,
      r: b.lob ? 8 : 6,
    });
  }
  unit.cooldown = b.burst ? 0.08 : b.fireRate;
  if (b.burst) {
    unit.burstLeft = (unit.burstLeft || b.burst) - 1;
    if (unit.burstLeft <= 0) {
      unit.burstLeft = 0;
      unit.cooldown = b.fireRate * 2.1;
    }
  }
  unit.flash = 0.08;
}

function fireSuper(state, unit) {
  const b = BRAWLERS[unit.brawlerIndex];
  const s = b.super;
  if (!unit.alive || unit.superCharge < s.cost) return false;
  unit.superCharge = 0;
  const ang = Math.atan2(unit.aimY, unit.aimX);
  if (s.type === 'shotgun' || s.type === 'beam') {
    const pellets = s.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const t = pellets === 1 ? 0 : (i / (pellets - 1) - 0.5) * (s.spread || 0);
      spawnBullet(state, unit, ang + t, s.damage, 560, (s.range || 240) / 560 + 0.05, '#ffe28a');
    }
  } else if (s.type === 'dash') {
    unit.dashT = 0.28;
    unit.dashDx = Math.cos(ang);
    unit.dashDy = Math.sin(ang);
    unit._dashDamage = s.damage;
    unit._dashHeal = s.heal || 0;
  } else if (s.type === 'healwave') {
    for (const other of state.units) {
      if (!other.alive || other.team !== unit.team) continue;
      if (dist(unit, other) <= s.range) {
        other.hp = Math.min(other.maxHp, other.hp + s.heal);
        state.fx.push({ kind: 'heal', x: other.x, y: other.y, t: 0.4, color: '#7dff9a' });
      }
    }
  } else if (s.type === 'stealth') {
    unit.stealth = s.duration;
  } else if (s.type === 'artillery') {
    const tx = unit.x + Math.cos(ang) * (s.range || 260);
    const ty = unit.y + Math.sin(ang) * (s.range || 260);
    state.fx.push({ kind: 'boom', x: tx, y: ty, t: 0.5, color: '#ffb347' });
    for (const other of state.units) {
      if (!other.alive || other.team === unit.team) continue;
      if (dist({ x: tx, y: ty }, other) < 70) hurt(state, other, s.damage, unit);
    }
  }
  state.fx.push({ kind: 'super', x: unit.x, y: unit.y, t: 0.45, color: CONFIG.palette.primary });
  return true;
}

function useGadget(state, unit) {
  const b = BRAWLERS[unit.brawlerIndex];
  const g = b.gadget;
  if (!g || unit.gadgetLeft <= 0 || !unit.alive) return false;
  unit.gadgetLeft -= 1;
  const ang = Math.atan2(unit.aimY, unit.aimX);
  if (g.type === 'speed') {
    unit.speedMul = 1.45;
    unit.gadgetBuff = g.duration;
  } else if (g.type === 'shield') {
    unit.shield = g.duration;
  } else if (g.type === 'heal') {
    unit.hp = Math.min(unit.maxHp, unit.hp + g.amount);
    state.fx.push({ kind: 'heal', x: unit.x, y: unit.y, t: 0.4, color: '#7dff9a' });
  } else if (g.type === 'dash') {
    unit.dashT = 0.2;
    unit.dashDx = Math.cos(ang);
    unit.dashDy = Math.sin(ang);
    unit._dashDamage = 0;
  } else if (g.type === 'knock') {
    for (const other of state.units) {
      if (!other.alive || other.team === unit.team) continue;
      if (dist(unit, other) < g.range) {
        const n = norm(other.x - unit.x, other.y - unit.y);
        other.x += n.x * 70;
        other.y += n.y * 70;
        hurt(state, other, 200, unit);
      }
    }
  } else if (g.type === 'zone') {
    state.zones.push({
      x: unit.x,
      y: unit.y,
      r: 70,
      t: g.duration,
      team: unit.team,
      dps: 280,
      ownerId: unit.id,
    });
  }
  state.fx.push({ kind: 'gadget', x: unit.x, y: unit.y, t: 0.35, color: '#9ad7ff' });
  return true;
}

function hurt(state, unit, amount, attacker) {
  if (!unit.alive) return;
  let dmg = amount;
  if (unit.shield > 0) dmg *= 0.45;
  unit.hp -= dmg;
  unit.flash = 0.15;
  if (unit.stealth > 0) unit.stealth = 0;
  if (attacker && attacker.alive) {
    attacker.superCharge = Math.min(1, attacker.superCharge + dmg / 2000);
  }
  state.fx.push({ kind: 'hit', x: unit.x, y: unit.y, t: 0.2, color: '#fff' });
  if (unit.hp <= 0) {
    unit.hp = 0;
    unit.alive = false;
    if (state.mode === 'knockout') unit.respawn = 999;
    else if (state.mode === 'showdown') unit.respawn = 999;
    else unit.respawn = CONFIG.rules.respawnSeconds;
    dropGems(state, unit);
    if (state.mode === 'bounty' || state.mode === 'gem' || state.mode === 'ball' || state.mode === 'heist' || state.mode === 'hotzone') {
      /* stars for flavor on kills in team modes optional */
    }
    if (attacker && attacker.alive && state.mode === 'knockout') {
      /* round may end */
    }
    if (attacker && attacker.alive) {
      attacker.stars = (attacker.stars || 0) + 1;
      if (state.mode === 'showdown') {
        attacker.cubes = (attacker.cubes || 0) + Math.max(1, unit.cubes || 0);
        applyCubes(attacker);
      }
    }
    state.fx.push({ kind: 'ko', x: unit.x, y: unit.y, t: 0.6, color: unit.color });
  }
}

function applyCubes(unit) {
  const base = BRAWLERS[unit.brawlerIndex];
  const mul = 1 + (unit.cubes || 0) * 0.12;
  const ratio = unit.hp / unit.maxHp;
  unit.maxHp = base.hp * mul;
  unit.hp = unit.maxHp * ratio;
  unit.damageMul = mul;
}

function dropGems(state, unit) {
  const n = unit.gems || 0;
  unit.gems = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const d = 18 + Math.random() * 40;
    state.gems.push({ x: unit.x + Math.cos(a) * d, y: unit.y + Math.sin(a) * d });
  }
}

function teamGems(state, team) {
  return state.units.filter((u) => u.team === team).reduce((s, u) => s + (u.gems || 0), 0);
}

function pickNearest(unit, list, pred) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    if (pred && !pred(item)) continue;
    const d = dist(unit, item);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

function findAutoAimTarget(state, unit) {
  const b = BRAWLERS[unit.brawlerIndex];
  const foes = state.units.filter((u) => u.alive && u.team !== unit.team && !(u.stealth > 0));
  let best = null;
  let score = Infinity;
  for (const f of foes) {
    const d = dist(unit, f);
    if (d > b.range * 1.15) continue;
    // 가까운 적 + 다가오는 적 우선
    const closing = (unit.x - f.x) * (f.x - unit.x) + (unit.y - f.y) * (f.y - unit.y);
    const s = d - (closing > 0 ? 40 : 0);
    if (s < score) {
      score = s;
      best = f;
    }
  }
  return best;
}

function aiControl(state, unit) {
  unit.think -= 0.016;
  if (unit.think > 0 && unit._aiMove) return unit._aiMove;
  unit.think = 0.2 + Math.random() * 0.3;
  const b = BRAWLERS[unit.brawlerIndex];
  const enemies = state.units.filter((u) => u.alive && u.team !== unit.team);
  const threat = pickNearest(unit, enemies);
  let target = null;
  let shoot = false;
  let useSuper = false;
  let useGadgetBtn = false;

  if (state.mode === 'gem') {
    const myG = teamGems(state, unit.team);
    if (unit.hp < unit.maxHp * 0.35) target = pickNearest(unit, state.map.bushes.map((bush) => ({ x: bush.x + bush.w / 2, y: bush.y + bush.h / 2 })));
    else if (myG < CONFIG.rules.gemWinCount) target = pickNearest(unit, state.gems) || state.map.mine;
    else target = pickNearest(unit, enemies) || state.map.mine;
  } else if (state.mode === 'showdown') {
    target = pickNearest(unit, state.crates) || pickNearest(unit, enemies) || { x: CONFIG.world.w / 2, y: CONFIG.world.h / 2 };
  } else if (state.mode === 'ball') {
    target = state.ball;
  } else if (state.mode === 'heist') {
    target = unit.team === 'ally' ? state.map.enemySafe : state.map.allySafe;
  } else if (state.mode === 'hotzone') {
    target = { x: state.map.hotzone.x + 70, y: state.map.hotzone.y + 70 };
  } else {
    target = threat;
  }

  if (threat && dist(unit, threat) < b.range * 0.95) {
    shoot = true;
    unit.aimX = threat.x - unit.x;
    unit.aimY = threat.y - unit.y;
    if (unit.superCharge >= 1) useSuper = true;
    if (unit.hp < unit.maxHp * 0.4 && unit.gadgetLeft > 0) useGadgetBtn = true;
  } else if (target) {
    unit.aimX = (target.x || target.x === 0 ? target.x : target.x) - unit.x;
    unit.aimY = (target.y || 0) - unit.y;
  }

  let mx = 0;
  let my = 0;
  if (target) {
    const v = norm((target.x || 0) - unit.x, (target.y || 0) - unit.y);
    mx = v.x;
    my = v.y;
  }
  if (threat && dist(unit, threat) < 85) {
    mx -= (threat.x - unit.x) * 0.02;
    my -= (threat.y - unit.y) * 0.02;
  }
  // 쇼다운 독가스 회피
  if (state.mode === 'showdown' && state.gasR) {
    const cx = CONFIG.world.w / 2;
    const cy = CONFIG.world.h / 2;
    if (dist(unit, { x: cx, y: cy }) > state.gasR - 40) {
      const v = norm(cx - unit.x, cy - unit.y);
      mx = v.x;
      my = v.y;
    }
  }
  unit._aiMove = { move: norm(mx, my), shoot, useSuper, useGadget: useGadgetBtn };
  return unit._aiMove;
}

function readPlayerInput(state, input, dt) {
  const feel = CONFIG.feel || {};
  const keys = input.keys;
  let ix = 0;
  let iy = 0;
  if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
  if (keys.has('d') || keys.has('arrowright')) ix += 1;
  if (keys.has('w') || keys.has('arrowup')) iy -= 1; // fixed north-up
  if (keys.has('s') || keys.has('arrowdown')) iy += 1;

  let wantAimX = state.playerAim.x;
  let wantAimY = state.playerAim.y;
  let shoot = false;
  let useSuper = keys.has('e') || keys.has('shift');
  let useGadgetBtn = keys.has('q') || input.pressed.has('q');
  let aimMode = 'none';
  let turnSpeed = feel.aimTurn || 2.4;
  let mouseAim = false;

  let left = null;
  let right = null;
  for (const p of input.pointers) {
    if (!p.down) continue;
    if (len(p.x - SUPER_BTN.x, p.y - SUPER_BTN.y) <= SUPER_BTN.r + 12) {
      useSuper = true;
      continue;
    }
    if (len(p.x - GADGET_BTN.x, p.y - GADGET_BTN.y) <= GADGET_BTN.r + 12) {
      useGadgetBtn = true;
      continue;
    }
    if (p.y > CONFIG.height * 0.58) {
      if (p.x < CONFIG.width * 0.48 && !left) left = p;
      else if (p.x >= CONFIG.width * 0.48 && !right) right = p;
    } else if (inStick(p.x, p.y, LEFT_STICK) && !left) left = p;
    else if (inStick(p.x, p.y, RIGHT_STICK) && !right) right = p;
  }

  // 스틱 이동(화면 기준 → 카메라 기준으로 아래에서 변환)
  if (left) {
    const v = stickVec(left.x, left.y, LEFT_STICK);
    if (v.mag > 0.1) {
      ix = v.x;
      iy = v.y;
    }
  }

  const movement = norm(ix, iy);
  const mx = movement.x;
  const my = movement.y;

  if (right) {
    const v = stickVec(right.x, right.y, RIGHT_STICK);
    shoot = true;
    turnSpeed = feel.stickAimTurn || 2.8;
    if (v.mag < 0.42) {
      aimMode = 'auto';
      const player = state.units.find((u) => u.id === 'player');
      const t = player && findAutoAimTarget(state, player);
      if (t) {
        wantAimX = t.x - player.x;
        wantAimY = t.y - player.y;
      } else if (v.mag > 0.08) {
        // 스틱 방향도 카메라 기준으로
        wantAimX = v.x;
        wantAimY = v.y;
      }
    } else {
      aimMode = 'manual';
      wantAimX = v.x;
      wantAimY = v.y;
    }
  }

  if (keys.has(' ')) {
    shoot = true;
    if (!right) {
      aimMode = 'auto';
      turnSpeed = feel.stickAimTurn || 2.8;
      const player = state.units.find((u) => u.id === 'player');
      const t = player && findAutoAimTarget(state, player);
      if (t) {
        wantAimX = t.x - player.x;
        wantAimY = t.y - player.y;
      }
    }
  }

  if (input.pointer.down && input.pointer.y < CONFIG.height * 0.62 && !left && !right) {
    const player = state.units.find((u) => u.id === 'player');
    if (player && state.camera.scale) {
      const hit = screenToWorld(input.pointer.x, input.pointer.y, state.camera);
      if (hit) {
        wantAimX = hit.x - player.x;
        wantAimY = hit.y - player.y;
        shoot = true;
        aimMode = 'manual';
        mouseAim = true;
        turnSpeed = feel.mouseAimTurn || 1.6;
      }
    }
  }

  // 조준 천천히 회전
  const aim = turnToward(state.playerAim.x, state.playerAim.y, wantAimX, wantAimY, turnSpeed, dt);
  state.playerAim = aim;

  // 이동 가속 보간 + 속도 배율
  if (!state.moveVel) state.moveVel = { x: 0, y: 0 };
  const accel = feel.moveAccel || 4.5;
  const t = 1 - Math.exp(-accel * dt);
  const scale = feel.moveScale || 0.82;
  state.moveVel.x += (mx * scale - state.moveVel.x) * t;
  state.moveVel.y += (my * scale - state.moveVel.y) * t;

  state.aimMode = aimMode;
  state.sticks = {
    left: { x: ix, y: iy, mag: len(ix, iy) },
    right: right ? stickVec(right.x, right.y, RIGHT_STICK) : { x: aim.x, y: aim.y, mag: shoot ? 1 : 0 },
  };
  return {
    move: { x: state.moveVel.x, y: state.moveVel.y },
    shoot,
    useSuper,
    useGadget: useGadgetBtn,
  };
}

function createGame() {
  return {
    phase: 'splash',
    modeIndex: 0,
    mode: 'gem',
    pickIndex: 0,
    map: buildMap(),
    units: [],
    bullets: [],
    gems: [],
    crates: [],
    zones: [],
    fx: [],
    ball: null,
    gemTimer: 0,
    crateTimer: 0,
    holdTeam: null,
    holdTime: 0,
    matchTime: CONFIG.rules.matchSeconds,
    gasR: 620,
    allyScore: 0,
    enemyScore: 0,
    allyZone: 0,
    enemyZone: 0,
    koAlly: 0,
    koEnemy: 0,
    round: 1,
    camera: { x: 0, y: 0 },
    playerAim: { x: 0, y: -1 },
    viewDir: { x: 0, y: -1 },
    moveVel: { x: 0, y: 0 },
    aimMode: 'none',
    sticks: { left: { x: 0, y: 0, mag: 0 }, right: { x: 0, y: 0, mag: 0 } },
    message: '',
    toast: 0,
    result: null,
  };
}

function startMatch(state) {
  const map = buildMap();
  state.map = map;
  state.map.allySafe.hp = CONFIG.rules.heistSafeHp;
  state.map.enemySafe.hp = CONFIG.rules.heistSafeHp;
  state.map.allySafe.maxHp = CONFIG.rules.heistSafeHp;
  state.map.enemySafe.maxHp = CONFIG.rules.heistSafeHp;
  const pick = state.pickIndex;
  const mode = state.mode = 'gem';

  if (mode === 'showdown') {
    const spawns = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      spawns.push({
        x: CONFIG.world.w / 2 + Math.cos(a) * 380,
        y: CONFIG.world.h / 2 + Math.sin(a) * 460,
      });
    }
    state.units = [makeUnit('player', 'ally', pick, spawns[0])];
    for (let i = 1; i < 8; i++) {
      state.units.push(makeUnit('bot' + i, 'enemy', (pick + i) % BRAWLERS.length, spawns[i]));
    }
    // 쇼다운은 각자 적
    for (const u of state.units) {
      if (u.id !== 'player') u.team = 'solo' + u.id;
    }
    state.gasR = 620;
    state.crates = [];
    state.crateTimer = 1;
  } else {
    const allyPicks = [pick];
    for (let i = 0; i < BRAWLERS.length && allyPicks.length < 3; i++) if (!allyPicks.includes(i)) allyPicks.push(i);
    const enemyPicks = [];
    for (let i = BRAWLERS.length - 1; i >= 0 && enemyPicks.length < 3; i--) enemyPicks.push(i);
    state.units = [
      makeUnit('player', 'ally', allyPicks[0], map.allySpawn[1]),
      makeUnit('ally1', 'ally', allyPicks[1], map.allySpawn[0]),
      makeUnit('ally2', 'ally', allyPicks[2], map.allySpawn[2]),
      makeUnit('enemy0', 'enemy', enemyPicks[0], map.enemySpawn[0]),
      makeUnit('enemy1', 'enemy', enemyPicks[1], map.enemySpawn[1]),
      makeUnit('enemy2', 'enemy', enemyPicks[2], map.enemySpawn[2]),
    ];
  }

  state.bullets = [];
  state.gems = [];
  state.zones = [];
  state.fx = [];
  state.gemTimer = 0.5;
  state.holdTeam = null;
  state.holdTime = 0;
  state.matchTime = CONFIG.rules.matchSeconds;
  state.allyScore = state.allyScore || 0;
  state.enemyScore = state.enemyScore || 0;
  if (mode !== 'knockout' || state.round === 1) {
    state.allyScore = 0;
    state.enemyScore = 0;
    state.koAlly = 0;
    state.koEnemy = 0;
  }
  state.allyZone = 0;
  state.enemyZone = 0;
  state.ball =
    mode === 'ball'
      ? { x: CONFIG.world.w / 2, y: CONFIG.world.h / 2, vx: 0, vy: 0, owner: null }
      : null;
  state.phase = 'fight';
  state.message = MODES.find((m) => m.id === mode)?.blurb || '';
  state.toast = 2;
  const p0 = state.units.find((u) => u.id === 'player');
  if (p0) {
    state.viewDir = { x: p0.aimX, y: p0.aimY };
    state.moveVel = { x: 0, y: 0 };
    state.playerAim = { x: p0.aimX, y: p0.aimY };
    updateCamera(state, p0, 1 / 60);
  }
}

function finish(state, success, message) {
  state.result = { success, message };
  state.phase = 'result';
}

function updateModeLogic(state, dt) {
  const mode = state.mode;
  if (mode === 'gem') {
    state.gemTimer -= dt;
    if (state.gemTimer <= 0 && state.gems.length < CONFIG.rules.maxGemsOnField) {
      const mine = state.map.mine;
      const a = Math.random() * TAU;
      const d = 20 + Math.random() * 50;
      state.gems.push({ x: mine.x + Math.cos(a) * d, y: mine.y + Math.sin(a) * d });
      state.gemTimer = CONFIG.rules.gemSpawnEvery * (0.7 + Math.random() * 0.5);
    }
    const allyG = teamGems(state, 'ally');
    const enemyG = teamGems(state, 'enemy');
    const leading =
      allyG >= CONFIG.rules.gemWinCount && allyG > enemyG
        ? 'ally'
        : enemyG >= CONFIG.rules.gemWinCount && enemyG > allyG
          ? 'enemy'
          : allyG >= CONFIG.rules.gemWinCount && enemyG < CONFIG.rules.gemWinCount
            ? 'ally'
            : enemyG >= CONFIG.rules.gemWinCount && allyG < CONFIG.rules.gemWinCount
              ? 'enemy'
              : null;
    if (leading) {
      if (state.holdTeam !== leading) {
        state.holdTeam = leading;
        state.holdTime = CONFIG.rules.holdSeconds;
        state.message = leading === 'ally' ? '젬 10개! 15초 버텨!' : '적 홀드 중! 젬을 뺏어!';
        state.toast = 2;
      } else {
        state.holdTime -= dt;
        if (state.holdTime <= 0) {
          finish(
            state,
            leading === 'ally',
            leading === 'ally'
              ? `젬 그래버 승리! (${allyG}:${enemyG})`
              : `젬 그래버 패배… (${allyG}:${enemyG})`
          );
        }
      }
    } else {
      if (state.holdTeam) {
        state.message = '홀드 취소!';
        state.toast = 1.2;
      }
      state.holdTeam = null;
      state.holdTime = 0;
    }
  } else if (mode === 'showdown') {
    state.gasR = Math.max(120, state.gasR - 18 * dt);
    state.crateTimer -= dt;
    if (state.crateTimer <= 0 && state.crates.length < 6) {
      state.crates.push({
        x: 80 + Math.random() * (CONFIG.world.w - 160),
        y: 80 + Math.random() * (CONFIG.world.h - 160),
        hp: 400,
      });
      state.crateTimer = 3.5;
    }
    const cx = CONFIG.world.w / 2;
    const cy = CONFIG.world.h / 2;
    for (const u of state.units) {
      if (!u.alive) continue;
      if (dist(u, { x: cx, y: cy }) > state.gasR) hurt(state, u, 220 * dt, null);
      for (let i = state.crates.length - 1; i >= 0; i--) {
        const c = state.crates[i];
        if (dist(u, c) < 28) {
          c.hp -= 500 * dt;
          if (c.hp <= 0) {
            u.cubes = (u.cubes || 0) + 1;
            applyCubes(u);
            state.crates.splice(i, 1);
            state.fx.push({ kind: 'gem', x: c.x, y: c.y, t: 0.3, color: '#ffe28a' });
          }
        }
      }
    }
    const alive = state.units.filter((u) => u.alive);
    if (alive.length <= 1) {
      const win = alive[0]?.id === 'player';
      finish(state, win, win ? '쇼다운 승리! 최후의 1인!' : '쇼다운 탈락… 다시 도전!');
    }
  } else if (mode === 'ball' && state.ball) {
    const ball = state.ball;
    if (ball.owner) {
      const o = state.units.find((u) => u.id === ball.owner);
      if (o && o.alive) {
        ball.x = o.x + o.aimX * 26;
        ball.y = o.y + o.aimY * 26;
        // 공격 키로 슛: 소유자가 사격하면 공을 밀어냄 — update에서 shoot 시 처리
      } else ball.owner = null;
    } else {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vx *= 0.985;
      ball.vy *= 0.985;
      ball.x = clamp(ball.x, 20, CONFIG.world.w - 20);
      ball.y = clamp(ball.y, 20, CONFIG.world.h - 20);
      for (const u of state.units) {
        if (!u.alive) continue;
        if (dist(u, ball) < BRAWLERS[u.brawlerIndex].radius + 14) {
          ball.owner = u.id;
          ball.vx = 0;
          ball.vy = 0;
          break;
        }
      }
    }
    const eg = state.map.enemyGoal;
    const ag = state.map.allyGoal;
    if (ball.x > eg.x && ball.x < eg.x + eg.w && ball.y < eg.y + eg.h) {
      state.allyScore += 1;
      state.message = `골! ${state.allyScore} : ${state.enemyScore}`;
      state.toast = 1.5;
      ball.x = CONFIG.world.w / 2;
      ball.y = CONFIG.world.h / 2;
      ball.owner = null;
      ball.vx = 0;
      ball.vy = 0;
    }
    if (ball.x > ag.x && ball.x < ag.x + ag.w && ball.y > ag.y) {
      state.enemyScore += 1;
      state.message = `실점… ${state.allyScore} : ${state.enemyScore}`;
      state.toast = 1.5;
      ball.x = CONFIG.world.w / 2;
      ball.y = CONFIG.world.h / 2;
      ball.owner = null;
      ball.vx = 0;
      ball.vy = 0;
    }
    if (state.allyScore >= CONFIG.rules.ballGoalsToWin) finish(state, true, `브롤 볼 승리! ${state.allyScore}:${state.enemyScore}`);
    if (state.enemyScore >= CONFIG.rules.ballGoalsToWin) finish(state, false, `브롤 볼 패배… ${state.allyScore}:${state.enemyScore}`);
  } else if (mode === 'heist') {
    // 금고는 총알 히트에서 처리. 시간 종료 비교
  } else if (mode === 'hotzone') {
    const z = state.map.hotzone;
    let allyIn = 0;
    let enemyIn = 0;
    for (const u of state.units) {
      if (!u.alive) continue;
      if (u.x > z.x && u.x < z.x + z.w && u.y > z.y && u.y < z.y + z.h) {
        if (u.team === 'ally') allyIn++;
        else if (u.team === 'enemy') enemyIn++;
      }
    }
    if (allyIn > enemyIn) state.allyZone = Math.min(100, state.allyZone + 12 * dt);
    if (enemyIn > allyIn) state.enemyZone = Math.min(100, state.enemyZone + 12 * dt);
    if (state.allyZone >= 100) finish(state, true, '핫존 점령 성공!');
    if (state.enemyZone >= 100) finish(state, false, '핫존을 빼앗겼어…');
  } else if (mode === 'knockout') {
    const allyAlive = state.units.some((u) => u.team === 'ally' && u.alive);
    const enemyAlive = state.units.some((u) => u.team === 'enemy' && u.alive);
    if (!allyAlive || !enemyAlive) {
      if (allyAlive) state.koAlly += 1;
      else state.koEnemy += 1;
      if (state.koAlly >= CONFIG.rules.knockoutRounds) finish(state, true, `녹아웃 승리! ${state.koAlly}:${state.koEnemy}`);
      else if (state.koEnemy >= CONFIG.rules.knockoutRounds) finish(state, false, `녹아웃 패배… ${state.koAlly}:${state.koEnemy}`);
      else {
        state.round += 1;
        state.message = `라운드 ${state.round}! (${state.koAlly}:${state.koEnemy})`;
        state.toast = 2;
        startMatch(state);
      }
    }
  }

  if (!state.result && mode !== 'showdown' && mode !== 'knockout' && state.matchTime <= 0) {
    if (mode === 'gem') {
      const a = teamGems(state, 'ally');
      const e = teamGems(state, 'enemy');
      finish(state, a >= e, `시간 종료 젬 ${a}:${e}`);
    } else if (mode === 'heist') {
      const a = state.map.allySafe.hp;
      const e = state.map.enemySafe.hp;
      finish(state, e < a, `하이스트 종료 금고 ${(e / 1000).toFixed(1)}k vs ${(a / 1000).toFixed(1)}k`);
    } else if (mode === 'ball') {
      finish(state, state.allyScore >= state.enemyScore, `브롤 볼 ${state.allyScore}:${state.enemyScore}`);
    } else if (mode === 'hotzone') {
      finish(state, state.allyZone >= state.enemyZone, `핫존 ${state.allyZone | 0}% : ${state.enemyZone | 0}%`);
    }
  }
}

function updateGame(state, dt, input) {
  if (state.phase === 'splash') {
    state.phase = 'mode';
    return;
  }

  if (state.phase === 'mode') {
    if (input.pressed.has('a') || input.pressed.has('arrowleft')) state.modeIndex = (state.modeIndex + MODES.length - 1) % MODES.length;
    if (input.pressed.has('d') || input.pressed.has('arrowright')) state.modeIndex = (state.modeIndex + 1) % MODES.length;
    if (input.pointer.pressed) {
      const cardW = 200;
      const cardH = 70;
      const cols = Math.min(3, MODES.length);
      const gap = 14;
      const startX = (CONFIG.width - (cardW * cols + gap * (cols - 1))) / 2;
      const startY = 150;
      for (let i = 0; i < MODES.length; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + 12);
        if (hitTest(input.pointer.x, input.pointer.y, x, y, cardW, cardH)) state.modeIndex = i;
      }
      if (hitTest(input.pointer.x, input.pointer.y, CONFIG.width / 2 - 110, 420, 220, 56)) {
        state.mode = MODES[state.modeIndex].id;
        state.phase = 'pick';
      }
    }
    if (input.pressed.has(' ') || input.pressed.has('enter')) {
      state.mode = MODES[state.modeIndex].id;
      state.phase = 'pick';
    }
    return;
  }

  if (state.phase === 'pick') {
    if (input.pressed.has('a') || input.pressed.has('arrowleft')) state.pickIndex = (state.pickIndex + BRAWLERS.length - 1) % BRAWLERS.length;
    if (input.pressed.has('d') || input.pressed.has('arrowright')) state.pickIndex = (state.pickIndex + 1) % BRAWLERS.length;
    if (input.pointer.pressed) {
      const cardW = 84;
      const gap = 10;
      const cols = 5;
      const startX = (CONFIG.width - (cardW * cols + gap * (cols - 1))) / 2;
      const y0 = 140;
      for (let i = 0; i < BRAWLERS.length; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        const x = startX + col * (cardW + gap);
        const y = y0 + row * 110;
        if (hitTest(input.pointer.x, input.pointer.y, x, y, cardW, 100)) state.pickIndex = i;
      }
      if (hitTest(input.pointer.x, input.pointer.y, CONFIG.width / 2 - 110, 420, 220, 56)) startMatch(state);
      if (hitTest(input.pointer.x, input.pointer.y, 20, 16, 80, 36)) state.phase = 'mode';
    }
    if (input.pressed.has(' ') || input.pressed.has('enter')) startMatch(state);
    if (input.pressed.has('backspace')) state.phase = 'mode';
    return;
  }

  if (state.phase !== 'fight' || state.result) return;

  state.matchTime -= dt;
  state.toast = Math.max(0, state.toast - dt);

  const playerInput = readPlayerInput(state, input, dt);

  for (const unit of state.units) {
    unit.cooldown = Math.max(0, unit.cooldown - dt);
    unit.flash = Math.max(0, unit.flash - dt);
    unit.gadgetBuff = Math.max(0, unit.gadgetBuff - dt);
    unit.shield = Math.max(0, unit.shield - dt);
    unit.stealth = Math.max(0, unit.stealth - dt);
    if (unit.gadgetBuff <= 0) unit.speedMul = 1;

    if (!unit.alive) {
      unit.respawn -= dt;
      if (unit.respawn <= 0 && state.mode !== 'showdown' && state.mode !== 'knockout') {
        unit.alive = true;
        unit.hp = unit.maxHp;
        const spawn = unit.team === 'ally' ? state.map.allySpawn[(Math.random() * 3) | 0] : state.map.enemySpawn[(Math.random() * 3) | 0];
        unit.x = spawn.x;
        unit.y = spawn.y;
        unit.gems = 0;
      }
      continue;
    }

    let move = { x: 0, y: 0 };
    let shoot = false;
    let useSuper = false;
    let useGad = false;
    if (unit.id === 'player') {
      move = playerInput.move;
      shoot = playerInput.shoot;
      useSuper = playerInput.useSuper;
      useGad = playerInput.useGadget;
      unit.aimX = state.playerAim.x;
      unit.aimY = state.playerAim.y;
    } else {
      const ai = aiControl(state, unit);
      move = ai.move;
      shoot = ai.shoot;
      useSuper = ai.useSuper;
      useGad = ai.useGadget;
    }

    if (unit.dashT > 0) {
      unit.dashT -= dt;
      resolveMove(unit, unit.dashDx * 3.2, unit.dashDy * 3.2, dt, state.map);
      for (const other of state.units) {
        if (!other.alive || other.team === unit.team) continue;
        if (dist(unit, other) < BRAWLERS[unit.brawlerIndex].radius + BRAWLERS[other.brawlerIndex].radius + 8) {
          if (unit._dashDamage) hurt(state, other, unit._dashDamage * dt * 4, unit);
          if (unit._dashHeal) unit.hp = Math.min(unit.maxHp, unit.hp + unit._dashHeal * dt);
        }
      }
    } else if (move.x || move.y) {
      resolveMove(unit, move.x, move.y, dt, state.map);
    }

    unit.hidden = pointInBush(unit.x, unit.y, state.map.bushes) || unit.stealth > 0;
    if (shoot || unit.dashT > 0 || unit.flash > 0) {
      if (unit.stealth <= 0) unit.hidden = pointInBush(unit.x, unit.y, state.map.bushes) && false;
      else unit.hidden = unit.stealth > 0;
      if (shoot) unit.hidden = unit.stealth > 0 ? false : false;
    }
    // simplify visibility: bush hide unless attacking; stealth always hide until attack
    unit.hidden = (pointInBush(unit.x, unit.y, state.map.bushes) && !shoot && unit.flash <= 0) || (unit.stealth > 0 && !shoot);

    if (useGad) useGadget(state, unit);
    if (useSuper) fireSuper(state, unit);
    if (shoot) {
      fireNormal(state, unit);
      // 브롤 볼 슛
      if (state.ball && state.ball.owner === unit.id) {
        state.ball.owner = null;
        state.ball.vx = unit.aimX * 420;
        state.ball.vy = unit.aimY * 420;
      }
    }

    for (let i = state.gems.length - 1; i >= 0; i--) {
      if (dist(unit, state.gems[i]) < BRAWLERS[unit.brawlerIndex].radius + 14) {
        unit.gems += 1;
        unit.superCharge = Math.min(1, unit.superCharge + 0.08);
        state.gems.splice(i, 1);
      }
    }
  }

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!b.ignoreWall) {
      for (const wall of state.map.walls) {
        if (circleHitsRect(b.x, b.y, b.r, wall)) {
          dead = true;
          break;
        }
      }
    }
    if (!dead && state.mode === 'heist') {
      const safes = [
        { s: state.map.enemySafe, team: 'ally' },
        { s: state.map.allySafe, team: 'enemy' },
      ];
      for (const { s, team } of safes) {
        if (b.team === team && circleHitsRect(b.x, b.y, b.r, s)) {
          s.hp -= b.damage;
          dead = true;
          state.fx.push({ kind: 'hit', x: b.x, y: b.y, t: 0.15, color: '#ffd24a' });
          if (s.hp <= 0) {
            finish(state, team === 'ally', team === 'ally' ? '금고 파괴! 하이스트 승리!' : '우리 금고가 파괴됐어…');
          }
          break;
        }
      }
    }
    if (!dead) {
      for (const unit of state.units) {
        if (!unit.alive) continue;
        const same = unit.team === b.team;
        // showdown: everyone is enemy except self
        const hostile = state.mode === 'showdown' ? unit.id !== b.ownerId : !same;
        if (dist(b, unit) > BRAWLERS[unit.brawlerIndex].radius + b.r) continue;
        if (!hostile) {
          if (b.heal > 0 && unit.hp < unit.maxHp) {
            unit.hp = Math.min(unit.maxHp, unit.hp + b.heal);
            dead = true;
            break;
          }
          continue;
        }
        const attacker = state.units.find((u) => u.id === b.ownerId);
        hurt(state, unit, b.damage, attacker);
        if (b.splash) {
          for (const o of state.units) {
            if (!o.alive || o.id === unit.id) continue;
            if (state.mode === 'showdown' ? o.id === b.ownerId : o.team === b.team) continue;
            if (dist(b, o) < b.splash) hurt(state, o, b.damage * 0.45, attacker);
          }
        }
        dead = true;
        break;
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }

  for (let i = state.zones.length - 1; i >= 0; i--) {
    const z = state.zones[i];
    z.t -= dt;
    const owner = state.units.find((u) => u.id === z.ownerId);
    for (const u of state.units) {
      if (!u.alive || u.team === z.team) continue;
      if (dist(u, z) < z.r) hurt(state, u, z.dps * dt, owner);
    }
    if (z.t <= 0) state.zones.splice(i, 1);
  }

  updateModeLogic(state, dt);

  const player = state.units.find((u) => u.id === 'player');
  if (player) updateCamera(state, player, dt);

  for (let i = state.fx.length - 1; i >= 0; i--) {
    state.fx[i].t -= dt;
    if (state.fx[i].t <= 0) state.fx.splice(i, 1);
  }
}

function teamGemCount(state, team) {
  return teamGems(state, team);
}

const UI = { LEFT_STICK, RIGHT_STICK, SUPER_BTN, GADGET_BTN, STICK_R, BRAWLERS, MODES };


const PAD = UI;

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawStick(ctx, stick, vec, label, accent) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#06140c';
  ctx.beginPath();
  ctx.arc(stick.x, stick.y, PAD.STICK_R + 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  const kx = stick.x + (vec?.x || 0) * (PAD.STICK_R - 10);
  const ky = stick.y + (vec?.y || 0) * (PAD.STICK_R - 10);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(kx, ky, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 12px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, stick.x, stick.y + PAD.STICK_R + 20);
  ctx.restore();
}

function renderSplash(ctx, view) {
  const g = ctx.createLinearGradient(0, 0, view.width, view.height);
  g.addColorStop(0, '#1a4d2e');
  g.addColorStop(1, '#0a1c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
  // 평면 전장 패턴
  ctx.strokeStyle = '#2f6b4888';
  for (let i = 0; i < 12; i++) {
    const y = 180 + i * 22;
    ctx.beginPath();
    ctx.moveTo(80 + i * 8, y);
    ctx.lineTo(view.width - 80 - i * 8, y);
    ctx.stroke();
  }
  ctx.fillStyle = CONFIG.palette.gem;
  ctx.beginPath();
  ctx.moveTo(view.width / 2, 200);
  ctx.lineTo(view.width / 2 + 36, 240);
  ctx.lineTo(view.width / 2, 280);
  ctx.lineTo(view.width / 2 - 36, 240);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '800 48px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('젬 브롤', view.width / 2, 120);
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '600 18px "Malgun Gothic", sans-serif';
  ctx.fillText('2D 젬 그래버 · 듀얼 스틱 · 3v3', view.width / 2, 160);
}

function renderMode(ctx, state, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, '#163528');
  g.addColorStop(1, '#0a1c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '800 36px "Malgun Gothic", sans-serif';
  ctx.fillText('젬 브롤', view.width / 2, 56);
  ctx.fillStyle = '#fff';
  ctx.font = '600 15px "Malgun Gothic", sans-serif';
  ctx.fillText('젬 그래버 · 가로 화면 · 한 판 약 2~3분', view.width / 2, 88);

  const cardW = 200;
  const cardH = 70;
  const cols = Math.min(3, MODES.length);
  const gap = 14;
  const startX = (view.width - (cardW * cols + gap * (cols - 1))) / 2;
  const startY = 150;
  MODES.forEach((m, i) => {
    const col = i % cols;
    const row = (i / cols) | 0;
    const x = startX + col * (cardW + gap);
    const y = startY + row * (cardH + 12);
    const sel = i === state.modeIndex;
    ctx.fillStyle = sel ? '#ffffff28' : '#00000055';
    roundRect(ctx, x, y, cardW, cardH, 14);
    ctx.fill();
    if (sel) {
      ctx.strokeStyle = CONFIG.palette.primary;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = '800 16px "Malgun Gothic", sans-serif';
    ctx.fillText(m.name, x + cardW / 2, y + 28);
    ctx.fillStyle = '#ffffffaa';
    ctx.font = '12px "Malgun Gothic", sans-serif';
    ctx.fillText(m.blurb, x + cardW / 2, y + 50);
  });

  ctx.fillStyle = CONFIG.palette.primary;
  roundRect(ctx, view.width / 2 - 110, 420, 220, 56, 16);
  ctx.fill();
  ctx.fillStyle = '#1a2a18';
  ctx.font = '800 18px "Malgun Gothic", sans-serif';
  ctx.fillText('브롤러 고르기', view.width / 2, 455);
}

function renderPick(ctx, state, view) {
  const g = ctx.createLinearGradient(0, 0, 0, view.height);
  g.addColorStop(0, '#163528');
  g.addColorStop(1, '#0a1c14');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.fillStyle = '#ffffff33';
  roundRect(ctx, 20, 16, 80, 36, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '700 13px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('← 모드', 60, 40);

  const mode = MODES.find((m) => m.id === state.mode);
  ctx.fillStyle = CONFIG.palette.primary;
  ctx.font = '800 30px "Malgun Gothic", sans-serif';
  ctx.fillText(mode?.name || '젬 브롤', view.width / 2, 48);
  ctx.fillStyle = '#ffffffcc';
  ctx.font = '13px "Malgun Gothic", sans-serif';
  ctx.fillText(mode?.blurb || '', view.width / 2, 76);

  const cardW = 84;
  const gap = 10;
  const cols = 5;
  const startX = (view.width - (cardW * cols + gap * (cols - 1))) / 2;
  const y0 = 140;
  BRAWLERS.forEach((b, i) => {
    const col = i % cols;
    const row = (i / cols) | 0;
    const x = startX + col * (cardW + gap);
    const y = y0 + row * 110;
    const sel = i === state.pickIndex;
    ctx.fillStyle = sel ? '#ffffff22' : '#00000055';
    roundRect(ctx, x, y, cardW, 100, 12);
    ctx.fill();
    if (sel) {
      ctx.strokeStyle = CONFIG.palette.primary;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // 브롤러 아이콘
    ctx.fillStyle = '#0006';
    ctx.beginPath();
    ctx.ellipse(x + cardW / 2, y + 48, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(x + cardW / 2, y + 30, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8';
    ctx.beginPath();
    ctx.arc(x + cardW / 2 - 4, y + 24, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 12px "Malgun Gothic", sans-serif';
    ctx.fillText(b.name, x + cardW / 2, y + 70);
    ctx.fillStyle = '#ffd98a';
    ctx.font = '600 10px "Malgun Gothic", sans-serif';
    ctx.fillText(b.role, x + cardW / 2, y + 88);
  });

  const pick = BRAWLERS[state.pickIndex];
  ctx.fillStyle = '#fff';
  ctx.font = '14px "Malgun Gothic", sans-serif';
  ctx.fillText(`${pick.name} · ${pick.role} · 가젯 ${pick.gadget.name} · 궁극 ${pick.super.name}`, view.width / 2, 390);

  ctx.fillStyle = CONFIG.palette.primary;
  roundRect(ctx, view.width / 2 - 110, 420, 220, 56, 16);
  ctx.fill();
  ctx.fillStyle = '#1a2a18';
  ctx.font = '800 18px "Malgun Gothic", sans-serif';
  ctx.fillText('2D 전투 시작', view.width / 2, 455);
}

function canSee(viewer, target) {
  if (!target.hidden) return true;
  if (viewer && viewer.team === target.team && !String(viewer.team).startsWith('solo')) return true;
  if (viewer && Math.hypot(viewer.x - target.x, viewer.y - target.y) < 70) return true;
  return false;
}

function renderFight(ctx, state, view) {
  const camera = state.camera;
  const player = state.units.find(u => u.id === 'player');
  ctx.fillStyle = '#10291d';
  ctx.fillRect(0, 0, view.width, view.height);
  if (!camera.scale) return;
  const scale = camera.scale;
  const project = (x, y) => worldToScreen(x, y, camera);
  const corner = project(0, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 60, view.width, view.height - 160);
  ctx.clip();
  ctx.fillStyle = '#337445';
  ctx.fillRect(corner.x, corner.y, CONFIG.world.w * scale, CONFIG.world.h * scale);
  for (let y = 0; y < CONFIG.world.h; y += 64) {
    for (let x = 0; x < CONFIG.world.w; x += 64) {
      const pos = project(x, y);
      ctx.fillStyle = ((x + y) / 64) % 2 ? '#ffffff05' : '#00000007';
      ctx.fillRect(pos.x, pos.y, 64 * scale, 64 * scale);
    }
  }
  for (const [y, color] of [[0, '#ff6b5a30'], [CONFIG.world.h - 150, '#4db7ff30']]) {
    const pos = project(0, y);
    ctx.fillStyle = color;
    ctx.fillRect(pos.x, pos.y, CONFIG.world.w * scale, 150 * scale);
  }
  ctx.strokeStyle = '#b3d282'; ctx.lineWidth = 4;
  ctx.strokeRect(corner.x, corner.y, CONFIG.world.w * scale, CONFIG.world.h * scale);
  for (const bush of state.map.bushes) {
    const pos = project(bush.x, bush.y);
    ctx.fillStyle = '#175c30';
    roundRect(ctx, pos.x, pos.y, bush.w * scale, bush.h * scale, 12); ctx.fill();
    ctx.fillStyle = '#37894a';
    for (let x = 10; x < bush.w; x += 22) for (let y = 8; y < bush.h; y += 22) {
      ctx.beginPath(); ctx.arc(pos.x + x * scale, pos.y + y * scale, 8 * scale, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const wall of state.map.walls) {
    const pos = project(wall.x, wall.y);
    ctx.fillStyle = '#0005';
    roundRect(ctx, pos.x + 3, pos.y + 4, wall.w * scale, wall.h * scale, 5); ctx.fill();
    ctx.fillStyle = '#927658';
    roundRect(ctx, pos.x, pos.y, wall.w * scale, wall.h * scale, 5); ctx.fill();
    ctx.strokeStyle = '#c5a47b'; ctx.lineWidth = 2; ctx.stroke();
  }
  const mine = project(state.map.mine.x, state.map.mine.y);
  ctx.fillStyle = '#24203d'; ctx.beginPath(); ctx.arc(mine.x, mine.y, 34 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#cf8bff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#e8baff'; ctx.font = '800 23px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('◆', mine.x, mine.y + 8);
  for (const zone of state.zones) {
    const pos = project(zone.x, zone.y);
    ctx.fillStyle = '#6cff7560'; ctx.beginPath(); ctx.arc(pos.x, pos.y, zone.r * scale, 0, Math.PI * 2); ctx.fill();
  }
  for (const gem of state.gems) {
    const pos = project(gem.x, gem.y);
    ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#c06aff'; ctx.shadowColor = '#dc94ff'; ctx.shadowBlur = 10;
    ctx.fillRect(-7, -7, 14, 14); ctx.strokeStyle = '#f4d7ff'; ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14); ctx.restore();
  }
  for (const unit of state.units) {
    if (!unit.alive || (unit.id !== 'player' && !canSee(player, unit))) continue;
    const pos = project(unit.x, unit.y);
    const brawler = BRAWLERS[unit.brawlerIndex];
    const radius = brawler.radius * scale;
    const teamColor = unit.team === 'ally' ? CONFIG.palette.ally : CONFIG.palette.enemy;
    ctx.save();
    ctx.globalAlpha = unit.hidden && unit.team === 'ally' ? 0.65 : 1;
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.arc(pos.x + 2, pos.y + 3, radius + 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = teamColor; ctx.lineWidth = unit.id === 'player' ? 4 : 3;
    ctx.fillStyle = unit.flash > 0 ? '#fff' : unit.color;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#233426'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pos.x + unit.aimX * radius * 0.4, pos.y + unit.aimY * radius * 0.4);
    ctx.lineTo(pos.x + unit.aimX * (radius + 10), pos.y + unit.aimY * (radius + 10)); ctx.stroke();
    ctx.fillStyle = '#ffffff70'; ctx.beginPath(); ctx.arc(pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.28, 0, Math.PI * 2); ctx.fill();
    if (unit.shield > 0) { ctx.strokeStyle = '#b6e8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pos.x, pos.y, radius + 7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#092018'; ctx.fillRect(pos.x - 21, pos.y - radius - 13, 42, 6);
    ctx.fillStyle = unit.team === 'ally' ? '#72f5a6' : '#ff8576'; ctx.fillRect(pos.x - 20, pos.y - radius - 12, 40 * Math.max(0, unit.hp / unit.maxHp), 4);
    ctx.font = '800 11px "Malgun Gothic", sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = unit.id === 'player' ? '#ffdf62' : '#fff';
    ctx.fillText(unit.id === 'player' ? 'YOU' : unit.name, pos.x, pos.y + radius + 15);
    if (unit.gems) { ctx.fillStyle = '#f3ceff'; ctx.fillText(`◆ ${unit.gems}`, pos.x, pos.y - radius - 19); }
    ctx.restore();
  }
  for (const bullet of state.bullets) {
    const pos = project(bullet.x, bullet.y);
    ctx.strokeStyle = bullet.color; ctx.lineWidth = Math.max(3, bullet.r * scale); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pos.x - bullet.vx * 0.018 * scale, pos.y - bullet.vy * 0.018 * scale); ctx.lineTo(pos.x, pos.y); ctx.stroke();
  }
  for (const effect of state.fx) {
    const pos = project(effect.x, effect.y);
    ctx.globalAlpha = Math.min(1, effect.t * 4); ctx.strokeStyle = effect.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pos.x, pos.y, (10 + (0.5 - effect.t) * 35) * scale, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  if (player && !player.alive) {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 20px "Malgun Gothic", sans-serif';
    ctx.fillText(`부활까지 ${Math.ceil(player.respawn)}초`, view.width / 2, view.height / 2);
  }

  // HUD
  ctx.fillStyle = '#06140ccc';
  roundRect(ctx, 16, 10, view.width - 32, 48, 12);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = CONFIG.palette.text;
  ctx.font = '700 15px "Malgun Gothic", sans-serif';
  const mm = Math.floor(Math.max(0, state.matchTime) / 60);
  const ss = String(Math.floor(Math.max(0, state.matchTime) % 60)).padStart(2, '0');
  const mode = MODES.find((m) => m.id === state.mode);
  ctx.fillText(`${mode?.name || ''}  2D  ${mm}:${ss}`, view.width / 2, 30);

  if (state.mode === 'gem') {
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.palette.ally;
    ctx.font = '800 20px "Malgun Gothic", sans-serif';
    ctx.fillText(`◆ ${teamGemCount(state, 'ally')}`, 28, 48);
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.palette.enemy;
    ctx.fillText(`${teamGemCount(state, 'enemy')} ◆`, view.width - 28, 48);
    if (state.holdTeam) {
      ctx.textAlign = 'center';
      ctx.fillStyle = state.holdTeam === 'ally' ? CONFIG.palette.primary : CONFIG.palette.danger;
      ctx.fillText(`홀드 ${Math.ceil(state.holdTime)}`, view.width / 2, 48);
    }
  } else if (state.mode === 'ball' || state.mode === 'knockout') {
    ctx.fillStyle = '#fff';
    ctx.font = '800 20px "Malgun Gothic", sans-serif';
    const a = state.mode === 'knockout' ? state.koAlly : state.allyScore;
    const e = state.mode === 'knockout' ? state.koEnemy : state.enemyScore;
    ctx.fillText(`${a} : ${e}`, view.width / 2, 48);
  } else if (state.mode === 'hotzone') {
    ctx.fillStyle = '#fff';
    ctx.font = '700 14px "Malgun Gothic", sans-serif';
    ctx.fillText(`점령 ${state.allyZone | 0}% / ${state.enemyZone | 0}%`, view.width / 2, 48);
  } else if (state.mode === 'heist') {
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px "Malgun Gothic", sans-serif';
    const er = Math.max(0, state.map.enemySafe.hp / state.map.enemySafe.maxHp);
    const ar = Math.max(0, state.map.allySafe.hp / state.map.allySafe.maxHp);
    ctx.fillText(`적 금고 ${(er * 100) | 0}% · 아군 ${(ar * 100) | 0}%`, view.width / 2, 48);
  } else if (state.mode === 'showdown') {
    const alive = state.units.filter((u) => u.alive).length;
    ctx.fillStyle = '#fff';
    ctx.font = '700 14px "Malgun Gothic", sans-serif';
    ctx.fillText(`생존 ${alive} · 큐브 ${player?.cubes || 0}`, view.width / 2, 48);
  }

  if (state.toast > 0 && state.message) {
    ctx.fillStyle = '#000000aa';
    roundRect(ctx, view.width / 2 - 200, 66, 400, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 13px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, view.width / 2, 88);
  }

  if (player && player.alive) {
    const charged = player.superCharge >= 1;
    ctx.fillStyle = charged ? CONFIG.palette.primary : '#ffffff33';
    ctx.beginPath();
    ctx.arc(PAD.SUPER_BTN.x, PAD.SUPER_BTN.y, PAD.SUPER_BTN.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.arc(PAD.SUPER_BTN.x, PAD.SUPER_BTN.y, PAD.SUPER_BTN.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * player.superCharge);
    ctx.stroke();
    ctx.fillStyle = charged ? '#1a2a18' : '#fff';
    ctx.font = '800 11px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('궁극', PAD.SUPER_BTN.x, PAD.SUPER_BTN.y + 4);

    ctx.fillStyle = player.gadgetLeft > 0 ? '#9ad7ff' : '#ffffff22';
    ctx.beginPath();
    ctx.arc(PAD.GADGET_BTN.x, PAD.GADGET_BTN.y, PAD.GADGET_BTN.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#123';
    ctx.font = '800 11px "Malgun Gothic", sans-serif';
    ctx.fillText(`가젯${player.gadgetLeft}`, PAD.GADGET_BTN.x, PAD.GADGET_BTN.y + 4);

    if (state.aimMode === 'auto') {
      ctx.fillStyle = '#5dffa0';
      ctx.font = '700 11px "Malgun Gothic", sans-serif';
      ctx.fillText('AUTO', PAD.RIGHT_STICK.x, PAD.RIGHT_STICK.y - PAD.STICK_R - 8);
    } else if (state.aimMode === 'manual') {
      ctx.fillStyle = '#ffd24a';
      ctx.font = '700 11px "Malgun Gothic", sans-serif';
      ctx.fillText('AIM', PAD.RIGHT_STICK.x, PAD.RIGHT_STICK.y - PAD.STICK_R - 8);
    }
  }

  drawStick(ctx, PAD.LEFT_STICK, state.sticks.left, '이동', CONFIG.palette.ally);
  drawStick(ctx, PAD.RIGHT_STICK, state.sticks.right, '공격', CONFIG.palette.danger);
}

mountGame({
  title: CONFIG.title,
  description:
    '2D 전장에서 펼치는 3대3 젬 그래버!\n\n1) 젬 10개를 모아 15초 동안 지키면 승리\n2) 브롤러: 탱커·어쌔신·딜러·저격수·컨트롤러·서포터·투척수\n3) 듀얼 스틱: 살짝=오토에임 / 깊게=수동조준\n4) 가젯·궁극·풀숲 · 약 2~3분',
  controls:
    '가로 화면 권장 · 왼쪽 스틱 이동 · 오른쪽 살짝 AUTO / 깊게 AIM · 가젯·궁극\nPC: WASD · Space · 클릭 조준 · Q 가젯 · E 궁극 · ESC 쉬기',
  width: CONFIG.width,
  height: CONFIG.height,
  theme: CONFIG.palette,
  create: createGame,
  update: updateGame,
  render(ctx, state, view) {
    if (state.phase === 'splash') renderSplash(ctx, view);
    else if (state.phase === 'mode') renderMode(ctx, state, view);
    else if (state.phase === 'pick') renderPick(ctx, state, view);
    else renderFight(ctx, state, view);
  },
});

}catch(err){
  console.error(err);
  const el=document.createElement('pre');
  el.style.cssText='position:fixed;inset:12px;background:#200;color:#fff;padding:16px;z-index:9999;white-space:pre-wrap;font:14px monospace';
  el.textContent='게임 실행 오류:\n'+(err&&err.stack?err.stack:err);
  document.body.appendChild(el);
}
})();
