export const CONFIG = {
  title: '끝없는 계단',
  palette: {
    background: '#1b1736',
    primary: '#ffcf4a',
    text: '#fff6dc',
  },
};

// 자주 바꾸는 규칙 값. 숫자를 조금씩 바꿔 가며 난이도를 맞춘다.
export const RULES = {
  timeMax: 1,            // 시간 막대 최대치
  timeGain: 0.06,        // 한 칸 오를 때 채워지는 시간
  drainStart: 0.14,      // 처음 1초에 줄어드는 시간
  drainPerStep: 0.001,   // 한 칸 오를 때마다 더 빨리 줄어드는 양
  drainMax: 0.8,         // 가장 빨리 줄어들 때의 1초당 양
  turnChance: 0.35,      // 계단이 꺾일 확률
  maxStraight: 6,        // 한 방향으로 이어지는 최대 칸 수
  safeSteps: 4,          // 처음에 꺾이지 않는 칸 수
  coinChance: 0.14,      // 계단 위에 코인이 나올 확률
  coinValue: 1,          // 코인 하나의 값
  stageSteps: 100,       // 몇 칸마다 배경 구간이 바뀌는지
  stageBonusTime: 0.15,  // 새 구간에 들어가면 채워지는 시간
  fallSeconds: 0.9,      // 떨어진 뒤 결과 화면까지의 시간
  stepsAhead: 40,        // 미리 만들어 두는 계단 수
};

// 키보드 조작. 소문자로 적는다.
export const KEYS = {
  turn: ['f', 'arrowleft', 'a'],
  climb: ['j', 'arrowright', 'd'],
};

// 100계단마다 바뀌는 배경 구간. 순서대로 돌아가며 반복한다.
export const STAGES = [
  { name: '아침 하늘', skyTop: '#57b8ff', skyBottom: '#c8efff', top: '#ffcf7a', front: '#c47a3a', edge: '#4a2a10', city: '#7aa9d6', windows: '#d9f1ff', clouds: true },
  { name: '노을 언덕', skyTop: '#ff7a59', skyBottom: '#ffd59a', top: '#fff0c9', front: '#c98a6b', edge: '#4d2222', city: '#b0566a', windows: '#ffd9a0', clouds: true },
  { name: '별빛 밤', skyTop: '#0f1640', skyBottom: '#3a3f94', top: '#9fe0ff', front: '#4d79c9', edge: '#0b1236', city: '#232a6a', windows: '#ffe98a', stars: true },
  { name: '우주 정거장', skyTop: '#05010f', skyBottom: '#2b0b4d', top: '#ffe066', front: '#c78a1b', edge: '#241300', city: '#1a0830', windows: '#9a7bff', stars: true, planet: true },
];
