// 도트 그림은 한 글자가 한 칸이다. '.'은 빈칸, 나머지 글자는 colors의 색으로 칠한다.
// 모든 그림은 오른쪽을 보는 모습으로 그린다. 왼쪽을 볼 때는 자동으로 뒤집는다.
// 그림 파일을 쓰려면 image: 'assets/hero.png'처럼 적는다. 발끝이 그림 아래쪽 가운데에 오게 그린다.

export const LEGS = {
  stand: [
    '..pp..pp..',
    '..pp..pp..',
    '..ff..fff.',
  ],
  step: [
    '...pp.pp..',
    '..pp...pp.',
    '..ff...fff',
  ],
};

const BASE_TOP = [
  '...hhhh...',
  '..hhhhhh..',
  '..hssses..',
  '..ssssss..',
  '...ssss...',
  '..cccccc..',
  '.sccccccs.',
  '.sccccccs.',
  '..dddddd..',
];

export const HEROES = [
  {
    id: 'sky', name: '하늘이', price: 0,
    colors: { h: '#5b3a1e', s: '#ffd3a6', e: '#1d1d2b', c: '#3f7dff', d: '#2546a8', p: '#26304f', f: '#f4f4f4' },
    top: BASE_TOP,
  },
  {
    id: 'berry', name: '딸기', price: 30,
    colors: { g: '#3ccf5a', h: '#ff5f8f', s: '#ffd9b8', e: '#1d1d2b', c: '#ff3b55', d: '#b81f3a', p: '#41284f', f: '#ffffff' },
    top: ['....gg....', '..hhhhhh..', ...BASE_TOP.slice(2)],
  },
  {
    id: 'fire', name: '소방관', price: 60,
    colors: { a: '#ffcc2f', h: '#3b2412', s: '#f6c79b', e: '#1d1d2b', c: '#e4572e', d: '#ffe36b', p: '#2a2a2a', f: '#111111' },
    top: ['..aaaaa...', '.aaaaaaaa.', ...BASE_TOP.slice(2)],
  },
  {
    id: 'robot', name: '로봇 삐삐', price: 120,
    colors: { a: '#ff4d4d', m: '#c9d3e0', b: '#38e1ff', g: '#55627a', p: '#c9d3e0', f: '#55627a' },
    top: [
      '....a.....',
      '..mmmmmm..',
      '..mmmbmb..',
      '..mmmmmm..',
      '...gggg...',
      '..mmmmmm..',
      '.gmmbbmmg.',
      '.gmmmmmmg.',
      '..gggggg..',
    ],
  },
];

// 함께 오르는 친구. coinMultiplier는 코인 배수, gainBonus는 시간 회복 추가 비율.
export const PETS = [
  { id: 'none', name: '혼자', price: 0, perk: '기본', coinMultiplier: 1, gainBonus: 0, rows: null },
  {
    id: 'chick', name: '병아리', price: 50, perk: '코인 ×2', coinMultiplier: 2, gainBonus: 0,
    colors: { y: '#ffd93b', e: '#1d1d2b', o: '#ff8a1f' },
    rows: ['..yy..', '.yyye.', 'yyyyoo', '.yyyy.', '..o.o.'],
  },
  {
    id: 'cat', name: '고양이', price: 90, perk: '시간 +20%', coinMultiplier: 1, gainBonus: 0.2,
    colors: { w: '#f2f2f2', e: '#1d1d2b', n: '#ff9eb5', t: '#a9a9b8' },
    rows: ['..w...w', '..ww.ww', '..wwwww', 't.wewew', 't.wwnww', 'ttwwwww', '..w.w.w'],
  },
];

export function buildSprite(rows, colors, scale = 4, outline = '#16121f') {
  const margin = 2, canvas = document.createElement('canvas');
  canvas.width = rows[0].length * scale + margin * 2;
  canvas.height = rows.length * scale + margin * 2;
  const g = canvas.getContext('2d');
  g.fillStyle = outline;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (colors[ch]) g.fillRect(x * scale, y * scale, scale + margin * 2, scale + margin * 2);
  }));
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!colors[ch]) return;
    g.fillStyle = colors[ch];
    g.fillRect(margin + x * scale, margin + y * scale, scale, scale);
  }));
  return canvas;
}

const cache = new Map();
export function heroSprite(hero, frame = 'stand') {
  const key = 'hero:' + hero.id + ':' + frame;
  if (!cache.has(key)) cache.set(key, buildSprite([...hero.top, ...LEGS[frame]], hero.colors));
  return cache.get(key);
}
export function petSprite(pet) {
  if (!pet.rows) return null;
  const key = 'pet:' + pet.id;
  if (!cache.has(key)) cache.set(key, buildSprite(pet.rows, pet.colors));
  return cache.get(key);
}

const images = new Map();
export function imageFor(src) {
  if (!src) return null;
  if (!images.has(src)) { const image = new Image(); image.src = src; images.set(src, image); }
  const image = images.get(src);
  return image.complete && image.naturalWidth ? image : null;
}

export const findHero = id => HEROES.find(hero => hero.id === id) || HEROES[0];
export const findPet = id => PETS.find(pet => pet.id === id) || PETS[0];
