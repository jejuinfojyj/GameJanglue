// 우노 규칙: 차례 진행, 카드 내기·뽑기, 특수 카드, 우노 외치기와 지적, 라운드 점수와 최종 우승.
import { CONFIG } from './config.mjs';
import { buildDeck, shuffle, canPlay, cardPoints, cardLabel, sortHand } from './cards.mjs';
import { chooseCard, chooseColor, nextIndex } from './ai.mjs';
import { seats, DECK, PILE, DECK_RECT, BUTTONS, NEXT_BUTTON, CANCEL_BUTTON, handLayout, colorButtons, catchButton, hit } from './layout.mjs';
import { sfx } from './sound.mjs';

export function createGame() {
  const state = {
    clock: 0, round: 0, direction: 1, current: 0, dealer: CONFIG.players.length - 1,
    players: CONFIG.players.map((p, i) => ({ ...p, isHuman: i === 0, hand: [], score: 0, unoCalled: false })),
    deck: [], discard: [], color: 'red',
    phase: 'turn', timer: 0, cursor: 0, keyboard: false,
    drawnCard: null, pendingCard: null, pendingFrom: 'turn', unoWindow: null, roundWinner: -1,
    message: '', notice: null, flights: [], bubbles: [], pulses: [], shake: null, summary: null, result: null,
  };
  state.seats = seats(state.players.length);
  startRound(state);
  return state;
}

function startRound(s) {
  s.round++;
  s.deck = buildDeck(); s.discard = []; s.direction = 1;
  s.flights = []; s.bubbles = []; s.pulses = []; s.unoWindow = null; s.summary = null; s.notice = null;
  for (const p of s.players) { p.hand = []; p.unoCalled = false; }
  for (let i = 0; i < CONFIG.rules.handSize; i++) for (const p of s.players) p.hand.push(s.deck.pop());
  sortHand(s.players[0].hand);

  // 첫 카드는 숫자 카드가 나올 때까지 다시 섞어 넣는다.
  let first = s.deck.pop();
  while (first.type !== 'number') {
    s.deck.splice(Math.floor(Math.random() * s.deck.length), 0, first);
    first = s.deck.pop();
  }
  s.discard.push(first); s.color = first.color;

  if (s.round > 1) s.dealer = (s.dealer + 1) % s.players.length;
  s.current = (s.dealer + 1) % s.players.length;
  beginTurn(s, s.round > 1 ? 0.9 : 0.3);
  notice(s, `${s.round}라운드 시작! ${subject(s.players[s.current])} 먼저 해.`);
}

function beginTurn(s, delay) {
  const p = s.players[s.current];
  s.phase = 'turn'; s.drawnCard = null; s.pendingCard = null;
  s.timer = delay ?? (p.isHuman ? CONFIG.timing.humanDelay : CONFIG.timing.aiThink);
  if (p.isHuman) {
    s.cursor = Math.min(s.cursor, Math.max(0, p.hand.length - 1));
    s.message = '내 차례! 같은 색이나 같은 숫자·기호를 내 봐.';
  } else {
    s.message = `${p.name} 차례… 고민 중`;
  }
}

function advance(s, steps) {
  s.current = nextIndex(s, s.current, steps);
  beginTurn(s);
}

// 이름 끝 글자에 받침이 있으면 '이', 없으면 '가'를 붙인다.
function subject(p) {
  if (p.isHuman) return '내가';
  const code = p.name.charCodeAt(p.name.length - 1) - 0xac00;
  return p.name + (code >= 0 && code < 11172 && code % 28 ? '이' : '가');
}

function notice(s, text) { s.notice = { text, t: 2.2 }; }
function bubble(s, pi, text) { s.bubbles = s.bubbles.filter(b => b.pi !== pi); s.bubbles.push({ pi, text, t: 1.6 }); }

function addFlight(s, card, from, to, faceUp, delay = 0) {
  s.flights.push({ card, x0: from.x, y0: from.y, x1: to.x, y1: to.y, faceUp, delay, dur: CONFIG.timing.flight, t: 0 });
}

