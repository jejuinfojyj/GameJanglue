/** 로켓 리그 사이드와이프 — 모드·차량·꾸미기·시즌 패스 */
export const CONFIG = {
  title: '로켓 리그 사이드와이프',
  saveKey: 'rocket-league-sidewipe-v1',
  width: 1360,
  height: 720,
  viewWidth: 960,
  viewHeight: 640,
  arenaViewHeight: 540,
  matchSeconds: 120,
  kickoffDelay: 1.1,
  gravity: 1450,
  floorY: 680,
  ceilingY: 36,
  fieldLeft: 40,
  fieldRight: 1320,
  goalHalfH: 78,
  ballRadius: 22,
  carHalfW: 34,
  carHalfH: 16,
  boostMax: 100,
  boostRegen: 16,
  boostCost: 38,
  jumpSpeed: 650,
  boostForce: 2050,
  dodgeSpeed: 640,
  driveAccel: 980,
  driveMax: 420,
  airAccel: 280,
  torque: 7.2,
  palette: {
    background: '#0d1b2a',
    surface: '#1b2838',
    primary: '#00e5a8',
    accent: '#ff6b3d',
    danger: '#ff4d6d',
    text: '#f2f7fb',
    blue: '#3aa0ff',
    orange: '#ff8a3d',
    boost: '#46f0ff',
    ball: '#f4f0e6',
  },
};

export const MODES = [
  {
    id: 'soccer1v1',
    name: '1대1 축구',
    desc: '나 대 AI 한 명. 오른쪽 주황 골대를 공격하세요.',
    kind: 'soccer',
    allies: 0,
    enemies: 1,
  },
  {
    id: 'soccer2v2',
    name: '2대2 축구',
    desc: '파란 아군 AI와 협동. 오른쪽 주황 골대를 공격하세요.',
    kind: 'soccer',
    allies: 1,
    enemies: 2,
  },
  {
    id: 'hoops',
    name: '후프스(Hoops)',
    desc: '중앙 후프를 향해 공을 밀면 슛! 위에서 아래로 넣으세요.',
    kind: 'hoops',
    allies: 0,
    enemies: 1,
  },
];

/** 차체. power/grip/boostMul은 운전감에 반영 */
export const VEHICLES = [
  { id: 'octane', name: '옥탄', price: 0, color: '#3aa0ff', power: 1, grip: 1, boostMul: 1, halfW: 34, halfH: 16 },
  { id: 'dominus', name: '도미너스', price: 180, color: '#6c63ff', power: 1.08, grip: 0.95, boostMul: 1.05, halfW: 38, halfH: 14 },
  { id: 'fennec', name: '페넥', price: 320, color: '#00c2a8', power: 1.12, grip: 1.05, boostMul: 1.08, halfW: 33, halfH: 15 },
  { id: 'breakout', name: '브레이크아웃', price: 450, color: '#ff6b3d', power: 1.18, grip: 0.9, boostMul: 1.12, halfW: 40, halfH: 13 },
  { id: 'batmobile', name: '사이드 배트', price: 700, color: '#111820', power: 1.22, grip: 1.1, boostMul: 1.15, halfW: 42, halfH: 12 },
];

export const DECALS = [
  { id: 'none', name: '없음', price: 0, pattern: 'none' },
  { id: 'stripe', name: '스트라이프', price: 80, pattern: 'stripe' },
  { id: 'flame', name: '플레임', price: 140, pattern: 'flame' },
  { id: 'circuit', name: '서킷', price: 200, pattern: 'circuit' },
  { id: 'star', name: '스타', price: 260, pattern: 'star' },
];

export const WHEELS = [
  { id: 'oem', name: '기본', price: 0, rim: '#cfd8e3', tire: '#1a1f26' },
  { id: 'chrome', name: '크롬', price: 100, rim: '#e8eef5', tire: '#111' },
  { id: 'neon', name: '네온', price: 180, rim: '#46f0ff', tire: '#0b1520' },
  { id: 'gold', name: '골드', price: 260, rim: '#f0c14b', tire: '#2a1a08' },
];

export const BOOSTS = [
  { id: 'standard', name: '스탠다드', price: 0, color: '#46f0ff', spark: '#dffcff' },
  { id: 'plasma', name: '플라즈마', price: 120, color: '#b388ff', spark: '#efe6ff' },
  { id: 'thermal', name: '써멀', price: 180, color: '#ff6b3d', spark: '#ffe0c8' },
  { id: 'ion', name: '이온', price: 240, color: '#00e5a8', spark: '#d8fff2' },
];

/** 시즌 패스 보상. xp 누적으로 해금 */
export const PASS_REWARDS = [
  { level: 1, xp: 0, type: 'credits', amount: 50, label: '시작 크레딧 50' },
  { level: 2, xp: 80, type: 'decal', id: 'stripe', label: '데칼: 스트라이프' },
  { level: 3, xp: 160, type: 'wheel', id: 'chrome', label: '바퀴: 크롬' },
  { level: 4, xp: 260, type: 'boost', id: 'plasma', label: '부스터: 플라즈마' },
  { level: 5, xp: 380, type: 'vehicle', id: 'dominus', label: '차량: 도미너스' },
  { level: 6, xp: 520, type: 'decal', id: 'flame', label: '데칼: 플레임' },
  { level: 7, xp: 680, type: 'credits', amount: 120, label: '크레딧 120' },
  { level: 8, xp: 860, type: 'boost', id: 'thermal', label: '부스터: 써멀' },
  { level: 9, xp: 1060, type: 'vehicle', id: 'fennec', label: '차량: 페넥' },
  { level: 10, xp: 1300, type: 'wheel', id: 'neon', label: '바퀴: 네온' },
  { level: 11, xp: 1560, type: 'decal', id: 'circuit', label: '데칼: 서킷' },
  { level: 12, xp: 1840, type: 'boost', id: 'ion', label: '부스터: 이온' },
  { level: 13, xp: 2140, type: 'vehicle', id: 'breakout', label: '차량: 브레이크아웃' },
  { level: 14, xp: 2480, type: 'wheel', id: 'gold', label: '바퀴: 골드' },
  { level: 15, xp: 2850, type: 'decal', id: 'star', label: '데칼: 스타' },
  { level: 16, xp: 3250, type: 'vehicle', id: 'batmobile', label: '차량: 사이드 배트' },
  { level: 17, xp: 3700, type: 'credits', amount: 250, label: '크레딧 250' },
];
