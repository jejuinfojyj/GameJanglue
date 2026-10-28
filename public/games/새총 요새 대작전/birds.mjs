// 새 종류. r=크기, mass=무게, strong=재질별 피해 배수, ability=날아가는 중 화면을 톡 눌렀을 때 능력
export const BIRDS = {
  red: {
    name: '불끈이', color: '#e8443a', belly: '#f6d7b0', r: 15, mass: 1,
    ability: 'shout', tip: '함성으로 주변 밀어내기', about: '기본 새',
    shout: { radius: 130, damage: 12, push: 520 },
  },
  blue: {
    name: '삼총이', color: '#4aa3f0', belly: '#cfe9ff', r: 11, mass: 0.7,
    ability: 'split', tip: '셋으로 나뉘기', about: '얼음에 강해',
    strong: { ice: 3, wood: 0.7, stone: 0.5 }, spread: 0.2,
  },
  yellow: {
    name: '번개', color: '#ffd23a', belly: '#fff3c4', r: 15, mass: 1, shape: 'triangle',
    ability: 'dash', tip: '번개처럼 빨라지기', about: '나무에 강해',
    strong: { wood: 2.2, stone: 0.6 }, dash: 1350,
  },
  black: {
    name: '쾅쾅이', color: '#2f2f3a', belly: '#6b6b78', r: 17, mass: 1.6,
    ability: 'boom', tip: '펑! 터지기', about: '돌에 강해 · 부딪히면 곧 터져',
    strong: { stone: 1.4 }, fuse: 1.2,
    blast: { radius: 125, damage: 150, push: 900, strong: { stone: 2.2, wood: 1.2 } },
  },
  white: {
    name: '알뿅이', color: '#f7f4ec', belly: '#ffe9c7', r: 16, mass: 1.1, shape: 'egg',
    ability: 'egg', tip: '알 폭탄 떨어뜨리기', about: '위에서 아래로 공격',
  },
  big: {
    name: '왕불끈', color: '#c7302b', belly: '#f2c9a0', r: 26, mass: 4,
    ability: 'none', tip: '', about: '엄청 무거워서 뚫고 지나가',
  },
};

// 알뿅이가 떨어뜨리는 알 폭탄
export const EGG = { r: 9, mass: 0.8, blast: { radius: 85, damage: 110, push: 600, strong: { stone: 1.3 } } };