function refillDeck(s) {
  if (s.discard.length < 2) return;
  const top = s.discard.pop();
  s.deck = shuffle(s.discard);
  s.discard = [top];
  notice(s, '뽑을 카드가 떨어져서 버린 카드를 다시 섞었어!');
}

function drawCards(s, pi, n, delay = 0) {
  const p = s.players[pi], drawn = [];
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) refillDeck(s);
    if (!s.deck.length) break;
    const card = s.deck.pop(), d = delay + i * 0.12;
    card.arrive = s.clock + d + CONFIG.timing.flight;
    p.hand.push(card); drawn.push(card);
    addFlight(s, card, DECK, s.seats[pi], p.isHuman, d);
  }
  if (p.hand.length > 1) p.unoCalled = false;
  if (p.isHuman) sortHand(p.hand);
  if (drawn.length) sfx('draw');
  return drawn;
}

function callUno(s, pi) {
  s.players[pi].unoCalled = true;
  if (s.unoWindow?.pi === pi) s.unoWindow = null;
  bubble(s, pi, '우노!');
  sfx('uno');
}

function penalize(s, pi, catcher) {
  const p = s.players[pi];
  s.unoWindow = null;
  bubble(s, catcher, pi === 0 ? '우노 안 외쳤지!' : '우노 안 했지!');
  drawCards(s, pi, CONFIG.rules.unoPenalty, 0.2);
  notice(s, `${subject(p)} 우노를 안 외쳐서 ${CONFIG.rules.unoPenalty}장을 뽑아!`);
  sfx('catch');
}

function playCard(s, pi, card, chosenColor) {
  const p = s.players[pi];
  p.hand.splice(p.hand.indexOf(card), 1);
  s.discard.push(card);
  s.color = card.color === 'wild' ? chosenColor : card.color;
  addFlight(s, card, s.seats[pi], PILE, true);
  s.pulses.push({ t: 0, color: s.color });
  sfx(card.type === 'number' ? 'play' : card.type);

  const who = p.isHuman ? '나' : p.name;
  let text = `${who}: ${cardLabel(card)}`;
  if (card.color === 'wild') text += ` → ${CONFIG.colorNames[s.color]}`;

  if (p.hand.length === 1 && !p.unoCalled) {
    if (p.isHuman) s.unoWindow = { pi, time: CONFIG.rules.aiCatchDelay };
    else if (Math.random() < p.unoChance) callUno(s, pi);
    else s.unoWindow = { pi, time: CONFIG.rules.catchWindow };
  }

  if (card.type === 'reverse') s.direction *= -1;
  const next = nextIndex(s, pi, 1), nextName = s.players[next].isHuman ? '나' : s.players[next].name;
  let steps = 1;
  if (card.type === 'skip') { steps = 2; bubble(s, next, '건너뛰기!'); text += ` · ${nextName} 쉬기`; }
  if (card.type === 'reverse') {
    steps = s.players.length === 2 ? 2 : 1;
    text += ' · 방향 반대로!';
  }
  if (card.type === 'draw2' || card.type === 'wild4') {
    const n = card.type === 'draw2' ? 2 : 4;
    drawCards(s, next, n, 0.25);
    steps = 2;
    bubble(s, next, `+${n}장…`);
    text += ` · ${nextName} ${n}장 뽑고 쉬기`;
  }
  notice(s, text);

  if (p.hand.length === 0) {
    s.phase = 'roundEndWait'; s.timer = CONFIG.timing.roundEndDelay; s.roundWinner = pi; s.unoWindow = null;
    bubble(s, pi, '다 냈다!');
    s.message = `${subject(p)} 카드를 모두 냈어!`;
    return;
  }
  s.current = pi;
  advance(s, steps);
}

