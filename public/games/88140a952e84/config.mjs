/** 과일 순서, 점수, 상자, 조작 감각은 이 파일에서 바꿉니다. */

export const CONFIG = {
  title: '수박게임',
  view: { width: 480, height: 840 },
  palette: {
    background: '#ffe7a3',
    surface: '#c9844a',
    primary: '#ef4b4c',
    text: '#5c3418',
  },
  box: {
    left: 42,
    right: 438,
    floor: 786,
    dropY: 198,
    dangerY: 270,
  },
  physics: {
    gravity: 2200,
    iterations: 7,
    substep: 1 / 120,
    restitution: 0.06,
    maxSpeed: 1700,
  },
  rules: {
    /** 위에서 나오는 과일 가짓수. 0부터 세면 체리~레몬이 5개다. */
    spawnCount: 5,
    dropCooldown: 0.4,
    mergeDelay: 0.1,
    overSeconds: 1.6,
    /** 막 떨어진 과일이 선을 지나가는 동안은 게임 오버로 세지 않는다. */
    overAge: 0.48,
    mergeSlack: 2,
    aimSpeed: 360,
  },
  bestKey: 'suika-best-score',
};

export const FRUITS = [
  { name: '체리', radius: 18, score: 0, fill: '#e4364a', shade: '#b71d34', accent: '#57a84a' },
  { name: '딸기', radius: 25, score: 2, fill: '#ef3d55', shade: '#c41f3a', accent: '#3f9a45' },
  { name: '포도', radius: 32, score: 4, fill: '#8d45c4', shade: '#642a96', accent: '#d7b0f2' },
  { name: '귤', radius: 40, score: 8, fill: '#f3921e', shade: '#d56d0d', accent: '#4ea24b' },
  { name: '레몬', radius: 48, score: 16, fill: '#ffe14a', shade: '#e0b40a', accent: '#fff7b0' },
  { name: '사과', radius: 57, score: 32, fill: '#e23b32', shade: '#b11e22', accent: '#67a84b' },
  { name: '배', radius: 66, score: 64, fill: '#d7e36a', shade: '#b4c43a', accent: '#8d6a32' },
  { name: '복숭아', radius: 76, score: 128, fill: '#ffb184', shade: '#f08a62', accent: '#ffe0cf' },
  { name: '파인애플', radius: 86, score: 256, fill: '#f0c43a', shade: '#d29a16', accent: '#3d9a45' },
  { name: '멜론', radius: 97, score: 512, fill: '#c6e07a', shade: '#7eaa45', accent: '#e7f5b8' },
  { name: '수박', radius: 108, score: 1024, fill: '#2f9a52', shade: '#1d6b38', accent: '#d7f5c4' },
];
