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
      master.gain.value = 0.45;
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
  play: () => { noise(0.08, 3000, 1.2, 0.25); tone(520, 700, 0.08, 'triangle', 0.1); },
  draw: () => noise(0.12, 1800, 0.8, 0.2),
  skip: () => { tone(700, 300, 0.18, 'square', 0.08); noise(0.08, 2500, 1, 0.2); },
  reverse: () => { tone(400, 800, 0.12, 'triangle', 0.12); tone(800, 400, 0.12, 'triangle', 0.12, 0.12); },
  draw2: () => [0, 0.1].forEach(d => tone(330, 660, 0.1, 'square', 0.08, d)),
  wild: () => [523, 659, 784].forEach((f, i) => tone(f, f * 1.5, 0.12, 'triangle', 0.12, i * 0.06)),
  wild4: () => { [392, 494, 587, 784].forEach((f, i) => tone(f, f, 0.1, 'square', 0.08, i * 0.07)); noise(0.3, 400, 0.8, 0.3, 0.25); },
  uno: () => { tone(660, 990, 0.14, 'sawtooth', 0.1); tone(990, 1320, 0.2, 'triangle', 0.14, 0.12); },
  catch: () => { tone(300, 150, 0.25, 'sawtooth', 0.1); tone(250, 120, 0.3, 'square', 0.06, 0.15); },
  nope: () => tone(180, 140, 0.15, 'square', 0.08),
  click: () => tone(800, 900, 0.05, 'triangle', 0.1),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.2, 'triangle', 0.16, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * 0.92, 0.22, 'triangle', 0.1, i * 0.16)),
};

export function sfx(name) {
  if (!ctx || ctx.state !== 'running' || !SOUNDS[name]) return;
  const now = performance.now();
  if (now - (lastPlayed[name] || 0) < 50) return;
  lastPlayed[name] = now;
  try { SOUNDS[name](); } catch { /* 소리 실패는 놀이를 멈추지 않는다 */ }
}
