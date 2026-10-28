// 자주 바꾸는 값은 이 파일에 모여 있다. 숫자를 바꾸면 게임 느낌이 바로 달라진다.
export const CONFIG = {
  title: '레일 서퍼',
  palette: { background: '#1b1530', primary: '#ffc83d', text: '#fff7e6' },
};

// 화면 크기(논리 좌표). 세로 9:15 비율로 휴대폰 한 손 조작에 맞췄다.
export const VIEW = { width: 480, height: 800 };

export const RULES = {
  startSpeed: 13,          // 출발 속도 (m/초)
  maxSpeed: 30,            // 최고 속도
  speedUpPerSecond: 0.13,  // 1초마다 빨라지는 양
  laneWidth: 2.4,          // 레인 사이 거리
  laneChangeTime: 0.13,    // 레인을 옮기는 데 걸리는 시간(초)
  gravity: 36,
  jumpHeight: 1.75,        // 보통 점프 높이 (m)
  superJumpHeight: 3.9,    // 점프화를 신었을 때 높이 (기차 지붕까지 닿는다)
  stumbleWindow: 4,        // 옆으로 부딪힌 뒤 이 시간 안에 또 부딪히면 잡힌다
  startBoards: 2,          // 판마다 주는 호버보드 수
  boardTime: 30,           // 호버보드 유지 시간
  safeTimeAfterBoard: 1.2, // 보드가 부서진 뒤 무적 시간
  scorePerMeter: 1,
  coinScore: 10,
};

export const POWERUPS = {
  magnet: { name: '자석', time: 10, color: '#ff5d6c' },
  sneakers: { name: '점프화', time: 10, color: '#58d68d' },
  jetpack: { name: '제트팩', time: 6.5, color: '#ffa53d' },
  double: { name: '점수 2배', time: 15, color: '#7aa7ff' },
  board: { name: '호버보드 +1', time: 0, color: '#c77dff' },
};

// 월드 투어: tourLength 미터마다 다음 도시로 바뀐다. 새 도시를 추가하면 순서대로 돈다.
export const TOUR = { tourLength: 700 };
export const CITIES = [
  {
    name: '서울', landmark: 'namsan',
    sky: ['#2b1f4f', '#c4577a', '#ffb470'], fog: '#e98a7c',
    ground: '#5b4a52', gravel: '#77646a', rail: '#d9d2cf', sleeper: '#3d2f30',
    wall: '#3a2e46', building: ['#3d2c55', '#4b3263', '#2e2445'], window: '#ffd98a',
    train: ['#3f8fe0', '#2bb39a', '#e2574c'], trainTrim: '#f5f1e6',
  },
  {
    name: '도쿄', landmark: 'tokyo',
    sky: ['#070b24', '#1c2a6b', '#5b3c9a'], fog: '#463c8c',
    ground: '#34344a', gravel: '#4a4a63', rail: '#c9cbe0', sleeper: '#22223a',
    wall: '#20203a', building: ['#1a1c3d', '#262a55', '#14162f'], window: '#7ff3ff',
    train: ['#e8e8ee', '#ff6fa8', '#7c6cff'], trainTrim: '#25d0c8',
  },
  {
    name: '파리', landmark: 'eiffel',
    sky: ['#6aa9e8', '#a9d5f2', '#ffe7c4'], fog: '#cfe2ee',
    ground: '#8a7663', gravel: '#a38f7c', rail: '#e9e4dc', sleeper: '#5a4636',
    wall: '#9c8a74', building: ['#d8c6a8', '#c8b394', '#e3d4b8'], window: '#5a7aa0',
    train: ['#2f5db8', '#e2b23a', '#3aa36a'], trainTrim: '#fff8ec',
  },
];

// 고를 수 있는 주인공과 보드. price 코인을 모으면 열린다.
export const HEROES = [
  { id: 'rio', name: '리오', price: 0, hoodie: '#ff8a3d', pants: '#2f4f8f', cap: '#2bb3a0', skin: '#f2c49b', hair: '#3b2416', bag: '#ffd23f' },
  { id: 'mina', name: '미나', price: 150, hoodie: '#c77dff', pants: '#2b2b44', cap: '#ff5d8f', skin: '#f6cfac', hair: '#1d1410', bag: '#58d68d' },
  { id: 'jun', name: '준', price: 400, hoodie: '#3ec1ff', pants: '#3b3b3b', cap: '#ffcf3d', skin: '#d9a273', hair: '#120c08', bag: '#ff5d6c' },
];
export const BOARDS = [
  { id: 'flame', name: '불꽃 보드', price: 0, deck: '#ff6b3d', glow: '#ffd23f' },
  { id: 'wave', name: '파도 보드', price: 200, deck: '#2bb3ff', glow: '#9ff3ff' },
  { id: 'star', name: '별빛 보드', price: 500, deck: '#7c4dff', glow: '#ff9cf0' },
];

// 그림 파일로 바꾸고 싶으면 source/assets 안 경로를 적는다. 비워 두면 코드로 그린 그림을 쓴다.
// hero 그림은 뒤에서 본 모습, 발이 그림 아래 가운데에 오게 그린다.
export const ART = { hero: '', coin: '' };

// PC 키 (소문자). 휴대폰은 화면을 밀고(스와이프) 두 번 톡 쳐서 보드를 탄다.
export const KEYS = {
  left: ['arrowleft', 'a'],
  right: ['arrowright', 'd'],
  up: ['arrowup', 'w'],
  down: ['arrowdown', 's'],
  board: [' ', 'b'],
};
