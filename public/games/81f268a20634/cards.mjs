// 카드 덱 구성과 "낼 수 있는지" 판정, 점수 계산.
import { CONFIG } from './config.mjs';

export const COLORS = ['red', 'yellow', 'green', 'blue'];
const TYPE_ORDER = { number: 0, skip: 1, reverse: 2, draw2: 3, wild: 4, wild4: 5 };
let nextId = 1;

export function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// 108장: 색마다 0 한 장, 1~9 두 장씩, 건너뛰기·역방향·+2 두 장씩, 와일드·와일드+4 각 4장
export function buildDeck() {
  const deck = [];
  const make = (color, type, value = null) => deck.push({ id: nextId++, color, type, value, arrive: 0 });
  for (const color of COLORS) {
    make(color, 'number', 0);
    for (let v = 1; v <= 9; v++) { make(color, 'number', v); make(color, 'number', v); }
    for (const type of ['skip', 'reverse', 'draw2']) { make(color, type); make(color, type); }
  }
  for (let i = 0; i < 4; i++) { make('wild', 'wild'); make('wild', 'wild4'); }
  return shuffle(deck);
}

export function canPlay(card, top, color) {
  if (card.color === 'wild') return true;
  if (card.color === color) return true;
  if (card.type === 'number') return top.type === 'number' && card.value === top.value;
  return card.type === top.type;
}

export function cardPoints(card) {
  if (card.type === 'number') return card.value;
  return card.color === 'wild' ? CONFIG.rules.points.wild : CONFIG.rules.points.action;
}

export function cardLabel(card) {
  const color = CONFIG.colorNames[card.color] || '';
  switch (card.type) {
    case 'number': return `${color} ${card.value}`;
    case 'skip': return `${color} 건너뛰기`;
    case 'reverse': return `${color} 역방향`;
    case 'draw2': return `${color} +2`;
    case 'wild': return '와일드';
    default: return '와일드 +4';
  }
}

export function sortHand(hand) {
  const colorOrder = [...COLORS, 'wild'];
  hand.sort((a, b) => colorOrder.indexOf(a.color) - colorOrder.indexOf(b.color)
    || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || (a.value ?? 0) - (b.value ?? 0));
}
