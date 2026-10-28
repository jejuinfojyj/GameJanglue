// 자주 바꾸는 값을 모아 둔 곳. 숫자를 바꾸면 게임 느낌이 바로 달라진다.
export const CONFIG = {
  title: '새총 요새 대작전',
  palette: { background: '#16324a', primary: '#ffb02e', text: '#fffaf0' },
};

// 화면 크기(가로형)와 땅 높이, 중력
export const WORLD = { width: 960, height: 540, ground: 480, gravity: 900 };

// 새총 위치, 최대로 당기는 거리, 당긴 거리 1px당 발사 속도
export const SLING = { x: 160, y: 372, maxPull: 100, power: 9.6 };

// 점수: 돼지 한 마리, 남은 새 한 마리, 재질별 블록
export const SCORE = { pig: 5000, birdLeft: 10000, block: { ice: 300, wood: 500, stone: 800 } };

// 재질: hp(튼튼함), density(무게), 그리기 색
export const MATERIALS = {
  ice: { name: '얼음', hp: 30, density: 0.6, fill: 'rgba(190,236,255,0.85)', line: '#5fb7da', detail: '#ffffff' },
  wood: { name: '나무', hp: 70, density: 1, fill: '#c98b4f', line: '#6e4220', detail: '#a96d36' },
  stone: { name: '돌', hp: 170, density: 2.4, fill: '#a3abb4', line: '#59616a', detail: '#7d858e' },
};

// 돼지 체력. 반지름 20 이상이면 큰 돼지
export const PIGS = { smallHp: 30, bigHp: 60, color: '#86d65a', dark: '#3f7d2a' };

// 물리 느낌 조절
export const PHYSICS = {
  hitDamage: 0.07,   // 새가 부딪힐 때 피해 = 속도 × 무게 × 이 값
  bounce: 0.2,       // 새가 튕기는 정도
  knock: 0.9,        // 맞은 블록이 밀려나는 정도
  landSpeed: 170,    // 이 속도보다 세게 떨어지면 피해
  landDamage: 0.09,
  crashSpeed: 200,   // 옆으로 이 속도보다 세게 부딪히면 피해
  crashDamage: 0.06,
  friction: 0.05,    // 바닥 마찰(1초 뒤 남는 속도 비율)
  tipAccel: 420,     // 받침이 없는 쪽으로 미끄러지는 힘
};

// 그림 파일로 바꾸고 싶을 때 경로를 적는다. 비워 두면 코드로 그린 그림을 쓴다.
// 예: 'assets/red.png'. 새·돼지는 오른쪽을 보는 정사각형 투명 PNG(128×128 권장),
// 배경은 960×540 가로 그림을 권장한다. 그림은 source/assets 폴더에 넣는다.
export const IMAGES = {
  background: '',
  pig: '',
  birds: { red: '', blue: '', yellow: '', black: '', white: '', big: '', egg: '' },
};
