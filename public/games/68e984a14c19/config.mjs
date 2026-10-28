export const CONFIG = {
  title: 'Snake.io',
  width: 480,
  height: 680,
  viewWidth: 430,
  world: 2200,
  margin: 52,
  baseSpeed: 158,
  boostSpeed: 276,
  turn: 4.8,
  minLength: 72,
  startLength: 120,
  maxLength: 860,
  boostInterval: 0.18,
  boostCost: 10,
  startBots: 6,
  maxBots: 10,
  botEvery: 18,
  foodCount: 150,
  specialCount: 4,
  maxFoods: 240,
  palette: {
    background: '#12311f',
    surface: '#1c4a30',
    primary: '#ffe08a',
    text: '#f4ffe9',
  },
  skins: [
    { id: 'mint', name: '민트', color: '#3ddc84' },
    { id: 'orange', name: '오렌지', color: '#ff8a3d' },
    { id: 'purple', name: '보라', color: '#c49bff' },
    { id: 'sky', name: '하늘', color: '#4cc9f0' },
    { id: 'pink', name: '분홍', color: '#ff6b9a' },
  ],
  botColors: ['#ff5d73', '#ffd166', '#7aa2ff', '#f4a261', '#9b5de5', '#00bbf9', '#fee440', '#ef476f', '#06d6a0', '#fb5607'],
  botNames: ['코코', '루비', '하늘봇', '별이', '콩이', '두리', '초코', '나리', '뽀송', '젤리', '모아', '하루'],
  foodColors: ['#b6ff4a', '#7af0ff', '#ff8bd2', '#ffe66d', '#ff7b7b'],
};

export function controlLayout() {
  const stick = { x: 84, y: CONFIG.height - 78, grab: 68, travel: 38, base: 46 };
  return {
    stick,
    boost: { x: CONFIG.width - 154, y: stick.y + stick.base - 72, w: 130, h: 72 },
  };
}