function scoreRound(s) {
  const winner = s.players[s.roundWinner];
  const rows = s.players.map((p, i) => ({
    name: p.isHuman ? '나' : p.name, cards: p.hand.length,
    points: p.hand.reduce((sum, c) => sum + cardPoints(c), 0), winner: i === s.roundWinner,
  }));
  const gained = rows.reduce((sum, r) => sum + r.points, 0);
  winner.score += gained;
  s.summary = { winner: s.roundWinner, rows, gained, matchOver: winner.score >= CONFIG.rules.targetScore };
  s.phase = 'roundEnd';
  sfx(winner.isHuman ? 'win' : 'lose');
}

function finishMatch(s) {
  const winner = s.players[s.summary.winner];
  const board = [...s.players].sort((a, b) => b.score - a.score)
    .map((p, i) => `${i + 1}위 ${p.isHuman ? '나' : p.name} ${p.score}점`).join('\n');
  s.result = winner.isHuman
    ? { success: true, message: `${CONFIG.rules.targetScore}점을 먼저 모아 최종 우승! (${s.round}라운드)\n${board}` }
    : { success: false, message: `${subject(winner)} ${CONFIG.rules.targetScore}점을 먼저 모았어.\n${board}` };
}

export function canCallUno(s) {
  const me = s.players[0];
  if (me.unoCalled || !['turn', 'drawn', 'chooseColor'].includes(s.phase)) return false;
  if (me.hand.length === 1) return true;
  return me.hand.length === 2 && s.current === 0;
}

function tickEffects(s, dt) {
  for (const f of s.flights) f.t += dt;
  s.flights = s.flights.filter(f => f.t < f.delay + f.dur);
  for (const b of s.bubbles) b.t -= dt;
  s.bubbles = s.bubbles.filter(b => b.t > 0);
  for (const p of s.pulses) p.t += dt;
  s.pulses = s.pulses.filter(p => p.t < 0.6);
  if (s.notice && (s.notice.t -= dt) <= 0) s.notice = null;
  if (s.shake && (s.shake.t -= dt) <= 0) s.shake = null;
}

function tickUnoWindow(s, dt) {
  const w = s.unoWindow;
  if (!w) return;
  const p = s.players[w.pi];
  if (p.unoCalled || p.hand.length !== 1) { s.unoWindow = null; return; }
  w.time -= dt;
  if (w.time > 0) return;
  const others = s.players.map((_, i) => i).filter(i => i !== w.pi && !s.players[i].isHuman);
  if (p.isHuman) penalize(s, 0, others[Math.floor(Math.random() * others.length)]);
  else if (others.length && Math.random() < CONFIG.rules.aiCatchChance) penalize(s, w.pi, others[Math.floor(Math.random() * others.length)]);
  else { s.unoWindow = null; p.unoCalled = true; }
}

function tryPlay(s, card) {
  const top = s.discard.at(-1);
  if (s.phase === 'drawn' && card !== s.drawnCard) {
    notice(s, '지금은 방금 뽑은 카드만 낼 수 있어.');
    s.shake = { card, t: 0.35 }; sfx('nope');
    return;
  }
  if (!canPlay(card, top, s.color)) {
    notice(s, `${CONFIG.colorNames[s.color]}색이나 같은 숫자·기호, 와일드만 낼 수 있어.`);
    s.shake = { card, t: 0.35 }; sfx('nope');
    return;
  }
  if (card.color === 'wild') {
    s.pendingFrom = s.phase; s.phase = 'chooseColor'; s.pendingCard = card;
    s.message = '바꿀 색을 골라 줘!';
    return;
  }
  playCard(s, 0, card);
}

