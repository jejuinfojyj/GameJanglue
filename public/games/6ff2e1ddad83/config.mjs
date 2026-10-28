/** 점수·판 크기·블록 모양·색을 여기서 바꿉니다. */
export const CONFIG = {
  title: '블락블라스트',
  gridSize: 8,
  cell: 46,
  boardGap: 3,
  boardX: 40,
  boardY: 78,
  trayY: 520,
  traySlotW: 140,
  traySlotH: 120,
  trayPadX: 30,
  placePointsPerCell: 1,
  lineBase: 10,
  multiLineBonus: 20,
  comboBonus: 15,
  palette: {
    background: '#0c3340',
    surface: '#174d5c',
    board: '#0a2a35',
    primary: '#ff9f43',
    text: '#f4fff8',
    muted: '#9ec4cf',
    ghostOk: '#7dffb855',
    ghostBad: '#ff6b6b44',
  },
  blockColors: [
    { fill: '#ff6b6b', edge: '#ff9a9a', deep: '#c44545' },
    { fill: '#ff9f43', edge: '#ffc078', deep: '#c46f1f' },
    { fill: '#ffe066', edge: '#fff3a3', deep: '#c4a820' },
    { fill: '#51cf66', edge: '#8ce99a', deep: '#2f9e44' },
    { fill: '#22b8cf', edge: '#66d9e8', deep: '#0b7285' },
    { fill: '#748ffc', edge: '#a5b4fc', deep: '#3b5bdb' },
    { fill: '#da77f2', edge: '#eebefa', deep: '#9c36b5' },
    { fill: '#20c997', edge: '#63e6be', deep: '#099268' },
  ],
};

/** 회전 없이 주어진 모양 그대로 쓰는 조각 목록. 각 칸은 [행, 열]. */
export const SHAPES = [
  { id: 'dot', cells: [[0, 0]] },
  { id: 'domino-h', cells: [[0, 0], [0, 1]] },
  { id: 'domino-v', cells: [[0, 0], [1, 0]] },
  { id: 'tri-h', cells: [[0, 0], [0, 1], [0, 2]] },
  { id: 'tri-v', cells: [[0, 0], [1, 0], [2, 0]] },
  { id: 'square2', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 'line4-h', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'line4-v', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: 'line5-h', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'line5-v', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: 'L3-a', cells: [[0, 0], [1, 0], [1, 1]] },
  { id: 'L3-b', cells: [[0, 1], [1, 0], [1, 1]] },
  { id: 'L3-c', cells: [[0, 0], [0, 1], [1, 0]] },
  { id: 'L3-d', cells: [[0, 0], [0, 1], [1, 1]] },
  { id: 'L4-a', cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: 'L4-b', cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
  { id: 'L4-c', cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { id: 'L4-d', cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: 'T4-a', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 'T4-b', cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },
  { id: 'T4-c', cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { id: 'T4-d', cells: [[0, 0], [1, 0], [1, 1], [2, 0]] },
  { id: 'S4-a', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: 'S4-b', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: 'plus', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
  { id: 'corner3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
  { id: 'square3', cells: [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ] },
  { id: 'U', cells: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] },
];

export function boardPixelSize() {
  const { gridSize, cell, boardGap } = CONFIG;
  return gridSize * cell + (gridSize - 1) * boardGap;
}

export function traySlotX(index) {
  return CONFIG.trayPadX + index * CONFIG.traySlotW;
}
