/** 판 크기·보석 색·레벨·왕국 꾸미기 비용을 여기서 바꿉니다. */
export const CONFIG = {
  title: '로얄매치',
  gridSize: 8,
  cell: 48,
  boardGap: 4,
  boardX: 36,
  boardY: 118,
  colorCount: 6,
  width: 480,
  height: 720,
  storageKey: 'royalmatch-progress-v1',
  palette: {
    background: '#16324f',
    surface: '#23486d',
    board: '#0f2438',
    primary: '#f0c14b',
    accent: '#7ed6a5',
    text: '#fff6e8',
    muted: '#a8c0d8',
    danger: '#ff7b7b',
  },
  gemColors: [
    { id: 'ruby', fill: '#ff5d6c', edge: '#ff9aa3', deep: '#c2303d', label: '루비' },
    { id: 'sapphire', fill: '#4dabf7', edge: '#91c9ff', deep: '#1c7ed6', label: '사파이어' },
    { id: 'emerald', fill: '#51cf66', edge: '#8ce99a', deep: '#2b8a3e', label: '에메랄드' },
    { id: 'topaz', fill: '#fcc419', edge: '#ffe066', deep: '#e67700', label: '토파즈' },
    { id: 'amethyst', fill: '#b197fc', edge: '#d0bfff', deep: '#7048e8', label: '자수정' },
    { id: 'turquoise', fill: '#22b8cf', edge: '#66d9e8', deep: '#0b7285', label: '터키석' },
  ],
};

/** 레벨별 이동 수와 목표. type: collect(색 모으기) | clear(특수 발동 횟수) */
export const LEVELS = [
  {
    id: 1,
    moves: 22,
    goals: [{ type: 'collect', color: 0, need: 18 }],
    blurb: '같은 보석 3개 이상을 맞춰 루비를 모아요.',
  },
  {
    id: 2,
    moves: 24,
    goals: [
      { type: 'collect', color: 1, need: 16 },
      { type: 'collect', color: 2, need: 16 },
    ],
    blurb: '사파이어와 에메랄드를 함께 모아요.',
  },
  {
    id: 3,
    moves: 26,
    goals: [
      { type: 'collect', color: 3, need: 20 },
      { type: 'clear', special: 'rocket', need: 2 },
    ],
    blurb: '4개를 맞춰 로켓을 만들고 써 보세요.',
  },
  {
    id: 4,
    moves: 26,
    goals: [
      { type: 'collect', color: 4, need: 18 },
      { type: 'clear', special: 'bomb', need: 2 },
    ],
    blurb: 'L·T 모양으로 폭탄을 만들고 터뜨려요.',
  },
  {
    id: 5,
    moves: 28,
    goals: [
      { type: 'collect', color: 5, need: 22 },
      { type: 'clear', special: 'propeller', need: 2 },
    ],
    blurb: '2×2 네모로 프로펠러를 띄워 보세요.',
  },
  {
    id: 6,
    moves: 30,
    goals: [
      { type: 'collect', color: 0, need: 15 },
      { type: 'collect', color: 1, need: 15 },
      { type: 'clear', special: 'disco', need: 1 },
    ],
    blurb: '5개를 맞춰 디스코 볼을 완성해요.',
  },
  {
    id: 7,
    moves: 28,
    goals: [
      { type: 'collect', color: 2, need: 24 },
      { type: 'collect', color: 3, need: 24 },
    ],
    blurb: '남은 별로 왕국도 꾸며 보세요.',
  },
  {
    id: 8,
    moves: 32,
    goals: [
      { type: 'collect', color: 4, need: 20 },
      { type: 'collect', color: 5, need: 20 },
      { type: 'clear', special: 'rocket', need: 3 },
    ],
    blurb: '로켓·폭탄을 조합해 한 번에 많이 지워요.',
  },
];

/** 별로 사는 왕국 꾸미기 목록 */
export const DECORATIONS = [
  { id: 'banner', name: '왕국 깃발', cost: 2, order: 1 },
  { id: 'garden', name: '꽃밭', cost: 3, order: 2 },
  { id: 'fountain', name: '황금 분수', cost: 4, order: 3 },
  { id: 'gate', name: '성문', cost: 5, order: 4 },
  { id: 'tower', name: '망루', cost: 6, order: 5 },
  { id: 'throne', name: '왕좌 홀', cost: 8, order: 6 },
];

export function boardPixelSize() {
  const { gridSize, cell, boardGap } = CONFIG;
  return gridSize * cell + (gridSize - 1) * boardGap;
}

export function boardOrigin() {
  return { x: CONFIG.boardX, y: CONFIG.boardY };
}
