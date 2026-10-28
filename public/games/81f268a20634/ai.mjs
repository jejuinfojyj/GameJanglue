// AI 친구들이 어떤 카드를 낼지, 와일드 색을 무엇으로 고를지 정한다.
// 전략: 와일드는 아껴 두기, 카드가 적은 다음 사람은 건너뛰기·+2로 막기, 많이 가진 색으로 판을 이끌기.
import { CONFIG } from './config.mjs';
import { COLORS, canPlay } from './cards.mjs';

export function nextIndex(state, from, steps = 1) {
  const n = state.players.length;
  return (((from + state.direction * steps) % n) + n) % n;
}

function colorCounts(hand) {
  const counts = Object.fromEntries(COLORS.map(c => [c, 0]));
  for (const card of hand) if (card.color !== 'wild') counts[card.color]++;
  return counts;
}

export function chooseColor(hand) {
  const counts = colorCounts(hand);
  const best = Math.max(...Object.values(counts));
  const options = COLORS.filter(c => counts[c] === best);
  return options[Math.floor(Math.random() * options.length)];
}

export function chooseCard(state, pi) {
  const player = state.players[pi], top = state.discard.at(-1);
  const playable = player.hand.filter(card => canPlay(card, top, state.color));
  if (!playable.length) return null;

  if (Math.random() > player.skill) {
    const plain = playable.filter(card => card.color !== 'wild');
    const pool = plain.length ? plain : playable;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const next = state.players[nextIndex(state, pi, 1)], prev = state.players[nextIndex(state, pi, -1)];
  const danger = p => p.hand.length <= CONFIG.ai.dangerCards;
  const counts = colorCounts(player.hand), favorite = chooseColor(player.hand);
  let best = null, bestScore = -Infinity;
  for (const card of playable) {
    let score = 0;
    switch (card.type) {
      case 'number': score = 10 + card.value * 0.4; break;
      case 'skip': score = 12 + (danger(next) ? 30 : 0); break;
      case 'draw2': score = 13 + (danger(next) ? 36 : 0); break;
      case 'reverse': score = 11 + (danger(next) && !danger(prev) ? 24 : 0); break;
      case 'wild': score = -20; break;
      case 'wild4': score = -24 + (danger(next) ? 50 : 0); break;
    }
    if (card.color !== 'wild') {
      score += counts[card.color] * 2;
      if (card.color === favorite) score += 4;
    }
    if (player.hand.length <= 2 && card.color === 'wild') score += 40;
    score += Math.random() * 2;
    if (score > bestScore) { bestScore = score; best = card; }
  }
  return best;
}
