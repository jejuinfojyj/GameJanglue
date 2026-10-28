// 효과음은 파일 없이 브라우저 소리 합성으로 만든다. 첫 터치·키 입력 뒤부터 소리가 난다.
let ctx = null, master = null, noiseBuffer = null;
const lastPlayed = {};

export function unlockAudio() {
  try {
    if (!ctx) {
      const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* 소리를 쓸 수 없는 환경 */ }
}

function tone(from, to, dur, type = 'sine', vol = 0.2, delay = 0) {
  const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, freq, q = 1, vol = 0.3, delay = 0) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + delay, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const SOUNDS = {
  stretch: () => tone(220, 420, 0.25, 'triangle', 0.12),
  launch: () => { noise(0.35, 1200, 0.7, 0.25); tone(500, 180, 0.3, 'sine', 0.12); },
  hit: s => tone(140, 60, 0.12, 'sine', 0.35 * s),
  thud: s => tone(90, 50, 0.1, 'sine', 0.25 * s),
  'break-ice': () => { noise(0.18, 4200, 2, 0.3); tone(1800, 900, 0.1, 'triangle', 0.08); },
  'break-wood': () => { noise(0.2, 700, 1.5, 0.35); tone(220, 120, 0.12, 'square', 0.06); },
  'break-stone': () => noise(0.3, 300, 1, 0.45),
  pop: () => { tone(520, 980, 0.12, 'square', 0.1); tone(900, 300, 0.18, 'triangle', 0.12, 0.08); noise(0.12, 2000, 1, 0.2); },
  boom: () => { noise(0.7, 160, 0.6, 0.8); tone(90, 40, 0.5, 'sine', 0.5); },
  shout: () => { tone(300, 600, 0.18, 'sawtooth', 0.1); tone(600, 380, 0.2, 'sawtooth', 0.08, 0.15); },
  split: () => [0, 0.06, 0.12].forEach(d => tone(900, 1400, 0.08, 'square', 0.06, d)),
  dash: () => { noise(0.25, 2600, 1, 0.25); tone(400, 1200, 0.2, 'sawtooth', 0.07); },
  egg: () => tone(700, 300, 0.18, 'triangle', 0.15),
  clear: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.16, i * 0.12)),
  star: () => tone(1046, 1568, 0.15, 'triangle', 0.15),
  fail: () => { [392, 330, 262].forEach((f, i) => tone(f, f * 0.9, 0.2, 'square', 0.07, i * 0.18)); tone(260, 180, 0.3, 'sawtooth', 0.06, 0.6); },
};

export function sfx(name, strength = 1) {
  if (!ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
  const now = performance.now();
  if (now - (lastPlayed[name] || 0) < 60) return;
  lastPlayed[name] = now;
  try { SOUNDS[name](Math.max(0.2, Math.min(1, strength))); } catch { /* 소리 실패는 놀이를 멈추지 않는다 */ }
}
