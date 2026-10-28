// 파일 없이 브라우저에서 바로 만드는 효과음. 이름은 game.mjs의 events와 같다.
let audio = null, enabled = true, coinStreak = 0, lastCoin = 0;

export function setSoundEnabled(value) { enabled = !!value; }

export function unlockAudio() {
  const AudioClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioClass) return;
  if (!audio) { try { audio = new AudioClass(); } catch { return; } }
  if (audio.state === 'suspended') audio.resume().catch(() => {});
}

function tone(freq, { dur = 0.08, type = 'square', vol = 0.05, to = null, delay = 0 } = {}) {
  if (!enabled || !audio || audio.state !== 'running') return;
  const t = audio.currentTime + delay, osc = audio.createOscillator(), gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

export const sfx = {
  swipe() { tone(420, { dur: 0.07, type: 'triangle', vol: 0.03, to: 260 }); },
  jump() { tone(330, { dur: 0.14, type: 'square', vol: 0.04, to: 660 }); },
  superJump() { tone(300, { dur: 0.25, type: 'square', vol: 0.045, to: 1200 }); },
  roll() { tone(260, { dur: 0.12, type: 'triangle', vol: 0.04, to: 120 }); },
  land() { tone(140, { dur: 0.06, type: 'triangle', vol: 0.04 }); },
  coin() {
    const now = performance.now();
    coinStreak = now - lastCoin < 400 ? Math.min(coinStreak + 1, 8) : 0;
    lastCoin = now;
    tone(988 + coinStreak * 40, { dur: 0.06, vol: 0.035 });
    tone(1319 + coinStreak * 50, { dur: 0.09, vol: 0.035, delay: 0.05 });
  },
  power() { [523, 659, 784, 1047].forEach((f, i) => tone(f, { dur: 0.1, vol: 0.045, type: 'triangle', delay: i * 0.06 })); },
  boardOn() { tone(200, { dur: 0.3, type: 'sawtooth', vol: 0.035, to: 800 }); },
  boardBreak() { tone(600, { dur: 0.3, type: 'sawtooth', vol: 0.05, to: 90 }); },
  bump() { tone(180, { dur: 0.15, type: 'square', vol: 0.06 }); tone(140, { dur: 0.15, type: 'square', vol: 0.05, delay: 0.1 }); },
  crash() { tone(300, { dur: 0.6, type: 'sawtooth', vol: 0.07, to: 50 }); },
  horn() { tone(330, { dur: 0.35, type: 'sawtooth', vol: 0.03 }); tone(415, { dur: 0.35, type: 'sawtooth', vol: 0.03 }); },
  city() { [784, 988, 1175].forEach((f, i) => tone(f, { dur: 0.14, vol: 0.04, type: 'triangle', delay: i * 0.1 })); },
  buy() { tone(660, { dur: 0.08, vol: 0.05, type: 'triangle' }); tone(990, { dur: 0.14, vol: 0.05, type: 'triangle', delay: 0.08 }); },
};