function humanTurn(s, tap, keys) {
  const hand = s.players[0].hand, top = s.discard.at(-1);

  if (s.phase === 'chooseColor') {
    const picked = colorButtons().find((b, i) => (tap && hit(b, tap)) || keys.has(String(i + 1)));
    if (picked) { playCard(s, 0, s.pendingCard, picked.color); return; }
    if ((tap && hit(CANCEL_BUTTON, tap)) || keys.has('backspace') || keys.has('x')) {
      s.phase = s.pendingFrom; s.pendingCard = null;
      s.message = '다른 카드를 골라도 돼.';
    }
    return;
  }

  if (keys.has('arrowleft')) { s.cursor = Math.max(0, s.cursor - 1); s.keyboard = true; }
  if (keys.has('arrowright')) { s.cursor = Math.min(hand.length - 1, s.cursor + 1); s.keyboard = true; }

  let chosen = null;
  if (tap) {
    const layout = handLayout(hand);
    for (let i = layout.length - 1; i >= 0; i--) {
      if (hit({ ...layout[i], y: layout[i].y - 12, h: layout[i].h + 12 }, tap)) { chosen = layout[i].card; break; }
    }
    if (chosen) { s.cursor = hand.indexOf(chosen); s.keyboard = false; }
  }
  if (keys.has('enter') || keys.has(' ')) chosen = hand[s.cursor];
  if (chosen) { tryPlay(s, chosen); return; }

  const wantDraw = (tap && (hit(BUTTONS.draw, tap) || hit(DECK_RECT, tap))) || keys.has('d');
  const wantPass = (tap && hit(BUTTONS.pass, tap)) || keys.has('p');

  if (s.phase === 'turn' && wantDraw) {
    const [card] = drawCards(s, 0, 1);
    if (!card) { notice(s, '뽑을 카드가 없어서 차례를 넘겨.'); advance(s, 1); return; }
    if (canPlay(card, top, s.color)) {
      s.phase = 'drawn'; s.drawnCard = card; s.cursor = hand.indexOf(card);
      s.message = '뽑은 카드를 낼 수 있어! 그 카드를 누르거나 넘기기.';
    } else {
      s.phase = 'passing'; s.timer = CONFIG.timing.pass;
      s.message = '낼 수 없는 카드야. 차례를 넘길게.';
    }
    return;
  }
  if (s.phase === 'drawn' && wantPass) advance(s, 1);
}

function aiTurn(s) {
  const pi = s.current, p = s.players[pi], top = s.discard.at(-1);
  if (s.phase === 'drawn') {
    const card = s.drawnCard;
    if (card && canPlay(card, top, s.color)) playCard(s, pi, card, chooseColor(p.hand));
    else advance(s, 1);
    return;
  }
  const card = chooseCard(s, pi);
  if (card) { playCard(s, pi, card, card.color === 'wild' ? chooseColor(p.hand) : null); return; }
  const [drawn] = drawCards(s, pi, 1);
  notice(s, `${p.name}: 낼 카드가 없어 1장 뽑기`);
  if (drawn && canPlay(drawn, top, s.color)) { s.phase = 'drawn'; s.drawnCard = drawn; s.timer = CONFIG.timing.aiDrawn; }
  else { s.phase = 'passing'; s.timer = CONFIG.timing.pass; }
}

export function updateGame(s, dt, input) {
  s.clock += dt;
  tickEffects(s, dt);
  const tap = input.pointer.pressed ? { x: input.pointer.x, y: input.pointer.y } : null, keys = input.pressed;

  if (s.phase === 'roundEnd') {
    if ((tap && hit(NEXT_BUTTON, tap)) || keys.has('enter') || keys.has(' ')) {
      sfx('click');
      if (s.summary.matchOver) finishMatch(s); else startRound(s);
    }
    return;
  }
  if (s.phase === 'roundEndWait') {
    if ((s.timer -= dt) <= 0) scoreRound(s);
    return;
  }

  tickUnoWindow(s, dt);
  if ((tap && hit(BUTTONS.uno, tap)) || keys.has('u')) {
    if (canCallUno(s)) callUno(s, 0);
    else if (tap) notice(s, '우노는 내 차례에 카드가 2장일 때, 또는 1장 남았을 때 외쳐!');
  }
  const w = s.unoWindow;
  if (w && w.pi !== 0 && ((tap && hit(catchButton(s.seats[w.pi]), tap)) || keys.has('c'))) penalize(s, w.pi, 0);

  if (s.timer > 0) { s.timer -= dt; return; }
  if (s.phase === 'passing') { advance(s, 1); return; }
  if (s.players[s.current].isHuman) humanTurn(s, tap, keys);
  else aiTurn(s);
}
