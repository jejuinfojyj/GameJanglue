// 480×800 세로 화면의 위치와 터치 영역. 규칙(game.mjs)과 그림(draw.mjs)이 같은 값을 쓴다.
export const W = 480, H = 800;
export const CARD = { w: 62, h: 92 };
export const BIG = { w: 74, h: 110 };
export const MINI = { w: 22, h: 32 };

const BOTTOM = { x: 240, y: 640, side: 'bottom' };
const LEFT = { x: 56, y: 282, side: 'left' };
const TOP = { x: 240, y: 92, side: 'top' };
const RIGHT = { x: 424, y: 282, side: 'right' };
const SEAT_SETS = { 2: [BOTTOM, TOP], 3: [BOTTOM, LEFT, RIGHT], 4: [BOTTOM, LEFT, TOP, RIGHT] };
export const seats = count => SEAT_SETS[count] || SEAT_SETS[4];

export const CENTER = { x: 240, y: 330, ring: 108 };
export const DECK = { x: 182, y: 330 };
export const PILE = { x: 298, y: 330 };
export const DECK_RECT = { x: DECK.x - BIG.w / 2, y: DECK.y - BIG.h / 2, w: BIG.w, h: BIG.h };

export const BUTTONS = {
  draw: { x: 16, y: 488, w: 140, h: 52 },
  pass: { x: 170, y: 488, w: 140, h: 52 },
  uno: { x: 324, y: 488, w: 140, h: 52 },
};
export const NEXT_BUTTON = { x: 100, y: 572, w: 280, h: 56 };
export const CANCEL_BUTTON = { x: 180, y: 452, w: 120, h: 44 };

const HAND = { width: 460, single: 640, rows: [588, 690] };

// 카드가 10장을 넘으면 두 줄로 나눠 손가락으로 누르기 쉬운 간격을 지킨다.
export function handLayout(hand) {
  const n = hand.length, { w, h } = CARD, rows = n > 10 ? 2 : 1, perRow = rows === 1 ? n : Math.ceil(n / 2);
  const result = [];
  for (let r = 0; r < rows; r++) {
    const items = r === 0 ? hand.slice(0, perRow) : hand.slice(perRow);
    const k = items.length;
    const gap = k > 1 ? Math.min(w + 6, (HAND.width - w) / (k - 1)) : 0;
    const total = k > 1 ? gap * (k - 1) + w : w;
    const x0 = (W - total) / 2, y = rows === 1 ? HAND.single : HAND.rows[r];
    items.forEach((card, i) => result.push({ card, x: x0 + i * gap, y, w, h }));
  }
  return result;
}

export function colorButtons() {
  return [
    { color: 'red', x: 132, y: 250, w: 104, h: 86 },
    { color: 'yellow', x: 244, y: 250, w: 104, h: 86 },
    { color: 'green', x: 132, y: 344, w: 104, h: 86 },
    { color: 'blue', x: 244, y: 344, w: 104, h: 86 },
  ];
}

export function catchButton(seat) {
  if (seat.side === 'top') return { x: seat.x + 44, y: seat.y - 22, w: 84, h: 44 };
  return { x: seat.x - 42, y: seat.y + 96, w: 84, h: 44 };
}

export const hit = (r, p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
