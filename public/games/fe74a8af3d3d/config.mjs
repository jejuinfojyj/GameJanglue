/** 아이템 체인·손님·에너지·식당 꾸미기를 여기서 바꿉니다. */
export const CONFIG = {
  title: '가십하버',
  width: 480,
  height: 740,
  cols: 6,
  rows: 5,
  cell: 58,
  gap: 6,
  boardX: 28,
  boardY: 214,
  storageKey: 'gossip-harbor-progress-v1',
  maxEnergy: 30,
  spawnCost: 1,
  energyRegenSec: 10,
  eventEnergyBonus: 6,
  ordersNeededForEvent: 4,
  palette: {
    background: '#1a3a4a',
    surface: '#2a5366',
    board: '#123040',
    primary: '#f0b45a',
    accent: '#6ec8a0',
    coral: '#ff7b7b',
    text: '#fff6e8',
    muted: '#a8c4d4',
    danger: '#ff8a8a',
    wood: '#c48a4a',
  },
};

/** 같은 단계 둘을 합치면 다음 단계가 됩니다. */
export const CHAINS = {
  sushi: {
    id: 'sushi',
    label: '초밥',
    generatorName: '쌀가마니',
    color: '#ff8fab',
    steps: [
      { id: 'sushi-1', name: '쌀', mark: '米' },
      { id: 'sushi-2', name: '주먹밥', mark: '🍙' },
      { id: 'sushi-3', name: '연어초밥', mark: '🍣' },
      { id: 'sushi-4', name: '특선초밥', mark: '🍱' },
      { id: 'sushi-5', name: '축제플래터', mark: '🎉' },
    ],
  },
  ramen: {
    id: 'ramen',
    label: '라멘',
    generatorName: '면통',
    color: '#ffc078',
    steps: [
      { id: 'ramen-1', name: '면발', mark: '麵' },
      { id: 'ramen-2', name: '라면그릇', mark: '🥣' },
      { id: 'ramen-3', name: '돈코츠라멘', mark: '🍜' },
      { id: 'ramen-4', name: '특제라멘', mark: '👑' },
      { id: 'ramen-5', name: '라멘왕세트', mark: '🏆' },
    ],
  },
  tool: {
    id: 'tool',
    label: '도구',
    generatorName: '도구상자',
    color: '#74c0fc',
    steps: [
      { id: 'tool-1', name: '나무젓가락', mark: '🥢' },
      { id: 'tool-2', name: '국자', mark: '🥄' },
      { id: 'tool-3', name: '식칼', mark: '🔪' },
      { id: 'tool-4', name: '도마세트', mark: '🪵' },
      { id: 'tool-5', name: '주방장도구', mark: '⭐' },
    ],
  },
};

export const GENERATORS = [
  { id: 'gen-sushi', chain: 'sushi', x: 28, y: 548 },
  { id: 'gen-ramen', chain: 'ramen', x: 176, y: 548 },
  { id: 'gen-tool', chain: 'tool', x: 324, y: 548 },
];

/** 손님이 요구할 수 있는 음식(도구 제외). level은 1부터. */
export const ORDERABLE = [
  { chain: 'sushi', level: 2, coins: 8, stars: 1 },
  { chain: 'sushi', level: 3, coins: 16, stars: 1 },
  { chain: 'sushi', level: 4, coins: 28, stars: 2 },
  { chain: 'ramen', level: 2, coins: 8, stars: 1 },
  { chain: 'ramen', level: 3, coins: 16, stars: 1 },
  { chain: 'ramen', level: 4, coins: 28, stars: 2 },
  { chain: 'sushi', level: 5, coins: 45, stars: 3 },
  { chain: 'ramen', level: 5, coins: 45, stars: 3 },
];

/**
 * 별으로 파손된 공간을 정리하고 가구를 고릅니다.
 * styles가 있으면 구입 시 스타일을 고릅니다.
 */
export const DECORATIONS = [
  {
    id: 'debris',
    name: '파손된 자리 정리',
    cost: 1,
    kind: 'clean',
    blurb: '쓰러진 의자·쓰레기를 치웁니다.',
  },
  {
    id: 'floor',
    name: '바닥 닦기',
    cost: 2,
    kind: 'clean',
    blurb: '얼룩진 바닥을 반짝이게 합니다.',
  },
  {
    id: 'tables',
    name: '식탁·좌석',
    cost: 3,
    kind: 'furniture',
    styles: [
      { id: 'traditional', name: '전통 다다미' },
      { id: 'modern', name: '모던 우드' },
      { id: 'harbor', name: '항구 카페' },
    ],
  },
  {
    id: 'lights',
    name: '조명',
    cost: 3,
    kind: 'furniture',
    styles: [
      { id: 'lantern', name: '등롱' },
      { id: 'neon', name: '네온' },
      { id: 'warm', name: '따뜻한 전구' },
    ],
  },
  {
    id: 'sign',
    name: '간판',
    cost: 4,
    kind: 'furniture',
    styles: [
      { id: 'wood', name: '나무 간판' },
      { id: 'cloth', name: '천막 간판' },
      { id: 'glow', name: '빛나는 간판' },
    ],
  },
  {
    id: 'plants',
    name: '화분·장식',
    cost: 2,
    kind: 'furniture',
    styles: [
      { id: 'bamboo', name: '대나무' },
      { id: 'flower', name: '벚꽃' },
      { id: 'sea', name: '바다 소품' },
    ],
  },
];

export const STORY = [
  { needStars: 0, title: '항구 식당의 첫날', text: '손님의 주문을 맞추며 별을 모아 보세요.' },
  { needStars: 3, title: '청소가 시작되다', text: '별로 파손된 자리를 정리할 수 있어요.' },
  { needStars: 7, title: '좌석이 돌아오다', text: '원하는 스타일의 식탁을 골라 꾸며 보세요.' },
  { needStars: 12, title: '불빛이 켜지다', text: '조명과 간판으로 분위기를 살립니다.' },
  { needStars: 18, title: '다시 열린 가십하버', text: '식당이 다시 빛나면 이야기가 완성됩니다.' },
];

export function itemDef(chainId, level) {
  const chain = CHAINS[chainId];
  if (!chain || level < 1 || level > chain.steps.length) return null;
  const step = chain.steps[level - 1];
  return {
    chain: chainId,
    level,
    id: step.id,
    name: step.name,
    mark: step.mark,
    color: chain.color,
    maxLevel: chain.steps.length,
  };
}

export function findItemById(itemId) {
  for (const chain of Object.values(CHAINS)) {
    const idx = chain.steps.findIndex((s) => s.id === itemId);
    if (idx >= 0) return itemDef(chain.id, idx + 1);
  }
  return null;
}

export function boardPixelSize() {
  return {
    w: CONFIG.cols * CONFIG.cell + (CONFIG.cols - 1) * CONFIG.gap,
    h: CONFIG.rows * CONFIG.cell + (CONFIG.rows - 1) * CONFIG.gap,
  };
}

export function boardOrigin() {
  return { x: CONFIG.boardX, y: CONFIG.boardY };
}

export function cellRect(row, col) {
  const origin = boardOrigin();
  const step = CONFIG.cell + CONFIG.gap;
  return {
    x: origin.x + col * step,
    y: origin.y + row * step,
    w: CONFIG.cell,
    h: CONFIG.cell,
  };
}
