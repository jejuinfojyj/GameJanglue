// 파일 없이 브라우저에서 바로 만드는 효과음.
let audio = null, enabled = true;

export function setSoundEnabled(value) { enabled = !!value; }

export function unlockAudio() {
  const AudioClass = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioClass) return;
  if (!audio) { try { audio = new AudioClass(); } catch { return; } }
  if (audio.state === 'suspended') audio.resume().catch(() => {});
}

function tone(freq, { dur = 0.08, type = 'square', vol = 0.06, to = null, delay = 0 } = {}) {
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
  step(state) { tone(300 + (state.score % 12) * 22, { dur: 0.05, vol: 0.045 }); },
  coin() { tone(988, { dur: 0.07, vol: 0.05 }); tone(1319, { dur: 0.12, vol: 0.05, delay: 0.07 }); },
  stage() { [523, 659, 784, 1047].forEach((f, i) => tone(f, { dur: 0.12, vol: 0.05, delay: i * 0.08 })); },
  fall() { tone(520, { dur: 0.7, type: 'sawtooth', vol: 0.06, to: 70 }); },
  timeout() { tone(220, { dur: 0.45, vol: 0.05, to: 90 }); },
  buy() { tone(660, { dur: 0.08, vol: 0.05, type: 'triangle' }); tone(990, { dur: 0.14, vol: 0.05, type: 'triangle', delay: 0.08 }); },
};
